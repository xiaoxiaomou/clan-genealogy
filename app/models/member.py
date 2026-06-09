from datetime import datetime
from app import db


class Member(db.Model):
    """家族成员模型"""
    __tablename__ = 'members'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(50), nullable=False)
    gender = db.Column(db.String(10), nullable=False, default='unknown')  # male, female, unknown
    birth_date = db.Column(db.String(20), nullable=True)
    death_date = db.Column(db.String(20), nullable=True)
    birth_place = db.Column(db.String(200), nullable=True)
    birth_place_lat = db.Column(db.Float, nullable=True)
    birth_place_lng = db.Column(db.Float, nullable=True)
    death_place = db.Column(db.String(200), nullable=True)
    death_place_lat = db.Column(db.Float, nullable=True)
    death_place_lng = db.Column(db.Float, nullable=True)
    generation = db.Column(db.Integer, nullable=True)  # 第几代/辈分
    generation_name = db.Column(db.String(50), nullable=True)  # 辈分名称
    bio = db.Column(db.Text, nullable=True)  # 简介
    avatar = db.Column(db.String(256), nullable=True)  # 头像路径
    is_alive = db.Column(db.Boolean, default=True, nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('family_branches.id'), nullable=True, index=True)  # 所属房支
    courtesy_name = db.Column(db.String(50), nullable=True)  # 字
    art_name = db.Column(db.String(100), nullable=True)  # 号
    posthumous_name = db.Column(db.String(100), nullable=True)  # 谥
    privacy_level = db.Column(db.String(20), nullable=False, default='public')  # public, family, private
    privacy_override = db.Column(db.Boolean, nullable=False, default=False)  # 手动覆盖活人保护
    sort_order = db.Column(db.Integer, nullable=False, default=0)  # 兄弟节点排序（同一父节点下的顺序）
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 关系
    parent_relationships = db.relationship(
        'Relationship',
        foreign_keys='Relationship.related_member_id',
        backref=db.backref('related_member', lazy='joined'),
        lazy='dynamic'
    )
    child_relationships = db.relationship(
        'Relationship',
        foreign_keys='Relationship.member_id',
        backref=db.backref('member', lazy='joined'),
        lazy='dynamic'
    )

    def to_dict(self, include_relations=False):
        # 延迟导入避免循环引用
        from app.models.relationship import Relationship

        data = {
            'id': self.id,
            'family_id': self.family_id,
            'name': self.name,
            'gender': self.gender,
            'birth_date': self.birth_date,
            'death_date': self.death_date,
            'birth_place': self.birth_place,
            'birth_place_lat': self.birth_place_lat,
            'birth_place_lng': self.birth_place_lng,
            'death_place': self.death_place,
            'death_place_lat': self.death_place_lat,
            'death_place_lng': self.death_place_lng,
            'generation': self.generation,
            'generation_name': self.generation_name,
            'bio': self.bio,
            'avatar': self.avatar,
            'is_alive': self.is_alive,
            'branch_id': self.branch_id,
            'courtesy_name': self.courtesy_name,
            'art_name': self.art_name,
            'posthumous_name': self.posthumous_name,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_relations:
            data['parents'] = [
                r.member.to_dict() for r in self.parent_relationships.filter_by(
                    relationship_type='parent'
                ).all()
            ]
            data['spouses'] = [
                r.related_member.to_dict() for r in Relationship.query.filter(
                    db.or_(
                        db.and_(Relationship.member_id == self.id, Relationship.relationship_type == 'spouse'),
                        db.and_(Relationship.related_member_id == self.id, Relationship.relationship_type == 'spouse')
                    )
                ).all()
            ]
        return data

    def __repr__(self):
        return f'<Member {self.name}>'