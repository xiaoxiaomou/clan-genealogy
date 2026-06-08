"""祭日提醒 API - 列出未来祭日 + 手动触发测试"""
from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required
from app.services.memorial_reminder import get_upcoming_memorials, check_and_send_reminders
from app.utils.decorators import family_permission_required

memorial_reminder_bp = Blueprint('memorial_reminder', __name__)


@memorial_reminder_bp.route('/<int:family_id>/memorial-reminders', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_upcoming(family_id):
    """查询本家族未来 N 天内的祭日"""
    try:
        days = int(request.args.get('days', 90))
    except (TypeError, ValueError):
        days = 90
    days = max(1, min(365, days))
    items = get_upcoming_memorials(days_ahead=days)
    items = [i for i in items if i['family_id'] == family_id]
    return jsonify({
        'days_ahead': days,
        'total': len(items),
        'items': items,
    })


@memorial_reminder_bp.route('/memorial-reminders/run', methods=['POST'])
@jwt_required()
def trigger_manual_check():
    """手动触发一次祭日检查（admin 调试用）"""
    from app.models.user import User
    from flask_jwt_extended import get_jwt_identity
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user or not user.is_admin:
        return jsonify({'error': '需要管理员权限'}), 403
    check_and_send_reminders(30)
    check_and_send_reminders(7)
    check_and_send_reminders(0)
    return jsonify({'message': '已执行祭日检查'})
