from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import db
from app.models.user import User


def login_required(fn):
    """登录验证装饰器"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return jsonify({'error': '用户不存在或已被禁用'}), 401
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    """管理员权限检查装饰器"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user or not user.is_admin:
            return jsonify({'error': '需要管理员权限'}), 403
        return fn(*args, **kwargs)
    return wrapper


def family_permission_required(min_role='viewer'):
    """族谱权限验证装饰器"""
    role_hierarchy = {'owner': 4, 'admin': 3, 'editor': 2, 'viewer': 1}

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from flask import request
            family_id = kwargs.get('family_id') or request.view_args.get('family_id')

            if not family_id:
                return jsonify({'error': '缺少族谱ID'}), 400

            # 尝试解析 JWT，如果没有则视为访客
            try:
                verify_jwt_in_request(optional=True)
                user_id = int(get_jwt_identity())
            except:
                user_id = None

            # 检查族谱是否公开
            from app.models.family import Family
            family = db.session.get(Family, family_id)
            if family and family.is_public:
                # 公开族谱，viewer 角色可以访问
                if min_role == 'viewer':
                    return fn(*args, **kwargs)

            # 如果没有 JWT，返回权限错误
            if not user_id:
                return jsonify({'error': '无权访问该族谱'}), 403

            # 管理员自动通过权限检查
            user = db.session.get(User, user_id)
            if user and user.is_admin:
                return fn(*args, **kwargs)

            from app.models.family import FamilyMember
            fm = FamilyMember.query.filter_by(
                family_id=family_id,
                user_id=user_id
            ).first()

            if not fm:
                return jsonify({'error': '无权访问该族谱'}), 403

            if role_hierarchy.get(fm.role, 0) < role_hierarchy.get(min_role, 0):
                return jsonify({'error': '权限不足'}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
