from app import db
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.user import User
from app.utils.image_utils import delete_avatar_file


class FamilyService:
    """族谱服务"""

    @staticmethod
    def create_family(name, creator_id, **kwargs):
        """创建族谱"""
        family = Family(
            name=name,
            creator_id=creator_id,
            description=kwargs.get('description'),
            surname=kwargs.get('surname'),
            origin=kwargs.get('origin'),
            is_public=kwargs.get('is_public', False)
        )
        db.session.add(family)
        db.session.flush()

        # 创建者自动成为 owner
        fm = FamilyMember(
            family_id=family.id,
            user_id=creator_id,
            role='owner'
        )
        db.session.add(fm)
        db.session.commit()
        return family

    @staticmethod
    def get_user_families(user_id):
        """获取用户的所有族谱（管理员返回全部）"""
        user = db.session.get(User, user_id)
        if user and user.is_admin:
            return Family.query.order_by(Family.created_at.desc()).all()

        family_ids = db.session.query(FamilyMember.family_id).filter_by(
            user_id=user_id
        ).all()
        family_ids = [fid[0] for fid in family_ids]
        families = Family.query.filter(Family.id.in_(family_ids)).order_by(
            Family.created_at.desc()
        ).all()
        return families

    @staticmethod
    def get_family(family_id):
        """获取族谱详情"""
        return db.session.get(Family, family_id)

    @staticmethod
    def update_family(family_id, **kwargs):
        """更新族谱信息"""
        family = db.session.get(Family, family_id)
        if not family:
            return None

        allowed_fields = ['name', 'description', 'surname', 'origin', 'is_public']
        for field in allowed_fields:
            if field in kwargs:
                setattr(family, field, kwargs[field])

        db.session.commit()
        return family

    @staticmethod
    def delete_family(family_id):
        """删除族谱"""
        family = db.session.get(Family, family_id)
        if family:
            db.session.delete(family)
            db.session.commit()
            return True
        return False

    @staticmethod
    def add_member(family_id, **kwargs):
        """添加家族成员"""
        member = Member(
            family_id=family_id,
            name=kwargs.get('name'),
            gender=kwargs.get('gender', 'unknown'),
            birth_date=kwargs.get('birth_date'),
            death_date=kwargs.get('death_date'),
            generation=kwargs.get('generation'),
            generation_name=kwargs.get('generation_name'),
            bio=kwargs.get('bio'),
            avatar=kwargs.get('avatar'),
            is_alive=kwargs.get('is_alive', True)
        )
        db.session.add(member)
        db.session.commit()

        # 通知族谱所有者有新成员添加
        from app.models.family import FamilyMember, Family
        family = db.session.get(Family, family_id)
        if family:
            for fm in family.family_members:
                if fm.role == 'owner' and fm.user_id != family.creator_id:
                    from app.models.notification import Notification
                    notif = Notification(
                        user_id=fm.user_id,
                        family_id=family_id,
                        title='新成员添加',
                        content=f'{family.name} 族谱新增成员：{member.name}',
                        type='info'
                    )
                    db.session.add(notif)
            if family.creator_id is not None:
                from app.models.notification import Notification
                notif = Notification(
                    user_id=family.creator_id,
                    family_id=family_id,
                    title='新成员添加',
                    content=f'{family.name} 族谱新增成员：{member.name}',
                    type='info'
                )
                db.session.add(notif)
            db.session.commit()

        return member

    @staticmethod
    def update_member(member_id, **kwargs):
        """更新成员信息"""
        member = db.session.get(Member, member_id)
        if not member:
            return None

        # 如果更新头像，先清理旧文件
        if 'avatar' in kwargs and kwargs['avatar'] != member.avatar:
            from flask import current_app
            if member.avatar:
                delete_avatar_file(member.avatar, current_app.config['UPLOAD_FOLDER'])

        allowed_fields = ['name', 'gender', 'birth_date', 'death_date',
                         'generation', 'generation_name', 'bio', 'avatar', 'is_alive']
        for field in allowed_fields:
            if field in kwargs:
                setattr(member, field, kwargs[field])

        db.session.commit()
        return member

    @staticmethod
    def delete_member(member_id):
        """删除成员"""
        member = db.session.get(Member, member_id)
        if member:
            # 清理头像文件
            if member.avatar:
                from flask import current_app
                delete_avatar_file(member.avatar, current_app.config['UPLOAD_FOLDER'])

            # 删除相关关系
            Relationship.query.filter(
                db.or_(
                    Relationship.member_id == member_id,
                    Relationship.related_member_id == member_id
                )
            ).delete()
            db.session.delete(member)
            db.session.commit()
            return True
        return False

    @staticmethod
    def get_family_members(family_id):
        """获取族谱所有成员"""
        return Member.query.filter_by(family_id=family_id).all()

    @staticmethod
    def get_member(member_id):
        """获取成员详情"""
        return db.session.get(Member, member_id)

    @staticmethod
    def add_relationship(member_id, related_member_id, relationship_type):
        """添加成员关系"""
        # 检查是否已存在
        existing = Relationship.query.filter_by(
            member_id=member_id,
            related_member_id=related_member_id,
            relationship_type=relationship_type
        ).first()
        if existing:
            return None, '关系已存在'

        # 验证成员属于同一个族谱
        member = db.session.get(Member, member_id)
        related = db.session.get(Member, related_member_id)
        if not member or not related:
            return None, '成员不存在'
        if member.family_id != related.family_id:
            return None, '成员不在同一个族谱中'

        rel = Relationship(
            member_id=member_id,
            related_member_id=related_member_id,
            relationship_type=relationship_type
        )
        db.session.add(rel)

        # 如果是配偶关系，双向添加
        if relationship_type == 'spouse':
            rel2 = Relationship(
                member_id=related_member_id,
                related_member_id=member_id,
                relationship_type='spouse'
            )
            db.session.add(rel2)

        db.session.commit()
        return rel, None

    @staticmethod
    def remove_relationship(relationship_id):
        """删除关系"""
        rel = db.session.get(Relationship, relationship_id)
        if rel:
            # 如果是配偶关系，同时删除反向关系
            if rel.relationship_type == 'spouse':
                reverse = Relationship.query.filter_by(
                    member_id=rel.related_member_id,
                    related_member_id=rel.member_id,
                    relationship_type='spouse'
                ).first()
                if reverse:
                    db.session.delete(reverse)

            db.session.delete(rel)
            db.session.commit()
            return True
        return False

    @staticmethod
    def get_family_relationships(family_id):
        """获取族谱所有关系"""
        member_ids = db.session.query(Member.id).filter_by(
            family_id=family_id
        ).all()
        member_ids = [mid[0] for mid in member_ids]

        relationships = Relationship.query.filter(
            db.and_(
                Relationship.member_id.in_(member_ids),
                Relationship.related_member_id.in_(member_ids)
            )
        ).all()
        return relationships

    @staticmethod
    def get_family_tree(family_id):
        """获取族谱树形数据（用于前端可视化）"""
        members = Member.query.filter_by(family_id=family_id).all()
        relationships = FamilyService.get_family_relationships(family_id)

        # 构建节点
        nodes = []
        for m in members:
            nodes.append({
                'id': m.id,
                'name': m.name,
                'gender': m.gender,
                'generation': m.generation,
                'generation_name': m.generation_name,
                'birth_date': m.birth_date,
                'death_date': m.death_date,
                'avatar': m.avatar,
                'is_alive': m.is_alive,
                'branch_id': m.branch_id,
            })

        # 构建边
        edges = []
        for r in relationships:
            # parent关系：member_id是父母，related_member_id是子女
            # 可视化时：source=父母（上），target=子女（下）
            if r.relationship_type == 'parent':
                edges.append({
                    'id': r.id,
                    'source': r.member_id,  # 父母（上）
                    'target': r.related_member_id,  # 子女（下）
                    'type': r.relationship_type,
                })
            else:
                # spouse/sibling：双向关系，source和target可以任意
                edges.append({
                    'id': r.id,
                    'source': r.member_id,
                    'target': r.related_member_id,
                    'type': r.relationship_type,
                })

        # 找到根节点（没有父节点的成员）
        parent_ids = set()
        child_ids = set()
        for e in edges:
            if e['type'] == 'parent':
                parent_ids.add(e['source'])
                child_ids.add(e['target'])

        root_ids = [n['id'] for n in nodes if n['id'] not in child_ids]

        return {
            'nodes': nodes,
            'edges': edges,
            'root_ids': root_ids,
        }

    # ==================== 族谱用户权限管理 ====================

    @staticmethod
    def get_family_users(family_id):
        """获取族谱的所有授权用户"""
        fms = FamilyMember.query.filter_by(family_id=family_id).all()
        result = []
        for fm in fms:
            user = db.session.get(User, fm.user_id)
            if user:
                result.append({
                    'id': fm.id,
                    'user_id': user.id,
                    'username': user.username,
                    'display_name': user.display_name,
                    'avatar': user.avatar,
                    'role': fm.role,
                    'joined_at': fm.joined_at.isoformat() if fm.joined_at else None,
                })
        return result

    @staticmethod
    def get_user_role(family_id, user_id):
        """获取用户在族谱中的角色"""
        fm = FamilyMember.query.filter_by(family_id=family_id, user_id=user_id).first()
        return fm.role if fm else None

    @staticmethod
    def add_family_user(family_id, user_id, role='viewer'):
        """添加用户到族谱"""
        if role not in ('owner', 'admin', 'editor', 'viewer'):
            return None, '无效的角色类型'

        # 检查用户是否存在
        user = db.session.get(User, user_id)
        if not user:
            return None, '用户不存在'

        # 检查是否已存在
        existing = FamilyMember.query.filter_by(family_id=family_id, user_id=user_id).first()
        if existing:
            return None, '该用户已在族谱中'

        fm = FamilyMember(family_id=family_id, user_id=user_id, role=role)
        db.session.add(fm)
        db.session.commit()
        return fm, None

    @staticmethod
    def remove_family_user(family_id, user_id):
        """从族谱中移除用户"""
        fm = FamilyMember.query.filter_by(family_id=family_id, user_id=user_id).first()
        if not fm:
            return False, '该用户不在族谱中'

        if fm.role == 'owner':
            # 检查是否还有其他owner
            owners = FamilyMember.query.filter_by(family_id=family_id, role='owner').count()
            if owners <= 1:
                return False, '不能移除唯一的所有者'

        db.session.delete(fm)
        db.session.commit()
        return True, None

    @staticmethod
    def update_family_user_role(family_id, user_id, new_role):
        """修改用户在族谱中的角色"""
        if new_role not in ('owner', 'admin', 'editor', 'viewer'):
            return False, '无效的角色类型'

        fm = FamilyMember.query.filter_by(family_id=family_id, user_id=user_id).first()
        if not fm:
            return False, '该用户不在族谱中'

        # 如果要把某人降级为非owner，检查是否还有其他owner
        if fm.role == 'owner' and new_role != 'owner':
            owners = FamilyMember.query.filter_by(family_id=family_id, role='owner').count()
            if owners <= 1:
                return False, '不能降级唯一的所有者'

        fm.role = new_role
        db.session.commit()
        return True, None
