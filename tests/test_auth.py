class TestAuth:
    """用户认证功能测试"""

    def test_register_success(self, client):
        """测试注册成功"""
        resp = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'password123',
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['message'] == '注册成功，请等待管理员审核'

    def test_register_duplicate_username(self, client, admin_user):
        """测试重复用户名注册"""
        resp = client.post('/api/auth/register', json={
            'username': 'admin',
            'email': 'another@test.com',
            'password': 'password123',
        })
        assert resp.status_code == 400

    def test_login_success(self, client, admin_user):
        """测试登录成功"""
        resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['is_admin'] is True

    def test_login_wrong_password(self, client, admin_user):
        """测试错误密码登录"""
        resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'wrong',
        })
        assert resp.status_code == 401

    def test_login_pending_user(self, client, pending_user):
        """测试待审核用户登录"""
        resp = client.post('/api/auth/login', json={
            'username': 'pending_user',
            'password': 'pending123',
        })
        assert resp.status_code == 401

    def test_get_profile(self, client, auth_headers):
        """测试获取用户信息"""
        resp = client.get('/api/auth/me', headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()['user']['username'] == 'admin'

    def test_change_password(self, client, auth_headers):
        """测试修改密码"""
        resp = client.post('/api/auth/change-password', headers=auth_headers, json={
            'old_password': 'admin123',
            'new_password': 'newadmin123',
        })
        assert resp.status_code == 200

    def test_refresh_token(self, client, admin_user):
        """测试令牌刷新"""
        login_resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123',
        })
        refresh_token = login_resp.get_json()['refresh_token']

        resp = client.post('/api/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}',
        })
        assert resp.status_code == 200
        assert 'access_token' in resp.get_json()

    def test_admin_approve_user(self, client, auth_headers, pending_user):
        """测试管理员审核通过用户"""
        resp = client.put(f'/api/auth/admin/users/{pending_user.id}/approve', headers=auth_headers)
        assert resp.status_code == 200

    def test_admin_reject_user(self, client, auth_headers, pending_user):
        """测试管理员拒绝用户"""
        resp = client.put(f'/api/auth/admin/users/{pending_user.id}/reject', headers=auth_headers)
        assert resp.status_code == 200

    def test_admin_get_pending_users(self, client, auth_headers, pending_user):
        """测试获取待审核用户列表"""
        resp = client.get('/api/auth/admin/users/pending', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['users']) >= 1
