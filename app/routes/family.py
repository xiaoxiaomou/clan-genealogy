from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.services.family_service import FamilyService
from app.utils.decorators import family_permission_required, admin_required
from app.utils.html_utils import sanitize_html
from app.models.user import User
from app.models.member import Member
from app.models.member_edit_history import MemberEditHistory
from app.routes.member_history import record_member_changes

family_bp = Blueprint('family', __name__)


def sanitize_bio(bio):
    """对成员 bio 字段做 HTML 安全清理，富文本支持"""
    if not bio:
        return bio
    return sanitize_html(bio, max_length=20000)


# ==================== 族谱管理 ====================

@family_bp.route('/', methods=['GET'])
@jwt_required()
def list_families():
    """获取用户的所有族谱"""
    user_id = int(get_jwt_identity())
    families = FamilyService.get_user_families(user_id)
    return jsonify({
        'families': [f.to_dict() for f in families]
    })


@family_bp.route('/<int:family_id>/my-role', methods=['GET'])
@jwt_required()
def get_my_role(family_id):
    """获取当前用户在族谱中的角色"""
    user_id = int(get_jwt_identity())

    # 管理员自动拥有所有权限
    user = db.session.get(User, user_id)
    if user and user.is_admin:
        return jsonify({'role': 'admin', 'can_edit': True})

    fm = FamilyService.get_family_users(family_id)
    my_record = next((u for u in fm if u['user_id'] == user_id), None)
    if my_record:
        role = my_record['role']
        can_edit = role in ('owner', 'admin', 'editor')
        return jsonify({'role': role, 'can_edit': can_edit})

    # 不在族谱中，检查是否公开
    from app.models.family import Family
    family = db.session.get(Family, family_id)
    if family and family.is_public:
        return jsonify({'role': 'viewer', 'can_edit': False})

    return jsonify({'error': '无权访问该族谱'}), 403


@family_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_family():
    """创建族谱（仅管理员）"""
    user_id = int(get_jwt_identity())

    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '族谱名称不能为空'}), 400

    family = FamilyService.create_family(
        name=name,
        creator_id=user_id,
        description=data.get('description'),
        surname=data.get('surname'),
        origin=data.get('origin'),
        is_public=data.get('is_public', False)
    )
    return jsonify({
        'message': '族谱创建成功',
        'family': family.to_dict()
    }), 201


