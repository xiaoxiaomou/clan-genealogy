"""成员管理测试夹具：各种类型的成员"""
import pytest
from app.models.member import Member
from app.models.relationship import Relationship
from app import db


@pytest.fixture
def diverse_members(app, _db, sample_family):
    """创建各种类型的成员用于 CRUD 测试"""
    fid = sample_family.id
    members = []

    # 正常男性
    m1 = Member(family_id=fid, name='正常男', gender='male', generation=1,
                generation_name='祖', birth_date='1900', death_date='1980',
                bio='正常男性', is_alive=False, courtesy_name='字甲',
                art_name='号乙')
    members.append(m1)

    # 正常女性
    m2 = Member(family_id=fid, name='正常女', gender='female', generation=1,
                generation_name='祖', birth_date='1905', death_date='1990',
                bio='正常女性', is_alive=False)
    members.append(m2)

    # 在世无出生日期
    m3 = Member(family_id=fid, name='在世无生日', gender='male', generation=2,
                generation_name='父', is_alive=True)
    members.append(m3)

    # 未知性别
    m4 = Member(family_id=fid, name='未知性别', gender='unknown', generation=3,
                generation_name='子', is_alive=True)
    members.append(m4)

    # 仅出生日期无死亡日期（在世）
    m5 = Member(family_id=fid, name='青年在世', gender='male', generation=3,
                generation_name='子', birth_date='2000', is_alive=True)
    members.append(m5)

    # 所有字段齐全
    m6 = Member(family_id=fid, name='字段齐全', gender='female', generation=2,
                generation_name='母', birth_date='1970', death_date=None,
                bio='测试所有字段', is_alive=True, courtesy_name='字丙',
                art_name='号丁', posthumous_name='谥戊',
                privacy_level='private', privacy_override=True,
                sort_order=1)
    members.append(m6)

    # 无辈分
    m7 = Member(family_id=fid, name='无辈分', gender='male', generation=None,
                is_alive=True)
    members.append(m7)

    # 已故无后代
    m8 = Member(family_id=fid, name='绝嗣', gender='male', generation=3,
                generation_name='子', birth_date='1920', death_date='1945',
                bio='英年早逝无子女', is_alive=False)
    members.append(m8)

    _db.session.add_all(members)
    _db.session.commit()
    for m in members:
        _db.session.refresh(m)
    return members


@pytest.fixture
def members_with_relationships(app, _db, sample_family):
    """创建带关系的成员网络"""
    fid = sample_family.id

    grandpa = Member(family_id=fid, name='爷爷', gender='male', generation=1,
                     generation_name='祖', is_alive=False)
    grandma = Member(family_id=fid, name='奶奶', gender='female', generation=1,
                     generation_name='祖', is_alive=False)
    father = Member(family_id=fid, name='父亲', gender='male', generation=2,
                    generation_name='父', is_alive=True)
    mother = Member(family_id=fid, name='母亲', gender='female', generation=2,
                    generation_name='父', is_alive=True)
    uncle = Member(family_id=fid, name='叔叔', gender='male', generation=2,
                   generation_name='父', is_alive=True)
    child = Member(family_id=fid, name='孩子', gender='male', generation=3,
                   generation_name='子', is_alive=True)

    _db.session.add_all([grandpa, grandma, father, mother, uncle, child])
    _db.session.commit()

    rels = [
        Relationship(member_id=father.id, related_member_id=grandpa.id, relationship_type='parent'),
        Relationship(member_id=uncle.id, related_member_id=grandpa.id, relationship_type='parent'),
        Relationship(member_id=child.id, related_member_id=father.id, relationship_type='parent'),
        Relationship(member_id=father.id, related_member_id=mother.id, relationship_type='spouse'),
        Relationship(member_id=father.id, related_member_id=uncle.id, relationship_type='sibling'),
    ]
    _db.session.add_all(rels)
    _db.session.commit()

    for m in [grandpa, grandma, father, mother, uncle, child]:
        _db.session.refresh(m)
    return {
        'grandpa': grandpa, 'grandma': grandma,
        'father': father, 'mother': mother,
        'uncle': uncle, 'child': child,
    }
