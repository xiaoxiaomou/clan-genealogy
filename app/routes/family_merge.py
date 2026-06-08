"""家族合并 API - 预览 + 执行"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.family_merge import preview_merge, execute_merge
from app.utils.decorators import family_permission_required

family_merge_bp = Blueprint('family_merge', __name__)


@family_merge_bp.route('/<int:family_id>/merge/preview', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def merge_preview(family_id):
    """预览合并冲突"""
    data = request.get_json() or {}
    source_id = data.get('source_family_id')
    if not source_id:
        return jsonify({'error': '需要 source_family_id'}), 400
    try:
        result = preview_merge(target_id=family_id, source_id=int(source_id))
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'预览失败: {e}'}), 500


@family_merge_bp.route('/<int:family_id>/merge/execute', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def merge_execute(family_id):
    """执行家族合并"""
    data = request.get_json() or {}
    source_id = data.get('source_family_id')
    if not source_id:
        return jsonify({'error': '需要 source_family_id'}), 400

    uid = int(get_jwt_identity())
    try:
        result = execute_merge(
            target_id=family_id,
            source_id=int(source_id),
            operator_user_id=uid,
            field_strategy=data.get('field_strategy', 'keep_target'),
            member_strategy=data.get('member_strategy', 'migrate_all'),
            delete_source=data.get('delete_source', False),
        )
        return jsonify({'message': '合并完成', 'result': result})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'合并失败: {e}'}), 500
