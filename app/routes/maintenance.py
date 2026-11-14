"""
数据维护 API 路由（管理员专用）
提供备份管理、数据完整性检查、孤儿文件清理与全站家族列表。
"""
import os
import json
import shutil
import zipfile
from datetime import datetime
from glob import glob

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.utils.decorators import admin_required
from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.event import FamilyEvent
from app.models.album import FamilyPhoto

maintenance_bp = Blueprint('maintenance', __name__)

# 备份文件白名单扩展与目录名（防路径穿越）
BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'backups',
)


def _images_dir(sub):
    """static/images 下的子目录（不存在则创建）"""
    path = os.path.join(current_app.static_folder, 'images', sub)
    os.makedirs(path, exist_ok=True)
    return path


def _safe_backup_path(filename):
    """校验备份文件名，防止路径穿越；不存在返回 None"""
    name = os.path.basename(filename)
    if not name.endswith('.zip') or name != filename:
        return None
    path = os.path.join(BACKUP_DIR, name)
    return path if os.path.isfile(path) else None


def _backup_info(path):
    st = os.stat(path)
    return {
        'filename': os.path.basename(path),
        'size_bytes': st.st_size,
        'size_mb': round(st.st_size / 1024 / 1024, 2),
        'created_at': datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
    }


def _referenced_basenames(paths):
    """从 /static/images/.../xxx 格式的引用中提取文件名集合"""
    refs = set()
    for p in paths:
        if p:
            refs.add(os.path.basename(p.replace('\\', '/')))
    return refs


def _orphan_files_in_dir(sub, referenced, has_thumb_convention=False):
    """找出目录中未被引用的文件；头像目录有 <name>_thumb 约定，随主文件处理"""
    folder = _images_dir(sub)
    orphans = []
    for f in os.listdir(folder):
        full = os.path.join(folder, f)
        if not os.path.isfile(full):
            continue
        if f in referenced:
            continue
        # 缩略图约定：主文件被引用则缩略图视为被引用
        if has_thumb_convention and '_thumb' in f:
            main = f.replace('_thumb', '', 1)
            if main in referenced:
                continue
        orphans.append({'file': f, 'size_bytes': os.path.getsize(full)})
    return orphans


def _dir_total_size(folder):
    total = 0
    for f in glob(os.path.join(folder, '*')):
        if os.path.isfile(f):
            total += os.path.getsize(f)
    return total


def _sqlite_db_path():
    """从 SQLAlchemy URI 解析 SQLite 数据库文件路径；非 SQLite 返回 None"""
    uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    prefix = 'sqlite:///'
    if not uri.startswith(prefix):
        return None
    db_path = uri[len(prefix):]
    # 相对路径是相对 app/ 目录的（config.py 里以 __file__ 拼接，此处兜底）
    return db_path if os.path.isabs(db_path) else os.path.abspath(
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', db_path)
    )


@maintenance_bp.route('/admin/maintenance/backups', methods=['GET'])
@jwt_required()
@admin_required
def list_backups():
    """列出所有备份文件"""
    os.makedirs(BACKUP_DIR, exist_ok=True)
    backups = sorted(
        (_backup_info(p) for p in glob(os.path.join(BACKUP_DIR, '*.zip'))),
        key=lambda b: b['created_at'],
        reverse=True,
    )
    return jsonify({'backups': backups, 'sqlite': _sqlite_db_path() is not None})


