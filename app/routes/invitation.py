from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.invitation import Invitation
from app.models.family import Family, FamilyMember
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.decorators import family_permission_required, admin_required

invitation_bp = Blueprint('invitation', __name__)


def create_audit_log(family_id, user_id, action, entity_type, entity_id=None, description=None):
    """创建审计日志条目"""
    log = AuditLog(
        family_id=family_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=request.remote_addr,
    )
    db.session.add(log)


@invitation_bp.route('/<int:family_id>/invitations', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def create_invitation(family_id):
    """创建邀请码"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    role = data.get('role', 'viewer')
    if role not in ('viewer', 'editor', 'admin'):
        return jsonify({'error': '无效的角色，支持: viewer, editor, admin'}), 400

    max_uses = data.get('max_uses', 0)
    try:
        max_uses = int(max_uses)
    except (ValueError, TypeError):
        max_uses = 0

    expires_in_hours = data.get('expires_in_hours')
    expires_at = None
    if expires_in_hours:
        try:
            expires_at = datetime.utcnow() + timedelta(hours=int(expires_in_hours))
        except (ValueError, TypeError):
            pass

    try:
        invitation = Invitation(
            family_id=family_id,
            created_by=user_id,
            role=role,
            max_uses=max_uses,
            expires_at=expires_at,
        )
        invitation.generate_code()
        db.session.add(invitation)
        create_audit_log(
            family_id, user_id, 'create', 'invitation',
            entity_id=invitation.id,
            description=f'创建邀请码，角色: {role}'
        )
        db.session.commit()
        return jsonify({
            'message': '邀请码创建成功',
            'invitation': invitation.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建邀请码失败: {str(e)}'}), 500


@invitation_bp.route('/<int:family_id>/invitations', methods=['GET'])
@jwt_required()
@family_permission_required('admin')
def list_invitations(family_id):
    """获取族谱的所有有效邀请码"""
    try:
        invitations = Invitation.query.filter_by(
            family_id=family_id,
            is_active=True
        ).order_by(Invitation.created_at.desc()).all()
        return jsonify({
            'invitations': [inv.to_dict() for inv in invitations]
        })
    except Exception as e:
        return jsonify({'error': f'获取邀请码列表失败: {str(e)}'}), 500


@invitation_bp.route('/<int:family_id>/invitations/<int:invite_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def deactivate_invitation(family_id, invite_id):
    """停用邀请码"""
    user_id = int(get_jwt_identity())
    try:
        invitation = Invitation.query.filter_by(id=invite_id, family_id=family_id).first()
        if not invitation:
            return jsonify({'error': '邀请码不存在'}), 404

        invitation.is_active = False
        create_audit_log(
            family_id, user_id, 'update', 'invitation',
            entity_id=invite_id, description='停用邀请码'
        )
        db.session.commit()
        return jsonify({'message': '邀请码已停用'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'停用邀请码失败: {str(e)}'}), 500


@invitation_bp.route('/join', methods=['POST'])
def join_via_invitation():
    """通过邀请码加入族谱（公开端点，无需认证）"""
    # 需要 JWT 以确定当前用户
    try:
        from flask_jwt_extended import verify_jwt_in_request
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception:
        return jsonify({'error': '请先登录'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    code = data.get('code', '').strip()
    if not code:
        return jsonify({'error': '邀请码不能为空'}), 400

    try:
        invitation = Invitation.query.filter_by(code=code, is_active=True).first()
        if not invitation:
            return jsonify({'error': '邀请码无效或已停用'}), 404

        # 检查是否过期
        if invitation.expires_at and invitation.expires_at < datetime.utcnow():
            invitation.is_active = False
            db.session.commit()
            return jsonify({'error': '邀请码已过期'}), 410

        # 检查使用次数
        if invitation.max_uses > 0 and invitation.use_count >= invitation.max_uses:
            invitation.is_active = False
            db.session.commit()
            return jsonify({'error': '邀请码使用次数已达上限'}), 410

        # 检查用户是否已在族谱中
        existing = FamilyMember.query.filter_by(
            family_id=invitation.family_id,
            user_id=user_id
        ).first()
        if existing:
            return jsonify({'error': '您已在该族谱中'}), 400

        # 添加用户到族谱
        fm = FamilyMember(
            family_id=invitation.family_id,
            user_id=user_id,
            role=invitation.role,
        )
        db.session.add(fm)

        # 增加使用次数
        invitation.use_count += 1
        if invitation.max_uses > 0 and invitation.use_count >= invitation.max_uses:
            invitation.is_active = False

        # 获取族谱名称用于审计日志
        family = db.session.get(Family, invitation.family_id)
        family_name = family.name if family else 'Unknown'

        create_audit_log(
            invitation.family_id, user_id, 'invite', 'family',
            entity_id=invitation.family_id,
            description=f'通过邀请码加入族谱: {family_name}'
        )
        db.session.commit()
        return jsonify({
            'message': f'成功加入族谱 {family_name}',
            'family_id': invitation.family_id,
            'role': invitation.role,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'加入族谱失败: {str(e)}'}), 500
