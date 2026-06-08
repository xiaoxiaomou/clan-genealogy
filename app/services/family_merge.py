"""家族合并服务

支持将一个家族（源）的成员/事件/动态/关系/相册/通知 全部迁移到另一个家族（目标），
并合并用户访问权；源家族标记为「已合并到 #N」并归档。
"""
import logging
from datetime import datetime
from typing import Optional
from flask import current_app
from app import db
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.event import FamilyEvent
from app.models.album import FamilyAlbum, FamilyPhoto
from app.models.notification import Notification
from app.models.post import Post, PostComment, PostLike
from app.models.share_link import FamilyShareLink
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def preview_merge(target_id: int, source_id: int) -> dict:
    """预览合并冲突：成员重复、字段差异、用户重复、链接数、记录数。"""
    if target_id == source_id:
        raise ValueError('源与目标不能相同')

    target = Family.query.get(target_id)
    source = Family.query.get(source_id)
    if not target or not source:
        raise ValueError('家族不存在')

    if source.merged_into_id:
        raise ValueError(f'源家族已合并到 #{source.merged_into_id}，不能再次合并')

    # 1. 成员重复检测：按 (name, generation) 匹配
    target_members = Member.query.filter_by(family_id=target_id).all()
    source_members = Member.query.filter_by(family_id=source_id).all()
    target_key = {(m.name.strip(), m.generation): m for m in target_members}
    source_key = {(m.name.strip(), m.generation): m for m in source_members}
    dup = []
    for k, sm in source_key.items():
        if k in target_key:
            tm = target_key[k]
            diffs = []
            for f in ['gender', 'birth_date', 'death_date', 'birth_place', 'death_place', 'bio']:
                sv = getattr(sm, f) or ''
                tv = getattr(tm, f) or ''
                if sv and sv != tv:
                    diffs.append({'field': f, 'target': tv, 'source': sv})
            dup.append({
                'source_member_id': sm.id,
                'target_member_id': tm.id,
                'name': sm.name,
                'generation': sm.generation,
                'differences': diffs,
                'recommend': 'skip' if not diffs else 'manual',
            })

    # 2. 用户重复：两家族共享用户的角色差异
    target_users = {fm.user_id: fm.role for fm in FamilyMember.query.filter_by(family_id=target_id).all()}
    source_users = {fm.user_id: fm.role for fm in FamilyMember.query.filter_by(family_id=source_id).all()}
    user_conflicts = []
    for uid, srole in source_users.items():
        if uid in target_users:
            trole = target_users[uid]
            if srole != trole:
                user_conflicts.append({
                    'user_id': uid,
                    'source_role': srole,
                    'target_role': trole,
                    'recommend': 'keep_higher',  # admin > editor > viewer
                })

    # 3. 关联数据计数
    target_member_ids = [m.id for m in target_members]
    source_member_ids = [m.id for m in source_members]
    counts = {
        'source_members': len(source_members),
        'target_members': len(target_members),
        'duplicates': len(dup),
        'source_relationships': Relationship.query.filter(
            Relationship.member_id.in_(source_member_ids) if source_member_ids else False
        ).count(),
        'source_events': FamilyEvent.query.filter_by(family_id=source_id).count(),
        'source_albums': FamilyAlbum.query.filter_by(family_id=source_id).count(),
        'source_photos': db.session.query(FamilyPhoto).join(FamilyAlbum, FamilyPhoto.album_id == FamilyAlbum.id).filter(FamilyAlbum.family_id == source_id).count(),
        'source_posts': Post.query.filter_by(family_id=source_id).count(),
        'source_chat_groups': 0,
        'source_share_links': FamilyShareLink.query.filter_by(family_id=source_id, revoked=False).count(),
        'shared_users': len(set(target_users) & set(source_users)),
        'source_only_users': len(set(source_users) - set(target_users)),
    }

    return {
        'target': {'id': target.id, 'name': target.name, 'surname': target.surname},
        'source': {'id': source.id, 'name': source.name, 'surname': source.surname, 'merged_into_id': source.merged_into_id},
        'counts': counts,
        'member_duplicates': dup[:50],  # 最多 50 条
        'user_role_conflicts': user_conflicts,
        'recommend_strategy': 'skip_duplicate_members' if dup else 'migrate_all',
    }


