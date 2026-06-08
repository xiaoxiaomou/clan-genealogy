from app.models.family import FamilyMember


class TestAdminProtection:
    """管理员权限保护测试"""

    def test_non_admin_cannot_create_relationship(self, client, _db, user_headers, sample_family, sample_members):
        """非族谱成员不能创建关系"""
        m1, m2 = sample_members
        resp = client.post(
            f'/api/family/{sample_family.id}/relationships',
            headers=user_headers,
            json={
                'member_id': m1.id,
                'related_member_id': m2.id,
                'relationship_type': 'parent',
            }
        )
        assert resp.status_code == 403
        data = resp.get_json()
        assert data['error'] == '无权访问该族谱'

    def test_admin_can_create_relationship(self, client, auth_headers, sample_family, sample_members):
        """管理员可以创建关系"""
        m1, m2 = sample_members
        resp = client.post(
            f'/api/family/{sample_family.id}/relationships',
            headers=auth_headers,
            json={
                'member_id': m1.id,
                'related_member_id': m2.id,
                'relationship_type': 'parent',
            }
        )
        assert resp.status_code == 201

    def test_non_admin_cannot_add_member(self, client, _db, user_headers, sample_family):
        """非族谱成员不能添加成员"""
        resp = client.post(
            f'/api/family/{sample_family.id}/members',
            headers=user_headers,
            json={
                'name': '测试成员',
                'gender': 'male',
                'generation': 1,
            }
        )
        assert resp.status_code == 403
        data = resp.get_json()
        assert data['error'] == '无权访问该族谱'

    def test_admin_can_add_member(self, client, auth_headers, sample_family):
        """管理员可以添加成员"""
        resp = client.post(
            f'/api/family/{sample_family.id}/members',
            headers=auth_headers,
            json={
                'name': '测试成员',
                'gender': 'male',
                'generation': 1,
            }
        )
        assert resp.status_code == 201

    def test_editor_can_add_member(self, client, _db, user_headers, sample_family, normal_user):
        """族谱编辑者可以添加成员"""
        # 先将 normal_user 添加为 editor
        fm = FamilyMember(
            family_id=sample_family.id,
            user_id=normal_user.id,
            role='editor',
        )
        _db.session.add(fm)
        _db.session.commit()

        resp = client.post(
            f'/api/family/{sample_family.id}/members',
            headers=user_headers,
            json={
                'name': '编辑器添加的成员',
                'gender': 'female',
                'generation': 2,
            }
        )
        assert resp.status_code == 201

    def test_viewer_cannot_add_member(self, client, _db, user_headers, sample_family, normal_user):
        """族谱浏览者不能添加成员"""
        # 先将 normal_user 添加为 viewer
        fm = FamilyMember(
            family_id=sample_family.id,
            user_id=normal_user.id,
            role='viewer',
        )
        _db.session.add(fm)
        _db.session.commit()

        resp = client.post(
            f'/api/family/{sample_family.id}/members',
            headers=user_headers,
            json={
                'name': '测试成员',
                'gender': 'male',
                'generation': 1,
            }
        )
        assert resp.status_code == 403
        data = resp.get_json()
        assert data['error'] == '权限不足'

    def test_non_admin_cannot_create_branch(self, client, _db, user_headers, sample_family):
        """非族谱成员不能创建分支"""
        resp = client.post(
            f'/api/family/{sample_family.id}/branches',
            headers=user_headers,
            json={'name': '长房'},
        )
        assert resp.status_code == 403
        data = resp.get_json()
        assert data['error'] == '无权访问该族谱'

    def test_admin_can_create_branch(self, client, auth_headers, sample_family):
        """管理员可以创建分支"""
        resp = client.post(
            f'/api/family/{sample_family.id}/branches',
            headers=auth_headers,
            json={'name': '长房'},
        )
        assert resp.status_code == 201

    def test_get_routes_require_no_admin(self, client, _db, user_headers, normal_user, sample_family, sample_members):
        """验证 GET 只读路由不需要 admin 权限"""
        fm = FamilyMember(
            family_id=sample_family.id,
            user_id=normal_user.id,
            role='viewer',
        )
        _db.session.add(fm)
        _db.session.commit()

        resp = client.get(
            f'/api/family/{sample_family.id}/relationships',
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert 'relationships' in resp.get_json()

        resp = client.get(
            f'/api/family/{sample_family.id}/members',
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert 'members' in resp.get_json()

        resp = client.get(
            f'/api/family/{sample_family.id}/branches',
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert 'branches' in resp.get_json()
