"""家族聊天 API（轮询模式，无 WebSocket）"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.chat import ChatGroup, ChatMessage
from app.models.user import User
from app.utils.decorators import family_permission_required

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/<int:family_id>/chat/groups', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_groups(family_id):
    user_id = int(get_jwt_identity())
    groups = ChatGroup.query.filter_by(family_id=family_id).all()
    result = []
    for g in groups:
        member_ids = json.loads(g.member_ids) if g.member_ids else []
        if user_id not in member_ids:
            continue
        d = g.to_dict()
        # 最新一条消息预览
        last = (
            ChatMessage.query.filter_by(group_id=g.id)
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        d['last_message'] = last.to_dict() if last else None
        result.append(d)
    # 按最后消息时间排序
    result.sort(
        key=lambda x: x.get('last_message_at') or '',
        reverse=True,
    )
    return jsonify({'groups': result})


@chat_bp.route('/<int:family_id>/chat/groups', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def create_group(family_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    member_ids = data.get('member_ids') or []
    if not name:
        return jsonify({'error': '群组名称不能为空'}), 400
    if user_id not in member_ids:
        member_ids = [user_id] + list(member_ids)
    g = ChatGroup(
        family_id=family_id,
        name=name,
        type=data.get('type', 'custom'),
        member_ids=json.dumps(list(set(member_ids)), ensure_ascii=False),
        created_by=user_id,
    )
    db.session.add(g)
    db.session.commit()
    return jsonify({'message': '群组已创建', 'group': g.to_dict()}), 201


@chat_bp.route('/<int:family_id>/chat/groups/<int:group_id>/messages', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_messages(family_id, group_id):
    user_id = int(get_jwt_identity())
    g = ChatGroup.query.filter_by(id=group_id, family_id=family_id).first()
    if not g:
        return jsonify({'error': '群组不存在'}), 404
    member_ids = json.loads(g.member_ids) if g.member_ids else []
    if user_id not in member_ids:
        return jsonify({'error': '不在该群组中'}), 403
    since = request.args.get('since', type=int)
    q = ChatMessage.query.filter_by(group_id=group_id)
    if since:
        q = q.filter(ChatMessage.id > since)
    q = q.order_by(ChatMessage.created_at.asc()).limit(200)
    return jsonify({'messages': [m.to_dict() for m in q.all()]})


@chat_bp.route('/<int:family_id>/chat/groups/<int:group_id>/messages', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def send_message(family_id, group_id):
    user_id = int(get_jwt_identity())
    g = ChatGroup.query.filter_by(id=group_id, family_id=family_id).first()
    if not g:
        return jsonify({'error': '群组不存在'}), 404
    member_ids = json.loads(g.member_ids) if g.member_ids else []
    if user_id not in member_ids:
        return jsonify({'error': '不在该群组中'}), 403
    data = request.get_json(silent=True) or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'error': '内容不能为空'}), 400
    m = ChatMessage(group_id=group_id, sender_id=user_id, content=content[:2000])
    db.session.add(m)
    g.last_message_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已发送', 'data': m.to_dict()}), 201


@chat_bp.route('/<int:family_id>/chat/dm', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def create_dm(family_id):
    """创建或获取与某用户的私聊频道"""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    peer_id = data.get('peer_user_id')
    if not peer_id:
        return jsonify({'error': '请提供 peer_user_id'}), 400
    if int(peer_id) == user_id:
        return jsonify({'error': '不能与自己私聊'}), 400
    # 查找已存在的 dm
    groups = ChatGroup.query.filter_by(family_id=family_id, type='dm').all()
    for g in groups:
        ids = json.loads(g.member_ids) if g.member_ids else []
        if set(ids) == {user_id, int(peer_id)}:
            return jsonify({'group': g.to_dict()})
    # 创建
    peer = db.session.get(User, int(peer_id))
    if not peer:
        return jsonify({'error': '对方用户不存在'}), 404
    g = ChatGroup(
        family_id=family_id,
        name=f'{peer.display_name or peer.username}',
        type='dm',
        member_ids=json.dumps([user_id, int(peer_id)]),
        created_by=user_id,
    )
    db.session.add(g)
    db.session.commit()
    return jsonify({'group': g.to_dict()}), 201
