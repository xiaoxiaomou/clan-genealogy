"""理事会/家庙 API（基于现有数据聚合）"""
from collections import Counter
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.models.user import User
from app.models.honor import Honor
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required

community_bp = Blueprint('community', __name__)


@community_bp.route('/<int:family_id>/council', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_council(family_id):
    """族委会/理事会：管理员、贡献者排行、家族规模统计"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    # 管理员/编辑/查看者分类（按本族谱的角色）
    fms = FamilyMember.query.filter_by(family_id=family_id).all()
    role_map = {'owner': [], 'admin': [], 'editor': [], 'viewer': []}
    for fm in fms:
        if fm.role not in role_map:
            continue
        user = db.session.get(User, fm.user_id)
        if not user:
            continue
        role_map[fm.role].append({
            'user_id': user.id,
            'username': user.username,
            'display_name': user.display_name,
            'avatar': user.avatar,
            'joined_at': fm.joined_at.isoformat() if fm.joined_at else None,
        })

    # 贡献者排行：审计日志次数
    logs = AuditLog.query.filter_by(family_id=family_id).all()
    counter = Counter(l.user_id for l in logs)
    contributors = []
    for uid, cnt in counter.most_common(10):
        u = db.session.get(User, uid)
        if not u:
            continue
        contributors.append({
            'user_id': u.id,
            'username': u.username,
            'display_name': u.display_name,
            'avatar': u.avatar,
            'action_count': cnt,
        })

    # 家族规模
    total_members = Member.query.filter_by(family_id=family_id).count()
    male = Member.query.filter_by(family_id=family_id, gender='male').count()
    female = Member.query.filter_by(family_id=family_id, gender='female').count()
    alive = Member.query.filter_by(family_id=family_id, is_alive=True).count()
    generations = (
        db.session.query(Member.generation)
        .filter(Member.family_id == family_id, Member.generation.isnot(None))
        .distinct()
        .count()
    )
    honors_count = Honor.query.filter_by(family_id=family_id).count()

    return jsonify({
        'family': {
            'id': family.id,
            'name': family.name,
            'surname': family.surname,
            'motto': family.motto,
            'created_at': family.created_at.isoformat() if family.created_at else None,
        },
        'roles': role_map,
        'contributors': contributors,
        'stats': {
            'total_members': total_members,
            'male': male,
            'female': female,
            'alive': alive,
            'generations': generations,
            'honors': honors_count,
        },
    })


@community_bp.route('/<int:family_id>/temple', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_temple(family_id):
    """家庙页：家族简介、始祖、字辈、家训"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    # 始祖：generation 最小
    founder = (
        Member.query.filter(Member.family_id == family_id, Member.generation.isnot(None))
        .order_by(Member.generation.asc(), Member.id.asc())
        .first()
    )
    founder_dict = founder.to_dict() if founder else None

    # 字辈诗
    from app.services.zibei_service import parse_chars
    zibei_chars = parse_chars(family.zibei_text or '')

    # 五代内统计
    if founder:
        descendant_count = Member.query.filter(
            Member.family_id == family_id,
            Member.generation.isnot(None),
            Member.generation >= founder.generation,
            Member.generation <= founder.generation + 4,
        ).count()
    else:
        descendant_count = 0

    return jsonify({
        'family': family.to_dict(),
        'founder': founder_dict,
        'zibei_chars': zibei_chars,
        'zibei_text': family.zibei_text or '',
        'zibei_description': family.zibei_description or '',
        'motto': family.motto or '',
        'intro': family.intro or '',
        'description': family.description or '',
        'descendant_count_5gen': descendant_count,
    })
