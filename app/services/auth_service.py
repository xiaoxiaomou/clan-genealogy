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
    def get_users_with_families():
        """所有用户 + 各自的家族归属（用户管理页用）"""
        from app.models.family import Family, FamilyMember
        users = User.query.order_by(User.created_at.desc()).all()
        rows = (db.session.query(FamilyMember, Family.name)
                .join(Family, FamilyMember.family_id == Family.id)
                .order_by(FamilyMember.joined_at)
                .all())
        fam_map = {}
        for fm, fam_name in rows:
            fam_map.setdefault(fm.user_id, []).append({
                'family_id': fm.family_id,
                'family_name': fam_name,
                'role': fm.role,
            })
        result = []
        for u in users:
            d = u.to_dict()
            d['families'] = fam_map.get(u.id, [])
            result.append(d)
        return result

    @staticmethod
    def admin_create_user(username, email, password, display_name=None):
        """管理员直建账号：跳过注册审核，直接激活入册"""
        username = (username or '').strip()
        email = (email or '').strip().lower()
        display_name = (display_name or '').strip()
        if not username or len(username) > 50:
            return None, '用户名不能为空且不超过 50 字'
        if not email or len(email) > 120 or '@' not in email:
            return None, '邮箱格式不正确'
        if not password or len(password) < 6:
            return None, '密码至少 6 位'
        if User.query.filter_by(username=username).first():
            return None, '用户名已存在'
        if User.query.filter_by(email=email).first():
            return None, '邮箱已被注册'
        user = User(
            username=username,
            email=email,
            display_name=display_name or username,
            status='active',
            is_active=True,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        current_app.logger.info(f'管理员直建账号: {username}')
        return user, None

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
    def admin_reset_password(user_id, new_password):
        """管理员重置用户密码"""
        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        if len(new_password) < 6:
            return False, '新密码至少 6 位'
        user.set_password(new_password)
        db.session.commit()
        return True, None

    @staticmethod
    def delete_user(user_id):
        """删除用户：连带清理其聊天、帖子、通知与家族关联"""
        import json as _json
        from app.models.chat import ChatGroup, ChatMessage
        from app.models.post import Post, PostComment, PostLike
        from app.models.notification import Notification
        from app.models.family import FamilyMember

        user = db.session.get(User, user_id)
        if not user:
            return False, '用户不存在'
        if user.is_admin:
            admins = User.query.filter_by(is_admin=True).count()
            if admins <= 1:
                return False, '不能删除最后一个管理员账号'

        # 个人互动数据
        ChatMessage.query.filter_by(sender_id=user_id).delete()
        PostLike.query.filter_by(user_id=user_id).delete()
        PostComment.query.filter_by(author_id=user_id).delete()
        Post.query.filter_by(author_id=user_id).delete()
        Notification.query.filter_by(user_id=user_id).delete()
        FamilyMember.query.filter_by(user_id=user_id).delete()

        # 聊天群：本人创建的私聊群整组删除；其余群摘除其成员 id
        for g in ChatGroup.query.filter_by(created_by=user_id).all():
            if g.type == 'dm':
                ChatMessage.query.filter_by(group_id=g.id).delete()
                db.session.delete(g)
            else:
                try:
                    ids = _json.loads(g.member_ids or '[]')
                except Exception:
                    ids = []
                if user_id in ids:
                    ids.remove(user_id)
                    g.member_ids = _json.dumps(ids)
        for g in ChatGroup.query.all():
            try:
                ids = _json.loads(g.member_ids or '[]')
            except Exception:
                continue
            if user_id in ids:
                ids.remove(user_id)
                g.member_ids = _json.dumps(ids)

        # 头像文件
        if user.avatar:
            try:
                from flask import current_app
                delete_avatar_file(user.avatar, current_app.config['UPLOAD_FOLDER'])
            except Exception:
                pass

        db.session.delete(user)
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
