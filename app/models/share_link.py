"""公开分享链接模型"""
from datetime import datetime
import secrets
from app import db


class FamilyShareLink(db.Model):
    __tablename__ = 'family_share_links'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    label = db.Column(db.String(120), nullable=True)  # 备注，如"给姑妈看的"
    password_hash = db.Column(db.String(256), nullable=True)  # 可选访问密码
    expires_at = db.Column(db.DateTime, nullable=True)  # 过期时间，None = 永不过期
    view_count = db.Column(db.Integer, default=0, nullable=False)
    last_viewed_at = db.Column(db.DateTime, nullable=True)
    last_viewer_ip = db.Column(db.String(64), nullable=True)
    revoked = db.Column(db.Boolean, default=False, nullable=False)  # 主动撤销
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 关系
    family = db.relationship('Family', backref=db.backref('share_links', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self, include_token=False):
        data = {
            'id': self.id,
            'family_id': self.family_id,
            'label': self.label,
            'has_password': bool(self.password_hash),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'view_count': self.view_count,
            'last_viewed_at': self.last_viewed_at.isoformat() if self.last_viewed_at else None,
            'revoked': self.revoked,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_token:
            data['token'] = self.token
            data['url'] = f'/share/{self.token}'
        return data

    def is_active(self):
        if self.revoked:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(24)

    def __repr__(self):
        return f'<FamilyShareLink family={self.family_id} token={self.token[:8]}...>'
