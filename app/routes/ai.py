"""家族 AI 助手 - 简单的 LLM 问答

接受用户问题，将家族成员数据摘要作为上下文传给 LLM，生成答案。

若 LLM_API_KEY 未配置：返回 "AI 服务未配置" 的友好提示。
"""
import os
import json
import logging
import requests
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.family import Family, FamilyMember
from app.models.member import Member
from app.utils.decorators import family_permission_required

ai_bp = Blueprint('ai', __name__)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """你是「家族 AI 助手」，根据用户提供的家族数据回答问题。
- 回答简洁准确，不超过 200 字
- 用中文回答
- 如果数据中找不到答案，明确告诉用户
- 不要编造数据
- 数据格式：JSON（members 数组 + family 元信息）
"""


def summarize_family(family_id: int) -> str:
    """生成家族的 LLM 上下文（截断到合理大小）"""
    family = Family.query.get(family_id)
    if not family:
        return '{}'
    members = Member.query.filter_by(family_id=family_id).all()
    data = {
        'family': {
            'name': family.name,
            'surname': family.surname,
            'origin': family.origin,
            'description': family.description,
        },
        'members': [
            {
                'name': m.name,
                'gender': m.gender,
                'generation': m.generation,
                'birth_date': m.birth_date,
                'death_date': m.death_date,
                'birth_place': m.birth_place,
                'death_place': m.death_place,
                'is_alive': m.is_alive,
                'bio': (m.bio or '')[:300],
            }
            for m in members
        ],
    }
    text = json.dumps(data, ensure_ascii=False)
    # 截断到 12KB 防 LLM 超限
    if len(text) > 12000:
        text = text[:12000] + '...(已截断)'
    return text


@ai_bp.route('/<int:family_id>/ai/ask', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def ask(family_id):
    data = request.get_json(silent=True) or {}
    question = (data.get('question') or '').strip()
    if not question:
        return jsonify({'error': '问题不能为空'}), 400
    if len(question) > 500:
        return jsonify({'error': '问题过长（≤500 字）'}), 400

    api_key = os.environ.get('LLM_API_KEY') or os.environ.get('OPENAI_API_KEY')
    base_url = os.environ.get('LLM_BASE_URL', 'https://api.openai.com/v1')
    model = os.environ.get('LLM_MODEL', 'gpt-4o-mini')

    context = summarize_family(family_id)
    user_prompt = f"家族数据：\n{context}\n\n用户问题：{question}\n\n请回答。"

    if not api_key:
        # 离线模式：返回基础规则引擎
        return jsonify({
            'answer': _offline_answer(question, family_id),
            'mode': 'offline',
            'model': 'local-rule',
        })

    try:
        r = requests.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt},
                ],
                'temperature': 0.3,
                'max_tokens': 500,
            },
            timeout=30,
        )
        if r.status_code != 200:
            logger.error(f'LLM API error: {r.status_code} {r.text[:200]}')
            return jsonify({
                'answer': 'AI 服务暂时不可用，请稍后再试。',
                'mode': 'error',
            }), 200
        j = r.json()
        answer = j.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        return jsonify({
            'answer': answer or 'AI 未返回答案。',
            'mode': 'online',
            'model': model,
        })
    except requests.RequestException as e:
        logger.error(f'LLM request failed: {e}')
        return jsonify({
            'answer': 'AI 服务连接失败，请检查网络。',
            'mode': 'error',
        })


def _offline_answer(question: str, family_id: int) -> str:
    """无 LLM 时的规则引擎：基于关键字匹配成员"""
    family = Family.query.get(family_id)
    if not family:
        return '家族不存在。'
    members = Member.query.filter_by(family_id=family_id).all()

    q = question.lower()
    # 计数类
    if any(k in q for k in ['多少人', '几位', '几个成员', 'count']):
        return f'本族共有 {len(members)} 位成员。'
    if any(k in q for k in ['多少代', '几代']):
        gens = len({(m.generation or 0) for m in members})
        return f'本族共 {gens} 代。'
    if any(k in q for k in ['起源', '发源', '籍贯', '来自', '哪里']):
        return f'本族{family.surname or ""}氏{family.name}的发源地为：{family.origin or "未记载"}。'
    if any(k in q for k in ['在世', '健在', '活着的']):
        alive = sum(1 for m in members if m.is_alive)
        return f'当前在世成员 {alive} 人。'
    if any(k in q for k in ['男', '男性']):
        male = sum(1 for m in members if m.gender == 'male')
        return f'男性成员 {male} 人。'
    if any(k in q for k in ['女', '女性']):
        female = sum(1 for m in members if m.gender == 'female')
        return f'女性成员 {female} 人。'
    if any(k in q for k in ['家训', '族训', 'motto']):
        return f'本族家训：{family.motto or "未记载"}。'
    if any(k in q for k in ['描述', '简介', '介绍']):
        return f'本族简介：{family.description or family.intro or "暂无"}。'

    # 名字查询
    for m in members:
        if m.name in question:
            parts = [f'{m.name}（第{m.generation or "?"}代）']
            if m.birth_date: parts.append(f'生于 {m.birth_date}')
            if m.death_date: parts.append(f'殁于 {m.death_date}')
            elif m.is_alive: parts.append('在世')
            if m.birth_place: parts.append(f'出生地 {m.birth_place}')
            if m.death_place: parts.append(f'逝世地 {m.death_place}')
            return '，'.join(parts) + '。'

    return '抱歉，未配置 LLM 密钥，无法深入理解您的问题。请尝试：人数 / 代数 / 起源 / 家训 / 成员姓名。'
