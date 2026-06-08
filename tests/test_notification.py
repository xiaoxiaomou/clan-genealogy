class TestNotification:
    """通知功能测试"""

    def test_get_notifications(self, client, auth_headers):
        """测试获取通知列表"""
        resp = client.get('/api/notification/', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'notifications' in data

    def test_get_unread_count(self, client, auth_headers):
        """测试获取未读通知数"""
        resp = client.get('/api/notification/unread-count', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'count' in data
