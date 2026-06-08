from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User

notification_bp = Blueprint('notification', __name__)


def create_notification(user_id, family_id, title, content, type='info'):
    """创建通知的辅助函数"""
    from app.models.notification import Notification
    from app import db
    notif = Notification(
        user_id=user_id,
        family_id=family_id,
        title=title,
        content=content,
        type=type
    )
    db.session.add(notif)
    db.session.commit()
    return notif


@notification_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """获取当前用户通知"""
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(
        user_id=user_id
    ).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify({
        'notifications': [n.to_dict() for n in notifications]
    })


@notification_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """获取未读通知数量"""
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).count()
    return jsonify({'count': count})


@notification_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """标记通知为已读"""
    user_id = int(get_jwt_identity())
    notif = Notification.query.filter_by(
        id=notification_id,
        user_id=user_id
    ).first()
    if not notif:
        return jsonify({'error': '通知不存在'}), 404
    notif.is_read = True
    from app import db
    db.session.commit()
    return jsonify({'message': '已标记为已读'})


@notification_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """标记所有通知为已读"""
    user_id = int(get_jwt_identity())
    from app import db
    Notification.query.filter_by(
        user_id=user_id,
        is_read=False
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': '已标记全部为已读'})


# 在文件末尾添加导入和关系
from app.models.notification import Notification  # noqa: E402