@maintenance_bp.route('/admin/maintenance/backups', methods=['POST'])
@jwt_required()
@admin_required
def create_backup():
    """创建备份：数据库 + 全部图片目录打包为一个 zip"""
    db_path = _sqlite_db_path()
    if not db_path or not os.path.isfile(db_path):
        return jsonify({'error': '当前数据库不是 SQLite，无法在页面内备份'}), 400

    os.makedirs(BACKUP_DIR, exist_ok=True)
    filename = f"zupu-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.zip"
    target = os.path.join(BACKUP_DIR, filename)

    try:
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.write(db_path, 'zupu.db')
            for sub in ('avatars', 'events', 'albums'):
                folder = os.path.join(current_app.static_folder, 'images', sub)
                if not os.path.isdir(folder):
                    continue
                for f in os.listdir(folder):
                    full = os.path.join(folder, f)
                    if os.path.isfile(full):
                        zf.write(full, f'images/{sub}/{f}')
    except OSError as e:
        if os.path.exists(target):
            os.remove(target)
        return jsonify({'error': f'备份失败: {e}'}), 500

    log = AuditLog(
        user_id=get_jwt_identity(),
        action='create',
        entity_type='backup',
        entity_id=None,
        description=f'创建备份: {filename}',
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': '备份创建成功', 'backup': _backup_info(target)})


@maintenance_bp.route('/admin/maintenance/backups/<path:filename>/download', methods=['GET'])
@jwt_required()
@admin_required
def download_backup(filename):
    path = _safe_backup_path(filename)
    if not path:
        return jsonify({'error': '备份不存在'}), 404
    return send_file(path, as_attachment=True, download_name=filename)


@maintenance_bp.route('/admin/maintenance/backups/<path:filename>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_backup(filename):
    path = _safe_backup_path(filename)
    if not path:
        return jsonify({'error': '备份不存在'}), 404
    os.remove(path)

    log = AuditLog(
        user_id=get_jwt_identity(),
        action='delete',
        entity_type='backup',
        entity_id=None,
        description=f'删除备份: {os.path.basename(filename)}',
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': '备份已删除'})


@maintenance_bp.route('/admin/maintenance/integrity', methods=['GET'])
@jwt_required()
@admin_required
def integrity_check():
    """数据完整性检查：孤儿记录与孤儿图片文件"""
    # 孤儿成员：family_id 指向不存在的家族
    orphan_members = (
        db.session.query(Member.id, Member.name, Member.family_id)
        .outerjoin(Family, Member.family_id == Family.id)
        .filter(Family.id.is_(None))
        .limit(20)
        .all()
    )

    # 孤儿关系：指向不存在的成员
    member_ids = {m.id for m in db.session.query(Member.id).all()}
    orphan_rels = []
    for rel in db.session.query(Relationship).all():
        if rel.member_id not in member_ids or rel.related_member_id not in member_ids:
            orphan_rels.append(rel)
            if len(orphan_rels) >= 20:
                break

    # 孤儿图片文件
    avatar_refs = _referenced_basenames(
        row[0] for row in db.session.query(User.avatar).all()
    )
    event_refs, broken_event_rows = set(), 0
    for (images_json,) in db.session.query(FamilyEvent.images).all():
        if not images_json:
            continue
        try:
            arr = json.loads(images_json)
            if isinstance(arr, list):
                event_refs.update(
                    os.path.basename(str(p).replace('\\', '/')) for p in arr if p
                )
        except (ValueError, TypeError):
            broken_event_rows += 1
    album_refs = _referenced_basenames(
        row[0] for row in db.session.query(FamilyPhoto.file_path).all()
    )

    avatar_orphans = _orphan_files_in_dir('avatars', avatar_refs, has_thumb_convention=True)
    event_orphans = _orphan_files_in_dir('events', event_refs)
    album_orphans = _orphan_files_in_dir('albums', album_refs)

    def _pack(items):
        return {
            'count': len(items),
            'samples': items[:10],
            'size_bytes': sum(i['size_bytes'] for i in items),
        }

    return jsonify({
        'sqlite': _sqlite_db_path() is not None,
        'checks': {
            'orphan_members': {
                'count': len(orphan_members),
                'samples': [
                    {'id': i, 'name': n, 'family_id': f} for i, n, f in orphan_members
                ],
            },
            'orphan_relationships': {
                'count': len(orphan_rels),
                'samples': [
                    {'id': r.id, 'member_id': r.member_id, 'related_member_id': r.related_member_id}
                    for r in orphan_rels[:10]
                ],
            },
            'broken_event_images_rows': {'count': broken_event_rows},
            'orphan_avatar_files': _pack(avatar_orphans),
            'orphan_event_files': _pack(event_orphans),
            'orphan_album_files': _pack(album_orphans),
        },
        'image_dirs': {
            sub: {'files': len(glob(os.path.join(_images_dir(sub), '*'))),
                  'size_bytes': _dir_total_size(_images_dir(sub))}
            for sub in ('avatars', 'events', 'albums')
        },
    })


@maintenance_bp.route('/admin/maintenance/cleanup', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_orphans():
    """清理孤儿图片文件（按目录），返回删除数量与释放空间"""
    data = request.get_json(silent=True) or {}
    target = data.get('target')
    if target not in ('avatars', 'events', 'albums'):
        return jsonify({'error': 'target 必须是 avatars / events / albums'}), 400

    if target == 'avatars':
        refs = _referenced_basenames(
            row[0] for row in db.session.query(User.avatar).all()
        )
        orphans = _orphan_files_in_dir('avatars', refs, has_thumb_convention=True)
    elif target == 'events':
        refs = set()
        for (images_json,) in db.session.query(FamilyEvent.images).all():
            if not images_json:
                continue
            try:
                arr = json.loads(images_json)
                if isinstance(arr, list):
                    refs.update(
                        os.path.basename(str(p).replace('\\', '/')) for p in arr if p
                    )
            except (ValueError, TypeError):
                continue
        orphans = _orphan_files_in_dir('events', refs)
    else:
        refs = _referenced_basenames(
            row[0] for row in db.session.query(FamilyPhoto.file_path).all()
        )
        orphans = _orphan_files_in_dir('albums', refs)

    folder = _images_dir(target)
    deleted, freed = 0, 0
    for item in orphans:
        path = os.path.join(folder, item['file'])
        try:
            freed += os.path.getsize(path)
            os.remove(path)
            deleted += 1
        except OSError:
            continue

    if deleted:
        log = AuditLog(
            user_id=get_jwt_identity(),
            action='delete',
            entity_type='cleanup',
            entity_id=None,
            description=f'清理孤儿图片 [{target}]: {deleted} 个文件，释放 {freed / 1024 / 1024:.2f} MB',
            ip_address=request.remote_addr,
        )
        db.session.add(log)
        db.session.commit()

    return jsonify({
        'message': f'已清理 {deleted} 个孤儿文件' if deleted else '没有需要清理的孤儿文件',
        'deleted_count': deleted,
        'freed_bytes': freed,
    })


@maintenance_bp.route('/admin/maintenance/families', methods=['GET'])
@jwt_required()
@admin_required
def all_families():
    """全站家族列表（管理员只读视图）：成员数与所有者"""
    families = db.session.query(Family).order_by(Family.created_at.desc()).all()
    member_counts = dict(
        db.session.query(FamilyMember.family_id, db.func.count(FamilyMember.id))
        .group_by(FamilyMember.family_id)
        .all()
    )
    owner_user_ids = {
        fm.family_id: fm.user_id
        for fm in db.session.query(FamilyMember)
        .filter(FamilyMember.role == 'owner')
        .all()
    }
    users_by_id = {
        u.id: u
        for u in db.session.query(User)
        .filter(User.id.in_(owner_user_ids.values()))
        .all()
    } if owner_user_ids else {}
    result = [
        {
            'id': fam.id,
            'name': fam.name,
            'surname': fam.surname,
            'member_count': member_counts.get(fam.id, 0),
            'owner_username': users_by_id[owner_user_ids[fam.id]].username
            if fam.id in owner_user_ids else None,
            'owner_name': users_by_id[owner_user_ids[fam.id]].display_name
            if fam.id in owner_user_ids else None,
            'created_at': fam.created_at.isoformat() if fam.created_at else None,
        }
        for fam in families
    ]
    return jsonify({'families': result})
