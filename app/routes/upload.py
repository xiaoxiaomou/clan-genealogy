import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import current_app
from app.utils.image_utils import (
    validate_image,
    process_avatar,
    generate_thumbnail,
    generate_filename,
    delete_avatar_file,
)
from app.models.user import User
from app.models.member import Member
from app.models.family import FamilyMember
from app import db

upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    """上传头像"""
    user_id = int(get_jwt_identity())

    # 检查是否有文件
    if 'file' not in request.files:
        return jsonify({'error': '未找到上传文件'}), 400

    file = request.files['file']
    upload_type = request.form.get('type', 'member')  # user 或 member
    member_id = None
    target_member = None

    if upload_type not in ('user', 'member'):
        return jsonify({'error': '无效的上传类型'}), 400

    # 验证文件
    error = validate_image(file)
    if error:
        return jsonify({'error': error}), 400

    # 确定记录 ID
    record_id = user_id
    if upload_type == 'member':
        member_id = request.form.get('member_id', type=int)
        if member_id:
            target_member = db.session.get(Member, member_id)
            if not target_member:
                return jsonify({'error': '成员不存在'}), 404

            current_user = db.session.get(User, user_id)
            if not current_user:
                return jsonify({'error': '用户不存在'}), 401

            if not current_user.is_admin:
                fm = FamilyMember.query.filter_by(
                    family_id=target_member.family_id,
                    user_id=user_id
                ).first()
                if not fm or fm.role not in ('owner', 'admin', 'editor'):
                    return jsonify({'error': '无权修改该成员头像'}), 403

            record_id = member_id
        else:
            # 使用 user_id + 随机数作为临时 ID
            record_id = user_id

    # 生成文件名
    filename = generate_filename(upload_type, record_id)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filepath = os.path.join(upload_folder, filename)

    try:
        # 处理并保存图片
        process_avatar(file, filepath, max_size=400)

        # 生成缩略图
        name, ext = os.path.splitext(filename)
        thumb_filename = f'{name}_thumb{ext}'
        thumb_path = os.path.join(upload_folder, thumb_filename)
        generate_thumbnail(filepath, thumb_path, size=100)

        # 返回 URL 路径
        url = f'/static/images/avatars/{filename}'

        # 更新数据库中的头像字段
        if upload_type == 'user':
            user = db.session.get(User, user_id)
            if user:
                # 清理旧头像
                if user.avatar:
                    delete_avatar_file(user.avatar, upload_folder)
                user.avatar = url
                db.session.commit()
        elif upload_type == 'member' and target_member:
            if target_member:
                # 清理旧头像
                if target_member.avatar:
                    delete_avatar_file(target_member.avatar, upload_folder)
                target_member.avatar = url
                db.session.commit()

        return jsonify({
            'message': '头像上传成功',
            'url': url,
        })

    except Exception as e:
        # 清理可能已创建的文件
        if os.path.exists(filepath):
            os.remove(filepath)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
        return jsonify({'error': f'图片处理失败: {str(e)}'}), 500
