"""全局搜索 API - 跨实体模糊搜索（成员 / 事件 / 帖子 / 家族 / 动作）"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from app import db
from app.models.member import Member
from app.models.family import Family, FamilyMember
from app.models.event import FamilyEvent
from app.models.post import Post
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required

search_bp = Blueprint('search', __name__)


@search_bp.route('/<int:family_id>/search', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def search_members(family_id):
    """模糊搜索家族成员（按姓名）"""
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'error': '搜索关键词不能为空'}), 400
    if len(q) < 1:
        return jsonify({'error': '搜索关键词至少1个字符'}), 400

    try:
        members = Member.query.filter(
            Member.family_id == family_id,
            Member.name.like(f'%{q}%')
        ).order_by(Member.generation.is_(None), Member.generation.asc(), Member.name.asc()).all()

        return jsonify({
            'query': q,
            'total': len(members),
            'members': [m.to_dict() for m in members]
        })
    except Exception as e:
        return jsonify({'error': f'搜索失败: {str(e)}'}), 500


@search_bp.route('/<int:family_id>/search/advanced', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def advanced_search(family_id):
    """高级搜索家族成员（多条件筛选）"""
    name = request.args.get('name', '').strip()
    generation = request.args.get('generation')
    gender = request.args.get('gender')
    is_alive = request.args.get('is_alive')

    try:
        query = Member.query.filter(Member.family_id == family_id)

        if name:
            query = query.filter(Member.name.like(f'%{name}%'))
        if generation is not None and generation != '':
            try:
                gen_val = int(generation)
                query = query.filter(Member.generation == gen_val)
            except (ValueError, TypeError):
                pass
        if gender and gender in ('male', 'female', 'unknown'):
            query = query.filter(Member.gender == gender)
        if is_alive is not None and is_alive != '':
            if is_alive.lower() in ('true', '1', 'yes'):
                query = query.filter(Member.is_alive == True)
            elif is_alive.lower() in ('false', '0', 'no'):
                query = query.filter(Member.is_alive == False)

        members = query.order_by(Member.generation.is_(None), Member.generation.asc(), Member.name.asc()).all()

        return jsonify({
            'filters': {
                'name': name or None,
                'generation': generation or None,
                'gender': gender or None,
                'is_alive': is_alive or None,
            },
            'total': len(members),
            'members': [m.to_dict() for m in members]
        })
    except Exception as e:
        return jsonify({'error': f'高级搜索失败: {str(e)}'}), 500


def _member_to_cmd(m: Member, family_id: int) -> dict:
    """成员转命令面板项"""
    sub = ' · '.join(filter(None, [
        f'第{m.generation}世' if m.generation else None,
        m.generation_name or None,
        f'({m.birth_date[:4]})' if m.birth_date else None,
    ]))
    return {
        'type': 'member',
        'id': m.id,
        'family_id': family_id,
        'title': m.name,
        'subtitle': sub or '成员',
        'path': f'/family/{family_id}/member/{m.id}',
        'icon': 'user',
    }


def _event_to_cmd(e: FamilyEvent, family_id: int) -> dict:
    return {
        'type': 'event',
        'id': e.id,
        'family_id': family_id,
        'title': e.title,
        'subtitle': e.event_date or e.event_type or '事件',
        'path': f'/family/{family_id}/events',
        'icon': 'calendar',
    }


def _post_to_cmd(p: Post, family_id: int) -> dict:
    snippet = (p.content or '')[:40]
    if len(p.content or '') > 40:
        snippet += '…'
    return {
        'type': 'post',
        'id': p.id,
        'family_id': family_id,
        'title': snippet or '动态',
        'subtitle': (p.created_at.isoformat()[:10] if p.created_at else ''),
        'path': f'/family/{family_id}/feed',
        'icon': 'megaphone',
    }


@search_bp.route('/global', methods=['GET'])
@jwt_required()
def global_search():
    """跨实体全局搜索（命令面板专用）

    Query params:
      q: 关键词 (>=1 字符)
      family_id: 可选，限制到特定家族上下文
      limit: 每类最多返回条数 (默认 8)
    """
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({
            'query': '',
            'groups': [],
            'recent': [],
            'quick_actions': [],
        })

    try:
        limit = max(1, min(20, int(request.args.get('limit', 8))))
    except (TypeError, ValueError):
        limit = 8

    family_id = request.args.get('family_id')
    if family_id is not None:
        try:
            family_id = int(family_id)
        except (TypeError, ValueError):
            family_id = None

    user_id = int(get_jwt_identity())
    user_family_ids = [
        fm.family_id
        for fm in FamilyMember.query.filter_by(user_id=user_id).all()
    ] or ([] if family_id is None else [family_id])

    target_family_ids = [family_id] if family_id else user_family_ids
    target_family_ids = list({fid for fid in target_family_ids if fid})

    groups = []

    if target_family_ids:
        member_filters = [
            Member.name.like(f'%{q}%'),
            Member.generation_name.like(f'%{q}%'),
            Member.bio.like(f'%{q}%'),
            Member.birth_place.like(f'%{q}%'),
        ]
        name_filter = or_(*member_filters)
        members = (
            Member.query
            .filter(Member.family_id.in_(target_family_ids))
            .filter(name_filter)
            .order_by(Member.generation.is_(None), Member.generation.asc(), Member.name.asc())
            .limit(limit)
            .all()
        )
        if members:
            family_for_member = {m.id: (m.family_id or target_family_ids[0]) for m in members}
            groups.append({
                'label': '成员',
                'items': [_member_to_cmd(m, family_for_member[m.id]) for m in members],
            })

        events = (
            FamilyEvent.query
            .filter(FamilyEvent.family_id.in_(target_family_ids))
            .filter(or_(
                FamilyEvent.title.like(f'%{q}%'),
                FamilyEvent.description.like(f'%{q}%'),
                FamilyEvent.location.like(f'%{q}%'),
            ))
            .order_by(FamilyEvent.event_date.desc().nulls_last() if db.engine.dialect.name == 'postgresql' else FamilyEvent.created_at.desc())
            .limit(limit)
            .all()
        )
        if events:
            groups.append({
                'label': '事件',
                'items': [_event_to_cmd(e, e.family_id) for e in events],
            })

        posts = (
            Post.query
            .filter(Post.family_id.in_(target_family_ids))
            .filter(Post.content.like(f'%{q}%'))
            .order_by(Post.created_at.desc())
            .limit(limit)
            .all()
        )
        if posts:
            groups.append({
                'label': '动态',
                'items': [_post_to_cmd(p, p.family_id) for p in posts],
            })

    if not family_id:
        families = (
            Family.query
            .filter(Family.id.in_(user_family_ids))
            .filter(or_(
                Family.name.like(f'%{q}%'),
                Family.surname.like(f'%{q}%'),
                Family.origin.like(f'%{q}%'),
            ))
            .limit(limit)
            .all()
        )
        if families:
            groups.append({
                'label': '家族',
                'items': [{
                    'type': 'family',
                    'id': f.id,
                    'title': f.name,
                    'subtitle': f.surname or f.origin or '家族',
                    'path': f'/family/{f.id}',
                    'icon': 'tree',
                } for f in families],
            })

    return jsonify({
        'query': q,
        'groups': groups,
        'total': sum(len(g['items']) for g in groups),
    })
