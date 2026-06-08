from app import db
from datetime import datetime


class FamilyArticle(db.Model):
    __tablename__ = 'family_articles'

    id = db.Column(db.Integer, primary_key=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    summary = db.Column(db.String(500), nullable=True)
    type = db.Column(db.String(20), nullable=False, default='story')
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_published = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    family = db.relationship('Family', backref=db.backref('articles', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'type': self.type,
            'sort_order': self.sort_order,
            'is_published': self.is_published,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
