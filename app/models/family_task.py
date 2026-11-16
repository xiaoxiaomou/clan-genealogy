from datetime import datetime
from app import db


class FamilyTask(db.Model):
    """修谱待办（家族级任务：资料补齐、校对、联络等）"""
    __tablename__ = 'family_tasks'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    detail = db.Column(db.Text, nullable=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    status = db.Column(db.String(10), nullable=False, default='open')  # open / done
    due_date = db.Column(db.Date, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    done_at = db.Column(db.DateTime, nullable=True)

    assignee = db.relationship('User', foreign_keys=[assignee_id])

    def to_dict(self, user_name_map=None):
        names = user_name_map or {}
        return {
            'id': self.id,
            'title': self.title,
            'detail': self.detail,
            'assignee_id': self.assignee_id,
            'assignee_name': names.get(self.assignee_id),
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'done_at': self.done_at.isoformat() if self.done_at else None,
        }
