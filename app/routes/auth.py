from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from app import db
from app.services.auth_service import AuthService
from app.models.user import User
from app.utils.decorators import admin_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    display_name = data.get('display_name', '').strip()

    if not username or not email or not password:
        return jsonify({'error': '用户名、邮箱和密码不能为空'}), 400

    if len(username) < 3 or len(username) > 50:
        return jsonify({'error': '用户名长度需要在3-50之间'}), 400

    if len(password) < 6:
        return jsonify({'error': '密码长度不能少于6位'}), 400

    user, error = AuthService.register(username, email, password, display_name)
    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'message': '注册成功，请等待管理员审核',
        'user': user.to_dict(),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400

    user, error = AuthService.login(username, password)
    if error:
        return jsonify({'error': error}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        'message': '登录成功',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """刷新令牌"""
    user_id = int(get_jwt_identity())
    access_token = create_access_token(identity=str(user_id))
    return jsonify({'access_token': access_token})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """获取当前用户信息"""
    user_id = int(get_jwt_identity())
    user = AuthService.get_user(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """更新用户信息"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    user, error = AuthService.update_user(user_id, **data)
    if error:
        return jsonify({'error': error}), 400

    return jsonify({'message': '更新成功', 'user': user.to_dict()})


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """修改密码"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return jsonify({'error': '原密码和新密码不能为空'}), 400

    success, error = AuthService.change_password(user_id, old_password, new_password)
    if error:
        return jsonify({'error': error}), 400

    return jsonify({'message': '密码修改成功'})


# ==================== 管理员审核用户 ====================

@auth_bp.route('/admin/users/pending', methods=['GET'])
@admin_required
def get_pending_users():
    """获取待审核用户列表"""
    users = AuthService.get_pending_users()
    return jsonify({
        'users': [u.to_dict() for u in users]
    })


@auth_bp.route('/admin/users/<int:user_id>/approve', methods=['PUT'])
@admin_required
def approve_user(user_id):
    """审核通过用户"""
    success, error = AuthService.approve_user(user_id)
    if not success:
        return jsonify({'error': error}), 400
    return jsonify({'message': '用户审核通过'})


@auth_bp.route('/admin/users/<int:user_id>/reject', methods=['PUT'])
@admin_required
def reject_user(user_id):
    """拒绝用户注册"""
    success, error = AuthService.reject_user(user_id)
    if not success:
        return jsonify({'error': error}), 400
    return jsonify({'message': '用户已拒绝'})


@auth_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_all_users():
    """获取所有用户列表"""
    users = AuthService.get_all_users()
    return jsonify({
        'users': [u.to_dict() for u in users]
    })


@auth_bp.route('/admin/users/<int:user_id>/disable', methods=['PUT'])
@admin_required
def disable_user(user_id):
    """禁用用户"""
    success, error = AuthService.disable_user(user_id)
    if not success:
        return jsonify({'error': error}), 400
    return jsonify({'message': '用户已禁用'})


@auth_bp.route('/admin/users/<int:user_id>/enable', methods=['PUT'])
@admin_required
def enable_user(user_id):
    """启用用户"""
    success, error = AuthService.enable_user(user_id)
    if not success:
        return jsonify({'error': error}), 400
    return jsonify({'message': '用户已启用'})
