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


class TestMemberNotFound:
    def test_member_not_found(self, client, auth_headers, sample_family):
        resp = client.get(
            f'/api/family/{sample_family.id}/kinship/lineage/99999',
            headers=auth_headers,
        )
        assert resp.status_code == 404


class TestUnrelatedPath:
    def test_unrelated_returns_empty(self, client, auth_headers, sample_family, _db):
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
