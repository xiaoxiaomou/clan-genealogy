from datetime import datetime
from app import db


class FamilyEvent(db.Model):
    """家族事件模型"""
    __tablename__ = 'family_events'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_date = db.Column(db.String(20), nullable=True)
    event_type = db.Column(db.String(50), nullable=False, default='other')  # birth, marriage, move, build, other
    location = db.Column(db.String(200), nullable=True)
    related_member_ids = db.Column(db.Text, nullable=True)  # JSON array of member IDs
    images = db.Column(db.Text, nullable=True)  # JSON array of image paths
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'family_id': self.family_id,
            'title': self.title,
            'description': self.description,
            'event_date': self.event_date,
            'event_type': self.event_type,
            'location': self.location,
            'related_member_ids': json.loads(self.related_member_ids) if self.related_member_ids else None,
            'images': json.loads(self.images) if self.images else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<FamilyEvent {self.title}>'
