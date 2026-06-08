"""全局命令面板搜索 - 跨家族跨实体"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app import db
from app.models.member import Member
from app.models.family import Family, FamilyMember
from app.models.event import FamilyEvent
from app.models.post import Post
from app.utils.decorators import family_permission_required

global_search_bp = Blueprint('global_search', __name__)


def _member_to_cmd(m, family_id):
    sub = ' · '.join(filter(None, [
        f'第{m.generation}世' if m.generation else None,
        m.generation_name or None,
        f'({m.birth_date[:4]})' if m.birth_date else None,
    ]))
    return {
        'type': 'member',
        'id': m.id,
        'family_id': family_id,
        'title': m.name,
        'subtitle': sub or '成员',
        'path': f'/family/{family_id}/member/{m.id}',
        'icon': 'user',
    }


def _event_to_cmd(e, family_id):
    return {
        'type': 'event',
        'id': e.id,
        'family_id': family_id,
        'title': e.title,
        'subtitle': e.event_date or e.event_type or '事件',
        'path': f'/family/{family_id}/events',
        'icon': 'calendar',
    }


def _post_to_cmd(p, family_id):
    snippet = (p.content or '')[:40]
    if len(p.content or '') > 40:
        snippet += '…'
    return {
        'type': 'post',
        'id': p.id,
        'family_id': family_id,
        'title': snippet or '动态',
        'subtitle': p.created_at.isoformat()[:10] if p.created_at else '',
        'path': f'/family/{family_id}/feed',
        'icon': 'megaphone',
    }


@global_search_bp.route('/search/global', methods=['GET'])
@jwt_required()
def global_search():
    """命令面板跨实体搜索

    Query:
      q: 关键词
      family_id: 可选上下文
      limit: 每类上限 (默认 8)
    """
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'query': '', 'groups': [], 'total': 0})

    try:
        limit = max(1, min(20, int(request.args.get('limit', 8))))
    except (TypeError, ValueError):
        limit = 8

    family_id = request.args.get('family_id')
    if family_id is not None:
        try:
            family_id = int(family_id)
        except (TypeError, ValueError):
            family_id = None

    user_id = int(get_jwt_identity())
    user_family_ids = [
        fm.family_id
        for fm in FamilyMember.query.filter_by(user_id=user_id).all()
    ] or ([] if family_id is None else [family_id])

    target_family_ids = [family_id] if family_id else user_family_ids
    target_family_ids = list({fid for fid in target_family_ids if fid})

    groups = []

    if target_family_ids:
        members = (
            Member.query
            .filter(Member.family_id.in_(target_family_ids))
            .filter(or_(
                Member.name.like(f'%{q}%'),
                Member.generation_name.like(f'%{q}%'),
                Member.bio.like(f'%{q}%'),
                Member.birth_place.like(f'%{q}%'),
            ))
            .order_by(Member.generation.is_(None), Member.generation.asc(), Member.name.asc())
            .limit(limit)
            .all()
        )
        if members:
            groups.append({
                'label': '成员',
                'items': [_member_to_cmd(m, m.family_id) for m in members],
            })

        events = (
            FamilyEvent.query
            .filter(FamilyEvent.family_id.in_(target_family_ids))
            .filter(or_(
                FamilyEvent.title.like(f'%{q}%'),
                FamilyEvent.description.like(f'%{q}%'),
                FamilyEvent.location.like(f'%{q}%'),
            ))
            .order_by(FamilyEvent.created_at.desc())
            .limit(limit)
            .all()
        )
        if events:
            groups.append({
                'label': '事件',
                'items': [_event_to_cmd(e, e.family_id) for e in events],
            })

        posts = (
            Post.query
            .filter(Post.family_id.in_(target_family_ids))
            .filter(Post.content.like(f'%{q}%'))
            .order_by(Post.created_at.desc())
            .limit(limit)
            .all()
        )
        if posts:
            groups.append({
                'label': '动态',
                'items': [_post_to_cmd(p, p.family_id) for p in posts],
            })

    if not family_id and user_family_ids:
        families = (
            Family.query
            .filter(Family.id.in_(user_family_ids))
            .filter(or_(
                Family.name.like(f'%{q}%'),
                Family.surname.like(f'%{q}%'),
                Family.origin.like(f'%{q}%'),
            ))
            .limit(limit)
            .all()
        )
        if families:
            groups.append({
                'label': '家族',
                'items': [{
                    'type': 'family',
                    'id': f.id,
                    'title': f.name,
                    'subtitle': f.surname or f.origin or '家族',
                    'path': f'/family/{f.id}',
                    'icon': 'tree',
                } for f in families],
            })

    return jsonify({
        'query': q,
        'groups': groups,
        'total': sum(len(g['items']) for g in groups),
    })


@global_search_bp.route('/search/actions', methods=['GET'])
@jwt_required()
def quick_actions():
    """快速动作清单（命令面板底部"快捷入口"区）"""
    user_id = int(get_jwt_identity())
    user_family_ids = [
        fm.family_id
        for fm in FamilyMember.query.filter_by(user_id=user_id).all()
    ]
    actions = [
        {'id': 'goto-home', 'title': '回到我的族谱', 'subtitle': '首页', 'icon': 'home', 'action': 'navigate', 'path': '/'},
        {'id': 'goto-profile', 'title': '个人设置', 'subtitle': '账号 / 资料', 'icon': 'user', 'action': 'navigate', 'path': '/profile'},
        {'id': 'theme-light', 'title': '切换到浅色模式', 'subtitle': '主题', 'icon': 'sun', 'action': 'theme', 'value': 'light'},
        {'id': 'theme-dark', 'title': '切换到深色模式', 'subtitle': '主题', 'icon': 'moon', 'action': 'theme', 'value': 'dark'},
        {'id': 'theme-ink', 'title': '切换到水墨模式', 'subtitle': '主题', 'icon': 'brush', 'action': 'theme', 'value': 'ink'},
    ]
    if user_family_ids:
        actions.insert(0, {
            'id': 'goto-feed',
            'title': '查看家族动态',
            'subtitle': '朋友圈 / 公告',
            'icon': 'megaphone',
            'action': 'navigate',
            'path': f'/family/{user_family_ids[0]}/feed',
        })
        actions.insert(1, {
            'id': 'goto-tree',
            'title': '查看世系图',
            'subtitle': '家族树',
            'icon': 'tree',
            'action': 'navigate',
            'path': f'/family/{user_family_ids[0]}/tree',
        })
        actions.insert(2, {
            'id': 'goto-stats',
            'title': '查看数据统计',
            'subtitle': '成员 / 世代 / 字辈',
            'icon': 'chart',
            'action': 'navigate',
            'path': f'/family/{user_family_ids[0]}/stats',
        })
        actions.insert(3, {
            'id': 'goto-add',
            'title': '添加成员',
            'subtitle': '录入新成员',
            'icon': 'plus',
            'action': 'navigate',
            'path': f'/family/{user_family_ids[0]}/tree?add=1',
        })
    return jsonify({'actions': actions})


@global_search_bp.route('/search/recent', methods=['GET'])
@jwt_required()
def recent_searches():
    """最近搜索（前端用 localStorage 持久化，后端只返回 quick actions 兜底）"""
    return jsonify({'recent': []})