def execute_merge(target_id: int, source_id: int, operator_user_id: int,
                   field_strategy: str = 'keep_target',  # 'keep_target' | 'keep_source' | 'keep_newest'
                   member_strategy: str = 'migrate_all',  # 'migrate_all' | 'skip_duplicate'
                   delete_source: bool = False) -> dict:
    """执行家族合并

    Args:
        field_strategy: 字段冲突时保留哪边（针对重复成员字段补全）
        member_strategy: 重复成员的处理方式
        delete_source: 是否硬删除源家族（默认归档为「已合并到 #N」）
    """
    if target_id == source_id:
        raise ValueError('源与目标不能相同')

    target = Family.query.get(target_id)
    source = Family.query.get(source_id)
    if not target or not source:
        raise ValueError('家族不存在')

    if source.merged_into_id:
        raise ValueError(f'源家族已合并到 #{source.merged_into_id}')

    result = {
        'migrated_members': 0,
        'skipped_members': 0,
        'migrated_relationships': 0,
        'migrated_events': 0,
        'migrated_albums': 0,
        'migrated_photos': 0,
        'migrated_posts': 0,
        'merged_user_access': 0,
        'migrated_share_links': 0,
    }

    # 1. 处理成员重复
    target_key = {
        (m.name.strip(), m.generation): m
        for m in Member.query.filter_by(family_id=target_id).all()
    }
    source_members = Member.query.filter_by(family_id=source_id).all()

    skip_ids = set()
    if member_strategy == 'skip_duplicate':
        for sm in source_members:
            k = (sm.name.strip(), sm.generation)
            if k in target_key:
                tm = target_key[k]
                # 补全字段
                if field_strategy == 'keep_source':
                    for f in ['gender', 'birth_date', 'death_date', 'birth_place', 'death_place', 'bio']:
                        sv = getattr(sm, f) or ''
                        tv = getattr(tm, f) or ''
                        if sv and not tv:
                            setattr(tm, f, sv)
                skip_ids.add(sm.id)
                result['skipped_members'] += 1

    # 2. 迁移成员
    for sm in source_members:
        if sm.id in skip_ids:
            continue
        sm.family_id = target_id
        result['migrated_members'] += 1

    # 3. 迁移关系：通过 member_id 改 family_id 不适用，需要重新写 member_id
    # 实际方案：把 source 的 member_id 全部更新为 target 中的对应 member_id
    # 但因为 source 的 member 会先迁移到 target，且 member.id 不变（只改 family_id），
    # 所以关系不需要改（仍指向同一 member id），只统计
    src_member_ids = [m.id for m in source_members if m.id not in skip_ids]
    rels = Relationship.query.filter(
        Relationship.member_id.in_(src_member_ids) if src_member_ids else False
    ).all()
    result['migrated_relationships'] = len(rels)

    # 4. 迁移事件
    evts = FamilyEvent.query.filter_by(family_id=source_id).all()
    for e in evts:
        e.family_id = target_id
        result['migrated_events'] += 1

    # 5. 迁移相册
    albums = FamilyAlbum.query.filter_by(family_id=source_id).all()
    for a in albums:
        a.family_id = target_id
        result['migrated_albums'] += 1
    result['migrated_photos'] = db.session.query(FamilyPhoto).join(FamilyAlbum, FamilyPhoto.album_id == FamilyAlbum.id).filter(
        FamilyAlbum.family_id == target_id,
        FamilyPhoto.album_id.in_([a.id for a in albums]) if albums else False
    ).count() if albums else 0

    # 6. 迁移动态
    posts = Post.query.filter_by(family_id=source_id).all()
    for p in posts:
        p.family_id = target_id
        result['migrated_posts'] += 1

    # 7. 迁移分享链接
    links = FamilyShareLink.query.filter_by(family_id=source_id).all()
    for ln in links:
        ln.family_id = target_id
        result['migrated_share_links'] += 1

    # 8. 合并用户访问权（高权限优先）
    role_rank = {'admin': 3, 'editor': 2, 'viewer': 1, 'member': 1}
    target_fms = {fm.user_id: fm for fm in FamilyMember.query.filter_by(family_id=target_id).all()}
    source_fms = FamilyMember.query.filter_by(family_id=source_id).all()
    for sfm in source_fms:
        if sfm.user_id in target_fms:
            tfm = target_fms[sfm.user_id]
            # 保留更高权限
            if role_rank.get(sfm.role, 0) > role_rank.get(tfm.role, 0):
                tfm.role = sfm.role
            # 删除源端访问权
            db.session.delete(sfm)
            result['merged_user_access'] += 1
        else:
            # 直接迁移
            sfm.family_id = target_id
            result['merged_user_access'] += 1

    # 9. 迁移通知
    Notification.query.filter_by(family_id=source_id).update({'family_id': target_id})

    # 10. 归档源家族
    if delete_source:
        # 真删除：先解除所有外键
        FamilyMember.query.filter_by(family_id=source_id).delete()
        db.session.delete(source)
    else:
        source.merged_into_id = target_id
        source.name = f'{source.name}（已合并→{target.name}）'
        source.description = (source.description or '') + f'\n\n[合并记录] {datetime.now().isoformat()} 合并到 #{target_id}'

    # 11. 审计日志
    log = AuditLog(
        user_id=operator_user_id,
        family_id=target_id,
        action='merge_families',
        entity_type='family',
        entity_id=source_id,
        description=f'将家族 #{source_id} 合并到本家族：迁移 {result["migrated_members"]} 成员 / {result["migrated_relationships"]} 关系 / {result["migrated_events"]} 事件 / {result["migrated_posts"]} 动态；跳过 {result["skipped_members"]} 重复成员；合并 {result["merged_user_access"]} 用户访问。',
    )
    db.session.add(log)

    db.session.commit()
    return result
