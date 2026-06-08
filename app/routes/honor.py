"""功德榜/荣誉墙 API"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.honor import Honor
from app.utils.decorators import family_permission_required

honor_bp = Blueprint('honor', __name__)


@honor_bp.route('/<int:family_id>/honors', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_honors(family_id):
    honors = (
        Honor.query.filter_by(family_id=family_id)
        .order_by(Honor.year.desc().nulls_last(), Honor.created_at.desc())
        .all()
    )
    return jsonify({'honors': [h.to_dict() for h in honors]})


@honor_bp.route('/<int:family_id>/honors', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_honor(family_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    member_id = data.get('member_id')
    title = (data.get('title') or '').strip()
    if not member_id or not title:
        return jsonify({'error': '成员ID与标题必填'}), 400
    h = Honor(
        family_id=family_id,
        member_id=int(member_id),
        title=title,
        category=data.get('category', 'other'),
        year=data.get('year'),
        description=data.get('description'),
        awarder=data.get('awarder'),
        created_by=user_id,
    )
    db.session.add(h)
    db.session.commit()
    return jsonify({'message': '荣誉已添加', 'honor': h.to_dict()}), 201


@honor_bp.route('/<int:family_id>/honors/<int:honor_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_honor(family_id, honor_id):
    data = request.get_json(silent=True) or {}
    h = Honor.query.filter_by(id=honor_id, family_id=family_id).first()
    if not h:
        return jsonify({'error': '荣誉不存在'}), 404
    for f in ('title', 'category', 'year', 'description', 'awarder'):
        if f in data:
            setattr(h, f, data[f])
    h.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已更新', 'honor': h.to_dict()})


@honor_bp.route('/<int:family_id>/honors/<int:honor_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('admin')
def delete_honor(family_id, honor_id):
    h = Honor.query.filter_by(id=honor_id, family_id=family_id).first()
    if not h:
        return jsonify({'error': '荣誉不存在'}), 404
    db.session.delete(h)
    db.session.commit()
    return jsonify({'message': '已删除'})
