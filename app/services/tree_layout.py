"""世系图布局算法

支持的样式：
- 欧式（OU）：竖式（横卷式）—— 始祖居上，子嗣向下；每代之间垂直分层
- 苏式（SU）：横式（蝴蝶式/宝塔式）—— 始祖居中，向上下展开
- 宝塔式（BAOTA）：始祖居中，向下展开（与苏式相似但分支左右对称；横式层级）

实现思路：
- 已有成员的 `generation` 字段作为世系层级
- 通过 relationships 表中的 parent_id 关系构建父子树
- 对每个成员根据样式计算 (x, y) 屏幕坐标
- 返回扁平化节点 + 边集合，前端 SVG 渲染
"""
from collections import defaultdict, deque
from typing import Any


def _build_family_tree(members, relationships):
    """构建以 root_id 为根的父→子关系树"""
    parent_of = {}  # child_id -> set of parent_ids
    for rel in relationships:
        if rel.relationship_type in ('parent', 'father', 'mother'):
            parent_of.setdefault(rel.related_member_id, set()).add(rel.member_id)

    children_of = defaultdict(set)
    for child, parents in parent_of.items():
        for p in parents:
            children_of[p].add(child)

    return children_of, parent_of


def _find_roots(members, parent_of):
    """找出没有父亲的成员作为根"""
    member_ids = {m.id for m in members}
    return [m for m in members if m.id not in parent_of]


def _subtree_size(children_of, node_id, memo):
    """递归计算子树大小（用于对称布局）"""
    if node_id in memo:
        return memo[node_id]
    size = 1
    for cid in children_of.get(node_id, set()):
        size += _subtree_size(children_of, cid, memo)
    memo[node_id] = size
    return size


def _layout_su(roots, children_of):
    """苏式横展布局：根在中间，子嗣左右展开

    返回 [(id, x, y, gen)] + 边列表
    """
    nodes = []
    edges = []
    memo = {}
    cursor = [0]  # 用列表做可变游标

    def walk(node_id, depth, side):
        """side: 1=左, -1=右"""
        size = _subtree_size(children_of, node_id, memo)
        # 当前节点位置
        if side == -1:  # 左侧扩展
            cursor[0] -= size
            my_pos = cursor[0] + size // 2
        else:
            my_pos = cursor[0] + size // 2
            cursor[0] += size

        nodes.append({'id': node_id, 'x': my_pos, 'y': depth, 'gen': depth})

        for i, cid in enumerate(sorted(children_of.get(node_id, set()))):
            child_side = -1 if i == 0 else 1 if i == 1 else 0  # 简化：第一子左，第二子右
            walk(cid, depth + 1, child_side)
            edges.append({'from': node_id, 'to': cid})

    # 多根情况：把每个根当独立分支横展
    for root in roots:
        walk(root.id, 0, 1)
        cursor[0] += 1  # 根之间留空

    return nodes, edges


def _layout_ou(roots, children_of):
    """欧式竖展布局：根在最上，子嗣垂直向下"""
    nodes = []
    edges = []
    memo = {}

    def walk(node_id, depth, x_offset):
        size = _subtree_size(children_of, node_id, memo)
        children = sorted(children_of.get(node_id, set()))
        if not children:
            nodes.append({'id': node_id, 'x': x_offset, 'y': depth, 'gen': depth})
            return x_offset
        # 先递归所有子节点，累加偏移
        new_offset = x_offset
        child_positions = []
        for cid in children:
            start = new_offset
            new_offset = walk(cid, depth + 1, new_offset)
            mid = (start + new_offset - 1) / 2
            child_positions.append((cid, mid))
        # 当前节点 x 为子节点中点
        my_x = (child_positions[0][1] + child_positions[-1][1]) / 2
        nodes.append({'id': node_id, 'x': my_x, 'y': depth, 'gen': depth})
        for cid, _ in child_positions:
            edges.append({'from': node_id, 'to': cid})
        return new_offset

    x = 0
    for root in roots:
        x = walk(root.id, 0, x) + 1

    return nodes, edges


