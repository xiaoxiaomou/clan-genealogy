from collections import deque
from sqlalchemy import text
from flask import current_app
from app import db
from app.models.relationship import Relationship


def _build_graph(family_id):
    """从数据库中构建家族关系图（复用 kinship.py 的逻辑）"""
    from app.models.member import Member
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


def query_ancestors_cte(member_id, max_depth=12):
    """使用 WITH RECURSIVE 向上查祖先链（PostgreSQL/SQLite 兼容）
    Returns:
        (ancestor_ids: list[int], edge_keys: set[str])
    """
    sql = text("""
        WITH RECURSIVE ancestors AS (
            SELECT related_member_id AS ancestor_id, member_id AS child_id, 1 AS depth
            FROM relationships
            WHERE member_id = :mid AND relationship_type = 'parent'
            UNION ALL
            SELECT r.related_member_id, r.member_id, a.depth + 1
            FROM relationships r
            INNER JOIN ancestors a ON r.member_id = a.ancestor_id
            WHERE r.relationship_type = 'parent' AND a.depth < :max_depth
        )
        SELECT DISTINCT ancestor_id, child_id, depth FROM ancestors
        ORDER BY depth
    """)

    result = db.session.execute(sql, {'mid': member_id, 'max_depth': max_depth}).fetchall()
    ancestor_ids = []
    edge_keys = set()
    for row in result:
        ancestor_id = int(row[0])
        child_id = int(row[1])
        ancestor_ids.append(ancestor_id)
        ek = (min(ancestor_id, child_id), max(ancestor_id, child_id))
        edge_keys.add(f'{ek[0]}-{ek[1]}')

    return ancestor_ids, edge_keys


def query_descendants_cte(member_id, max_depth=12):
    """使用 WITH RECURSIVE 向下查子孙链
    Returns:
        (descendant_ids: list[int], edge_keys: set[str])
    """
    sql = text("""
        WITH RECURSIVE descendants AS (
            SELECT member_id AS descendant_id, related_member_id AS parent_id, 1 AS depth
            FROM relationships
            WHERE related_member_id = :mid AND relationship_type = 'parent'
            UNION ALL
            SELECT r.member_id, r.related_member_id, d.depth + 1
            FROM relationships r
            INNER JOIN descendants d ON r.related_member_id = d.descendant_id
            WHERE r.relationship_type = 'parent' AND d.depth < :max_depth
        )
        SELECT DISTINCT descendant_id, parent_id, depth FROM descendants
        ORDER BY depth
    """)

    result = db.session.execute(sql, {'mid': member_id, 'max_depth': max_depth}).fetchall()
    descendant_ids = []
    edge_keys = set()
    for row in result:
        descendant_id = int(row[0])
        parent_id = int(row[1])
        descendant_ids.append(descendant_id)
        ek = (min(descendant_id, parent_id), max(descendant_id, parent_id))
        edge_keys.add(f'{ek[0]}-{ek[1]}')

    return descendant_ids, edge_keys


def query_ancestors_with_cte(member_id, max_depth=12):
    """向上查祖先，含 BFS fallback"""
    try:
        return query_ancestors_cte(member_id, max_depth)
    except Exception:
        current_app.logger.warning('CTE ancestors query failed, falling back to BFS')
        adj, members = _build_graph(current_app.config.get('FAMILY_ID', None))
        from app.routes.kinship import collect_ancestors
        if adj:
            ids, edges = collect_ancestors(adj, member_id, max_depth)
            return list(ids), edges
        return [], set()


def query_descendants_with_cte(member_id, max_depth=12):
    """向下查子孙，含 BFS fallback"""
    try:
        return query_descendants_cte(member_id, max_depth)
    except Exception:
        current_app.logger.warning('CTE descendants query failed, falling back to BFS')
        adj, members = _build_graph(current_app.config.get('FAMILY_ID', None))
        from app.routes.kinship import collect_descendants
        if adj:
            ids, edges = collect_descendants(adj, member_id, max_depth)
            return list(ids), edges
        return [], set()


def find_lineage_chain_cte(member_id, direction='up', max_depth=24):
    """用 CTE 查主干（member 到最远祖先/最深子孙的有序列表）"""
    if direction == 'up':
        sql = text("""
            WITH RECURSIVE chain AS (
                SELECT member_id AS from_id, related_member_id AS to_id, 1 AS depth
                FROM relationships
                WHERE member_id = :mid AND relationship_type = 'parent'
                UNION ALL
                SELECT r.member_id, r.related_member_id, c.depth + 1
                FROM relationships r
                INNER JOIN chain c ON r.member_id = c.to_id
                WHERE r.relationship_type = 'parent' AND c.depth < :max_depth
            )
            SELECT to_id, depth FROM chain ORDER BY depth
        """)
    else:
        sql = text("""
            WITH RECURSIVE chain AS (
                SELECT member_id AS from_id, related_member_id AS to_id, 1 AS depth
                FROM relationships
                WHERE related_member_id = :mid AND relationship_type = 'parent'
                UNION ALL
                SELECT r.member_id, r.related_member_id, c.depth + 1
                FROM relationships r
                INNER JOIN chain c ON r.member_id = c.from_id
                WHERE r.relationship_type = 'parent' AND c.depth < :max_depth
            )
            SELECT from_id, depth FROM chain ORDER BY depth
        """)

    try:
        result = db.session.execute(sql, {'mid': member_id, 'max_depth': max_depth}).fetchall()
        chain = [member_id]
        for row in result:
            chain.append(int(row[0]))
        return chain
    except Exception:
        current_app.logger.warning('CTE chain query failed, returning [member_id]')
        return [member_id]
