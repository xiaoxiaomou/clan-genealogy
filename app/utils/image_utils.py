"""图片处理工具模块"""
import os
import uuid
import time
from typing import Optional

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
ALLOWED_MIMES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}


def allowed_file(filename: str) -> bool:
    """检查文件扩展名是否合法"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_image(file_storage) -> Optional[str]:
    """验证上传的图片文件，返回错误信息或 None"""
    if not file_storage or file_storage.filename == '':
        return '未选择文件'

    if not allowed_file(file_storage.filename):
        return '不支持的文件格式，仅支持 JPG/PNG/GIF/WebP'

    # 检查 MIME 类型
    mime = file_storage.mimetype
    if mime and mime not in ALLOWED_MIMES:
        return '文件类型不合法'

    # 用 Pillow 验证是否为有效图片
    try:
        from PIL import Image
        file_storage.seek(0)
        img = Image.open(file_storage)
        img.verify()
        file_storage.seek(0)
    except Exception:
        return '文件不是有效的图片'

    return None


def process_avatar(file_storage, output_path: str, max_size: int = 400) -> None:
    """处理头像图片：转 RGB、缩放、保存为 JPEG"""
    from PIL import Image

    file_storage.seek(0)
    img = Image.open(file_storage)

    # 转换为 RGB（处理 RGBA/P 模式）
    if img.mode in ('RGBA', 'P', 'LA'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        if 'A' in img.mode:
            background.paste(img, mask=img.split()[-1])
            img = background
        else:
            img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # 缩放
    img.thumbnail((max_size, max_size), Image.LANCZOS)

    # 保存
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, 'JPEG', quality=85)


def generate_thumbnail(input_path: str, thumb_path: str, size: int = 100) -> None:
    """生成缩略图"""
    from PIL import Image

    img = Image.open(input_path)
    img.thumbnail((size, size), Image.LANCZOS)
    img.save(thumb_path, 'JPEG', quality=80)


def generate_filename(prefix: str, record_id: int, ext: str = 'jpg') -> str:
    """生成唯一文件名"""
    timestamp = int(time.time())
    random_hex = uuid.uuid4().hex[:6]
    return f'{prefix}_{record_id}_{timestamp}_{random_hex}.{ext}'


def delete_avatar_file(url_path: str, upload_folder: str) -> None:
    """删除头像文件及其缩略图"""
    if not url_path:
        return

    try:
        # 从 URL 路径提取文件名
        filename = url_path.rsplit('/', 1)[-1]
        filepath = os.path.join(upload_folder, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

        # 删除缩略图
        name, ext = os.path.splitext(filename)
        thumb_filename = f'{name}_thumb{ext}'
        thumb_path = os.path.join(upload_folder, thumb_filename)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
    except Exception:
        pass  # 删除失败不阻断主流程


def get_thumb_url(url_path: str) -> str:
    """从原图 URL 获取缩略图 URL"""
    if not url_path:
        return ''
    name, ext = url_path.rsplit('.', 1)
    return f'{name}_thumb.{ext}'
