"""族谱关系高亮接口测试（A1 金线溯源 + A2 关系路径）"""
import pytest

from app import db
from app.models.member import Member
from app.models.relationship import Relationship


def _make_member(family_id, name, generation=1, gender='male'):
    m = Member(
        family_id=family_id,
        name=name,
        gender=gender,
        generation=generation,
        is_alive=True,
    )
    db.session.add(m)
    db.session.commit()
    db.session.refresh(m)
    return m


def _add_parent(family_id, child_id, parent_id):
    rel = Relationship(
        member_id=child_id,
        related_member_id=parent_id,
        relationship_type='parent',
    )
    db.session.add(rel)
    db.session.commit()
    return rel


def _add_spouse(family_id, m1, m2):
    rel = Relationship(
        member_id=m1,
        related_member_id=m2,
        relationship_type='spouse',
    )
    db.session.add(rel)
    db.session.commit()
    return rel


def _add_sibling(family_id, m1, m2):
    rel = Relationship(
        member_id=m1,
        related_member_id=m2,
        relationship_type='sibling',
    )
    db.session.add(rel)
    db.session.commit()
    return rel


@pytest.fixture
def three_gen_tree(app, _db, sample_family):
    """构造一棵三代家族树：

        张祖 (gen 1)
            ├── 张父 (gen 2)
            │       ├── 张本人 (gen 3, male)
            │       └── 张妹 (gen 3, female)
            └── 张伯 (gen 2)
                    └── 张堂兄 (gen 3)
        张母 (配偶 of 张父, gen 2)
    """
    fid = sample_family.id
    zhu = _make_member(fid, '张祖', 1, 'male')
    fu = _make_member(fid, '张父', 2, 'male')
    mu = _make_member(fid, '张母', 2, 'female')
    bo = _make_member(fid, '张伯', 2, 'male')
    ben = _make_member(fid, '张本人', 3, 'male')
    mei = _make_member(fid, '张妹', 3, 'female')
    tang = _make_member(fid, '张堂兄', 3, 'male')

    _add_parent(fid, fu.id, zhu.id)
    _add_parent(fid, ben.id, fu.id)
    _add_parent(fid, mei.id, fu.id)
    _add_parent(fid, bo.id, zhu.id)
    _add_parent(fid, tang.id, bo.id)
    _add_spouse(fid, fu.id, mu.id)
    _add_sibling(fid, ben.id, mei.id)
    return {
        'zhu': zhu, 'fu': fu, 'mu': mu, 'bo': bo,
        'ben': ben, 'mei': mei, 'tang': tang,
    }


class TestLineageHighlight:
    """金线溯源 / 金扇繁衍 高亮接口"""

    def test_ancestors_of_leaf(self, client, auth_headers, sample_family, three_gen_tree):
        """张本人的祖先应包含张父（直系父）和张祖（祖父），不含配偶/叔伯"""
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}',
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        ids = {a['id'] for a in data['ancestors']}
        assert three_gen_tree['fu'].id in ids
        assert three_gen_tree['zhu'].id in ids
        # 配偶是 sideways，不在父链上
        assert three_gen_tree['mu'].id not in ids
        # 叔伯不在直系父链上
        assert three_gen_tree['bo'].id not in ids
        # 堂兄是堂叔的子，不应出现
        assert three_gen_tree['tang'].id not in ids

    def test_descendants_of_root(self, client, auth_headers, sample_family, three_gen_tree):
        """张祖的子孙应包含父、伯、本人、妹、堂兄"""
        zhu = three_gen_tree['zhu']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{zhu.id}',
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        ids = {d['id'] for d in data['descendants']}
        assert {three_gen_tree[k].id for k in ('fu', 'bo', 'ben', 'mei', 'tang')} <= ids

    def test_ancestor_chain_is_ordered(self, client, auth_headers, sample_family, three_gen_tree):
        """ancestor_chain 应是从 member 到根的有序节点列表"""
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}',
            headers=auth_headers,
        )
        chain = resp.get_json()['ancestor_chain']
        assert chain[0] == ben.id
        assert three_gen_tree['zhu'].id in chain
        # ben -> fu -> zhu 中间应经过 fu
        assert three_gen_tree['fu'].id in chain
        # 顺序：ben 在前
        assert chain.index(ben.id) < chain.index(three_gen_tree['fu'].id)

    def test_descendant_chain_includes_leaf(self, client, auth_headers, sample_family, three_gen_tree):
        """descendant_chain 应包含最深的后代"""
        zhu = three_gen_tree['zhu']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{zhu.id}',
            headers=auth_headers,
        )
        chain = resp.get_json()['descendant_chain']
        assert chain[0] == zhu.id
        # 最深 3 代：zhu -> fu -> ben（2 步）或 zhu -> bo -> tang
        assert len(chain) >= 3

    def test_siblings_and_spouses(self, client, auth_headers, sample_family, three_gen_tree):
        """同辈 + 配偶应被识别"""
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}',
            headers=auth_headers,
        )
        data = resp.get_json()
        sibling_ids = set(data['sibling_ids'])
        spouse_ids = set(data['spouse_ids'])
        # 张妹 是张本人的姐妹
        assert three_gen_tree['mei'].id in sibling_ids
        # 张本人没有配偶
        assert spouse_ids == set()

    def test_exclude_siblings(self, client, auth_headers, sample_family, three_gen_tree):
        """include_siblings=false 时不应返回 siblings/spouses"""
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}'
            '?include_siblings=false',
            headers=auth_headers,
        )
        data = resp.get_json()
        assert data['siblings'] == []
        assert data['siblings_ids'] if 'siblings_ids' in data else True
        assert data['spouses'] == []

    def test_member_not_found(self, client, auth_headers, sample_family):
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/99999',
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_max_depth_limit(self, client, auth_headers, sample_family, three_gen_tree):
        """max_depth=1 时张本人只能看到直接父辈"""
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}?max_depth=1',
            headers=auth_headers,
        )
        data = resp.get_json()
        ids = {a['id'] for a in data['ancestors']}
        assert three_gen_tree['fu'].id in ids
        # 张祖（祖父）距 ben 2 代，max_depth=1 时不应出现
        assert three_gen_tree['zhu'].id not in ids


class TestRelationshipPathSets:
    """A2 关系路径接口应同时返回 node_ids / edge_keys 集合供前端高亮"""

    def test_path_includes_id_sets(self, client, auth_headers, sample_family, three_gen_tree):
        ben = three_gen_tree['ben']
        tang = three_gen_tree['tang']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/path'
            f'?member1={ben.id}&member2={tang.id}',
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['connected'] is True
        # path_node_ids 应包含路径上的所有节点
        path_node_ids = set(data['path_node_ids'])
        assert {ben.id, tang.id, three_gen_tree['fu'].id, three_gen_tree['zhu'].id,
                three_gen_tree['bo'].id} <= path_node_ids
        # path_edge_keys 应非空
        assert len(data['path_edge_keys']) >= 4
        # 至少有一个 key 形如 "a-b"
        assert any('-' in k for k in data['path_edge_keys'])

    def test_unrelated_returns_empty(self, client, auth_headers, sample_family, _db):
        """不连通的成员 path 应为空"""
        from app.models.family import FamilyMember
        a = _make_member(sample_family.id, '孤独A', 1, 'male')
        b = _make_member(sample_family.id, '孤独B', 1, 'female')
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/path?member1={a.id}&member2={b.id}',
            headers=auth_headers,
        )
        data = resp.get_json()
        assert data['connected'] is False
        assert data['path_node_ids'] == []
        assert data['path_edge_keys'] == []
