from collections import deque
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from app import db
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.kinship import (
    query_ancestors_cte, query_descendants_cte, find_lineage_chain_cte
)
from app.models.member_extension import (
    MemberMigration, MemberBurial, MarriedOutDaughter
)
from app.utils.decorators import family_permission_required

kinship_bp = Blueprint('kinship', __name__)


def build_graph(family_id):
    """从数据库中构建家族关系图

    Returns:
        adj: dict member_id -> list of (neighbor_id, relationship_type, direction)
        members: dict member_id -> Member object
    """
    members = {m.id: m for m in Member.query.filter_by(family_id=family_id).all()}
    relationships = Relationship.query.filter(
        db.or_(
            Relationship.member_id.in_(members.keys()),
            Relationship.related_member_id.in_(members.keys())
        )
    ).all()

    adj = {mid: [] for mid in members}

    for rel in relationships:
        m1, m2 = rel.member_id, rel.related_member_id
        if m1 not in adj or m2 not in adj:
            continue

        if rel.relationship_type == 'parent':
            # parent: m1 is child, m2 is parent
            # From child -> parent: going UP
            adj[m1].append((m2, 'parent', 'up'))
            # From parent -> child: going DOWN
            adj[m2].append((m1, 'parent', 'down'))
        elif rel.relationship_type == 'spouse':
            # spouse: bidirectional, sideways
            adj[m1].append((m2, 'spouse', 'sideways'))
            adj[m2].append((m1, 'spouse', 'sideways'))
        elif rel.relationship_type == 'sibling':
            # sibling: bidirectional, sideways
            adj[m1].append((m2, 'sibling', 'sideways'))
            adj[m2].append((m1, 'sibling', 'sideways'))

    return adj, members


def bfs_shortest_path(adj, start, end):
    """BFS 寻找最短路径"""
    if start not in adj or end not in adj:
        return None
    if start == end:
        return []

    visited = {start}
    queue = deque()
    queue.append((start, []))

    while queue:
        current, path = queue.popleft()
        for neighbor, rel_type, direction in adj.get(current, []):
            if neighbor == end:
                return path + [(current, neighbor, rel_type, direction)]
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = path + [(current, neighbor, rel_type, direction)]
                queue.append((neighbor, new_path))

    return None


def collect_ancestors(adj, member_id, max_depth=6):
    """沿父链（direction='up'）向上收集祖先节点 + 关联边。

    Returns:
        (ancestor_ids: set, edge_keys: set)
        edge_keys 形如 "parent:child"（无方向），方便前端匹配父子边。
    """
    ancestor_ids = set()
    edge_keys = set()
    if member_id not in adj:
        return ancestor_ids, edge_keys

    visited_edges = set()
    queue = deque([(member_id, 0)])
    seen = {member_id}

    while queue:
        current, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for neighbor, rel_type, direction in adj.get(current, []):
            if direction != 'up' or rel_type != 'parent':
                continue
            ek = (min(current, neighbor), max(current, neighbor), rel_type)
            if ek in visited_edges:
                continue
            visited_edges.add(ek)
            edge_keys.add(f'{ek[0]}-{ek[1]}')
            if neighbor not in seen:
                seen.add(neighbor)
                ancestor_ids.add(neighbor)
                queue.append((neighbor, depth + 1))

    return ancestor_ids, edge_keys


def collect_descendants(adj, member_id, max_depth=6):
    """沿 direction='down' 向下收集子孙节点 + 关联边（用于金扇繁衍）。"""
    descendant_ids = set()
    edge_keys = set()
    if member_id not in adj:
        return descendant_ids, edge_keys

    visited_edges = set()
    queue = deque([(member_id, 0)])
    seen = {member_id}

    while queue:
        current, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for neighbor, rel_type, direction in adj.get(current, []):
            if direction != 'down' or rel_type != 'parent':
                continue
            ek = (min(current, neighbor), max(current, neighbor), rel_type)
            if ek in visited_edges:
                continue
            visited_edges.add(ek)
            edge_keys.add(f'{ek[0]}-{ek[1]}')
            if neighbor not in seen:
                seen.add(neighbor)
                descendant_ids.add(neighbor)
                queue.append((neighbor, depth + 1))

    return descendant_ids, edge_keys


def collect_relationship_set(adj, path):
    """把 BFS 路径转换成 (node_ids, edge_keys) 集合。"""
    if not path:
        return set(), set()
    node_ids = set()
    edge_keys = set()
    for frm, to, rel_type, _ in path:
        node_ids.add(frm)
        node_ids.add(to)
        ek = (min(frm, to), max(frm, to), rel_type)
        edge_keys.add(f'{ek[0]}-{ek[1]}')
    return node_ids, edge_keys


