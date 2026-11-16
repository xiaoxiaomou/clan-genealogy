"""修谱待办清单 API"""
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.services.family_service import FamilyService
from app.utils.decorators import family_permission_required
from app.models.family_task import FamilyTask
from app.models.user import User

tasks_bp = Blueprint('tasks', __name__)


def _task_dicts(family_id):
    tasks = (FamilyTask.query
             .filter_by(family_id=family_id)
             .order_by(FamilyTask.status, FamilyTask.due_date.is_(None), FamilyTask.due_date,
                       FamilyTask.created_at.desc())
             .all())
    assignee_ids = {t.assignee_id for t in tasks if t.assignee_id}
    users = User.query.filter(User.id.in_(assignee_ids)).all() if assignee_ids else []
    names = {u.id: (u.display_name or u.username) for u in users}
    return [t.to_dict(names) for t in tasks]


@tasks_bp.route('/<int:family_id>/tasks', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_tasks(family_id):
    """待办清单（未完成在前）"""
    return jsonify({'tasks': _task_dicts(family_id)})


@tasks_bp.route('/<int:family_id>/tasks', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_task(family_id):
    """新建待办"""
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': '待办标题不能为空'}), 400
    me = int(get_jwt_identity())

    assignee_id = data.get('assignee_id')
    if assignee_id:
        try:
            assignee_id = int(assignee_id)
        except (TypeError, ValueError):
            assignee_id = None

    due = None
    if data.get('due_date'):
        try:
            due = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': '截止日期格式应为 YYYY-MM-DD'}), 400

    task = FamilyTask(
        family_id=family_id,
        title=title[:200],
        detail=(data.get('detail') or '').strip() or None,
        assignee_id=assignee_id,
        due_date=due,
        created_by=me,
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({'message': '待办已创建', 'task': task.to_dict()}), 201


@tasks_bp.route('/<int:family_id>/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('viewer')
def update_task(family_id, task_id):
    """更新待办（勾选完成 / 改指派 / 改标题）——任何家族成员可勾选"""
    task = FamilyTask.query.filter_by(id=task_id, family_id=family_id).first()
    if not task:
        return jsonify({'error': '待办不存在'}), 404

    data = request.get_json() or {}
    if 'status' in data:
        status = data['status']
        if status not in ('open', 'done'):
            return jsonify({'error': '状态不合法'}), 400
        task.status = status
        task.done_at = datetime.utcnow() if status == 'done' else None
    if 'assignee_id' in data:
        v = data['assignee_id']
        task.assignee_id = int(v) if v else None
    if 'title' in data and (data['title'] or '').strip():
        task.title = data['title'].strip()[:200]
    if 'detail' in data:
        task.detail = (data['detail'] or '').strip() or None
    if 'due_date' in data:
        try:
            task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data['due_date'] else None
        except ValueError:
            return jsonify({'error': '截止日期格式应为 YYYY-MM-DD'}), 400
    db.session.commit()
    return jsonify({'message': '待办已更新', 'task': task.to_dict()})


@tasks_bp.route('/<int:family_id>/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def delete_task(family_id, task_id):
    """删除待办（家族管理角色）"""
    task = FamilyTask.query.filter_by(id=task_id, family_id=family_id).first()
    if not task:
        return jsonify({'error': '待办不存在'}), 404
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': '待办已删除'})
