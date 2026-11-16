from datetime import datetime
from app import db


class MemorialRitual(db.Model):
    """线上祭拜记录（献花/点烛/上香/叩首）"""
    __tablename__ = 'memorial_rituals'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False)  # flower / candle / incense / kowtow
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self, user_name=None):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'user_id': self.user_id,
            'user_name': user_name,
            'kind': self.kind,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MemorialMessage(db.Model):
    """追思留言"""
    __tablename__ = 'memorial_messages'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self, user_name=None):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'user_id': self.user_id,
            'user_name': user_name,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
