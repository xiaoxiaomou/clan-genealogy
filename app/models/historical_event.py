"""历史事实模型：与家族成员同代发生的国内外大事，可关联成员

区别于 FamilyEvent（家族私人事件），HistoricalEvent 是公开历史时间线
"""
from datetime import datetime
from app import db


class HistoricalEvent(db.Model):
    __tablename__ = 'historical_events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False)  # 公元年
    month = db.Column(db.Integer, nullable=True)
    day = db.Column(db.Integer, nullable=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False, default='event')
    # category: politics / military / culture / disaster / event
    related_member_ids = db.Column(db.Text, nullable=True)  # JSON
    source = db.Column(db.String(200), nullable=True)  # 资料来源
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'family_id': self.family_id,
            'year': self.year,
            'month': self.month,
            'day': self.day,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'related_member_ids': json.loads(self.related_member_ids) if self.related_member_ids else [],
            'source': self.source,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
