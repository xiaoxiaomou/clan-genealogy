"""家族动态（朋友圈）API"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.post import Post, PostComment, PostLike
from app.models.user import User
from app.services.mention import parse_mentions, resolve_mentions, notify_mentions, notify_comment_to_post_author
from app.utils.decorators import family_permission_required
from app.utils.html_utils import sanitize_html

post_bp = Blueprint('post', __name__)


@post_bp.route('/<int:family_id>/posts', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_posts(family_id):
    posts = (
        Post.query.filter_by(family_id=family_id)
        .order_by(Post.pinned.desc(), Post.created_at.desc())
        .limit(100)
        .all()
    )
    user_id = int(get_jwt_identity())
    result = []
    for p in posts:
        d = p.to_dict()
        liked = PostLike.query.filter_by(post_id=p.id, user_id=user_id).first() is not None
        d['liked'] = liked
        result.append(d)
    return jsonify({'posts': result})


@post_bp.route('/<int:family_id>/posts', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def create_post(family_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': '内容不能为空'}), 400
    p = Post(
        family_id=family_id,
        author_id=user_id,
        content=sanitize_html(content, max_length=10000),
        media_urls=json.dumps(data.get('media_urls', []), ensure_ascii=False) if data.get('media_urls') else None,
        visibility=data.get('visibility', 'family'),
        pinned=bool(data.get('pinned', False)),
    )
    db.session.add(p)
    db.session.flush()  # 拿 id

    # @mention 解析与通知
    try:
        names = parse_mentions(content)
        if names:
            mentioned = resolve_mentions(family_id, names)
            if mentioned:
                notify_mentions(family_id, p.id, None, mentioned, user_id, source_kind='帖子')
        db.session.commit()
    except Exception:
        db.session.rollback()
        # 不阻塞发帖

    return jsonify({'message': '发布成功', 'post': p.to_dict()}), 201


@post_bp.route('/<int:family_id>/posts/<int:post_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('viewer')
def delete_post(family_id, post_id):
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    p = Post.query.filter_by(id=post_id, family_id=family_id).first()
    if not p:
        return jsonify({'error': '帖子不存在'}), 404
    if p.author_id != user_id and not (user and user.is_admin):
        return jsonify({'error': '仅作者本人可删除'}), 403
    PostComment.query.filter_by(post_id=post_id).delete()
    PostLike.query.filter_by(post_id=post_id).delete()
    db.session.delete(p)
    db.session.commit()
    return jsonify({'message': '已删除'})


@post_bp.route('/<int:family_id>/posts/<int:post_id>/like', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def like_post(family_id, post_id):
    user_id = int(get_jwt_identity())
    p = Post.query.filter_by(id=post_id, family_id=family_id).first()
    if not p:
        return jsonify({'error': '帖子不存在'}), 404
    existing = PostLike.query.filter_by(post_id=post_id, user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        p.like_count = max(0, p.like_count - 1)
        liked = False
    else:
        db.session.add(PostLike(post_id=post_id, user_id=user_id))
        p.like_count = p.like_count + 1
        liked = True
    db.session.commit()
    return jsonify({'liked': liked, 'like_count': p.like_count})


@post_bp.route('/<int:family_id>/posts/<int:post_id>/comments', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_comments(family_id, post_id):
    p = Post.query.filter_by(id=post_id, family_id=family_id).first()
    if not p:
        return jsonify({'error': '帖子不存在'}), 404
    comments = (
        PostComment.query.filter_by(post_id=post_id)
        .order_by(PostComment.created_at.asc())
        .all()
    )
    return jsonify({'comments': [c.to_dict() for c in comments]})


@post_bp.route('/<int:family_id>/posts/<int:post_id>/comments', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def create_comment(family_id, post_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': '评论内容不能为空'}), 400
    p = Post.query.filter_by(id=post_id, family_id=family_id).first()
    if not p:
        return jsonify({'error': '帖子不存在'}), 404
    c = PostComment(
        post_id=post_id,
        author_id=user_id,
        content=sanitize_html(content, max_length=2000),
    )
    db.session.add(c)
    p.comment_count = p.comment_count + 1
    db.session.flush()

    # @mention + 通知作者
    try:
        names = parse_mentions(content)
        if names:
            mentioned = resolve_mentions(family_id, names)
            if mentioned:
                notify_mentions(family_id, p.id, c.id, mentioned, user_id, source_kind='评论')
        notify_comment_to_post_author(family_id, p.id, p.author_id, user_id, content)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({'message': '评论成功', 'comment': c.to_dict()}), 201


@post_bp.route('/<int:family_id>/posts/<int:post_id>/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('viewer')
def delete_comment(family_id, post_id, comment_id):
    """删除评论（仅作者或 admin）"""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    c = PostComment.query.filter_by(id=comment_id, post_id=post_id).first()
    if not c:
        return jsonify({'error': '评论不存在'}), 404
    if c.author_id != user_id and not (user and user.is_admin):
        return jsonify({'error': '仅作者本人可删除'}), 403
    p = Post.query.filter_by(id=post_id).first()
    db.session.delete(c)
    if p:
        p.comment_count = max(0, p.comment_count - 1)
    db.session.commit()
    return jsonify({'message': '已删除'})


@post_bp.route('/<int:family_id>/mentions/search', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def search_mentionable(family_id):
    """@提及 自动补全 - 在本家族中查找用户"""
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'items': []})
    from app.models.family import FamilyMember
    family_user_ids = [fm.user_id for fm in FamilyMember.query.filter_by(family_id=family_id).all()]
    if not family_user_ids:
        return jsonify({'items': []})
    users = (
        User.query
        .filter(User.id.in_(family_user_ids))
        .filter(
            (User.username.ilike(f'%{q}%')) |
            (User.display_name.ilike(f'%{q}%'))
        )
        .limit(10)
        .all()
    )
    return jsonify({
        'items': [
            {
                'id': u.id,
                'username': u.username,
                'display_name': u.display_name or u.username,
                'avatar': u.avatar,
            }
            for u in users
        ]
    })
