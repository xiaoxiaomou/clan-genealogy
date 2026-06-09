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
('测试族谱', '测试用族谱', '李', '河南洛阳', 1, TRUE);

-- 插入族谱-用户关联
INSERT INTO family_members (family_id, user_id, role) VALUES
(1, 1, 'owner');
