from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required
from sqlalchemy import func

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/<int:family_id>/audit-logs', methods=['GET'])
@jwt_required()
@family_permission_required('admin')
def list_audit_logs(family_id):
    """获取审计日志（分页，按时间降序）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # 限制 per_page 范围
    per_page = max(1, min(per_page, 100))
    page = max(1, page)

    try:
        query = AuditLog.query.filter_by(family_id=family_id)\
            .order_by(AuditLog.created_at.desc())

        total = query.count()
        logs = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            'audit_logs': [log.to_dict() for log in logs],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page if total > 0 else 1,
            }
        })
    except Exception as e:
        return jsonify({'error': f'获取审计日志失败: {str(e)}'}), 500


@audit_bp.route('/<int:family_id>/audit-logs/stats', methods=['GET'])
@jwt_required()
@family_permission_required('admin')
def audit_log_stats(family_id):
    """获取审计日志统计：按操作类型分组 + 近30天每日数量"""
    try:
        # 1. 按 action 类型统计
        action_counts = db.session.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.family_id == family_id
        ).group_by(AuditLog.action).order_by(func.count(AuditLog.id).desc()).all()

        # 2. 按 entity_type 统计
        entity_counts = db.session.query(
            AuditLog.entity_type,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.family_id == family_id
        ).group_by(AuditLog.entity_type).order_by(func.count(AuditLog.id).desc()).all()

        # 3. 近30天每日统计
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        daily_counts = db.session.query(
            func.date(AuditLog.created_at).label('date'),
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.family_id == family_id,
            AuditLog.created_at >= thirty_days_ago
        ).group_by(func.date(AuditLog.created_at))\
         .order_by(func.date(AuditLog.created_at).desc()).all()

        # 4. 总日志数
        total_count = AuditLog.query.filter_by(family_id=family_id).count()

        return jsonify({
            'total_logs': total_count,
            'by_action': {
                row.action: row.count for row in action_counts
            },
            'by_entity_type': {
                row.entity_type: row.count for row in entity_counts
            },
            'daily_counts_last_30_days': [
                {
                    'date': row.date,
                    'count': row.count
                }
                for row in daily_counts
            ],
        })
    except Exception as e:
        return jsonify({'error': f'获取审计日志统计失败: {str(e)}'}), 500
