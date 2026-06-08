from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.branch import FamilyBranch
from app.models.member import Member
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required, admin_required

branch_bp = Blueprint('branch', __name__)


def create_audit_log(family_id, user_id, action, entity_type, entity_id=None, description=None):
    """创建审计日志条目"""
    log = AuditLog(
        family_id=family_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=request.remote_addr,
    )
    db.session.add(log)


def build_branch_tree(branches, parent_id=None):
    """递归构建分支树结构"""
    tree = []
    for branch in branches:
        if branch.parent_branch_id == parent_id:
            node = branch.to_dict()
            children = build_branch_tree(branches, branch.id)
            if children:
                node['children'] = children
            else:
                node['children'] = []
            tree.append(node)
    return sorted(tree, key=lambda x: x.get('sort_order', 0))


@branch_bp.route('/<int:family_id>/branches', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_branches(family_id):
    """获取族谱的所有分支（树形结构）"""
    try:
        branches = FamilyBranch.query.filter_by(
            family_id=family_id,
            is_active=True
        ).order_by(FamilyBranch.sort_order.asc()).all()

        tree = build_branch_tree(branches)
        return jsonify({
            'branches': tree,
            'total': len(branches)
        })
    except Exception as e:
        return jsonify({'error': f'获取分支列表失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/branches', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def create_branch(family_id):
    """创建分支"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '分支名称不能为空'}), 400

    parent_branch_id = data.get('parent_branch_id')
    if parent_branch_id:
        parent = FamilyBranch.query.filter_by(id=parent_branch_id, family_id=family_id).first()
        if not parent:
            return jsonify({'error': '父分支不存在'}), 404

    try:
        # 自动计算排序序号
        max_order = FamilyBranch.query.filter_by(family_id=family_id)\
            .with_entities(db.func.max(FamilyBranch.sort_order)).scalar()
        sort_order = (max_order or 0) + 1

        branch = FamilyBranch(
            family_id=family_id,
            name=name,
            description=data.get('description'),
            founder_id=data.get('founder_id'),
            parent_branch_id=parent_branch_id,
            sort_order=sort_order,
            is_active=True,
        )
        db.session.add(branch)
        create_audit_log(
            family_id, user_id, 'create', 'branch',
            entity_id=branch.id, description=f'创建分支: {name}'
        )
        db.session.commit()
        return jsonify({
            'message': '分支创建成功',
            'branch': branch.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建分支失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/branches/<int:branch_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_branch(family_id, branch_id):
    """获取分支详情（含成员数量）"""
    try:
        branch = FamilyBranch.query.filter_by(id=branch_id, family_id=family_id).first()
        if not branch:
            return jsonify({'error': '分支不存在'}), 404

        data = branch.to_dict()

        # 注意：Member 模型没有直接关联 branch_id，这里只是一个计数
        # 如果有分支成员关系表，可以从那里获取
        # 这里我们用 branch 本身的 member_count 字段
        data['actual_member_count'] = branch.member_count

        # 获取子分支
        children = FamilyBranch.query.filter_by(
            parent_branch_id=branch.id,
            is_active=True
        ).order_by(FamilyBranch.sort_order.asc()).all()
        data['children'] = [c.to_dict() for c in children]

        return jsonify({'branch': data})
    except Exception as e:
        return jsonify({'error': f'获取分支详情失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/branches/<int:branch_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('admin')
def update_branch(family_id, branch_id):
    """更新分支信息"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    try:
        branch = FamilyBranch.query.filter_by(id=branch_id, family_id=family_id).first()
        if not branch:
            return jsonify({'error': '分支不存在'}), 404

        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': '分支名称不能为空'}), 400
            branch.name = name
        if 'description' in data:
            branch.description = data['description']
        if 'founder_id' in data:
            branch.founder_id = data['founder_id']
        if 'parent_branch_id' in data:
            if data['parent_branch_id']:
                parent = FamilyBranch.query.filter_by(id=data['parent_branch_id'], family_id=family_id).first()
                if not parent:
                    return jsonify({'error': '父分支不存在'}), 404
            branch.parent_branch_id = data['parent_branch_id']

        branch.updated_at = datetime.utcnow()
        create_audit_log(
            family_id, user_id, 'update', 'branch',
            entity_id=branch.id, description=f'更新分支: {branch.name}'
        )
        db.session.commit()
        return jsonify({
            'message': '分支更新成功',
            'branch': branch.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新分支失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/branches/<int:branch_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def deactivate_branch(family_id, branch_id):
    """停用分支（软删除）"""
    user_id = int(get_jwt_identity())
    try:
        branch = FamilyBranch.query.filter_by(id=branch_id, family_id=family_id).first()
        if not branch:
            return jsonify({'error': '分支不存在'}), 404

        branch.is_active = False
        branch.updated_at = datetime.utcnow()

        # 同时停用所有子分支
        def deactivate_children(parent_id):
            children = FamilyBranch.query.filter_by(parent_branch_id=parent_id, is_active=True).all()
            for child in children:
                child.is_active = False
                child.updated_at = datetime.utcnow()
                deactivate_children(child.id)

        deactivate_children(branch_id)

        create_audit_log(
            family_id, user_id, 'delete', 'branch',
            entity_id=branch_id, description=f'停用分支: {branch.name}'
        )
        db.session.commit()
        return jsonify({'message': '分支已停用'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'停用分支失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/branches/<int:branch_id>/reorder', methods=['PUT'])
@jwt_required()
@family_permission_required('admin')
def reorder_branch(family_id, branch_id):
    """更新分支排序"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    sort_order = data.get('sort_order')
    if sort_order is None:
        return jsonify({'error': 'sort_order 不能为空'}), 400

    try:
        sort_order = int(sort_order)
    except (ValueError, TypeError):
        return jsonify({'error': 'sort_order 必须是整数'}), 400

    try:
        branch = FamilyBranch.query.filter_by(id=branch_id, family_id=family_id).first()
        if not branch:
            return jsonify({'error': '分支不存在'}), 404

        branch.sort_order = sort_order
        branch.updated_at = datetime.utcnow()
        create_audit_log(
            family_id, user_id, 'update', 'branch',
            entity_id=branch.id, description=f'更新分支排序: {branch.name} -> {sort_order}'
        )
        db.session.commit()
        return jsonify({
            'message': '排序更新成功',
            'branch': branch.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新排序失败: {str(e)}'}), 500


@branch_bp.route('/<int:family_id>/members/<int:member_id>/assign-branch', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def assign_member_branch(family_id, member_id):
    """将成员分配到分支"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    branch_id = data.get('branch_id')
    if branch_id is None:
        return jsonify({'error': 'branch_id 不能为空'}), 400

    try:
        member = Member.query.filter_by(id=member_id, family_id=family_id).first()
        if not member:
            return jsonify({'error': '成员不存在'}), 404

        if branch_id is not None:
            branch = FamilyBranch.query.filter_by(id=branch_id, family_id=family_id, is_active=True).first()
            if not branch:
                return jsonify({'error': '分支不存在或已停用'}), 404

        old_branch_id = member.branch_id
        member.branch_id = branch_id

        # 更新分支成员计数
        if old_branch_id and old_branch_id != branch_id:
            old_branch = FamilyBranch.query.get(old_branch_id)
            if old_branch:
                old_branch.member_count = max(0, (old_branch.member_count or 1) - 1)
        if branch_id is not None and branch_id != old_branch_id:
            branch.member_count = (branch.member_count or 0) + 1

        create_audit_log(
            family_id, user_id, 'update', 'member',
            entity_id=member_id,
            description=f'将成员 {member.name} 分配到分支: {branch.name if branch_id else "无"}'
        )
        db.session.commit()
        return jsonify({
            'message': f'成员 {member.name} 已分配到分支 {branch.name}' if branch_id else f'成员 {member.name} 已取消分支分配',
            'member_id': member_id,
            'branch_id': branch_id,
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'分配成员到分支失败: {str(e)}'}), 500
