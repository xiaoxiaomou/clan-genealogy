import secrets
from datetime import datetime
from app import db


class Invitation(db.Model):
    """邀请码模型"""
    __tablename__ = 'invitations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='viewer')
    max_uses = db.Column(db.Integer, nullable=False, default=0)  # 0 = unlimited
    use_count = db.Column(db.Integer, nullable=False, default=0)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def generate_code(self):
        """生成唯一的邀请码"""
        self.code = secrets.token_urlsafe(24)
        return self.code

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'code': self.code,
            'created_by': self.created_by,
            'role': self.role,
            'max_uses': self.max_uses,
            'use_count': self.use_count,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Invitation {self.code}>'
