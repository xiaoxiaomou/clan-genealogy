from datetime import datetime
from app import db


class FamilyActivity(db.Model):
    """家族活动（祭祖 / 颁谱 / 聚会等）"""
    __tablename__ = 'family_activities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(20), nullable=False, default='聚会')  # 祭祖 / 颁谱 / 聚会 / 其他
    activity_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    rsvps = db.relationship('ActivityRsvp', backref='activity',
                            cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self, current_user_id=None):
        from app.models.user import User
        rsvp_list = []
        for r in self.rsvps.order_by(ActivityRsvp.created_at):
            d = r.to_dict()
            u = db.session.get(User, r.user_id)
            d['user_name'] = (u.display_name or u.username) if u else f'#{r.user_id}'
            rsvp_list.append(d)
        my = next((r for r in rsvp_list if r['user_id'] == current_user_id), None)
        joining = sum(1 for r in rsvp_list if r['status'] == 'join')
        return {
            'id': self.id,
            'title': self.title,
            'type': self.type,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'location': self.location,
            'description': self.description,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'rsvps': rsvp_list,
            'joining_count': joining,
            'my_rsvp': my,
        }


class ActivityRsvp(db.Model):
    """活动报名（接龙）"""
    __tablename__ = 'activity_rsvps'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('family_activities.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    status = db.Column(db.String(10), nullable=False, default='join')  # join / maybe / no
    guests = db.Column(db.Integer, nullable=False, default=0)  # 携带人数
    note = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('activity_id', 'user_id', name='uq_activity_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'status': self.status,
            'guests': self.guests,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
