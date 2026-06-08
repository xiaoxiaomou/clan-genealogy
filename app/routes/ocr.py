"""
AI OCR 家谱图片识别

通过 LLM (OpenAI 兼容协议) 识别家谱图片中的成员信息。

支持的环境变量：
  LLM_API_KEY       - LLM API 密钥（必填，未配置时返回模拟数据）
  LLM_BASE_URL      - API 基础 URL（默认 https://api.openai.com/v1）
  LLM_MODEL         - 模型名（默认 gpt-4o）
  LLM_VISION_MODEL  - 视觉模型（默认同 LLM_MODEL）

输出格式：结构化成员列表 + 关系
"""
import os
import re
import json
import base64
import logging
import requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.decorators import family_permission_required
from app.services.family_service import FamilyService
from app.utils.audit import log_action

ocr_bp = Blueprint('ocr', __name__)
logger = logging.getLogger(__name__)


OCR_PROMPT = """你是一名专业的家谱研究助手。请仔细分析用户上传的家谱图片（可能是老族谱、墓碑、家谱印刷品等），
从图片中提取所有可见的家族成员信息。

要求：
1. 仔细识别人物姓名、性别（男/女/未知）、生卒年、字辈、籍贯、简介等
2. 推断人物之间的父子、夫妻、兄弟关系
3. 如果图片是世系图，按"第X代"或"X世"组织
4. 如果字迹不清，请在 bio 中标注"（字迹不清）"
5. 仅输出 JSON，不要 Markdown 代码块

输出 JSON 格式：
{
  "members": [
    {
      "name": "姓名",
      "gender": "male/female/unknown",
      "birth_date": "YYYY-MM-DD 或留空",
      "death_date": "YYYY-MM-DD 或留空",
      "generation": 1,
      "generation_name": "字辈字",
      "is_alive": false,
      "bio": "简介",
      "birth_place": "出生地"
    }
  ],
  "relationships": [
    {
      "from": "父姓名",
      "to": "子姓名",
      "type": "parent"
    },
    {
      "from": "夫姓名",
      "to": "妻姓名",
      "type": "spouse"
    }
  ]
}

如果图片中完全无人脸/无文字，返回 {"members": [], "relationships": [], "note": "图片中未识别到家族成员信息"}。
"""


def _call_llm_vision(image_data_url: str) -> dict:
    """
    调用 LLM 视觉模型识别家谱图片

    Args:
        image_data_url: data:image/...;base64,xxx 格式

    Returns:
        解析后的字典
    """
    api_key = os.environ.get('LLM_API_KEY', '').strip()
    if not api_key:
        # 模拟数据：返回空 + 提示
        return {
            'members': [],
            'relationships': [],
            'note': 'LLM_API_KEY 未配置。请在环境变量中设置 LLM_API_KEY 后重试。',
            'mock': True,
        }

    base_url = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1').rstrip('/')
    model = os.environ.get('LLM_VISION_MODEL') or os.environ.get('LLM_MODEL', 'gpt-4o')

    try:
        resp = requests.post(
            f'{base_url}/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': model,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {'type': 'text', 'text': OCR_PROMPT},
                            {'type': 'image_url', 'image_url': {'url': image_data_url}},
                        ],
                    }
                ],
                'temperature': 0.2,
                'max_tokens': 4000,
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data['choices'][0]['message']['content']
        # 尝试从 content 中提取 JSON
        json_match = re.search(r'\{[\s\S]*\}', content)
        if not json_match:
            return {'members': [], 'relationships': [], 'note': 'LLM 未返回 JSON', 'raw': content}
        return json.loads(json_match.group(0))
    except requests.RequestException as e:
        logger.exception('LLM 请求失败')
        return {'members': [], 'relationships': [], 'error': f'LLM 请求失败: {str(e)[:200]}'}
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.exception('LLM 响应解析失败')
        return {'members': [], 'relationships': [], 'error': f'LLM 响应解析失败: {str(e)[:200]}'}


