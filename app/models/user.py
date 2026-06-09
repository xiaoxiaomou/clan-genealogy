from datetime import datetime
import secrets
from app import db


class User(db.Model):
    """用户模型"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(80), nullable=True)
    avatar = db.Column(db.String(256), nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 密码重置
    reset_token = db.Column(db.String(128), nullable=True, index=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    # 增强字段
    relationship_to_creator = db.Column(db.String(50), nullable=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('family_branches.id'), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    linked_member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=True, index=True)

    # 关系
    families = db.relationship('FamilyMember', backref='user', lazy='dynamic')
    branch = db.relationship('FamilyBranch', backref='users', lazy='select')

    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)

    def generate_reset_token(self, expires_minutes=30):
        """生成密码重置 token"""
        from datetime import timedelta
        self.reset_token = secrets.token_urlsafe(48)
        self.reset_token_expires = datetime.utcnow() + timedelta(minutes=expires_minutes)
        return self.reset_token

    def verify_reset_token(self, token):
        """验证重置 token 是否有效"""
        if not self.reset_token or self.reset_token != token:
            return False
        if not self.reset_token_expires or self.reset_token_expires < datetime.utcnow():
            return False
        return True

    def clear_reset_token(self):
        """清除重置 token"""
        self.reset_token = None
        self.reset_token_expires = None

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'display_name': self.display_name,
            'avatar': self.avatar,
            'is_admin': self.is_admin,
            'is_active': self.is_active,
            'status': self.status,
            'relationship_to_creator': self.relationship_to_creator,
            'branch_id': self.branch_id,
            'location': self.location,
            'linked_member_id': self.linked_member_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<User {self.username}>'
