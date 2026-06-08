class TestFamily:
    """族谱功能测试"""

    def test_create_family(self, client, auth_headers):
        """测试创建族谱"""
        resp = client.post('/api/family/', headers=auth_headers, json={
            'name': '张氏族谱',
            'surname': '张',
            'origin': '山东',
            'description': '测试族谱',
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['family']['name'] == '张氏族谱'

    def test_list_families(self, client, auth_headers, sample_family):
        """测试获取族谱列表"""
        resp = client.get('/api/family/', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['families']) >= 1

    def test_get_family(self, client, auth_headers, sample_family):
        """测试获取族谱详情"""
        resp = client.get(f'/api/family/{sample_family.id}', headers=auth_headers)
        assert resp.status_code == 200
        assert resp.get_json()['family']['name'] == '测试族谱'

    def test_update_family(self, client, auth_headers, sample_family):
        """测试更新族谱"""
        resp = client.put(f'/api/family/{sample_family.id}', headers=auth_headers, json={
            'name': '更新后的族谱',
            'description': '已更新',
        })
        assert resp.status_code == 200
        assert resp.get_json()['family']['name'] == '更新后的族谱'

    def test_delete_family(self, client, auth_headers, sample_family):
        """测试删除族谱"""
        resp = client.delete(f'/api/family/{sample_family.id}', headers=auth_headers)
        assert resp.status_code == 200

    def test_add_member(self, client, auth_headers, sample_family):
        """测试添加成员"""
        resp = client.post(f'/api/family/{sample_family.id}/members', headers=auth_headers, json={
            'name': '张大',
            'gender': 'male',
            'generation': 1,
        })
        assert resp.status_code == 201
        assert resp.get_json()['member']['name'] == '张大'

    def test_list_members(self, client, auth_headers, sample_family, sample_members):
        """测试获取成员列表"""
        resp = client.get(f'/api/family/{sample_family.id}/members', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['members']) >= 2

    def test_add_relationship(self, client, auth_headers, sample_family, sample_members):
        """测试添加关系"""
        m1, m2 = sample_members
        resp = client.post(f'/api/family/{sample_family.id}/relationships', headers=auth_headers, json={
            'member_id': m1.id,
            'related_member_id': m2.id,
            'relationship_type': 'parent',
        })
        assert resp.status_code == 201

    def test_get_family_tree(self, client, auth_headers, sample_family, sample_members):
        """测试获取族谱树"""
        resp = client.get(f'/api/family/{sample_family.id}/tree', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['nodes']) >= 2

    def test_get_family_stats(self, client, auth_headers, sample_family, sample_members):
        """测试获取族谱统计"""
        resp = client.get(f'/api/family/{sample_family.id}/stats', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['total'] >= 2

    def test_add_family_user(self, client, auth_headers, sample_family, normal_user):
        """测试添加族谱成员（授权）"""
        resp = client.post(f'/api/family/{sample_family.id}/users', headers=auth_headers, json={
            'user_id': normal_user.id,
            'role': 'viewer',
        })
        assert resp.status_code == 201

    def test_list_family_users(self, client, auth_headers, sample_family):
        """测试获取族谱授权用户"""
        resp = client.get(f'/api/family/{sample_family.id}/users', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert len(data['users']) >= 1

    def test_quick_add_family(self, client, auth_headers, sample_family):
        """测试快速建家庭（父亲+母亲+子女）"""
        resp = client.post(f'/api/family/{sample_family.id}/quick-family', headers=auth_headers, json={
            'father': {'name': '张父', 'gender': 'male', 'generation': 1},
            'mother': {'name': '李母', 'gender': 'female', 'generation': 1},
            'children': [
                {'name': '张大子', 'gender': 'male'},
                {'name': '张二女', 'gender': 'female'},
            ],
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert 'father' in data
        assert 'mother' in data
        assert len(data['children']) == 2

        # 验证家庭关系已建立：查父子关系
        resp2 = client.get(f'/api/family/{sample_family.id}/relationships', headers=auth_headers)
        assert resp2.status_code == 200
        rels = resp2.get_json()['relationships']
        # 至少应有: 1配偶(双向=2条) + 2亲子(父亲-每个孩子) + 2亲子(母亲-每个孩子) + 1兄弟姊妹
        assert len(rels) >= 5

    def test_quick_add_family_father_only(self, client, auth_headers, sample_family):
        """测试快速建家庭（仅父亲，无配偶子女）"""
        resp = client.post(f'/api/family/{sample_family.id}/quick-family', headers=auth_headers, json={
            'father': {'name': '张单独', 'gender': 'male', 'generation': 1},
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['father']['name'] == '张单独'
        assert data['mother'] is None
        assert len(data['children']) == 0

    def test_quick_add_family_no_name(self, client, auth_headers, sample_family):
        """测试快速建家庭（父亲姓名为空应报错）"""
        resp = client.post(f'/api/family/{sample_family.id}/quick-family', headers=auth_headers, json={
            'father': {'name': '', 'gender': 'male'},
        })
        assert resp.status_code == 400

    def test_import_members_csv(self, client, auth_headers, sample_family):
        """测试批量导入成员（CSV格式）"""
        import io
        csv_content = 'name,gender,birth_date,generation,is_alive\n导入张三,male,1980-01-01,2,1\n导入李四,female,1985-05-15,2,1\n'
        data = {'file': (io.BytesIO(csv_content.encode('utf-8-sig')), 'members.csv')}
        resp = client.post(
            f'/api/family/{sample_family.id}/import',
            headers=auth_headers,
            content_type='multipart/form-data',
            data=data,
        )
        assert resp.status_code == 200
        result = resp.get_json()
        assert result['added_count'] == 2
        assert result['error_count'] == 0

        # 验证成员已添加到族谱
        resp2 = client.get(f'/api/family/{sample_family.id}/members', headers=auth_headers)
        members = resp2.get_json()['members']
        names = [m['name'] for m in members]
        assert '导入张三' in names
        assert '导入李四' in names

    def test_import_members_empty_file(self, client, auth_headers, sample_family):
        """测试批量导入（空文件应报错）"""
        import io
        data = {'file': (io.BytesIO(b''), 'empty.csv')}
        resp = client.post(
            f'/api/family/{sample_family.id}/import',
            headers=auth_headers,
            content_type='multipart/form-data',
            data=data,
        )
        assert resp.status_code == 400