def find_lineage_chain(adj, member_id, direction, max_depth=12):
    """从 member 沿单一父链返回 (root_id) → ... → member 的有序节点列表。

    用于"金线溯源/金扇繁衍"高亮的主干。优先取"最远"父链（用 BFS 找最深处）。
    """
    if member_id not in adj:
        return []

    # 找最远的一代
    best = [(member_id, [member_id])]
    visited = {member_id}
    queue = deque([(member_id, [member_id])])
    while queue:
        current, chain = queue.popleft()
        if len(chain) - 1 >= max_depth:
            continue
        has_child = False
        for neighbor, rel_type, dir_ in adj.get(current, []):
            if dir_ != direction or rel_type != 'parent':
                continue
            if neighbor in visited:
                continue
            visited.add(neighbor)
            has_child = True
            new_chain = chain + [neighbor]
            queue.append((neighbor, new_chain))
            if len(new_chain) > len(best[0][1]):
                best = [(neighbor, new_chain)]
    return best[0][1] if best else []


def determine_relationship(member1, member2, path, members):
    """根据路径确定中文亲属关系"""
    if not path:
        # Same person or direct lookup
        if member1.id == member2.id:
            return '自己'
        # Check if member2 is member1's parent
        return '无亲属关系'

    # Analyze the path: count generations up/down
    gen_count = 0  # positive = member1 is elder, negative = member2 is elder
    sideways_count = 0
    path_rels = []

    for step in path:
        _, _, rel_type, direction = step
        if direction == 'up':
            gen_count += 1  # going up (to elder)
            path_rels.append('up')
        elif direction == 'down':
            gen_count -= 1  # going down (to younger)
            path_rels.append('down')
        else:  # sideways
            sideways_count += 1
            path_rels.append('sideways')

    g1 = member1.generation or 0
    g2 = member2.generation or 0
    gen_diff = g1 - g2  # positive: member1 is higher generation (older)

    # Check genders
    gender1 = member1.gender
    gender2 = member2.gender

    # ----- Direct ancestry (no sideways edges) -----
    if sideways_count == 0 and len(path_rels) > 0:
        all_up = all(d == 'up' for d in path_rels)
        all_down = all(d == 'down' for d in path_rels)

        if all_up:
            # member2 is an ancestor of member1
            gen_level = len(path_rels)
            if gen_level == 1:
                return '父亲' if gender2 == 'male' else '母亲'
            elif gen_level == 2:
                return '祖父' if gender2 == 'male' else '祖母'
            elif gen_level == 3:
                return '曾祖父' if gender2 == 'male' else '曾祖母'
            elif gen_level == 4:
                return '高祖父' if gender2 == 'male' else '高祖母'
            else:
                return f'{gen_level}世祖' if gender2 == 'male' else f'{gen_level}世祖姑'

        if all_down:
            # member2 is a descendant of member1
            gen_level = len(path_rels)
            if gen_level == 1:
                return '儿子' if gender2 == 'male' else '女儿'
            elif gen_level == 2:
                return '孙子' if gender2 == 'male' else '孙女'
            elif gen_level == 3:
                return '曾孙' if gender2 == 'male' else '曾孙女'
            elif gen_level == 4:
                return '玄孙' if gender2 == 'male' else '玄孙女'
            else:
                return f'{gen_level}世孙' if gender2 == 'male' else f'{gen_level}世孙女'

    # ----- Uncle/Aunt (parent's sibling) -----
    # Pattern: up, sideways, down (same gen, but through parent's sibling)
    if len(path_rels) >= 2 and path_rels[0] == 'up' and path_rels[-1] == 'down':
        # Check if it's up->sideways->down pattern
        inner_sideways = all(d == 'sideways' for d in path_rels[1:-1]) if len(path_rels) > 2 else (len(path_rels) == 2)
        if inner_sideways or (len(path_rels) == 2 and path_rels[1].startswith('side')):
            # Actually for length 2: up then down means same gen, check if path is parent->sibling->self
            # Let me re-check: up means we went to parent. If next is down, we went to self, which doesn't make sense
            # Actually the path goes node by node. Let me think:
            # If path is: me -> parent (up), parent -> uncle (sideways/sibling), uncle -> cousin (down)
            # That's 3 steps. But the gen_diff would be 0.
            pass

    # Use generation difference as primary indicator
    abs_gen_diff = abs(gen_diff)

    # SAME GENERATION
    if gen_diff == 0 and sideways_count > 0:
        # Siblings
        if all(d == 'sideways' for d in path_rels):
            if gender2 == 'male':
                return '兄弟' if gender1 == 'male' else '哥哥/弟弟'  # female speaking
            else:
                return '姐妹' if gender1 == 'female' else '姐姐/妹妹'  # male speaking
        # Cousins - through parent's sibling
        if len(path_rels) == 3 and path_rels[0] == 'up' and path_rels[1] == 'sideways' and path_rels[2] == 'down':
            # Determine whether paternal or maternal
            # Go up from member1, check the gender at the sibling level
            # Let's check the gender of the sibling (the parent's sibling's parent's child)
            first_step = path[0]
            parent_id = first_step[1]  # member1's parent
            second_step = path[1]
            sibling_id = second_step[1]  # the sibling of the parent

            parent_member = members.get(parent_id)
            sibling_member = members.get(sibling_id)

            # The sibling is the parent's sibling
            # If parent is male -> paternal cousin (堂), if female -> maternal cousin (表)
            is_paternal = parent_member and parent_member.gender == 'male' if parent_member else True

            pref = '堂' if is_paternal else '表'
            if gender2 == 'male':
                return f'{pref}兄弟'
            else:
                return f'{pref}姐妹'

    # ONE GENERATION UP (member1 is one gen younger -> member2 is uncle/aunt)
    if gen_diff == -1 and sideways_count > 0:
        # Uncle/aunt
        if len(path_rels) == 2 and path_rels[0] == 'up' and path_rels[1] == 'sideways':
            # member1 -> parent (up) -> parent's sibling (sideways)
            first_step = path[0]
            parent_id = first_step[1]
            parent_member = members.get(parent_id)
            is_paternal = parent_member and parent_member.gender == 'male' if parent_member else True

            if is_paternal:
                if gender2 == 'male':
                    # Father's brother: 伯父 (older) or 叔父 (younger)
                    return '伯父'  # simplified - could check age
                else:
                    # Father's sister: 姑妈
                    return '姑妈'
            else:
                if gender2 == 'male':
                    # Mother's brother: 舅舅
                    return '舅舅'
                else:
                    # Mother's sister: 姨妈
                    return '姨妈'

    # ONE GENERATION DOWN (member1 is one gen older -> member2 is nephew/niece)
    if gen_diff == 1 and sideways_count > 0:
        # Nephew/niece
        # Check if the connection is through a sibling
        # Pattern: sideways -> down (sibling -> their child)
        has_sideways_first = len(path_rels) >= 1 and path_rels[0] == 'sideways'
        has_down = any(d == 'down' for d in path_rels)

        if has_sideways_first and has_down:
            # Determine paternal vs maternal based on member1's gender
            if gender1 == 'male':
                # Brother's children: 侄子/侄女
                return '侄子' if gender2 == 'male' else '侄女'
            else:
                # Sister's children: 外甥/外甥女
                return '外甥' if gender2 == 'male' else '外甥女'

    # TWO GENERATIONS UP (member1 is two gen younger -> grand-uncle/aunt)
    if gen_diff == -2 and sideways_count > 0:
        # Grand-uncle/aunt (parent's uncle/aunt)
        if gender2 == 'male':
            return '叔祖父' if gen_diff < 0 else '伯祖父'
        else:
            return '姑祖母' if gender2 == 'female' else '姨祖母'

    # TWO GENERATIONS DOWN (member1 is two gen older -> grand-nephew/niece)
    if gen_diff == 2 and sideways_count > 0:
        return '侄孙' if gender2 == 'male' else '侄孙女'

    # ----- In-law relationships (through spouse) -----
    # Pattern involves a spouse edge
    has_spouse = any(rel_type == 'spouse' for _, _, rel_type, _ in path)

    if has_spouse:
        if gen_diff == 0:
            # Could be brother/sister-in-law
            # spouse's sibling or sibling's spouse
            return '配偶的兄弟姐妹'
        elif gen_diff == 1:
            # Child's spouse or spouse's sibling's child
            return '儿媳' if gender2 == 'female' else '女婿'
        elif gen_diff == -1:
            # Spouse's parent
            if gender1 == 'male':
                return '岳父' if gender2 == 'male' else '岳母'
            else:
                return '公公' if gender2 == 'male' else '婆婆'

    # Fallback for unknown relationships
    return '无亲属关系'


