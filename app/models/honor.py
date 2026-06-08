"""荣誉/功德榜模型"""
from datetime import datetime
from app import db


class Honor(db.Model):
    __tablename__ = 'honors'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)  # 荣誉标题
    category = db.Column(db.String(30), nullable=False, default='other')
    # education / career / virtue / donation / other
    year = db.Column(db.Integer, nullable=True)  # 获荣誉年份
    description = db.Column(db.Text, nullable=True)  # 详细说明
    awarder = db.Column(db.String(200), nullable=True)  # 颁奖机构
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    member = db.relationship('Member', backref='honors', lazy='joined')

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'member_id': self.member_id,
            'member_name': self.member.name if self.member else None,
            'title': self.title,
            'category': self.category,
            'year': self.year,
            'description': self.description,
            'awarder': self.awarder,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
