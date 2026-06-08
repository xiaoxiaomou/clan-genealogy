"""世系图与旁系图 API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.member import Member
from app.models.relationship import Relationship
from app.utils.decorators import family_permission_required
from app.services.tree_layout import build_lineage_chart, build_cousin_tree

lineage_bp = Blueprint('lineage', __name__)


@lineage_bp.route('/<int:family_id>/tree/lineage', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_lineage(family_id):
    """获取世系图（苏/欧/宝塔式）"""
    style = request.args.get('style', 'ou').lower()
    if style not in ('su', 'ou', 'baota'):
        style = 'ou'
    root_member_id = request.args.get('root_member_id', type=int)

    members = Member.query.filter_by(family_id=family_id).all()
    member_ids = {m.id for m in members}
    if not member_ids:
        return jsonify({'nodes': [], 'edges': [], 'style': style})

    rels = Relationship.query.filter(
        Relationship.member_id.in_(member_ids),
        Relationship.related_member_id.in_(member_ids),
    ).all()

    chart = build_lineage_chart(members, rels, style, root_member_id)
    return jsonify(chart)


@lineage_bp.route('/<int:family_id>/tree/cousin', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_cousin(family_id):
    """获取旁系图（cousin tree）"""
    root_member_id = request.args.get('root_member_id', type=int)
    if not root_member_id:
        return jsonify({'error': '请提供 root_member_id'}), 400
    depth = min(max(request.args.get('depth', default=3, type=int), 1), 6)

    members = Member.query.filter_by(family_id=family_id).all()
    member_ids = {m.id for m in members}
    if root_member_id not in member_ids:
        return jsonify({'error': '根成员不存在'}), 404

    rels = Relationship.query.filter(
        Relationship.member_id.in_(member_ids),
        Relationship.related_member_id.in_(member_ids),
    ).all()

    chart = build_cousin_tree(members, rels, root_member_id, depth)
    return jsonify(chart)