def _layout_baota(roots, children_of):
    """宝塔式：根居中，左右镜像对称

    与苏式类似，但强制左右对称分支
    """
    nodes = []
    edges = []
    memo = {}

    def walk(node_id, depth, anchor):
        """anchor: 父节点的位置，子节点围绕 anchor 左右展开"""
        size = _subtree_size(children_of, node_id, memo)
        children = sorted(children_of.get(node_id, set()))
        if not children:
            nodes.append({'id': node_id, 'x': anchor, 'y': depth, 'gen': depth})
            return
        # 把子树分配到左右两侧
        mid = len(children) // 2
        left = children[:mid]
        right = children[mid:]
        x = anchor
        # 左侧
        for cid in left:
            x = walk(cid, depth + 1, x - size / (2 * (len(left) + 1)))
            edges.append({'from': node_id, 'to': cid})
        # 右侧
        for cid in right:
            x = walk(cid, depth + 1, x + size / (2 * (len(right) + 1)))
            edges.append({'from': node_id, 'to': cid})
        nodes.append({'id': node_id, 'x': anchor, 'y': depth, 'gen': depth})

    x = 0
    for root in roots:
        walk(root.id, 0, x)
        x += 5
        edges_set = set((e['from'], e['to']) for e in edges)  # noqa: F841

    return nodes, edges


def build_lineage_chart(members, relationships, style: str, root_member_id: int | None = None):
    """主入口：构建世系图节点+边

    Args:
        members: Member 对象列表
        relationships: Relationship 对象列表
        style: 'su' / 'ou' / 'baota'
        root_member_id: 限定某个根；None 则自动找根
    """
    children_of, parent_of = _build_family_tree(members, relationships)

    if root_member_id:
        roots = [m for m in members if m.id == root_member_id]
    else:
        roots = _find_roots(members, parent_of)

    if not roots:
        return {'nodes': [], 'edges': [], 'style': style}

    if style == 'su':
        nodes, edges = _layout_su(roots, children_of)
    elif style == 'ou':
        nodes, edges = _layout_ou(roots, children_of)
    elif style == 'baota':
        nodes, edges = _layout_baota(roots, children_of)
    else:
        nodes, edges = _layout_ou(roots, children_of)

    # 节点上挂载成员信息
    member_map = {m.id: m for m in members}
    enriched = []
    for n in nodes:
        m = member_map.get(n['id'])
        if not m:
            continue
        # 从 birth_date/death_date 字符串中提取年份
        birth_year = None
        if m.birth_date and len(m.birth_date) >= 4 and m.birth_date[:4].isdigit():
            birth_year = int(m.birth_date[:4])
        death_year = None
        if m.death_date and len(m.death_date) >= 4 and m.death_date[:4].isdigit():
            death_year = int(m.death_date[:4])
        enriched.append({
            'id': m.id,
            'name': m.name,
            'gender': m.gender,
            'is_alive': m.is_alive,
            'generation': m.generation,
            'birth_year': birth_year,
            'death_year': death_year,
            'x': n['x'],
            'y': n['y'],
        })
    return {'nodes': enriched, 'edges': edges, 'style': style}


def build_cousin_tree(members, relationships, root_member_id: int, depth: int = 3):
    """旁系图：从 root_member_id 出发，向所有方向的亲缘关系扩展

    包括：直系（父母/祖父母/外祖父母/曾祖）+
          旁系（伯/叔/姑/舅/姨/堂兄弟/表兄弟）+ 配偶
    """
    rel_map = defaultdict(list)  # member_id -> [(related_id, rel_type, direction)]
    for r in relationships:
        rel_map[r.member_id].append((r.related_member_id, r.relationship_type))
        rel_map[r.related_member_id].append((r.member_id, r.relationship_type, True))  # 反向

    member_map = {m.id: m for m in members}
    visited = {root_member_id}
    queue = deque([(root_member_id, 0)])
    nodes = []
    edges = []

    nodes.append({
        'id': root_member_id,
        'name': member_map[root_member_id].name if root_member_id in member_map else f'#{root_member_id}',
        'gender': getattr(member_map.get(root_member_id), 'gender', 'unknown'),
        'generation': getattr(member_map.get(root_member_id), 'generation', None),
        'depth': 0,
        'is_root': True,
    })

    while queue:
        cur_id, cur_depth = queue.popleft()
        if cur_depth >= depth:
            continue
        for item in rel_map[cur_id]:
            if len(item) == 2:
                rel_id, rel_type = item
                is_reverse = False
            else:
                rel_id, rel_type, is_reverse = item
            if rel_id in visited:
                continue
            visited.add(rel_id)
            m = member_map.get(rel_id)
            if not m:
                continue
            nodes.append({
                'id': m.id,
                'name': m.name,
                'gender': m.gender,
                'generation': m.generation,
                'depth': cur_depth + 1,
                'is_root': False,
            })
            edges.append({
                'from': cur_id,
                'to': m.id,
                'rel_type': rel_type,
                'is_reverse': is_reverse,
            })
            queue.append((m.id, cur_depth + 1))

    return {'nodes': nodes, 'edges': edges, 'root_id': root_member_id, 'depth': depth}
