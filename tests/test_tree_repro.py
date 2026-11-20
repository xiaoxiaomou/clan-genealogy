"""临时复现测试：打印带关系的族谱树接口返回结构"""


def test_print_tree(app, _db, sample_family, auth_headers):
    from app.models.member import Member
    from app.models.relationship import Relationship

    members = [
        Member(family_id=sample_family.id, name='李祖', gender='male', generation=1, generation_name='德',
               is_alive=False, birth_date='1900', death_date='1960'),
        Member(family_id=sample_family.id, name='李父', gender='male', generation=2, generation_name='建',
               is_alive=True, birth_date='1930'),
        Member(family_id=sample_family.id, name='李母', gender='female', generation=2, generation_name='建',
               is_alive=True, birth_date='1931'),
        Member(family_id=sample_family.id, name='李子', gender='male', generation=3, generation_name='传',
               is_alive=True, birth_date='1960'),
    ]
    _db.session.add_all(members)
    _db.session.commit()

    member_ids = [m.id for m in members]
    _db.session.add_all([
        Relationship(member_id=member_ids[2], related_member_id=member_ids[0], relationship_type='parent'),
        Relationship(member_id=member_ids[2], related_member_id=member_ids[1], relationship_type='parent'),
        Relationship(member_id=member_ids[3], related_member_id=member_ids[2], relationship_type='parent'),
        Relationship(member_id=member_ids[0], related_member_id=member_ids[1], relationship_type='spouse'),
    ])
    _db.session.commit()

    import json
    resp = app.test_client().get(f'/api/family/{sample_family.id}/tree', headers=auth_headers)
    data = resp.get_json()
    print('TREE_RESULT')
    print(json.dumps(data, ensure_ascii=False, indent=2))
    assert True
