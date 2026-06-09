-- ============================================
-- 族谱管理系统 示例数据 — 李氏家族
-- ============================================

USE zupu;

INSERT INTO users (username, email, password_hash, display_name) VALUES
('admin', 'admin@zupu.com', 'pbkdf2:sha256:600000$salt$hash_placeholder', '管理员'),
('zhangsan', 'zhangsan@zupu.com', 'pbkdf2:sha256:600000$salt$hash_placeholder', '张三');

INSERT INTO families (name, description, surname, origin, creator_id, is_public) VALUES
('李氏家谱', '李氏四代家族，30人', '李', '河南洛阳', 1, TRUE);

INSERT INTO family_members (family_id, user_id, role) VALUES
(1, 1, 'owner');

INSERT INTO members (family_id, name, gender, birth_date, death_date, generation, generation_name, bio, is_alive, courtesy_name, art_name) VALUES
(1, '李祖', 'male', '1900', '1960', 1, '德', '李氏始祖，民国年间迁居洛阳。', FALSE, '德厚', '朴庵'),
(1, '李婆', 'female', '1902', '1985', 1, '德', '李祖之妻。', FALSE, NULL, NULL),
(1, '李伯', 'male', '1925', '2000', 2, '建', '李祖长子，务农。', FALSE, '建农', NULL),
(1, '李伯婆', 'female', '1927', '2005', 2, '建', '李伯之妻。', FALSE, NULL, NULL),
(1, '李父', 'male', '1930', '2010', 2, '建', '李祖次子，退休教师。', FALSE, '建文', NULL),
(1, '李母', 'female', '1932', '2018', 2, '建', '李父之妻，教师。', FALSE, NULL, NULL),
(1, '李大哥', 'male', '1953', NULL, 3, '守', '李父长子，工程师。', TRUE, '守正', NULL),
(1, '李大嫂', 'female', '1955', NULL, 3, '守', '李大哥之妻。', TRUE, NULL, NULL),
(1, '李二哥', 'male', '1958', '2022', 3, '守', '李父次子，医生。', FALSE, '守仁', '杏林散人'),
(1, '李二嫂', 'female', '1960', NULL, 3, '守', '李二哥之妻。', TRUE, NULL, NULL),
(1, '李三姐', 'female', '1962', NULL, 3, '守', '李父长女。', TRUE, NULL, NULL),
(1, '李四', 'male', '1965', '1990', 3, '守', '李父三子，英年早逝。', FALSE, NULL, NULL),
(1, '李五', 'male', '1968', NULL, 3, '守', '李父四子，在外地工作。', TRUE, NULL, NULL),
(1, '李妹', 'female', '1970', NULL, 3, '守', '李父幼女。', TRUE, NULL, NULL),
(1, '李堂哥', 'male', '1950', '2023', 3, '守', '李伯长子。', FALSE, '守业', NULL),
(1, '李堂嫂', 'female', '1952', NULL, 3, '守', '李堂哥之妻。', TRUE, NULL, NULL),
(1, '李堂弟', 'male', '1955', NULL, 3, '守', '李伯次子，个体户。', TRUE, NULL, NULL),
(1, '李堂妹', 'female', '1958', NULL, 3, '守', '李伯之女。', TRUE, NULL, NULL),
(1, '李长孙', 'male', '1978', NULL, 4, '承', '李大哥之子。', TRUE, '承先', NULL),
(1, '李长孙女', 'female', '1980', NULL, 4, '承', '李大哥之女。', TRUE, NULL, NULL),
(1, '李次息', 'male', '1983', NULL, 4, '承', '李大哥次子。', TRUE, NULL, NULL),
(1, '李艺林', 'male', '1985', NULL, 4, '承', '李二哥之子，画家。', TRUE, NULL, '墨石'),
(1, '李艺书', 'female', '1988', NULL, 4, '承', '李二哥之女，教师。', TRUE, NULL, NULL),
(1, '李远志', 'male', '1975', NULL, 4, '承', '李堂哥之子。', TRUE, NULL, NULL),
(1, '李远芳', 'female', '1978', NULL, 4, '承', '李堂哥之女。', TRUE, NULL, NULL),
(1, '李堂孙', 'male', '1980', NULL, 4, '承', '李堂弟之子。', TRUE, NULL, NULL),
(1, '李晚子', 'male', '2000', NULL, 4, '承', '李五之子。', TRUE, NULL, NULL);
