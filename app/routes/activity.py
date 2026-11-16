"""家族活动 API（祭祖 / 颁谱 / 聚会，含报名接龙）"""
from datetime import date, datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.services.family_service import FamilyService
from app.utils.decorators import family_permission_required
from app.models.activity import FamilyActivity, ActivityRsvp
from app.models.user import User

activity_bp = Blueprint('activity', __name__)

VALID_TYPES = ('祭祖', '颁谱', '聚会', '其他')
VALID_STATUS = ('join', 'maybe', 'no')


def _user_map(user_ids):
    users = User.query.filter(User.id.in_(set(user_ids))).all() if user_ids else []
    return {u.id: (u.display_name or u.username) for u in users}


@activity_bp.route('/<int:family_id>/activities', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_activities(family_id):
    """活动列表（未开始的在前，含报名统计与我的报名）"""
    me = int(get_jwt_identity())
    activities = (FamilyActivity.query
                  .filter_by(family_id=family_id)
                  .order_by(FamilyActivity.activity_date)
                  .all())
    today = date.today()
    result = []
    for a in activities:
        d = a.to_dict(current_user_id=me)
        d['is_past'] = a.activity_date < today if a.activity_date else False
        result.append(d)
    result.sort(key=lambda x: (x['is_past'], x['activity_date'] or '9999'))
    return jsonify({'activities': result})


@activity_bp.route('/<int:family_id>/activities', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_activity(family_id):
    """创建活动"""
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': '活动标题不能为空'}), 400
    try:
        activity_date = datetime.strptime(data.get('activity_date') or '', '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': '活动日期格式应为 YYYY-MM-DD'}), 400
    a = FamilyActivity(
        family_id=family_id,
        title=title,
        type=data.get('type') if data.get('type') in VALID_TYPES else '其他',
        activity_date=activity_date,
        location=(data.get('location') or '').strip() or None,
        description=(data.get('description') or '').strip() or None,
        created_by=int(get_jwt_identity()),
    )
    db.session.add(a)
    db.session.commit()
    return jsonify({'message': '活动已创建', 'activity': a.to_dict()}), 201


@activity_bp.route('/<int:family_id>/activities/<int:activity_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_activity(family_id, activity_id):
    """编辑活动（创建者或家族管理角色）"""
    a = FamilyActivity.query.filter_by(id=activity_id, family_id=family_id).first()
    if not a:
        return jsonify({'error': '活动不存在'}), 404
    me = int(get_jwt_identity())
    if a.created_by != me:
        # 非创建者需要 admin 级；简化：查角色
        from app.models.family import FamilyMember
        fm = FamilyMember.query.filter_by(family_id=family_id, user_id=me).first()
        if not fm or fm.role not in ('owner', 'admin'):
            return jsonify({'error': '只有创建者或家族管理员可编辑'}), 403
    data = request.get_json() or {}
    if 'title' in data:
        a.title = (data.get('title') or '').strip() or a.title
    if 'type' in data and data['type'] in VALID_TYPES:
        a.type = data['type']
    if 'activity_date' in data and data['activity_date']:
        try:
            a.activity_date = datetime.strptime(data['activity_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '活动日期格式应为 YYYY-MM-DD'}), 400
    if 'location' in data:
        a.location = (data['location'] or '').strip() or None
    if 'description' in data:
        a.description = (data['description'] or '').strip() or None
    db.session.commit()
    return jsonify({'message': '活动已更新', 'activity': a.to_dict()})


@activity_bp.route('/<int:family_id>/activities/<int:activity_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def delete_activity(family_id, activity_id):
    """删除活动"""
    a = FamilyActivity.query.filter_by(id=activity_id, family_id=family_id).first()
    if not a:
        return jsonify({'error': '活动不存在'}), 404
    db.session.delete(a)
    db.session.commit()
    return jsonify({'message': '活动已删除'})


@activity_bp.route('/<int:family_id>/activities/<int:activity_id>/rsvp', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def rsvp_activity(family_id, activity_id):
    """报名 / 接龙（join 参加 · maybe 待定 · no 不参加）"""
    a = FamilyActivity.query.filter_by(id=activity_id, family_id=family_id).first()
    if not a:
        return jsonify({'error': '活动不存在'}), 404
    data = request.get_json() or {}
    status = data.get('status')
    if status not in VALID_STATUS:
        return jsonify({'error': '状态不合法'}), 400
    me = int(get_jwt_identity())
    guests = max(0, min(20, int(data.get('guests') or 0)))
    note = (data.get('note') or '').strip()[:200] or None

    rsvp = ActivityRsvp.query.filter_by(activity_id=activity_id, user_id=me).first()
    if rsvp:
        rsvp.status = status
        rsvp.guests = guests
        rsvp.note = note
    else:
        rsvp = ActivityRsvp(activity_id=activity_id, user_id=me, status=status, guests=guests, note=note)
        db.session.add(rsvp)
    db.session.commit()

    names = _user_map([me])
    return jsonify({'message': '已登记', 'rsvp': rsvp.to_dict() | {'user_name': names.get(me)}})
