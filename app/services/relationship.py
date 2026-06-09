from collections import deque

from app import db
from app.models.member import Member
from app.models.relationship import Relationship


def _build_graph(family_id):
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
            adj[m1].append((m2, 'parent', 'up'))
            adj[m2].append((m1, 'parent', 'down'))
        elif rel.relationship_type == 'spouse':
            adj[m1].append((m2, 'spouse', 'sideways'))
            adj[m2].append((m1, 'spouse', 'sideways'))
        elif rel.relationship_type == 'sibling':
            adj[m1].append((m2, 'sibling', 'sideways'))
            adj[m2].append((m1, 'sibling', 'sideways'))
    return adj, members


def bfs_shortest_path(adj, start, end):
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


def find_common_ancestors(member_a_id, member_b_id, family_id):
    """找两人的共同祖先"""
    adj, members = _build_graph(family_id)

    def get_ancestors(mid):
        ancestors = set()
        visited = {mid}
        queue = deque([(mid, 0)])
        while queue:
            cur, depth = queue.popleft()
            for neighbor, rel_type, direction in adj.get(cur, []):
                if direction == 'up' and rel_type == 'parent':
                    if neighbor not in visited:
                        visited.add(neighbor)
                        ancestors.add(neighbor)
                        queue.append((neighbor, depth + 1))
        return ancestors

    ancestors_a = get_ancestors(member_a_id)
    ancestors_b = get_ancestors(member_b_id)
    common = ancestors_a & ancestors_b
    result = []
    for cid in common:
        member = members.get(cid)
        if member:
            result.append({'id': member.id, 'name': member.name, 'gender': member.gender})
    return result


def compute_consanguinity(path):
    """Wright 路径系数法
    直接亲子：0.5
    祖孙：0.25^n（n 代）
    兄弟姐妹：0.5
    叔侄/姑甥：0.25
    堂兄弟：0.125
    path: list of (from_id, to_id, rel_type, direction)
    """
    if not path:
        return 0.0

    ups = sum(1 for _, _, _, d in path if d == 'up')
    downs = sum(1 for _, _, _, d in path if d == 'down')
    sideways = sum(1 for _, _, _, d in path if d == 'sideways')
    has_spouse = any(rel == 'spouse' for _, _, rel, _ in path)

    total_steps = len(path)

    if has_spouse:
        return 0.0

    if sideways == 0:
        if ups == 1 or downs == 1:
            return 0.5
        elif ups == 2 or downs == 2:
            return 0.25
        elif ups == 3 or downs == 3:
            return 0.125
        elif ups >= 4 or downs >= 4:
            return 0.5 ** (ups + downs)

    if sideways > 0 and ups == 0 and downs == 0:
        if sideways == 1:
            return 0.5
        if sideways == 2:
            return 0.125
        if sideways >= 3:
            return 0.5 ** (sideways + 1)

    if sideways > 0:
        gen_diff = abs(ups - downs)
        total = ups + downs + sideways
        if gen_diff == 0:
            if total == 3:
                return 0.125
            return 0.5 ** (total - 1)
        if gen_diff == 1:
            if total == 2:
                return 0.25
            return 0.5 ** total

    return 0.5 ** total


def compute_chinese_kinship_term(member1, member2, path, members):
    """计算中文亲属关系称呼"""
    from app.routes.kinship import determine_relationship
    return determine_relationship(member1, member2, path, members)


def get_relationship_info(member1_id, member2_id, family_id):
    """一站式获取两人关系信息"""
    if member1_id == member2_id:
        member = Member.query.get(member1_id)
        return {
            'member1': {'id': member.id, 'name': member.name},
            'member2': {'id': member.id, 'name': member.name},
            'path': [],
            'relationship': '自己',
            'common_ancestors': [],
            'consanguinity': 0.0,
            'connected': True,
        }

    member1 = Member.query.filter_by(id=member1_id, family_id=family_id).first()
    member2 = Member.query.filter_by(id=member2_id, family_id=family_id).first()

    if not member1 or not member2:
        return {'error': '成员不存在'}

    adj, members = _build_graph(family_id)
    path = bfs_shortest_path(adj, member1_id, member2_id)

    if not path:
        return {
            'member1': {'id': member1.id, 'name': member1.name},
            'member2': {'id': member2.id, 'name': member2.name},
            'path': [],
            'relationship': '无亲属关系',
            'common_ancestors': [],
            'consanguinity': 0.0,
            'connected': False,
        }

    relationship = compute_chinese_kinship_term(member1, member2, path, members)
    consanguinity = compute_consanguinity(path)

    path_info = []
    for from_id, to_id, rel_type, direction in path:
        from_member = members.get(from_id)
        to_member = members.get(to_id)
        path_info.append({
            'from': {'id': from_id, 'name': from_member.name if from_member else 'Unknown'},
            'to': {'id': to_id, 'name': to_member.name if to_member else 'Unknown'},
            'relationship_type': rel_type,
            'direction': direction,
        })

    common_ancestors = find_common_ancestors(member1_id, member2_id, family_id)

    path_node_ids = set()
    path_edge_keys = set()
    for frm, to, rel_type, _ in path:
        path_node_ids.add(frm)
        path_node_ids.add(to)
        ek = (min(frm, to), max(frm, to), rel_type)
        path_edge_keys.add(f'{ek[0]}-{ek[1]}')

    return {
        'member1': {'id': member1.id, 'name': member1.name, 'gender': member1.gender},
        'member2': {'id': member2.id, 'name': member2.name, 'gender': member2.gender},
        'path': path_info,
        'path_node_ids': sorted(path_node_ids),
        'path_edge_keys': sorted(path_edge_keys),
        'relationship': relationship,
        'common_ancestors': common_ancestors,
        'consanguinity': round(consanguinity, 4),
        'connected': True,
    }
