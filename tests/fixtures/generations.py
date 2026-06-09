"""辈分管理测试夹具"""
import pytest
from app.models.generation import GenerationRule
from app import db


@pytest.fixture
def sample_generations(app, _db, sample_family):
    """创建辈分字派规则"""
    fid = sample_family.id
    rules = [
        GenerationRule(family_id=fid, generation=1, character='德',
                       description='始祖辈'),
        GenerationRule(family_id=fid, generation=2, character='建',
                       description='二世'),
        GenerationRule(family_id=fid, generation=3, character='守',
                       description='三世'),
        GenerationRule(family_id=fid, generation=4, character='承',
                       description='四世'),
        GenerationRule(family_id=fid, generation=5, character='启',
                       description='五世'),
    ]
    _db.session.add_all(rules)
    _db.session.commit()
    for r in rules:
        _db.session.refresh(r)
    return rules
