"""
系统配置管理 API 路由
提供管理员配置管理接口
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.config_service import ConfigService
from app.utils.decorators import admin_required
from app.models.audit_log import AuditLog

config_bp = Blueprint('config', __name__)


@config_bp.route('/admin/config', methods=['GET'])
@jwt_required()
@admin_required
def get_all_configs():
    """获取所有配置项"""
    configs = ConfigService.get_all_configs()
    return jsonify({'configs': configs})


@config_bp.route('/admin/config/category/<string:category>', methods=['GET'])
@jwt_required()
@admin_required
def get_configs_by_category(category):
    """按分类获取配置"""
    if category not in ConfigService.CATEGORIES:
        return jsonify({'error': f'无效的分类: {category}'}), 400

    configs = ConfigService.get_configs_by_category(category)
    return jsonify({'configs': configs, 'category': category})


@config_bp.route('/admin/config/<string:key>', methods=['GET'])
@jwt_required()
@admin_required
def get_config_by_key(key):
    """获取单个配置"""
    config = ConfigService.get_config_by_key(key)
    if not config:
        return jsonify({'error': f'配置项 {key} 不存在'}), 404
    return jsonify({'config': config})


@config_bp.route('/admin/config/<string:key>', methods=['PUT'])
@jwt_required()
@admin_required
def update_config(key):
    """更新单个配置"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    value = data.get('value')
    reason = data.get('reason', '')
    ip_address = request.remote_addr

    if value is None:
        return jsonify({'error': '缺少 value 字段'}), 400

    user_id = get_jwt_identity()
    success, message, result = ConfigService.update_config(
        key, value, user_id, reason, ip_address
    )

    if not success:
        return jsonify({'error': message}), 400

    return jsonify({
        'message': message,
        'config': result
    })


@config_bp.route('/admin/config/batch', methods=['PUT'])
@jwt_required()
@admin_required
def batch_update_configs():
    """批量更新配置"""
    data = request.get_json()
    if not data or 'updates' not in data:
        return jsonify({'error': '缺少 updates 字段'}), 400

    updates = data.get('updates', [])
    reason = data.get('reason', '')
    ip_address = request.remote_addr

    if not isinstance(updates, list):
        return jsonify({'error': 'updates 必须是数组'}), 400

    user_id = get_jwt_identity()
    success, message, results = ConfigService.batch_update_configs(
        updates, user_id, reason, ip_address
    )

    if not success:
        return jsonify({'error': message, 'results': results}), 400

    return jsonify({
        'message': message,
        'updated': len(results),
        'results': results
    })


@config_bp.route('/admin/config/reset', methods=['POST'])
@jwt_required()
@admin_required
def reset_configs():
    """重置配置到默认值"""
    data = request.get_json() or {}
    category = data.get('category')  # 可选，按分类重置
    ip_address = request.remote_addr

    if category and category not in ConfigService.CATEGORIES:
        return jsonify({'error': f'无效的分类: {category}'}), 400

    user_id = get_jwt_identity()
    success, message = ConfigService.reset_to_defaults(category, user_id)

    return jsonify({'message': message})


@config_bp.route('/admin/config/initialize', methods=['POST'])
@jwt_required()
@admin_required
def initialize_configs():
    """初始化默认配置（仅插入缺失项）"""
    ConfigService.initialize_defaults()
    return jsonify({'message': '默认配置初始化完成'})


# ========== 公开配置（前端可读）==========

@config_bp.route('/config/public', methods=['GET'])
@jwt_required()
def get_public_configs():
    """获取公开配置（前端可读）"""
    configs = ConfigService.get_public_configs()
    return jsonify({'configs': configs})


# ========== 操作日志 ==========

@config_bp.route('/admin/audit-logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    """获取操作日志"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    action = request.args.get('action')  # filter by action
    user_id = request.args.get('user_id', type=int)
    target_type = request.args.get('target_type')

    query = AuditLog.query.order_by(AuditLog.created_at.desc())

    if action:
        query = query.filter_by(action=action)
    if user_id:
        query = query.filter_by(user_id=user_id)
    if target_type:
        query = query.filter_by(target_type=target_type)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'logs': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': page,
        'per_page': per_page
    })


@config_bp.route('/admin/audit-logs/export', methods=['GET'])
@jwt_required()
@admin_required
def export_audit_logs():
    """导出操作日志"""
    format_type = request.args.get('format', 'json')  # json or csv
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = AuditLog.query.order_by(AuditLog.created_at.desc())

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    logs = query.all()

    if format_type == 'csv':
        import csv
        import io
        from flask import Response

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', '用户ID', '操作', '目标类型', '目标ID', '描述', 'IP地址', '时间'])

        for log in logs:
            writer.writerow([
                log.id, log.user_id, log.action, log.target_type,
                log.entity_id, log.description, log.ip_address, log.created_at
            ])

        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=audit_logs.csv'}
        )

    return jsonify({
        'logs': [log.to_dict() for log in logs],
        'total': len(logs)
    })


# ========== 系统状态 ==========

@config_bp.route('/admin/system/status', methods=['GET'])
@jwt_required()
@admin_required
def get_system_status():
    """获取系统状态"""
    from app.models import User, Family, Member, SystemConfig
    from app import db

    return jsonify({
        'users': {
            'total': User.query.count(),
            'active': User.query.filter_by(is_active=True).count(),
            'pending': User.query.filter_by(status='pending').count()
        },
        'families': {
            'total': Family.query.count()
        },
        'members': {
            'total': Member.query.count()
        },
        'configs': {
            'total': SystemConfig.query.count(),
            'categories': ConfigService.CATEGORIES
        }
    })
