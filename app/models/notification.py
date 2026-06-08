from datetime import datetime
from app import db


class Notification(db.Model):
    """通知模型"""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=True, index=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=True)
    type = db.Column(db.String(20), nullable=False, default='info')  # info, warning, success, comment, mention, memorial_reminder
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    related_post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=True, index=True)
    related_member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('notifications', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'family_id': self.family_id,
            'title': self.title,
            'content': self.content,
            'type': self.type,
            'is_read': self.is_read,
            'related_post_id': self.related_post_id,
            'related_member_id': self.related_member_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Notification {self.id}: {self.title}>'