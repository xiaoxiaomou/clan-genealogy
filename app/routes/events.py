import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.event import FamilyEvent
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required, admin_required

events_bp = Blueprint('events', __name__)


def create_audit_log(family_id, user_id, action, entity_type, entity_id=None, description=None, ip_address=None):
    """创建审计日志条目"""
    log = AuditLog(
        family_id=family_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address or request.remote_addr,
    )
    db.session.add(log)


@events_bp.route('/<int:family_id>/events', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_events(family_id):
    """获取家族所有事件，按事件日期降序排列"""
    try:
        events = FamilyEvent.query.filter_by(family_id=family_id)\
            .order_by(FamilyEvent.event_date.desc(), FamilyEvent.created_at.desc())\
            .all()
        return jsonify({
            'events': [e.to_dict() for e in events]
        })
    except Exception as e:
        return jsonify({'error': f'获取事件列表失败: {str(e)}'}), 500


@events_bp.route('/<int:family_id>/events', methods=['POST'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def create_event(family_id):
    """创建家族事件"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': '事件标题不能为空'}), 400

    try:
        event = FamilyEvent(
            family_id=family_id,
            title=title,
            description=data.get('description'),
            event_date=data.get('event_date'),
            event_type=data.get('event_type', 'other'),
            location=data.get('location'),
            related_member_ids=json.dumps(data.get('related_member_ids', []), ensure_ascii=False) if data.get('related_member_ids') else None,
            images=json.dumps(data.get('images', []), ensure_ascii=False) if data.get('images') else None,
            created_by=user_id,
        )
        db.session.add(event)
        create_audit_log(
            family_id, user_id, 'create', 'event',
            entity_id=event.id, description=f'创建事件: {title}'
        )
        db.session.commit()
        return jsonify({
            'message': '事件创建成功',
            'event': event.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建事件失败: {str(e)}'}), 500


@events_bp.route('/<int:family_id>/events/<int:event_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_event(family_id, event_id):
    """获取事件详情"""
    try:
        event = FamilyEvent.query.filter_by(id=event_id, family_id=family_id).first()
        if not event:
            return jsonify({'error': '事件不存在'}), 404
        return jsonify({'event': event.to_dict()})
    except Exception as e:
        return jsonify({'error': f'获取事件详情失败: {str(e)}'}), 500


@events_bp.route('/<int:family_id>/events/<int:event_id>', methods=['PUT'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def update_event(family_id, event_id):
    """更新事件"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    try:
        event = FamilyEvent.query.filter_by(id=event_id, family_id=family_id).first()
        if not event:
            return jsonify({'error': '事件不存在'}), 404

        if 'title' in data:
            title = data['title'].strip()
            if not title:
                return jsonify({'error': '事件标题不能为空'}), 400
            event.title = title
        if 'description' in data:
            event.description = data['description']
        if 'event_date' in data:
            event.event_date = data['event_date']
        if 'event_type' in data:
            event.event_type = data['event_type']
        if 'location' in data:
            event.location = data['location']
        if 'related_member_ids' in data:
            event.related_member_ids = json.dumps(data['related_member_ids'], ensure_ascii=False) if data['related_member_ids'] else None
        if 'images' in data:
            event.images = json.dumps(data['images'], ensure_ascii=False) if data['images'] else None

        event.updated_at = datetime.utcnow()
        create_audit_log(
            family_id, user_id, 'update', 'event',
            entity_id=event.id, description=f'更新事件: {event.title}'
        )
        db.session.commit()
        return jsonify({
            'message': '事件更新成功',
            'event': event.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新事件失败: {str(e)}'}), 500


@events_bp.route('/<int:family_id>/events/<int:event_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@family_permission_required('admin')
def delete_event(family_id, event_id):
    """删除事件"""
    user_id = int(get_jwt_identity())
    try:
        event = FamilyEvent.query.filter_by(id=event_id, family_id=family_id).first()
        if not event:
            return jsonify({'error': '事件不存在'}), 404

        title = event.title
        db.session.delete(event)
        create_audit_log(
            family_id, user_id, 'delete', 'event',
            entity_id=event_id, description=f'删除事件: {title}'
        )
        db.session.commit()
        return jsonify({'message': '事件删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除事件失败: {str(e)}'}), 500


@events_bp.route('/<int:family_id>/events/upload-image', methods=['POST'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def upload_event_image(family_id):
    """上传事件图片"""
    from flask import current_app
    import os
    import uuid

    if 'file' not in request.files:
        return jsonify({'error': '没有文件'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400

    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_extensions:
        return jsonify({'error': '不支持的图片格式'}), 400

    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    events_folder = os.path.join(upload_folder, 'events')
    os.makedirs(events_folder, exist_ok=True)

    filepath = os.path.join(events_folder, filename)
    file.save(filepath)

    url = f"/static/images/events/{filename}"
    return jsonify({'message': '上传成功', 'url': url})
