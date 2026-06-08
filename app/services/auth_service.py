from flask import current_app
from app import db
from app.models.user import User
from app.utils.image_utils import delete_avatar_file


class AuthService:
    """用户认证服务"""

    @staticmethod
    def register(username, email, password, display_name=None):
        """用户注册（默认待审核，首个用户自动成为管理员并激活）"""
        if User.query.filter_by(username=username).first():
            return None, '用户名已存在'
        if User.query.filter_by(email=email).first():
            return None, '邮箱已被注册'

        # 检查是否为首个用户
        is_first_user = User.query.count() == 0

        user = User(
            username=username,
            email=email,
            display_name=display_name or username,
            status='active' if is_first_user else 'pending',
            is_admin=is_first_user
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        current_app.logger.info(f'新用户注册: {username}, 是否首个用户: {is_first_user}')

        # 通知管理员有新用户注册
        if not is_first_user:
            try:
                from app.models.notification import Notification
                admins = User.query.filter_by(is_admin=True).all()
                for admin in admins:
                    notif = Notification(
                        user_id=admin.id,
                        title='新用户注册',
                        content=f'用户 "{user.display_name or user.username}" 已注册，等待审核',
                        type='info',
                    )
                    db.session.add(notif)
                db.session.commit()
                current_app.logger.info(f'已通知 {len(admins)} 位管理员审核用户 {username}')
            except Exception as e:
                current_app.logger.error(f'通知管理员失败: {e}')
                db.session.rollback()

        return user, None

    @staticmethod
    def login(username, password):
        """用户登录"""
        user = User.query.filter(
            db.or_(User.username == username, User.email == username)
        ).first()

        if not user or not user.check_password(password):
            current_app.logger.warning(f'登录失败: {username} - 用户名或密码错误')
            return None, '用户名或密码错误'
        if not user.is_active:
            current_app.logger.warning(f'登录失败: {username} - 账户已禁用')
            return None, '账户已被禁用'
        if user.status == 'pending':
            current_app.logger.warning(f'登录失败: {username} - 账户待审核')
            return None, '账户待审核，请联系管理员'
        if user.status == 'rejected':
            current_app.logger.warning(f'登录失败: {username} - 账户审核未通过')
            return None, '账户审核未通过'

        current_app.logger.info(f'用户登录成功: {username}')
        return user, None

    @staticmethod
    def get_user(user_id):
        """获取用户信息"""
        return db.session.get(User, user_id)

    @staticmethod
    def update_user(user_id, **kwargs):
        """更新用户信息"""
        user = db.session.get(User, user_id)
        if not user:
            return None, '用户不存在'

        # 如果更新头像，先清理旧文件
        if 'avatar' in kwargs and kwargs['avatar'] != user.avatar:
            from flask import current_app
            if user.avatar:
                delete_avatar_file(user.avatar, current_app.config['UPLOAD_FOLDER'])

        allowed_fields = ['display_name', 'avatar', 'relationship_to_creator', 'location', 'linked_member_id']
        for field in allowed_fields:
            if field in kwargs:
                setattr(user, field, kwargs[field])

        db.session.commit()
        return user, None

    @staticmethod
    def change_password(user_id, old_password, new_password):
        """修改密码"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        if not user.check_password(old_password):
            return False, '原密码错误'

        user.set_password(new_password)
        db.session.commit()
        return True, None

    @staticmethod
    def get_pending_users():
        """获取待审核用户列表"""
        return User.query.filter_by(status='pending').order_by(User.created_at.desc()).all()

    @staticmethod
    def get_all_users():
        """获取所有用户列表"""
        return User.query.order_by(User.created_at.desc()).all()

    @staticmethod
    def approve_user(user_id):
        """审核通过用户"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        if user.status != 'pending':
            return False, '该用户不处于待审核状态'
        user.status = 'active'
        db.session.commit()
        current_app.logger.info(f'用户审核通过: {user.username} (ID: {user_id})')
        return True, None

    @staticmethod
    def reject_user(user_id):
        """拒绝用户注册"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        if user.status != 'pending':
            return False, '该用户不处于待审核状态'
        user.status = 'rejected'
        db.session.commit()
        current_app.logger.info(f'用户审核拒绝: {user.username} (ID: {user_id})')
        return True, None

    @staticmethod
    def disable_user(user_id):
        """禁用用户"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        user.is_active = False
        db.session.commit()
        return True, None

    @staticmethod
    def enable_user(user_id):
        """启用用户"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        user.is_active = True
        db.session.commit()
        return True, None
