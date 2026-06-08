from datetime import datetime
from app import db


class GenerationRule(db.Model):
    """辈分字派模型"""
    __tablename__ = 'generation_rules'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    generation = db.Column(db.Integer, nullable=False)  # 第几代
    character = db.Column(db.String(10), nullable=False)  # 字派
    description = db.Column(db.String(200), nullable=True)  # 备注
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('family_id', 'generation', name='uq_family_generation'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'generation': self.generation,
            'character': self.character,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<GenerationRule {self.family_id} gen={self.generation} char={self.character}>'