@kinship_bp.route('/<int:family_id>/kinship/relation', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_relationship(family_id):
    """一站式获取两人关系信息（称呼 + 共同祖先 + 血缘系数 + 路径）"""
    m1_id = request.args.get('member1', type=int)
    m2_id = request.args.get('member2', type=int)
    if not m1_id or not m2_id:
        return jsonify({'error': '需要两个成员ID'}), 400

    from app.services.relationship import get_relationship_info
    result = get_relationship_info(m1_id, m2_id, family_id)

    if 'error' in result:
        return jsonify(result), 404

    return jsonify(result)


@kinship_bp.route('/<int:family_id>/kinship', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def calculate_kinship(family_id):
    """计算两个家族成员之间的亲属关系"""
    member1_id = request.args.get('member1', type=int)
    member2_id = request.args.get('member2', type=int)

    if not member1_id or not member2_id:
        return jsonify({'error': '请提供两个成员的ID: member1, member2'}), 400

    member1 = Member.query.filter_by(id=member1_id, family_id=family_id).first()
    member2 = Member.query.filter_by(id=member2_id, family_id=family_id).first()

    if not member1:
        return jsonify({'error': '成员1不存在'}), 404
    if not member2:
        return jsonify({'error': '成员2不存在'}), 404

    adj, members = build_graph(family_id)
    path = bfs_shortest_path(adj, member1_id, member2_id)
    relationship = determine_relationship(member1, member2, path, members)

    return jsonify({
        'member1': {'id': member1.id, 'name': member1.name},
        'member2': {'id': member2.id, 'name': member2.name},
        'path': [],
        'relationship': relationship,
    })


@kinship_bp.route('/<int:family_id>/kinship/path', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_relationship_path(family_id):
    """获取两个成员之间的关系路径"""
    m1_id = request.args.get('member1', type=int)
    m2_id = request.args.get('member2', type=int)

    if not m1_id or not m2_id:
        return jsonify({'error': '需要两个成员ID'}), 400

    member1 = Member.query.filter_by(id=m1_id, family_id=family_id).first()
    member2 = Member.query.filter_by(id=m2_id, family_id=family_id).first()

    if not member1 or not member2:
        return jsonify({'error': '成员不存在'}), 404

    adj, members = build_graph(family_id)
    path = bfs_shortest_path(adj, m1_id, m2_id)

    if not path:
        return jsonify({
            'member1': {'id': member1.id, 'name': member1.name},
            'member2': {'id': member2.id, 'name': member2.name},
            'path': [],
            'path_node_ids': [],
            'path_edge_keys': [],
            'connected': False,
        })

    path_info = []
    path_node_ids, path_edge_keys = collect_relationship_set(adj, path)
    for from_id, to_id, rel_type, direction in path:
        from_member = members.get(from_id)
        to_member = members.get(to_id)
        path_info.append({
            'from': {'id': from_id, 'name': from_member.name if from_member else 'Unknown'},
            'to': {'id': to_id, 'name': to_member.name if to_member else 'Unknown'},
            'relationship_type': rel_type,
            'direction': direction,
        })

    relationship = determine_relationship(member1, member2, path, members)

    return jsonify({
        'member1': {'id': member1.id, 'name': member1.name},
        'member2': {'id': member2.id, 'name': member2.name},
        'path': path_info,
        'path_node_ids': sorted(path_node_ids),
        'path_edge_keys': sorted(path_edge_keys),
        'relationship': relationship,
        'connected': True,
    })


@kinship_bp.route('/<int:family_id>/kinship/lineage/<int:member_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_lineage_highlight(family_id, member_id):
    """获取成员的高亮集合（金线溯源 / 金扇繁衍 共用）

    Query params:
        max_depth: 向上/向下最大代数，默认 6
        include_siblings: 是否包含同辈（siblings, spouse），默认 true
    Returns:
        {
            member, ancestors: [{id,name,depth}], descendants: [...],
            ancestor_ids, descendant_ids, ancestor_edge_keys, descendant_edge_keys,
            ancestor_chain: [id, id, ...]  (金线主干，从 member 到根)
            descendant_chain: [id, id, ...]  (金扇主干，从 member 到最深子孙)
        }
    """
    max_depth = min(max(1, request.args.get('max_depth', 6, type=int)), 12)
    include_siblings = request.args.get('include_siblings', 'true').lower() == 'true'

    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    adj, members = build_graph(family_id)

    use_cte = current_app.config.get('USE_CTE', True)

    if use_cte:
        try:
            ancestor_ids, ancestor_edge_keys = query_ancestors_cte(member_id, max_depth)
            ancestor_ids = set(ancestor_ids)
        except Exception:
            current_app.logger.warning('CTE ancestors failed, falling back to BFS')
            ancestor_ids, ancestor_edge_keys = collect_ancestors(adj, member_id, max_depth=max_depth)
    else:
        ancestor_ids, ancestor_edge_keys = collect_ancestors(adj, member_id, max_depth=max_depth)

    if use_cte:
        try:
            descendant_ids, descendant_edge_keys = query_descendants_cte(member_id, max_depth)
            descendant_ids = set(descendant_ids)
        except Exception:
            current_app.logger.warning('CTE descendants failed, falling back to BFS')
            descendant_ids, descendant_edge_keys = collect_descendants(adj, member_id, max_depth=max_depth)
    else:
        descendant_ids, descendant_edge_keys = collect_descendants(adj, member_id, max_depth=max_depth)

    sibling_ids = set()
    spouse_ids = set()
    if include_siblings:
        for neighbor, rel_type, dir_ in adj.get(member_id, []):
            if rel_type == 'sibling' and dir_ == 'sideways':
                sibling_ids.add(neighbor)
            elif rel_type == 'spouse' and dir_ == 'sideways':
                spouse_ids.add(neighbor)

    if use_cte:
        try:
            ancestor_chain = find_lineage_chain_cte(member_id, 'up', max_depth=max_depth * 2)
        except Exception:
            current_app.logger.warning('CTE chain up failed, falling back to BFS')
            ancestor_chain = find_lineage_chain(adj, member_id, 'up', max_depth=max_depth * 2)
    else:
        ancestor_chain = find_lineage_chain(adj, member_id, 'up', max_depth=max_depth * 2)

    if use_cte:
        try:
            descendant_chain = find_lineage_chain_cte(member_id, 'down', max_depth=max_depth * 2)
        except Exception:
            current_app.logger.warning('CTE chain down failed, falling back to BFS')
            descendant_chain = find_lineage_chain(adj, member_id, 'down', max_depth=max_depth * 2)
    else:
        descendant_chain = find_lineage_chain(adj, member_id, 'down', max_depth=max_depth * 2)

    def to_list(id_set):
        return [
            {
                'id': mid,
                'name': members[mid].name if mid in members else 'Unknown',
                'generation': members[mid].generation if mid in members and members[mid].generation is not None else 0,
            }
            for mid in id_set
        ]

    return jsonify({
        'member': {'id': member.id, 'name': member.name},
        'max_depth': max_depth,
        'ancestors': to_list(ancestor_ids),
        'descendants': to_list(descendant_ids),
        'siblings': to_list(sibling_ids),
        'spouses': to_list(spouse_ids),
        'ancestor_ids': sorted(ancestor_ids),
        'descendant_ids': sorted(descendant_ids),
        'sibling_ids': sorted(sibling_ids),
        'spouse_ids': sorted(spouse_ids),
        'ancestor_edge_keys': sorted(ancestor_edge_keys),
        'descendant_edge_keys': sorted(descendant_edge_keys),
        'ancestor_chain': ancestor_chain,
        'descendant_chain': descendant_chain,
    })


@kinship_bp.route('/<int:family_id>/kinship/hourglass/<int:member_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_hourglass_view(family_id, member_id):
    """沙漏图视图：以某人为中心，返回上 N 代祖先 + 下 N 代子孙 + 同辈

    Query params:
        ancestor_depth: 向上最大代数，默认 4
        descendant_depth: 向下最大代数，默认 4
        include_siblings: 是否包含同辈（siblings, spouse），默认 true
    Returns:
        {
            member, ancestors: [{id,name,generation}], descendants: [{id,name,generation}],
            siblings, spouses,
            ancestor_edge_keys, descendant_edge_keys,
            all_ids: [全部相关成员 ID]
        }
    """
    ancestor_depth = min(max(1, request.args.get('ancestor_depth', 4, type=int)), 10)
    descendant_depth = min(max(1, request.args.get('descendant_depth', 4, type=int)), 10)
    include_siblings = request.args.get('include_siblings', 'true').lower() == 'true'

    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    adj, members = build_graph(family_id)

    use_cte = current_app.config.get('USE_CTE', True)

    if use_cte:
        try:
            ancestor_ids, ancestor_edge_keys = query_ancestors_cte(member_id, ancestor_depth)
            ancestor_ids = set(ancestor_ids)
        except Exception:
            ancestor_ids, ancestor_edge_keys = collect_ancestors(adj, member_id, max_depth=ancestor_depth)
    else:
        ancestor_ids, ancestor_edge_keys = collect_ancestors(adj, member_id, max_depth=ancestor_depth)

    if use_cte:
        try:
            descendant_ids, descendant_edge_keys = query_descendants_cte(member_id, descendant_depth)
            descendant_ids = set(descendant_ids)
        except Exception:
            descendant_ids, descendant_edge_keys = collect_descendants(adj, member_id, max_depth=descendant_depth)
    else:
        descendant_ids, descendant_edge_keys = collect_descendants(adj, member_id, max_depth=descendant_depth)

    sibling_ids = set()
    spouse_ids = set()
    if include_siblings:
        for neighbor, rel_type, dir_ in adj.get(member_id, []):
            if rel_type == 'sibling' and dir_ == 'sideways':
                sibling_ids.add(neighbor)
            elif rel_type == 'spouse' and dir_ == 'sideways':
                spouse_ids.add(neighbor)

    def to_list(id_set):
        return [
            {
                'id': mid,
                'name': members[mid].name if mid in members else 'Unknown',
                'generation': members[mid].generation if mid in members and members[mid].generation is not None else 0,
            }
            for mid in sorted(id_set)
        ]

    all_ids = sorted({member_id} | ancestor_ids | descendant_ids | sibling_ids | spouse_ids)

    return jsonify({
        'member': {'id': member.id, 'name': member.name, 'generation': member.generation or 0},
        'ancestor_depth': ancestor_depth,
        'descendant_depth': descendant_depth,
        'ancestors': to_list(ancestor_ids),
        'descendants': to_list(descendant_ids),
        'siblings': to_list(sibling_ids),
        'spouses': to_list(spouse_ids),
        'ancestor_ids': sorted(ancestor_ids),
        'descendant_ids': sorted(descendant_ids),
        'sibling_ids': sorted(sibling_ids),
        'spouse_ids': sorted(spouse_ids),
        'ancestor_edge_keys': sorted(ancestor_edge_keys),
        'descendant_edge_keys': sorted(descendant_edge_keys),
        'all_ids': all_ids,
    })


def calculate_wufu_degree(member1, member2, path, members):
    """计算五服等级

    五服制度：
    - 斩衰 (3年): 父母、子女、配偶
    - 齐衰 (1年): 祖父母、兄弟姐妹、叔伯姑姨、侄子女
    - 大功 (9个月): 曾祖父母、堂兄弟姐妹
    - 小功 (5个月): 高祖父母、表兄弟姐妹
    - 缌麻 (3个月): 族兄弟姐妹
    """
    if not path:
        if member1.id == member2.id:
            return {'degree': 'self', 'name': '本人', 'mourning_years': 0}
        return {'degree': 'none', 'name': '无服', 'mourning_years': 0}

    # Analyze path
    gen_count = 0
    sideways_count = 0
    path_rels = []

    for step in path:
        _, _, rel_type, direction = step
        if direction == 'up':
            gen_count += 1
            path_rels.append('up')
        elif direction == 'down':
            gen_count -= 1
            path_rels.append('down')
        else:
            sideways_count += 1
            path_rels.append('sideways')

    # Check if there are spouse edges
    has_spouse = any(rel_type == 'spouse' for _, _, rel_type, _ in path)
    has_parent_child = any(rel_type == 'parent' for _, _, rel_type, _ in path)

    # Count generations up and down
    ups = path_rels.count('up')
    downs = path_rels.count('down')

    # Direct linear relationships (ancestors/descendants)
    if sideways_count == 0:
        if ups == 1 or downs == 1:
            # Parents or children - 斩衰
            return {'degree': 'zancui', 'name': '斩衰', 'mourning_years': 3}
        elif ups == 2 or downs == 2:
            # Grandparents or grandchildren - 齐衰
            return {'degree': 'zicui', 'name': '齐衰', 'mourning_years': 1}
        elif ups == 3 or downs == 3:
            # Great-grandparents or great-grandchildren - 大功
            return {'degree': 'dagong', 'name': '大功', 'mourning_years': 0.75}
        elif ups == 4 or downs == 4:
            # 5th generation - 小功
            return {'degree': 'xiaogong', 'name': '小功', 'mourning_years': 0.42}
        else:
            # 5+ generations - 缌麻
            return {'degree': 'sima', 'name': '缌麻', 'mourning_years': 0.25}

    # Collateral relatives with spouse involved
    if has_spouse and gen_count == 0:
        # Spouse's siblings, in-laws - 齐衰
        return {'degree': 'zicui', 'name': '齐衰', 'mourning_years': 1}

    # Siblings (same generation, sideways through sibling edge)
    if sideways_count > 0 and ups == 0 and downs == 0:
        # Brothers/sisters - 齐衰
        return {'degree': 'zicui', 'name': '齐衰', 'mourning_years': 1}

    # Uncle/aunt or nephew/niece (one generation difference + sideways)
    if (ups == 1 and downs == 1) or (ups == 0 and downs == 0 and sideways_count == 2):
        # Uncle/aunt (through parent) or nephew/niece - 齐衰
        return {'degree': 'zicui', 'name': '齐衰', 'mourning_years': 1}

    # Cousins (two sideways steps with same generation)
    if sideways_count == 2 and ups == 0 and downs == 0:
        # First cousins (堂/表) - 大功
        return {'degree': 'dagong', 'name': '大功', 'mourning_years': 0.75}

    # Second cousins - 小功
    if sideways_count == 3 and ups == 0 and downs == 0:
        return {'degree': 'xiaogong', 'name': '小功', 'mourning_years': 0.42}

    # More distant - 缌麻
    return {'degree': 'sima', 'name': '缌麻', 'mourning_years': 0.25}


@kinship_bp.route('/<int:family_id>/wufu/<int:member_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_wufu_chart(family_id, member_id):
    """获取成员的五服图（传统五服关系可视化）"""
    member = Member.query.filter_by(id=member_id, family_id=family_id).first()
    if not member:
        return jsonify({'error': '成员不存在'}), 404

    adj, members = build_graph(family_id)

    # Classify all relatives into five fu categories
    wufu_data = {
        'member': {'id': member.id, 'name': member.name},
        'zancui': [],      # 斩衰 - 3年
        'zicui': [],       # 齐衰 - 1年
        'dagong': [],      # 大功 - 9个月
        'xiaogong': [],    # 小功 - 5个月
        'sima': [],        # 缌麻 - 3个月
    }

    for other_id, other_member in members.items():
        if other_id == member_id:
            continue

        path = bfs_shortest_path(adj, member_id, other_id)
        wufu_result = calculate_wufu_degree(member, other_member, path, members)

        member_data = {
            'id': other_member.id,
            'name': other_member.name,
            'gender': other_member.gender,
            'generation': other_member.generation,
            'relationship': wufu_result['name'],
            'path': [
                {'from': p[0], 'to': p[1], 'type': p[2], 'direction': p[3]}
                for p in path
            ] if path else []
        }

        if wufu_result['degree'] == 'zancui':
            wufu_data['zancui'].append(member_data)
        elif wufu_result['degree'] == 'zicui':
            wufu_data['zicui'].append(member_data)
        elif wufu_result['degree'] == 'dagong':
            wufu_data['dagong'].append(member_data)
        elif wufu_result['degree'] == 'xiaogong':
            wufu_data['xiaogong'].append(member_data)
        elif wufu_result['degree'] == 'sima':
            wufu_data['sima'].append(member_data)

    return jsonify(wufu_data)


# -------- 成员扩展信息 CRUD（迁徙/葬地/出嫁女）--------


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/extensions', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_member_extensions(family_id, member_id):
    migrations = [m.to_dict() for m in MemberMigration.query.filter_by(member_id=member_id).order_by(MemberMigration.sort_order).all()]
    burials = [b.to_dict() for b in MemberBurial.query.filter_by(member_id=member_id).all()]
    married_out = [d.to_dict() for d in MarriedOutDaughter.query.filter_by(member_id=member_id).all()]
    return jsonify({'migrations': migrations, 'burials': burials, 'married_out': married_out})


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/migrations', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def add_migration(family_id, member_id):
    data = request.get_json()
    if not data or not data.get('to_place'):
        return jsonify({'error': '迁入地不能为空'}), 400
    m = MemberMigration(member_id=member_id, to_place=data['to_place'],
                        from_place=data.get('from_place'), year=data.get('year'),
                        reason=data.get('reason'), notes=data.get('notes'),
                        sort_order=data.get('sort_order', 0))
    db.session.add(m)
    db.session.commit()
    return jsonify({'message': '迁徙记录已添加', 'migration': m.to_dict()}), 201


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/migrations/<int:mig_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_migration(family_id, member_id, mig_id):
    mig = MemberMigration.query.filter_by(id=mig_id, member_id=member_id).first()
    if not mig:
        return jsonify({'error': '迁徙记录不存在'}), 404
    data = request.get_json()
    for f in ('to_place', 'from_place', 'year', 'reason', 'notes', 'sort_order'):
        if f in data:
            setattr(mig, f, data[f])
    db.session.commit()
    return jsonify({'message': '迁徙记录已更新', 'migration': mig.to_dict()})


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/migrations/<int:mig_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_migration(family_id, member_id, mig_id):
    mig = MemberMigration.query.filter_by(id=mig_id, member_id=member_id).first()
    if not mig:
        return jsonify({'error': '迁徙记录不存在'}), 404
    db.session.delete(mig)
    db.session.commit()
    return jsonify({'message': '迁徙记录已删除'})


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/burials', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def add_burial(family_id, member_id):
    data = request.get_json()
    if not data or not data.get('burial_place'):
        return jsonify({'error': '葬地不能为空'}), 400
    b = MemberBurial(member_id=member_id, burial_place=data['burial_place'],
                     latitude=data.get('latitude'), longitude=data.get('longitude'),
                     orientation=data.get('orientation'), notes=data.get('notes'))
    db.session.add(b)
    db.session.commit()
    return jsonify({'message': '葬地信息已添加', 'burial': b.to_dict()}), 201


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/burials/<int:burial_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_burial(family_id, member_id, burial_id):
    b = MemberBurial.query.filter_by(id=burial_id, member_id=member_id).first()
    if not b:
        return jsonify({'error': '葬地记录不存在'}), 404
    data = request.get_json()
    for f in ('burial_place', 'latitude', 'longitude', 'orientation', 'notes'):
        if f in data:
            setattr(b, f, data[f])
    db.session.commit()
    return jsonify({'message': '葬地信息已更新', 'burial': b.to_dict()})


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/burials/<int:burial_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_burial(family_id, member_id, burial_id):
    b = MemberBurial.query.filter_by(id=burial_id, member_id=member_id).first()
    if not b:
        return jsonify({'error': '葬地记录不存在'}), 404
    db.session.delete(b)
    db.session.commit()
    return jsonify({'message': '葬地信息已删除'})


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/married-out', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def add_married_out(family_id, member_id):
    data = request.get_json()
    if not data or not data.get('married_to_name'):
        return jsonify({'error': '夫家姓名不能为空'}), 400
    d = MarriedOutDaughter(member_id=member_id, married_to_name=data['married_to_name'],
                           married_to_place=data.get('married_to_place'),
                           married_year=data.get('married_year'), notes=data.get('notes'))
    db.session.add(d)
    db.session.commit()
    return jsonify({'message': '出嫁女信息已添加', 'married_out': d.to_dict()}), 201


@kinship_bp.route('/<int:family_id>/members/<int:member_id>/married-out/<int:mo_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_married_out(family_id, member_id, mo_id):
    d = MarriedOutDaughter.query.filter_by(id=mo_id, member_id=member_id).first()
    if not d:
        return jsonify({'error': '出嫁女记录不存在'}), 404
    data = request.get_json()
    for f in ('married_to_name', 'married_to_place', 'married_year', 'notes'):
        if f in data:
            setattr(d, f, data[f])
    db.session.commit()
    return jsonify({'message': '出嫁女信息已更新', 'married_out': d.to_dict()})


@kinship_bp.route('/<int:family_id>/members/statistics/generations', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def generation_statistics(family_id):
    """字辈频次统计 + 世代人口分布"""
    from sqlalchemy import func

    # 字辈频次
    gen_names = db.session.query(
        Member.generation_name, func.count(Member.id).label('count')
    ).filter(Member.family_id == family_id, Member.generation_name.isnot(None))\
     .group_by(Member.generation_name).order_by(func.min(Member.generation).asc()).all()

    # 世代人口分布（按 generation 汇总）
    gen_dist = db.session.query(
        Member.generation, func.count(Member.id).label('count')
    ).filter(Member.family_id == family_id, Member.generation.isnot(None))\
     .group_by(Member.generation).order_by(Member.generation.asc()).all()

    # 性别分布按世代
    gen_gender = db.session.query(
        Member.generation, Member.gender, func.count(Member.id).label('count')
    ).filter(Member.family_id == family_id, Member.generation.isnot(None))\
     .group_by(Member.generation, Member.gender).order_by(Member.generation.asc()).all()

    # 在世/已故统计
    alive_count = Member.query.filter_by(family_id=family_id, is_alive=True).count()
    dead_count = Member.query.filter_by(family_id=family_id, is_alive=False).count()

    return jsonify({
        'total': Member.query.filter_by(family_id=family_id).count(),
        'alive_count': alive_count,
        'dead_count': dead_count,
        'generation_names': [
            {'generation_name': g[0], 'count': g[1]} for g in gen_names
        ],
        'generation_distribution': [
            {'generation': g[0], 'count': g[1]} for g in gen_dist
        ],
        'generation_gender': [
            {'generation': g[0], 'gender': g[1], 'count': g[2]} for g in gen_gender
        ],
    })
@jwt_required()
@family_permission_required('editor')
def delete_married_out(family_id, member_id, mo_id):
    d = MarriedOutDaughter.query.filter_by(id=mo_id, member_id=member_id).first()
    if not d:
        return jsonify({'error': '出嫁女记录不存在'}), 404
    db.session.delete(d)
    db.session.commit()
    return jsonify({'message': '出嫁女信息已删除'})
