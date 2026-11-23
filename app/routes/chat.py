"""家族聊天 API（轮询模式，无 WebSocket）"""
import json
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.chat import ChatGroup, ChatMessage
from app.models.user import User
from app.utils.decorators import family_permission_required

chat_bp = Blueprint('chat', __name__)

# 聊天媒体：仅允许常见图片与语音格式，单文件上限 5MB（与全局 MAX_CONTENT_LENGTH 一致）
CHAT_IMAGE_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
CHAT_VOICE_EXT = {'webm', 'ogg', 'mp3', 'wav', 'm4a'}
CHAT_MAX_BYTES = 5 * 1024 * 1024


def _chat_upload_dir():
    """聊天媒体目录（app/static/chat），确保存在"""
    path = os.path.join(current_app.root_path, 'static', 'chat')
    os.makedirs(path, exist_ok=True)
    return path


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
    msg_type = data.get('msg_type') or 'text'
    media_url = (data.get('media_url') or '').strip()
    duration = data.get('duration')

    if msg_type not in ('text', 'image', 'voice'):
        return jsonify({'error': '无效的消息类型'}), 400

    if msg_type == 'text':
        if not content:
            return jsonify({'error': '内容不能为空'}), 400
        media_url = None
        duration = None
    else:
        if not media_url:
            return jsonify({'error': '缺少媒体文件'}), 400
        # 仅允许站内静态资源路径，避免外部 URL 注入
        if not media_url.startswith('/static/chat/'):
            return jsonify({'error': '无效的媒体地址'}), 400
        if msg_type == 'voice':
            try:
                duration = max(1, min(int(duration or 1), 600))
            except (TypeError, ValueError):
                duration = 1
        else:
            duration = None

    m = ChatMessage(
        group_id=group_id,
        sender_id=user_id,
        content=content[:2000],
        msg_type=msg_type,
        media_url=media_url or None,
        duration=duration,
    )
    db.session.add(m)
    g.last_message_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': '已发送', 'data': m.to_dict()}), 201


@chat_bp.route('/<int:family_id>/chat/upload', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def upload_chat_media(family_id):
    """上传聊天媒体（图片 / 语音），返回可用于 send_message 的 media_url。"""
    user_id = int(get_jwt_identity())
    if 'file' not in request.files:
        return jsonify({'error': '未找到上传文件'}), 400
    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': '文件名为空'}), 400

    kind = request.form.get('kind', 'image')  # image / voice
    if kind not in ('image', 'voice'):
        return jsonify({'error': '无效的媒体类型'}), 400

    ext = secure_filename(file.filename).rsplit('.', 1)[-1].lower()
    allowed = CHAT_IMAGE_EXT if kind == 'image' else CHAT_VOICE_EXT
    if ext not in allowed:
        return jsonify({'error': f'不支持的文件格式，仅允许：{", ".join(sorted(allowed))}'}), 400

    # 读取并校验大小
    data = file.read()
    if not data:
        return jsonify({'error': '文件内容为空'}), 400
    if len(data) > CHAT_MAX_BYTES:
        return jsonify({'error': '文件过大，上限 5MB'}), 400

    # 生成不可猜的文件名：family_user_uuid.ext
    filename = f'f{family_id}_u{user_id}_{uuid.uuid4().hex[:12]}.{ext}'
    upload_dir = _chat_upload_dir()
    filepath = os.path.join(upload_dir, filename)
    try:
        with open(filepath, 'wb') as f:
            f.write(data)
    except OSError:
        return jsonify({'error': '文件保存失败'}), 500

    return jsonify({
        'url': f'/static/chat/{filename}',
        'kind': kind,
        'size': len(data),
    }), 201


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
