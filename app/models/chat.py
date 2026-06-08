"""家族聊天：群组（family/dm）+ 消息"""
from datetime import datetime
from app import db


class ChatGroup(db.Model):
    __tablename__ = 'chat_groups'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False)
    type = db.Column(db.String(20), nullable=False, default='family')
    # family: 全员群 / dm: 私聊 / custom: 自定义群
    member_ids = db.Column(db.Text, nullable=False)  # JSON 数组
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_message_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'family_id': self.family_id,
            'name': self.name,
            'type': self.type,
            'member_ids': json.loads(self.member_ids) if self.member_ids else [],
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('chat_groups.id'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    sender = db.relationship('User', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'group_id': self.group_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.display_name or self.sender.username if self.sender else None,
            'sender_avatar': self.sender.avatar if self.sender else None,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
