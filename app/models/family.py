from datetime import datetime
from app import db


class Family(db.Model):
    """族谱模型"""
    __tablename__ = 'families'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    surname = db.Column(db.String(50), nullable=True)  # 姓氏
    origin = db.Column(db.String(200), nullable=True)   # 籍贯/发源地
    origin_lat = db.Column(db.Float, nullable=True)     # 发源地纬度
    origin_lng = db.Column(db.Float, nullable=True)     # 发源地经度
    intro = db.Column(db.Text, nullable=True)            # 家族简介
    motto = db.Column(db.String(300), nullable=True)     # 家训/族训
    zibei_text = db.Column(db.Text, nullable=True)       # 字辈诗原文，例如"德建伟业..."
    zibei_start_generation = db.Column(db.Integer, nullable=True, default=1)  # 字辈诗起始世代
    zibei_assignment = db.Column(db.String(20), nullable=True, default='sequential')
    # sequential: 第 N 字给第 N 代（无起点偏移）
    # generation_based: 用 zibei_start_generation 决定起点
    zibei_description = db.Column(db.Text, nullable=True)  # 字辈释义
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False, nullable=False)
    merged_into_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 关系
    creator = db.relationship('User', backref=db.backref('created_families', lazy='dynamic'))
    members = db.relationship('Member', backref='family', lazy='dynamic', cascade='all, delete-orphan')
    family_members = db.relationship('FamilyMember', backref='family', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'surname': self.surname,
            'origin': self.origin,
            'origin_lat': self.origin_lat,
            'origin_lng': self.origin_lng,
            'creator_id': self.creator_id,
            'is_public': self.is_public,
            'merged_into_id': self.merged_into_id,
            'intro': self.intro,
            'motto': self.motto,
            'zibei_text': self.zibei_text,
            'zibei_start_generation': self.zibei_start_generation,
            'zibei_assignment': self.zibei_assignment,
            'zibei_description': self.zibei_description,
            'member_count': self.members.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Family {self.name}>'


class FamilyMember(db.Model):
    """族谱-用户关联模型（权限管理）"""
    __tablename__ = 'family_members'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='viewer')  # owner, admin, editor, viewer
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('family_id', 'user_id', name='uq_family_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'user_id': self.user_id,
            'role': self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
        }

    def __repr__(self):
        return f'<FamilyMember family={self.family_id} user={self.user_id} role={self.role}>'
