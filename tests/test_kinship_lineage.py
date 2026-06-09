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
    """构造一棵三代家族树（李氏）：

        李祖 (gen 1)
            ├── 李父 (gen 2)
            │       ├── 李本人 (gen 3, male)
            │       └── 李妹 (gen 3, female)
            └── 李伯 (gen 2)
                    └── 李堂兄 (gen 3)
        李母 (配偶 of 李父, gen 2)
    """
    fid = sample_family.id
    zhu = _make_member(fid, '李祖', 1, 'male')
    fu = _make_member(fid, '李父', 2, 'male')
    mu = _make_member(fid, '李母', 2, 'female')
    bo = _make_member(fid, '李伯', 2, 'male')
    ben = _make_member(fid, '李本人', 3, 'male')
    mei = _make_member(fid, '李妹', 3, 'female')
    tang = _make_member(fid, '李堂兄', 3, 'male')

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
    def test_ancestors_of_leaf(self, client, auth_headers, sample_family, three_gen_tree):
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
        assert three_gen_tree['mu'].id not in ids
        assert three_gen_tree['bo'].id not in ids
        assert three_gen_tree['tang'].id not in ids

    def test_descendants_of_root(self, client, auth_headers, sample_family, three_gen_tree):
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
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}',
            headers=auth_headers,
        )
        chain = resp.get_json()['ancestor_chain']
        assert chain[0] == ben.id
        assert three_gen_tree['zhu'].id in chain
        assert three_gen_tree['fu'].id in chain
        assert chain.index(ben.id) < chain.index(three_gen_tree['fu'].id)

    def test_descendant_chain_includes_leaf(self, client, auth_headers, sample_family, three_gen_tree):
        zhu = three_gen_tree['zhu']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{zhu.id}',
            headers=auth_headers,
        )
        chain = resp.get_json()['descendant_chain']
        assert chain[0] == zhu.id
        assert len(chain) >= 3

    def test_siblings_and_spouses(self, client, auth_headers, sample_family, three_gen_tree):
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}',
            headers=auth_headers,
        )
        data = resp.get_json()
        assert three_gen_tree['mei'].id in set(data['sibling_ids'])
        assert set(data['spouse_ids']) == set()

    def test_exclude_siblings(self, client, auth_headers, sample_family, three_gen_tree):
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}'
            '?include_siblings=false',
            headers=auth_headers,
        )
        data = resp.get_json()
        assert data['siblings'] == []
        assert data['spouses'] == []

    def test_member_not_found(self, client, auth_headers, sample_family):
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/99999',
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_max_depth_limit(self, client, auth_headers, sample_family, three_gen_tree):
        ben = three_gen_tree['ben']
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/{ben.id}?max_depth=1',
            headers=auth_headers,
        )
        data = resp.get_json()
        ids = {a['id'] for a in data['ancestors']}
        assert three_gen_tree['fu'].id in ids
        assert three_gen_tree['zhu'].id not in ids


class TestRelationshipPathSets:
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
        path_node_ids = set(data['path_node_ids'])
        assert {ben.id, tang.id, three_gen_tree['fu'].id, three_gen_tree['zhu'].id,
                three_gen_tree['bo'].id} <= path_node_ids
        assert len(data['path_edge_keys']) >= 4
        assert any('-' in k for k in data['path_edge_keys'])

    def test_unrelated_returns_empty(self, client, auth_headers, sample_family, _db):
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
