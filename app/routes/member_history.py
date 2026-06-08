"""成员编辑版本历史 API"""
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.member import Member
from app.models.member_edit_history import MemberEditHistory
from app.utils.decorators import family_permission_required

member_history_bp = Blueprint('member_history', __name__)


# 可追踪的字段白名单
TRACKED_FIELDS = {
    'name', 'gender', 'generation', 'birth_date', 'death_date',
    'is_alive', 'birth_place', 'death_place', 'generation_name',
    'father_id', 'mother_id', 'spouse_id', 'branch_id', 'bio',
    'occupation', 'avatar',
}


def record_member_changes(family_id: int, member: Member, old_attrs: dict, new_attrs: dict,
                           editor_id: int, batch_id: str = None, action: str = 'update'):
    """对比 old_attrs 和 new_attrs，记录每个变更字段到 history。"""
    if not batch_id:
        batch_id = uuid.uuid4().hex[:16]
    for field in TRACKED_FIELDS:
        if field not in new_attrs:
            continue
        old = (old_attrs.get(field) or '') if old_attrs else ''
        new = new_attrs.get(field) or ''
        # 规范化
        old_s = str(old).strip() if old is not None else ''
        new_s = str(new).strip() if new is not None else ''
        if old_s == new_s:
            continue
        h = MemberEditHistory(
            family_id=family_id,
            member_id=member.id,
            editor_id=editor_id,
            batch_id=batch_id,
            field_name=field,
            old_value=old_s or None,
            new_value=new_s or None,
            action=action,
        )
        db.session.add(h)
    return batch_id


@member_history_bp.route('/<int:family_id>/members/<int:member_id>/history', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_history(family_id, member_id):
    """列出某成员的所有历史变更（按 batch 分组）"""
    try:
        page = max(1, int(request.args.get('page', 1)))
        page_size = min(100, max(10, int(request.args.get('page_size', 30))))
    except (TypeError, ValueError):
        page, page_size = 1, 30

    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    # 按 batch_id 倒序
    history = (
        MemberEditHistory.query
        .filter_by(family_id=family_id, member_id=member_id)
        .order_by(MemberEditHistory.created_at.desc(), MemberEditHistory.id.desc())
        .all()
    )

    # 分组
    groups = {}
    for h in history:
        groups.setdefault(h.batch_id, []).append(h)

    grouped = []
    for batch_id, items in groups.items():
        first = items[0]
        grouped.append({
            'batch_id': batch_id,
            'editor_id': first.editor_id,
            'editor_name': first.editor.display_name if first.editor else None,
            'action': first.action,
            'created_at': first.created_at.isoformat(),
            'changes': [
                {
                    'field': i.field_name,
                    'old': i.old_value,
                    'new': i.new_value,
                }
                for i in sorted(items, key=lambda x: x.field_name)
            ],
        })

    # 分页（按 group）
    total = len(grouped)
    start = (page - 1) * page_size
    end = start + page_size
    return jsonify({
        'total': total,
        'page': page,
        'page_size': page_size,
        'groups': grouped[start:end],
    })


@member_history_bp.route('/<int:family_id>/members/<int:member_id>/rollback/<batch_id>', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def rollback_to(family_id, member_id, batch_id):
    """回滚到指定批次（将该批次所有 new_value 改回 old_value）"""
    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    items = MemberEditHistory.query.filter_by(
        family_id=family_id,
        member_id=member_id,
        batch_id=batch_id,
    ).all()
    if not items:
        return jsonify({'error': '历史记录不存在'}), 404

    uid = int(get_jwt_identity())

    # 收集新值→旧值
    new_attrs = {}
    for h in items:
        new_attrs[h.field_name] = h.old_value

    # 保存当前状态以便记录"回滚"动作
    old_attrs = {f: getattr(member, f) for f in TRACKED_FIELDS if f in new_attrs}

    # 应用旧值
    for f, v in new_attrs.items():
        if hasattr(member, f):
            setattr(member, f, v or None)
    member.updated_at = datetime.utcnow()

    # 记录回滚
    record_member_changes(
        family_id=family_id,
        member=member,
        old_attrs=old_attrs,
        new_attrs=new_attrs,
        editor_id=uid,
        batch_id=uuid.uuid4().hex[:16],
        action='rollback',
    )
    db.session.commit()

    return jsonify({
        'message': f'已回滚 {len(new_attrs)} 个字段',
        'rolled_back_fields': list(new_attrs.keys()),
        'member': member.to_dict(),
    })


@member_history_bp.route('/<int:family_id>/members/<int:member_id>/history/<batch_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def delete_history(family_id, member_id, batch_id):
    """删除一条历史记录（admin 清理用）"""
    items = MemberEditHistory.query.filter_by(
        family_id=family_id,
        member_id=member_id,
        batch_id=batch_id,
    ).all()
    if not items:
        return jsonify({'error': '历史记录不存在'}), 404
    for h in items:
        db.session.delete(h)
    db.session.commit()
    return jsonify({'message': f'已删除 {len(items)} 条历史记录'})


@member_history_bp.route('/<int:family_id>/members/<int:member_id>/history', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def clear_history(family_id, member_id):
    """清空成员全部历史（admin）"""
    n = MemberEditHistory.query.filter_by(
        family_id=family_id,
        member_id=member_id,
    ).delete()
    db.session.commit()
    return jsonify({'message': f'已清空 {n} 条历史记录'})
