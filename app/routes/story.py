from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app import db
from app.models.article import FamilyArticle
from app.models.family import Family
from app.utils.decorators import family_permission_required

story_bp = Blueprint('story', __name__)


@story_bp.route('/<int:family_id>/articles', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_articles(family_id):
    articles = FamilyArticle.query.filter_by(family_id=family_id, is_published=True)\
        .order_by(FamilyArticle.sort_order, FamilyArticle.created_at).all()
    return jsonify({'articles': [a.to_dict() for a in articles]})


@story_bp.route('/<int:family_id>/articles/all', methods=['GET'])
@jwt_required()
@family_permission_required('editor')
def list_all_articles(family_id):
    articles = FamilyArticle.query.filter_by(family_id=family_id)\
        .order_by(FamilyArticle.sort_order, FamilyArticle.created_at).all()
    return jsonify({'articles': [a.to_dict() for a in articles]})


@story_bp.route('/<int:family_id>/articles', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_article(family_id):
    data = request.get_json()
    if not data or not data.get('title', '').strip():
        return jsonify({'error': '标题不能为空'}), 400
    max_order = db.session.query(db.func.max(FamilyArticle.sort_order))\
        .filter_by(family_id=family_id).scalar() or 0
    article = FamilyArticle(
        family_id=family_id,
        title=data['title'].strip(),
        content=data.get('content', ''),
        summary=data.get('summary', ''),
        type=data.get('type', 'story'),
        sort_order=data.get('sort_order', max_order + 1),
        is_published=data.get('is_published', True),
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({'article': article.to_dict()}), 201


@story_bp.route('/<int:family_id>/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_article(family_id, article_id):
    article = FamilyArticle.query.filter_by(id=article_id, family_id=family_id).first()
    if not article:
        return jsonify({'error': '文章不存在'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400
    for field in ('title', 'content', 'summary', 'type', 'sort_order', 'is_published'):
        if field in data:
            setattr(article, field, data[field])
    db.session.commit()
    return jsonify({'article': article.to_dict()})


@story_bp.route('/<int:family_id>/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_article(family_id, article_id):
    article = FamilyArticle.query.filter_by(id=article_id, family_id=family_id).first()
    if not article:
        return jsonify({'error': '文章不存在'}), 404
    db.session.delete(article)
    db.session.commit()
    return jsonify({'message': '删除成功'})


@story_bp.route('/<int:family_id>/intro', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_family_intro(family_id):
    family = Family.query.get(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400
    if 'intro' in data:
        family.intro = data['intro']
    if 'motto' in data:
        family.motto = data['motto']
    db.session.commit()
    return jsonify({'family': family.to_dict()})
