"""历史事实索引 API"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.historical_event import HistoricalEvent
from app.utils.decorators import family_permission_required
from app.utils.html_utils import sanitize_html

history_bp = Blueprint('history', __name__)


@history_bp.route('/<int:family_id>/history', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_history(family_id):
    events = (
        HistoricalEvent.query.filter_by(family_id=family_id)
        .order_by(HistoricalEvent.year.asc(), HistoricalEvent.month.asc(), HistoricalEvent.day.asc())
        .all()
    )
    return jsonify({'events': [e.to_dict() for e in events]})


@history_bp.route('/<int:family_id>/history', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_history(family_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': '标题不能为空'}), 400
    year = data.get('year')
    if not year or not isinstance(year, int):
        return jsonify({'error': '年份必填且为整数'}), 400
    try:
        e = HistoricalEvent(
            family_id=family_id,
            year=year,
            month=data.get('month'),
            day=data.get('day'),
            title=title,
            description=sanitize_html(data.get('description') or '', max_length=20000),
            category=data.get('category', 'event'),
            related_member_ids=json.dumps(data.get('related_member_ids', []), ensure_ascii=False) if data.get('related_member_ids') else None,
            source=data.get('source'),
            created_by=user_id,
        )
        db.session.add(e)
        db.session.commit()
        return jsonify({'message': '历史事件已添加', 'event': e.to_dict()}), 201
    except Exception as ex:
        db.session.rollback()
        return jsonify({'error': str(ex)}), 500


@history_bp.route('/<int:family_id>/history/<int:event_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_history(family_id, event_id):
    data = request.get_json(silent=True) or {}
    e = HistoricalEvent.query.filter_by(id=event_id, family_id=family_id).first()
    if not e:
        return jsonify({'error': '事件不存在'}), 404
    if 'title' in data:
        e.title = data['title'].strip() or e.title
    if 'year' in data:
        e.year = int(data['year'])
    if 'month' in data:
        e.month = data['month']
    if 'day' in data:
        e.day = data['day']
    if 'description' in data:
        e.description = sanitize_html(data['description'] or '', max_length=20000)
    if 'category' in data:
        e.category = data['category']
    if 'related_member_ids' in data:
        e.related_member_ids = json.dumps(data['related_member_ids'], ensure_ascii=False) if data['related_member_ids'] else None
    if 'source' in data:
        e.source = data['source']
    e.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已更新', 'event': e.to_dict()})


@history_bp.route('/<int:family_id>/history/<int:event_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def delete_history(family_id, event_id):
    e = HistoricalEvent.query.filter_by(id=event_id, family_id=family_id).first()
    if not e:
        return jsonify({'error': '事件不存在'}), 404
    db.session.delete(e)
    db.session.commit()
    return jsonify({'message': '已删除'})
