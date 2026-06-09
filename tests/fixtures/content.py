"""动态/事件/相册测试夹具"""
import pytest
from datetime import datetime, date
from app.models.member import Member
from app.models.event import FamilyEvent
from app.models.album import FamilyAlbum, FamilyPhoto
from app.models.article import FamilyArticle
from app.models.honor import Honor
from app import db


@pytest.fixture
def sample_events(app, _db, sample_family):
    """创建家族事件"""
    fid = sample_family.id
    events = [
        FamilyEvent(family_id=fid, title='家族祭祖', event_date=date(2024, 4, 5),
                    description='清明祭祖', event_type='ceremony'),
        FamilyEvent(family_id=fid, title='家族聚会', event_date=date(2024, 10, 1),
                    description='国庆聚会', event_type='gathering'),
        FamilyEvent(family_id=fid, title='修缮族谱', event_date=date(2024, 6, 15),
                    description='族谱修缮启动', event_type='other'),
    ]
    _db.session.add_all(events)
    _db.session.commit()
    for e in events:
        _db.session.refresh(e)
    return events


@pytest.fixture
def sample_albums(app, _db, sample_family):
    """创建相册"""
    fid = sample_family.id
    albums = [
        FamilyAlbum(family_id=fid, title='全家福', description='历年全家福照片'),
        FamilyAlbum(family_id=fid, title='老照片', description='家族历史老照片'),
    ]
    _db.session.add_all(albums)
    _db.session.commit()
    for a in albums:
        _db.session.refresh(a)
    return albums


@pytest.fixture
def sample_articles(app, _db, sample_family):
    """创建家族文章"""
    fid = sample_family.id
    articles = [
        FamilyArticle(family_id=fid, title='李氏源流', content='李氏起源于...',
                      author='admin', is_published=True),
        FamilyArticle(family_id=fid, title='家训', content='孝悌忠信...',
                      author='admin', is_published=True),
        FamilyArticle(family_id=fid, title='未发布草稿', content='草稿内容...',
                      author='admin', is_published=False),
    ]
    _db.session.add_all(articles)
    _db.session.commit()
    for a in articles:
        _db.session.refresh(a)
    return articles


@pytest.fixture
def sample_honors(app, _db, sample_family, sample_members):
    """创建成员荣誉"""
    fid = sample_family.id
    honors = [
        Honor(family_id=fid, member_id=sample_members[0].id,
              title='劳动模范', year='2020', description='市级劳动模范',
              category='work'),
        Honor(family_id=fid, member_id=sample_members[1].id,
              title='优秀教师', year='2019', description='省级优秀教师',
              category='education'),
    ]
    _db.session.add_all(honors)
    _db.session.commit()
    for h in honors:
        _db.session.refresh(h)
    return honors
