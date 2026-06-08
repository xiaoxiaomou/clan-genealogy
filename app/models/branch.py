from datetime import datetime
from app import db


class FamilyBranch(db.Model):
    """家族分支模型"""
    __tablename__ = 'family_branches'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    founder_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=True)
    parent_branch_id = db.Column(db.Integer, db.ForeignKey('family_branches.id'), nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    member_count = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 自引用关系
    children = db.relationship(
        'FamilyBranch',
        backref=db.backref('parent', remote_side=[id]),
        lazy='dynamic'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'name': self.name,
            'description': self.description,
            'founder_id': self.founder_id,
            'parent_branch_id': self.parent_branch_id,
            'sort_order': self.sort_order,
            'member_count': self.member_count,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<FamilyBranch {self.name}>'
