"""公开分享链接 API

- 受保护（管理员）：CRUD 链接
- 公开（无认证）：通过 token 只读访问家族信息
"""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from app.models.share_link import FamilyShareLink
from app.models.family import Family
from app.models.member import Member
from app.models.relationship import Relationship
from app.utils.decorators import family_permission_required

share_bp = Blueprint('share', __name__)

# 公开访问单独 blueprint（避免 family_id 前缀约束）
public_share_bp = Blueprint('public_share', __name__)


@share_bp.route('/<int:family_id>/share-links', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def create_share_link(family_id):
    """创建分享链接

    请求体: {
      label?: string,
      password?: string,        # 可选访问密码
      expires_in_days?: number, # 可选过期天数，None 或 0 = 永不过期
    }
    """
    data = request.get_json(silent=True) or {}
    label = (data.get('label') or '').strip()[:120] or None
    password = data.get('password') or None
    expires_in_days = data.get('expires_in_days')

    expires_at = None
    if expires_in_days:
        try:
            d = int(expires_in_days)
            if d > 0:
                expires_at = datetime.utcnow() + timedelta(days=d)
        except (TypeError, ValueError):
            return jsonify({'error': 'expires_in_days 必须是正整数'}), 400

    link = FamilyShareLink(
        family_id=family_id,
        token=FamilyShareLink.generate_token(),
        label=label,
        password_hash=generate_password_hash(password) if password else None,
        expires_at=expires_at,
        created_by=int(get_jwt_identity()),
    )
    db.session.add(link)
    db.session.commit()

    return jsonify({
        'message': '分享链接创建成功',
        'link': link.to_dict(include_token=True),
    })


@share_bp.route('/<int:family_id>/share-links', methods=['GET'])
@jwt_required()
@family_permission_required('admin')
def list_share_links(family_id):
    links = (
        FamilyShareLink.query
        .filter_by(family_id=family_id)
        .order_by(FamilyShareLink.created_at.desc())
        .all()
    )
    return jsonify({
        'links': [l.to_dict(include_token=True) for l in links],
    })


@share_bp.route('/<int:family_id>/share-links/<int:link_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def revoke_share_link(family_id, link_id):
    link = FamilyShareLink.query.filter_by(id=link_id, family_id=family_id).first()
    if not link:
        return jsonify({'error': '链接不存在'}), 404
    link.revoked = True
    db.session.commit()
    return jsonify({'message': '已撤销分享链接'})


@share_bp.route('/<int:family_id>/share-links/<int:link_id>/hard', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def hard_delete_share_link(family_id, link_id):
    """永久删除（仅在已撤销后可删）"""
    link = FamilyShareLink.query.filter_by(id=link_id, family_id=family_id).first()
    if not link:
        return jsonify({'error': '链接不存在'}), 404
    if not link.revoked:
        return jsonify({'error': '请先撤销链接再删除'}), 400
    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': '已删除分享链接'})


# ==================== 公开访问（无需 JWT） ====================

@public_share_bp.route('/share/<token>', methods=['POST'])
def access_shared_family(token):
    """公开访问：返回家族只读信息

    请求体: { password?: string }
    """
    link = FamilyShareLink.query.filter_by(token=token).first()
    if not link:
        return jsonify({'error': '链接不存在'}), 404
    if not link.is_active():
        return jsonify({'error': '链接已失效或被撤销', 'expired': True}), 410

    # 密码校验
    if link.password_hash:
        data = request.get_json(silent=True) or {}
        pwd = data.get('password', '')
        if not pwd or not check_password_hash(link.password_hash, pwd):
            return jsonify({'error': '密码错误', 'password_required': True}), 401

    # 记录访问
    link.view_count = (link.view_count or 0) + 1
    link.last_viewed_at = datetime.utcnow()
    link.last_viewer_ip = request.remote_addr
    db.session.commit()

    family = Family.query.get(link.family_id)
    if not family:
        return jsonify({'error': '家族不存在'}), 404

    # 成员列表（只读）
    members = (
        Member.query
        .filter_by(family_id=link.family_id)
        .order_by(Member.generation.is_(None), Member.generation.asc(), Member.name.asc())
        .all()
    )
    return jsonify({
        'family': {
            'name': family.name,
            'surname': family.surname,
            'origin': family.origin,
            'intro': family.intro,
            'motto': family.motto,
        },
        'member_count': len(members),
        'members': [m.to_dict() for m in members],
        'view_count': link.view_count,
        'shared_at': link.created_at.isoformat(),
        'expires_at': link.expires_at.isoformat() if link.expires_at else None,
    })


@public_share_bp.route('/share/<token>/info', methods=['GET'])
def share_link_info(token):
    """仅查询链接元信息（不消耗访问次数）"""
    link = FamilyShareLink.query.filter_by(token=token).first()
    if not link:
        return jsonify({'error': '链接不存在'}), 404
    return jsonify({
        'label': link.label,
        'has_password': bool(link.password_hash),
        'active': link.is_active(),
        'expires_at': link.expires_at.isoformat() if link.expires_at else None,
        'family_name': link.family.name if link.family else None,
    })
