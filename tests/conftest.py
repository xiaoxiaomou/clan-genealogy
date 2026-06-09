import pytest
from app import create_app, db
from app.models.user import User
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.notification import Notification


@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def _db(app):
    return db


@pytest.fixture
def admin_user(app, _db):
    user = User(
        username='admin',
        email='admin@test.com',
        display_name='管理员',
        is_admin=True,
        status='active',
    )
    user.set_password('admin123')
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture
def normal_user(app, _db):
    user = User(
        username='user',
        email='user@test.com',
        display_name='普通用户',
        is_admin=False,
        status='active',
    )
    user.set_password('user123')
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture
def pending_user(app, _db):
    user = User(
        username='pending_user',
        email='pending@test.com',
        display_name='待审用户',
        is_admin=False,
        status='pending',
    )
    user.set_password('pending123')
    _db.session.add(user)
    _db.session.commit()
    return user


@pytest.fixture
def auth_headers(client, admin_user):
    login_resp = client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'admin123',
    })
    token = login_resp.get_json()['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def user_headers(client, normal_user):
    login_resp = client.post('/api/auth/login', json={
        'username': 'user',
        'password': 'user123',
    })
    token = login_resp.get_json()['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_family(app, _db, admin_user):
    family = Family(
        name='测试族谱',
        surname='李',
        origin='河南洛阳',
        description='测试用族谱',
        creator_id=admin_user.id,
    )
    _db.session.add(family)
    _db.session.commit()

    fm = FamilyMember(
        family_id=family.id,
        user_id=admin_user.id,
        role='owner',
    )
    _db.session.add(fm)
    _db.session.commit()

    _db.session.refresh(family)
    return family


@pytest.fixture
def sample_members(app, _db, sample_family):
    m1 = Member(
        family_id=sample_family.id,
        name='李祖',
        gender='male',
        generation=1,
        generation_name='德',
        is_alive=False,
        birth_date='1900',
        death_date='1960',
        courtesy_name='德厚',
    )
    m2 = Member(
        family_id=sample_family.id,
        name='李父',
        gender='male',
        generation=2,
        generation_name='建',
        is_alive=True,
        birth_date='1930',
        courtesy_name='建文',
    )
    _db.session.add_all([m1, m2])
    _db.session.commit()

    _db.session.refresh(m1)
    _db.session.refresh(m2)
    return [m1, m2]