@ocr_bp.route('/<int:family_id>/ocr/recognize', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def recognize(family_id):
    """
    上传家谱图片，识别成员信息
    """
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    if 'file' not in request.files:
        return jsonify({'error': '未找到上传文件'}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({'error': '文件为空'}), 400

    # 校验类型
    allowed = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'}
    if file.mimetype and file.mimetype not in allowed:
        return jsonify({'error': f'不支持的图片类型: {file.mimetype}'}), 400

    # 限制大小 10MB
    file_data = file.read()
    if len(file_data) > 10 * 1024 * 1024:
        return jsonify({'error': '图片过大（最大 10MB）'}), 400

    # 构造 data URL
    b64 = base64.b64encode(file_data).decode('utf-8')
    data_url = f'data:{file.mimetype or "image/jpeg"};base64,{b64}'

    # 调用 LLM
    result = _call_llm_vision(data_url)

    members = result.get('members', [])
    relationships = result.get('relationships', [])

    # 数据清洗：剔除明显无效的成员
    valid_members = []
    for m in members:
        if not isinstance(m, dict):
            continue
        name = (m.get('name') or '').strip()
        if not name or len(name) > 50:
            continue
        m['name'] = name
        # 性别归一化
        gender = m.get('gender', 'unknown')
        if gender not in ('male', 'female', 'unknown'):
            if gender in ('男', 'M', 'm'):
                gender = 'male'
            elif gender in ('女', 'F', 'f'):
                gender = 'female'
            else:
                gender = 'unknown'
        m['gender'] = gender
        valid_members.append(m)

    return jsonify({
        'members': valid_members,
        'relationships': relationships,
        'note': result.get('note'),
        'mock': result.get('mock', False),
        'error': result.get('error'),
        'filename': file.filename,
    })


@ocr_bp.route('/<int:family_id>/ocr/import', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def import_ocr_result(family_id):
    """
    将 OCR 识别结果批量导入族谱
    请求体: { members: [...], relationships: [...] }
    """
    from app import db
    from app.models.member import Member
    from app.models.relationship import Relationship

    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    members_data = data.get('members', [])
    rels_data = data.get('relationships', [])

    if not isinstance(members_data, list) or not members_data:
        return jsonify({'error': '成员数据无效'}), 400

    # 创建成员，建立 name -> Member 映射
    name_to_id = {}
    imported = 0
    for m in members_data:
        name = (m.get('name') or '').strip()
        if not name:
            continue
        member = Member(
            family_id=family_id,
            name=name,
            gender=m.get('gender', 'unknown'),
            birth_date=m.get('birth_date'),
            death_date=m.get('death_date'),
            birth_place=m.get('birth_place'),
            generation=m.get('generation'),
            generation_name=m.get('generation_name'),
            bio=m.get('bio'),
            is_alive=m.get('is_alive', True),
        )
        db.session.add(member)
        db.session.flush()
        name_to_id[name] = member.id
        imported += 1

    # 创建关系
    rel_imported = 0
    for r in rels_data:
        from_name = (r.get('from') or '').strip()
        to_name = (r.get('to') or '').strip()
        rel_type = r.get('type', 'parent')
        if from_name not in name_to_id or to_name not in name_to_id:
            continue
        if rel_type not in ('parent', 'spouse', 'sibling'):
            rel_type = 'parent'
        # 避免重复
        existing = Relationship.query.filter_by(
            family_id=family_id,
            member_id=name_to_id[from_name],
            related_member_id=name_to_id[to_name],
            relationship_type=rel_type,
        ).first()
        if existing:
            continue
        rel = Relationship(
            family_id=family_id,
            member_id=name_to_id[from_name],
            related_member_id=name_to_id[to_name],
            relationship_type=rel_type,
        )
        db.session.add(rel)
        rel_imported += 1

    db.session.commit()

    user_id = get_jwt_identity()
    log_action(user_id, 'ocr_import', 'family', family_id, {
        'members_imported': imported,
        'relationships_imported': rel_imported,
    })

    return jsonify({
        'message': f'成功导入 {imported} 位成员，{rel_imported} 条关系',
        'members_imported': imported,
        'relationships_imported': rel_imported,
    })
