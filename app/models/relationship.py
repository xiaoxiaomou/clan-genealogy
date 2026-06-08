from datetime import datetime
from app import db


class Relationship(db.Model):
    """家族成员关系模型"""
    __tablename__ = 'relationships'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    related_member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    relationship_type = db.Column(db.String(20), nullable=False)  # parent, spouse, sibling
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('member_id', 'related_member_id', 'relationship_type',
                          name='uq_member_relationship'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'related_member_id': self.related_member_id,
            'relationship_type': self.relationship_type,
            'member_name': self.member.name if self.member else None,
            'related_member_name': self.related_member.name if self.related_member else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<Relationship {self.member_id}-{self.relationship_type}->{self.related_member_id}>'