@family_bp.route('/<int:family_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_family(family_id):
    """获取族谱详情"""
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    return jsonify({'family': family.to_dict()})


@family_bp.route('/<int:family_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('admin')
def update_family(family_id):
    """更新族谱信息"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    family = FamilyService.update_family(family_id, **data)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    return jsonify({
        'message': '族谱更新成功',
        'family': family.to_dict()
    })


@family_bp.route('/<int:family_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('owner')
def delete_family(family_id):
    """删除族谱"""
    if FamilyService.delete_family(family_id):
        return jsonify({'message': '族谱删除成功'})
    return jsonify({'error': '族谱不存在'}), 404


# ==================== 成员管理 ====================

@family_bp.route('/<int:family_id>/members', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_members(family_id):
    """获取族谱所有成员"""
    members = FamilyService.get_family_members(family_id)
    return jsonify({
        'members': [m.to_dict() for m in members]
    })


@family_bp.route('/<int:family_id>/members', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def add_member(family_id):
    """添加家族成员"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '成员姓名不能为空'}), 400

    member = FamilyService.add_member(
        family_id=family_id,
        name=name,
        gender=data.get('gender', 'unknown'),
        birth_date=data.get('birth_date'),
        death_date=data.get('death_date'),
        generation=data.get('generation'),
        generation_name=data.get('generation_name'),
        bio=sanitize_bio(data.get('bio')),
        avatar=data.get('avatar'),
        is_alive=data.get('is_alive', True)
    )
    return jsonify({
        'message': '成员添加成功',
        'member': member.to_dict()
    }), 201


@family_bp.route('/<int:family_id>/members/<int:member_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_member(family_id, member_id):
    """获取成员详情"""
    member = FamilyService.get_member(member_id)
    if not member or member.family_id != family_id:
        return jsonify({'error': '成员不存在'}), 404
    return jsonify({'member': member.to_dict(include_relations=True)})


@family_bp.route('/<int:family_id>/members/<int:member_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_member(family_id, member_id):
    """更新成员信息"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    # bio 字段做 HTML 安全清理（支持富文本）
    if 'bio' in data and data['bio']:
        data['bio'] = sanitize_bio(data['bio'])

    # 先读旧值用于 history
    old_member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not old_member:
        return jsonify({'error': '成员不存在'}), 404
    old_attrs = {
        f: getattr(old_member, f)
        for f in ('name', 'gender', 'generation', 'birth_date', 'death_date',
                   'is_alive', 'birth_place', 'death_place', 'generation_name',
                   'father_id', 'mother_id', 'spouse_id', 'branch_id', 'bio',
                   'occupation', 'avatar')
        if hasattr(old_member, f)
    }

    member = FamilyService.update_member(member_id, **data)
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    # 记录版本历史
    try:
        uid = int(get_jwt_identity())
        record_member_changes(
            family_id=family_id,
            member=member,
            old_attrs=old_attrs,
            new_attrs=data,
            editor_id=uid,
        )
        db.session.commit()
    except Exception:
        # history 失败不阻塞主流程
        db.session.rollback()

    return jsonify({
        'message': '成员信息更新成功',
        'member': member.to_dict()
    })


@family_bp.route('/<int:family_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_member(family_id, member_id):
    """删除成员"""
    if FamilyService.delete_member(member_id):
        return jsonify({'message': '成员删除成功'})
    return jsonify({'error': '成员不存在'}), 404


# ==================== 批量操作 ====================

# 允许批量更新的字段白名单
BATCH_EDITABLE_FIELDS = {
    'gender', 'is_alive', 'branch_id', 'generation_name',
    'birth_place', 'death_place',
}


@family_bp.route('/<int:family_id>/members/batch-edit', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def batch_edit_members(family_id):
    """批量编辑多个成员的共享字段

    请求体: {
      member_ids: [1, 2, 3, ...],
      updates: { gender: "male", branch_id: 2, is_alive: false, ... },
      mode: "set" | "append",  # set=覆盖, append=追加（仅对 generation_name 生效）
    }
    """
    data = request.get_json(silent=True) or {}
    member_ids = data.get('member_ids') or []
    updates = data.get('updates') or {}
    mode = data.get('mode', 'set')

    if not isinstance(member_ids, list) or not member_ids:
        return jsonify({'error': 'member_ids 必须是非空数组'}), 400
    if not isinstance(updates, dict) or not updates:
        return jsonify({'error': 'updates 必须是非空对象'}), 400

    # 字段白名单
    invalid = set(updates.keys()) - BATCH_EDITABLE_FIELDS
    if invalid:
        return jsonify({
            'error': f'不允许批量修改字段: {", ".join(sorted(invalid))}',
            'allowed': sorted(BATCH_EDITABLE_FIELDS),
        }), 400

    # 字段级校验
    clean_updates = {}
    for k, v in updates.items():
        if k == 'gender' and v not in ('male', 'female', 'unknown'):
            return jsonify({'error': 'gender 必须是 male/female/unknown'}), 400
        if k == 'is_alive':
            clean_updates[k] = bool(v) if isinstance(v, bool) else str(v).lower() in ('true', '1', 'yes')
        elif k == 'branch_id':
            try:
                clean_updates[k] = int(v) if v not in (None, '', 'null') else None
            except (TypeError, ValueError):
                return jsonify({'error': 'branch_id 必须是整数'}), 400
        else:
            clean_updates[k] = v if v != '' else None

    try:
        affected = 0
        skipped = []
        for mid in member_ids:
            try:
                mid_int = int(mid)
            except (TypeError, ValueError):
                skipped.append({'id': mid, 'reason': 'ID 无效'})
                continue
            m = Member.query.filter_by(id=mid_int, family_id=family_id).first()
            if not m:
                skipped.append({'id': mid_int, 'reason': '成员不存在或不属于本家族'})
                continue
            for k, v in clean_updates.items():
                if mode == 'append' and k == 'generation_name':
                    cur = m.generation_name or ''
                    new_v = v
                    if new_v and new_v not in cur.split(','):
                        m.generation_name = (cur + ',' + new_v).strip(',') if cur else new_v
                else:
                    setattr(m, k, v)
            affected += 1

        db.session.commit()
        # 审计
        from app.utils.audit import log_action
        log_action(
            family_id=family_id,
            user_id=int(get_jwt_identity()),
            action='batch_update',
            entity_type='member',
            description=f'批量更新 {affected} 个成员，字段: {", ".join(clean_updates.keys())} (mode={mode})',
        )
        return jsonify({
            'message': f'成功更新 {affected} 个成员',
            'affected': affected,
            'skipped': skipped,
            'updates_applied': list(clean_updates.keys()),
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'批量更新失败: {str(e)}'}), 500


@family_bp.route('/<int:family_id>/members/batch-delete', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def batch_delete_members(family_id):
    """批量删除（仅 admin 权限）"""
    data = request.get_json(silent=True) or {}
    member_ids = data.get('member_ids') or []
    if not isinstance(member_ids, list) or not member_ids:
        return jsonify({'error': 'member_ids 必须是非空数组'}), 400

    deleted = 0
    failed = []
    for mid in member_ids:
        try:
            mid_int = int(mid)
        except (TypeError, ValueError):
            failed.append({'id': mid, 'reason': 'ID 无效'})
            continue
        if FamilyService.delete_member(mid_int):
            deleted += 1
        else:
            failed.append({'id': mid_int, 'reason': '成员不存在'})

    db.session.commit()
    from app.utils.audit import log_action
    log_action(
        family_id=family_id,
        user_id=int(get_jwt_identity()),
        action='batch_delete',
        entity_type='member',
        description=f'批量删除 {deleted} 个成员',
    )
    return jsonify({
        'message': f'成功删除 {deleted} 个成员',
        'deleted': deleted,
        'failed': failed,
    })


@family_bp.route('/<int:family_id>/members/import-csv', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def import_members_csv(family_id):
    """从 CSV 文本导入成员（dry-run 模式 + 实际写入两阶段）

    请求体: {
      csv_text: "name,gender,birth_date,death_date,generation_name,birth_place,is_alive\n...",
      dry_run: true,  # 仅校验，不写入
      skip_header: true,
    }

    响应: {
      total: 50,
      valid: 48,
      invalid: 2,
      errors: [{ row: 3, name: "张三", reason: "缺少必填 name 字段" }, ...],
      preview: [...first 5 parsed members...]
    }
    """
    import csv as csv_mod
    from io import StringIO

    data = request.get_json(silent=True) or {}
    csv_text = data.get('csv_text', '').strip()
    dry_run = bool(data.get('dry_run', True))
    skip_header = bool(data.get('skip_header', True))

    if not csv_text:
        return jsonify({'error': 'csv_text 不能为空'}), 400

    reader = csv_mod.DictReader(StringIO(csv_text))
    rows = list(reader)

    valid = []
    errors = []
    for i, row in enumerate(rows, start=2 if skip_header else 1):
        name = (row.get('name') or '').strip()
        if not name:
            errors.append({'row': i, 'name': '', 'reason': '缺少必填 name 字段'})
            continue
        gender = (row.get('gender') or 'unknown').strip().lower()
        if gender not in ('male', 'female', 'unknown'):
            errors.append({'row': i, 'name': name, 'reason': f'gender 非法: {gender}'})
            continue
        gen_name = (row.get('generation_name') or '').strip() or None
        try:
            gen = int(row['generation']) if row.get('generation') else None
        except (TypeError, ValueError):
            gen = None
        valid.append({
            'name': name,
            'gender': gender,
            'birth_date': (row.get('birth_date') or '').strip() or None,
            'death_date': (row.get('death_date') or '').strip() or None,
            'generation_name': gen_name,
            'generation': gen,
            'birth_place': (row.get('birth_place') or '').strip() or None,
            'death_place': (row.get('death_place') or '').strip() or None,
            'is_alive': str(row.get('is_alive', 'true')).lower() in ('true', '1', 'yes', '是', '1'),
            'bio': (row.get('bio') or '').strip() or None,
        })

    if dry_run:
        return jsonify({
            'dry_run': True,
            'total': len(rows),
            'valid': len(valid),
            'invalid': len(errors),
            'errors': errors[:30],
            'preview': valid[:5],
        })

    # 实际写入
    try:
        added = 0
        for m_data in valid:
            m = Member(family_id=family_id, **m_data)
            db.session.add(m)
            added += 1
        db.session.commit()
        from app.utils.audit import log_action
        log_action(
            family_id=family_id,
            user_id=int(get_jwt_identity()),
            action='csv_import',
            entity_type='member',
            description=f'CSV 导入 {added} 个成员',
        )
        return jsonify({
            'dry_run': False,
            'added': added,
            'invalid': len(errors),
            'errors': errors[:30],
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'CSV 导入失败: {str(e)}'}), 500


# ==================== 关系管理 ====================

@family_bp.route('/<int:family_id>/relationships', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_relationships(family_id):
    """获取族谱所有关系"""
    relationships = FamilyService.get_family_relationships(family_id)
    return jsonify({
        'relationships': [r.to_dict() for r in relationships]
    })


@family_bp.route('/<int:family_id>/relationships', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def add_relationship(family_id):
    """添加成员关系"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    member_id = data.get('member_id')
    related_member_id = data.get('related_member_id')
    relationship_type = data.get('relationship_type')

    if not member_id or not related_member_id or not relationship_type:
        return jsonify({'error': '缺少必要参数'}), 400

    if relationship_type not in ('parent', 'spouse', 'sibling'):
        return jsonify({'error': '无效的关系类型'}), 400

    rel, error = FamilyService.add_relationship(
        member_id, related_member_id, relationship_type
    )
    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'message': '关系添加成功',
        'relationship': rel.to_dict()
    }), 201


@family_bp.route('/<int:family_id>/relationships/<int:relationship_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_relationship(family_id, relationship_id):
    """删除关系"""
    if FamilyService.remove_relationship(relationship_id):
        return jsonify({'message': '关系删除成功'})
    return jsonify({'error': '关系不存在'}), 404


# ==================== 族谱树形数据 ====================

@family_bp.route('/<int:family_id>/tree', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_family_tree(family_id):
    """获取族谱树形数据（用于可视化）"""
    tree_data = FamilyService.get_family_tree(family_id)
    return jsonify(tree_data)


# ==================== 族谱统计 ====================

@family_bp.route('/<int:family_id>/stats', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_family_stats(family_id):
    """获取族谱统计数据"""
    from datetime import datetime
    members = FamilyService.get_family_members(family_id)
    relationships = FamilyService.get_family_relationships(family_id)

    total = len(members)
    male_count = sum(1 for m in members if m.gender == 'male')
    female_count = sum(1 for m in members if m.gender == 'female')
    unknown_count = sum(1 for m in members if m.gender == 'unknown')
    alive_count = sum(1 for m in members if m.is_alive)
    deceased_count = total - alive_count

    gen_stats = {}
    for m in members:
        if m.generation:
            gen_stats[f'第{m.generation}代'] = gen_stats.get(f'第{m.generation}代', 0) + 1

    parent_rels = sum(1 for r in relationships if r.relationship_type == 'parent')
    spouse_rels = sum(1 for r in relationships if r.relationship_type == 'spouse')
    sibling_rels = sum(1 for r in relationships if r.relationship_type == 'sibling')

    age_groups = {'0-17': {'male': 0, 'female': 0}, '18-35': {'male': 0, 'female': 0}, '36-60': {'male': 0, 'female': 0}, '60+': {'male': 0, 'female': 0}}
    current_year = datetime.now().year
    for m in members:
        if m.birth_date:
            try:
                birth_year = int(m.birth_date[:4])
                age = current_year - birth_year
                if age < 18:
                    age_key = '0-17'
                elif age < 36:
                    age_key = '18-35'
                elif age < 60:
                    age_key = '36-60'
                else:
                    age_key = '60+'
                if m.gender == 'male':
                    age_groups[age_key]['male'] += 1
                elif m.gender == 'female':
                    age_groups[age_key]['female'] += 1
            except:
                pass

    branch_stats: dict[int, dict] = {}
    for m in members:
        bid = getattr(m, 'branch_id', None) or 0
        bucket = branch_stats.setdefault(bid, {'count': 0, 'male': 0, 'female': 0, 'alive': 0})
        bucket['count'] += 1
        if m.gender == 'male':
            bucket['male'] += 1
        elif m.gender == 'female':
            bucket['female'] += 1
        if m.is_alive:
            bucket['alive'] += 1

    branch_labels = {}
    try:
        from app.models.branch import Branch
        for b in Branch.query.filter_by(family_id=family_id).all():
            branch_labels[b.id] = b.name
    except Exception:
        pass
    branch_distribution = []
    for bid, b in sorted(branch_stats.items(), key=lambda x: -x[1]['count']):
        branch_distribution.append({
            'branch_id': bid,
            'branch_name': branch_labels.get(bid, '未分配分支' if bid == 0 else f'分支#{bid}'),
            **b,
        })

    lifespans: list[dict] = []
    for m in members:
        if not m.birth_date:
            continue
        try:
            by = int(m.birth_date[:4])
            dy = None
            if m.death_date:
                dy = int(m.death_date[:4])
            elif not m.is_alive:
                continue
            if dy is not None:
                age = dy - by
                if 0 < age < 130:
                    lifespans.append({
                        'member_id': m.id,
                        'name': m.name,
                        'gender': m.gender,
                        'birth_year': by,
                        'death_year': dy,
                        'age': age,
                    })
        except (ValueError, TypeError):
            continue

    longevity = {
        'count': len(lifespans),
        'avg_age': round(sum(x['age'] for x in lifespans) / len(lifespans), 1) if lifespans else 0,
        'max_age': max((x['age'] for x in lifespans), default=0),
        'min_age': min((x['age'] for x in lifespans), default=0),
        'male_avg': round(sum(x['age'] for x in lifespans if x['gender'] == 'male') /
                          max(1, sum(1 for x in lifespans if x['gender'] == 'male')), 1),
        'female_avg': round(sum(x['age'] for x in lifespans if x['gender'] == 'female') /
                            max(1, sum(1 for x in lifespans if x['gender'] == 'female')), 1),
        'top_longest': sorted(lifespans, key=lambda x: -x['age'])[:5],
    }

    decade_distribution: dict[str, int] = {}
    for m in members:
        if not m.birth_date:
            continue
        try:
            by = int(m.birth_date[:4])
            decade = f"{(by // 10) * 10}s"
            decade_distribution[decade] = decade_distribution.get(decade, 0) + 1
        except (ValueError, TypeError):
            continue
    birth_decades = [{'decade': d, 'count': c} for d, c in sorted(decade_distribution.items())]

    return jsonify({
        'total': total,
        'gender': {
            'male': male_count,
            'female': female_count,
            'unknown': unknown_count,
        },
        'alive_status': {
            'alive': alive_count,
            'deceased': deceased_count,
        },
        'generation': gen_stats,
        'relationships': {
            'parent': parent_rels,
            'spouse': spouse_rels,
            'sibling': sibling_rels,
        },
        'age_groups': age_groups,
        'branch_distribution': branch_distribution,
        'longevity': longevity,
        'birth_decades': birth_decades,
    })


# ==================== 族谱用户权限管理 ====================

@family_bp.route('/<int:family_id>/users', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_family_users(family_id):
    """获取族谱的所有授权用户"""
    users = FamilyService.get_family_users(family_id)
    return jsonify({'users': users})


@family_bp.route('/<int:family_id>/users', methods=['POST'])
@jwt_required()
@family_permission_required('admin')
def add_family_user_route(family_id):
    """添加用户到族谱（授权）"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    user_id = data.get('user_id')
    role = data.get('role', 'viewer')

    if not user_id:
        return jsonify({'error': '用户ID不能为空'}), 400

    fm, error = FamilyService.add_family_user(family_id, user_id, role)
    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'message': '用户授权成功',
        'family_member': fm.to_dict()
    }), 201


@family_bp.route('/<int:family_id>/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('admin')
def update_family_user_role_route(family_id, user_id):
    """修改用户在族谱中的角色"""
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    new_role = data.get('role')
    if not new_role:
        return jsonify({'error': '角色不能为空'}), 400

    success, error = FamilyService.update_family_user_role(family_id, user_id, new_role)
    if not success:
        return jsonify({'error': error}), 400

    return jsonify({'message': '角色更新成功'})


@family_bp.route('/<int:family_id>/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def remove_family_user_route(family_id, user_id):
    """从族谱中移除用户"""
    success, error = FamilyService.remove_family_user(family_id, user_id)
    if not success:
        return jsonify({'error': error}), 400

    return jsonify({'message': '用户已移除'})


@family_bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    """搜索用户（用于添加族谱成员时查找）"""
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify({'error': '搜索关键词至少2个字符'}), 400

    users = User.query.filter(
        User.username.contains(query) | User.display_name.contains(query)
    ).limit(10).all()

    return jsonify({
        'users': [
            {
                'id': u.id,
                'username': u.username,
                'display_name': u.display_name,
                'avatar': u.avatar,
            }
            for u in users
        ]
    })


# ==================== 成员-用户账号绑定 ====================

@family_bp.route('/<int:family_id>/members/<int:member_id>/bound-user', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_bound_user(family_id, member_id):
    """获取成员绑定的用户账号"""
    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    bound_user = User.query.filter_by(linked_member_id=member_id).first()
    if not bound_user:
        return jsonify({'bound_user': None})

    return jsonify({
        'bound_user': {
            'id': bound_user.id,
            'username': bound_user.username,
            'display_name': bound_user.display_name,
            'avatar': bound_user.avatar,
            'email': bound_user.email if User.query.get(bound_user.id).id == int(get_jwt_identity()) else None,
        }
    })


@family_bp.route('/<int:family_id>/members/<int:member_id>/bound-user', methods=['PUT'])
@jwt_required()
@family_permission_required('admin')
def bind_user_to_member(family_id, member_id):
    """管理员将用户账号绑定到成员（替换原绑定）"""
    data = request.get_json() or {}
    user_id = data.get('user_id')

    if user_id is None:
        return jsonify({'error': '缺少 user_id'}), 400

    user_id = int(user_id)
    target_member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not target_member:
        return jsonify({'error': '成员不存在'}), 404

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'error': '用户不存在'}), 404

    existing = User.query.filter(
        User.linked_member_id == member_id,
        User.id != user_id,
    ).first()
    if existing:
        existing.linked_member_id = None
        db.session.flush()

    old_binding = User.query.filter_by(linked_member_id=member_id).first()
    if old_binding and old_binding.id != user_id:
        old_binding.linked_member_id = None
        db.session.flush()

    target_user.linked_member_id = member_id
    db.session.commit()

    return jsonify({
        'message': '账号绑定成功',
        'bound_user': {
            'id': target_user.id,
            'username': target_user.username,
            'display_name': target_user.display_name,
            'avatar': target_user.avatar,
        },
    })


@family_bp.route('/<int:family_id>/members/<int:member_id>/bound-user', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def unbind_user_from_member(family_id, member_id):
    """解除成员的用户账号绑定"""
    target_member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not target_member:
        return jsonify({'error': '成员不存在'}), 404

    bound = User.query.filter_by(linked_member_id=member_id).first()
    if not bound:
        return jsonify({'error': '该成员未绑定用户'}), 404

    bound.linked_member_id = None
    db.session.commit()
    return jsonify({'message': '已解除账号绑定'})


@family_bp.route('/<int:family_id>/my-linked-member', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_my_linked_member(family_id):
    """获取当前用户在族谱中绑定的成员"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.linked_member_id:
        return jsonify({'member': None})

    member = Member.query.filter_by(id=user.linked_member_id, family_id=family_id).first()
    if not member:
        return jsonify({'member': None})

    return jsonify({'member': member.to_dict()})


@family_bp.route('/<int:family_id>/my-linked-member', methods=['PUT'])
@jwt_required()
@family_permission_required('viewer')
def bind_self_to_member(family_id):
    """用户自己绑定到某成员（仅能绑定自己）"""
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    member_id = data.get('member_id')

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    if member_id is None:
        user.linked_member_id = None
        db.session.commit()
        return jsonify({'message': '已解除自我关联'})

    member_id = int(member_id)
    target_member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not target_member:
        return jsonify({'error': '成员不存在'}), 404

    exists = User.query.filter(
        User.linked_member_id == member_id,
        User.id != user_id,
    ).first()
    if exists:
        return jsonify({'error': '该成员已被其他账号绑定'}), 400

    user.linked_member_id = member_id
    db.session.commit()
    return jsonify({
        'message': '已将自己关联到此成员',
        'member': target_member.to_dict(),
    })
