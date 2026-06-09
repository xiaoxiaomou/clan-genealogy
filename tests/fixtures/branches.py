"""分支管理测试夹具"""
import pytest
from app.models.member import Member
from app.models.family import FamilyBranch
from app import db


@pytest.fixture
def sample_branches(app, _db, sample_family):
    """创建多个分支"""
    fid = sample_family.id
    b1 = FamilyBranch(family_id=fid, name='长房', description='长房嫡系', sort_order=1)
    b2 = FamilyBranch(family_id=fid, name='二房', description='二房旁系', sort_order=2)
    b3 = FamilyBranch(family_id=fid, name='三房', description='三房', sort_order=3)
    _db.session.add_all([b1, b2, b3])
    _db.session.commit()
    for b in [b1, b2, b3]:
        _db.session.refresh(b)
    return [b1, b2, b3]


@pytest.fixture
def branch_with_members(app, _db, sample_family, sample_branches):
    """创建分配到分支的成员"""
    fid = sample_family.id
    members = []
    for i, branch in enumerate(sample_branches):
        m = Member(family_id=fid, name=f'分支成员{branch.id}',
                   gender='male', generation=i + 1,
                   branch_id=branch.id, is_alive=True)
        members.append(m)
    _db.session.add_all(members)
    _db.session.commit()
    for m in members:
        _db.session.refresh(m)
    return members
