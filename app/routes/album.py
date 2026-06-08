import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.album import FamilyAlbum, FamilyPhoto
from app.models.audit_log import AuditLog
from app.utils.decorators import family_permission_required, admin_required

album_bp = Blueprint('album', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_album_upload_folder():
    """获取相册上传目录"""
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'images', 'albums')
    os.makedirs(base, exist_ok=True)
    return base


def create_audit_log(family_id, user_id, action, entity_type, entity_id=None, description=None):
    """创建审计日志条目"""
    from app.models.audit_log import AuditLog
    log = AuditLog(
        family_id=family_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=request.remote_addr,
    )
    db.session.add(log)


# ==================== 相册管理 ====================

@album_bp.route('/<int:family_id>/albums', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_albums(family_id):
    """获取家族所有相册"""
    try:
        albums = FamilyAlbum.query.filter_by(family_id=family_id)\
            .order_by(FamilyAlbum.created_at.desc()).all()
        result = []
        for album in albums:
            data = album.to_dict()
            data['photo_count'] = album.photos.count()
            if album.cover_photo_id:
                cover = db.session.get(FamilyPhoto, album.cover_photo_id)
                data['cover_url'] = cover.file_path if cover else None
            else:
                first_photo = album.photos.first()
                data['cover_url'] = first_photo.file_path if first_photo else None
            result.append(data)
        return jsonify({'albums': result})
    except Exception as e:
        return jsonify({'error': f'获取相册列表失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums', methods=['POST'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def create_album(family_id):
    """创建相册"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': '相册名称不能为空'}), 400

    try:
        album = FamilyAlbum(
            family_id=family_id,
            name=name,
            description=data.get('description'),
            created_by=user_id,
        )
        db.session.add(album)
        create_audit_log(
            family_id, user_id, 'create', 'album',
            entity_id=album.id, description=f'创建相册: {name}'
        )
        db.session.commit()
        return jsonify({
            'message': '相册创建成功',
            'album': album.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建相册失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums/<int:album_id>', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_album(family_id, album_id):
    """获取相册详情（含照片）"""
    try:
        album = FamilyAlbum.query.filter_by(id=album_id, family_id=family_id).first()
        if not album:
            return jsonify({'error': '相册不存在'}), 404

        data = album.to_dict()
        photos = album.photos.order_by(FamilyPhoto.created_at.desc()).all()
        data['photos'] = [p.to_dict() for p in photos]
        data['photo_count'] = len(photos)
        return jsonify({'album': data})
    except Exception as e:
        return jsonify({'error': f'获取相册详情失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums/<int:album_id>', methods=['PUT'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def update_album(family_id, album_id):
    """更新相册信息"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据不能为空'}), 400

    try:
        album = FamilyAlbum.query.filter_by(id=album_id, family_id=family_id).first()
        if not album:
            return jsonify({'error': '相册不存在'}), 404

        if 'name' in data:
            name = data['name'].strip()
            if not name:
                return jsonify({'error': '相册名称不能为空'}), 400
            album.name = name
        if 'description' in data:
            album.description = data['description']
        if 'cover_photo_id' in data:
            album.cover_photo_id = data['cover_photo_id']

        album.updated_at = datetime.utcnow()
        create_audit_log(
            family_id, user_id, 'update', 'album',
            entity_id=album.id, description=f'更新相册: {album.name}'
        )
        db.session.commit()
        return jsonify({
            'message': '相册更新成功',
            'album': album.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新相册失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums/<int:album_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@family_permission_required('admin')
def delete_album(family_id, album_id):
    """删除相册（同时删除其中的照片文件）"""
    user_id = int(get_jwt_identity())
    try:
        album = FamilyAlbum.query.filter_by(id=album_id, family_id=family_id).first()
        if not album:
            return jsonify({'error': '相册不存在'}), 404

        # 删除所有照片文件
        photos = album.photos.all()
        for photo in photos:
            if photo.file_path:
                file_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'static', photo.file_path.lstrip('/')
                ) if not os.path.isabs(photo.file_path) else photo.file_path
                if os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError:
                        pass
            db.session.delete(photo)

        name = album.name
        db.session.delete(album)
        create_audit_log(
            family_id, user_id, 'delete', 'album',
            entity_id=album_id, description=f'删除相册: {name}'
        )
        db.session.commit()
        return jsonify({'message': '相册删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除相册失败: {str(e)}'}), 500


# ==================== 照片管理 ====================

@album_bp.route('/<int:family_id>/albums/<int:album_id>/photos', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_photos(family_id, album_id):
    """获取相册中的照片列表"""
    try:
        album = FamilyAlbum.query.filter_by(id=album_id, family_id=family_id).first()
        if not album:
            return jsonify({'error': '相册不存在'}), 404

        photos = album.photos.order_by(FamilyPhoto.created_at.desc()).all()
        return jsonify({
            'photos': [p.to_dict() for p in photos]
        })
    except Exception as e:
        return jsonify({'error': f'获取照片列表失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums/<int:album_id>/photos', methods=['POST'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def upload_photo(family_id, album_id):
    """上传照片到相册"""
    user_id = int(get_jwt_identity())

    # 检查相册是否存在
    album = FamilyAlbum.query.filter_by(id=album_id, family_id=family_id).first()
    if not album:
        return jsonify({'error': '相册不存在'}), 404

    if 'file' not in request.files:
        return jsonify({'error': '未上传文件'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': '文件名为空'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式，支持: png, jpg, jpeg, gif, webp, bmp'}), 400

    try:
        # 保存文件
        upload_folder = get_album_upload_folder()
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)

        # 计算文件大小
        file_size = os.path.getsize(file_path)

        # 存储相对路径
        relative_path = f"/static/images/albums/{filename}"

        title = request.form.get('title')
        description = request.form.get('description')
        member_id = request.form.get('member_id')
        if member_id:
            try:
                member_id = int(member_id)
            except (ValueError, TypeError):
                member_id = None

        photo = FamilyPhoto(
            album_id=album_id,
            member_id=member_id,
            title=title,
            description=description,
            file_path=relative_path,
            file_size=file_size,
            mime_type=file.content_type,
            uploaded_by=user_id,
        )
        db.session.add(photo)
        create_audit_log(
            family_id, user_id, 'create', 'photo',
            entity_id=photo.id, description=f'上传照片: {title or filename}'
        )
        db.session.commit()
        return jsonify({
            'message': '照片上传成功',
            'photo': photo.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'上传照片失败: {str(e)}'}), 500


@album_bp.route('/<int:family_id>/albums/<int:album_id>/photos/<int:photo_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@family_permission_required('editor')
def delete_photo(family_id, album_id, photo_id):
    """删除照片（同时删除文件）"""
    user_id = int(get_jwt_identity())
    try:
        photo = FamilyPhoto.query.filter_by(id=photo_id, album_id=album_id).first()
        if not photo:
            return jsonify({'error': '照片不存在'}), 404

        # 删除文件
        if photo.file_path:
            # 解析路径
            file_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'static', photo.file_path.lstrip('/static/')
            ) if '..' not in photo.file_path else photo.file_path

            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass

        # 如果此照片是相册封面，清除引用
        album = db.session.get(FamilyAlbum, album_id)
        if album and album.cover_photo_id == photo_id:
            album.cover_photo_id = None

        db.session.delete(photo)
        create_audit_log(
            family_id, user_id, 'delete', 'photo',
            entity_id=photo_id, description=f'删除照片: {photo.title or photo.file_path}'
        )
        db.session.commit()
        return jsonify({'message': '照片删除成功'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除照片失败: {str(e)}'}), 500
