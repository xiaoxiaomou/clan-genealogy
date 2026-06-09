from datetime import datetime
from app import db


class MemberMigration(db.Model):
    """家族成员迁徙记录"""
    __tablename__ = 'member_migrations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    from_place = db.Column(db.String(200), nullable=True)
    to_place = db.Column(db.String(200), nullable=False)
    year = db.Column(db.String(20), nullable=True)
    reason = db.Column(db.String(200), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    member = db.relationship('Member', backref=db.backref('migrations', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'from_place': self.from_place,
            'to_place': self.to_place,
            'year': self.year,
            'reason': self.reason,
            'notes': self.notes,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MemberBurial(db.Model):
    """家族成员葬地信息"""
    __tablename__ = 'member_burials'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    burial_place = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    orientation = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    member = db.relationship('Member', backref=db.backref('burials', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'burial_place': self.burial_place,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'orientation': self.orientation,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MarriedOutDaughter(db.Model):
    """出嫁女信息"""
    __tablename__ = 'married_out_daughters'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    married_to_name = db.Column(db.String(100), nullable=False)
    married_to_place = db.Column(db.String(200), nullable=True)
    married_year = db.Column(db.String(20), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    member = db.relationship('Member', backref=db.backref('married_out_info', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'member_id': self.member_id,
            'married_to_name': self.married_to_name,
            'married_to_place': self.married_to_place,
            'married_year': self.married_year,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
