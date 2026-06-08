-- ============================================
-- 族谱管理系统 示例数据
-- ============================================

USE zupu;

-- 插入测试用户（密码：123456）
INSERT INTO users (username, email, password_hash, display_name) VALUES
('admin', 'admin@zupu.com', 'pbkdf2:sha256:600000$salt$hash_placeholder', '管理员'),
('zhangsan', 'zhangsan@zupu.com', 'pbkdf2:sha256:600000$salt$hash_placeholder', '张三');

-- 插入族谱
INSERT INTO families (name, description, surname, origin, creator_id, is_public) VALUES
('张氏族谱', '张氏家族族谱，追溯至明朝洪武年间', '张', '山东济南', 1, TRUE),
('李氏族谱', '李氏家族族谱', '李', '河南洛阳', 2, FALSE);

-- 插入族谱-用户关联
INSERT INTO family_members (family_id, user_id, role) VALUES
(1, 1, 'owner'),
(2, 2, 'owner');

-- 插入家族成员
INSERT INTO members (family_id, name, gender, birth_date, death_date, generation, generation_name, bio, is_alive) VALUES
(1, '张德厚', 'male', '1920-03-15', '1998-12-01', 1, '德', '族谱始祖，民国时期教书先生', FALSE),
(1, '张建国', 'male', '1945-08-20', '2020-05-10', 2, '建', '长子，退休教师', FALSE),
(1, '张建民', 'male', '1948-11-03', NULL, 2, '建', '次子，退休工程师', TRUE),
(1, '张秀英', 'female', '1950-06-18', NULL, 2, '建', '长女，退休医生', TRUE),
(1, '张伟', 'male', '1970-04-12', NULL, 3, '伟', '建国长子，软件工程师', TRUE),
(1, '张丽', 'female', '1973-09-25', NULL, 3, '伟', '建国长女，大学教授', TRUE),
(1, '张强', 'male', '1975-02-08', NULL, 3, '伟', '建民之子，企业家', TRUE),
(1, '张小明', 'male', '1995-07-14', NULL, 4, '小', '张伟之子，研究生在读', TRUE),
(1, '张小雨', 'female', '1998-12-30', NULL, 4, '小', '张伟之女，设计师', TRUE);

-- 插入关系
INSERT INTO relationships (member_id, related_member_id, relationship_type) VALUES
-- 建国是德厚之子
(1, 2, 'parent'),
-- 建民是德厚之子
(1, 3, 'parent'),
-- 秀英是德厚之女
(1, 4, 'parent'),
-- 伟是建国之子
(2, 5, 'parent'),
-- 丽是建国之女
(2, 6, 'parent'),
-- 强是建民之子
(3, 7, 'parent'),
-- 小明是伟之子
(5, 8, 'parent'),
-- 小雨是伟之女
(5, 9, 'parent');
