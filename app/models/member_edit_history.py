"""成员编辑版本历史模型

每次成员字段被修改时记录：
- family_id / member_id：所属
- editor_id：编辑者
- batch_id（可选）：同一编辑动作的多字段变更会共用一个 batch_id
- field_name：被修改的字段
- old_value / new_value：变更前后
- created_at：变更时间

回滚：调用 MemberEditHistory.rollback_to(batch_id) 会把该批次的新值写回旧值
"""
from datetime import datetime
from app import db


class MemberEditHistory(db.Model):
    __tablename__ = 'member_edit_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.id'), nullable=False, index=True)
    editor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    batch_id = db.Column(db.String(40), nullable=False, index=True)
    field_name = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    action = db.Column(db.String(20), nullable=False, default='update')  # update / rollback
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    # 关系
    editor = db.relationship('User', backref='member_edits')

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'member_id': self.member_id,
            'editor_id': self.editor_id,
            'editor_name': self.editor.display_name if self.editor else None,
            'batch_id': self.batch_id,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'action': self.action,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<MemberEditHistory {self.member_id} {self.field_name} {self.old_value!r}->{self.new_value!r}>'
