"""字辈诗管理 API"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.family import Family
from app.models.member import Member
from app.utils.decorators import family_permission_required
from app.services import zibei_service

zibei_bp = Blueprint('zibei', __name__)


@zibei_bp.route('/<int:family_id>/zibei', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_zibei(family_id):
    """获取族谱的字辈诗配置"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    return jsonify({
        'zibei_text': family.zibei_text or '',
        'zibei_start_generation': family.zibei_start_generation or 1,
        'zibei_assignment': family.zibei_assignment or 'sequential',
        'zibei_description': family.zibei_description or '',
        'parsed_chars': zibei_service.parse_chars(family.zibei_text or ''),
    })


@zibei_bp.route('/<int:family_id>/zibei', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_zibei(family_id):
    """更新字辈诗"""
    data = request.get_json(silent=True) or {}
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    if 'zibei_text' in data:
        zibei_service.parse_chars(data['zibei_text'])
        family.zibei_text = data['zibei_text']
    if 'zibei_start_generation' in data:
        family.zibei_start_generation = int(data['zibei_start_generation'])
    if 'zibei_assignment' in data:
        family.zibei_assignment = data['zibei_assignment'] if data['zibei_assignment'] in ('sequential', 'generation_based') else 'sequential'
    if 'zibei_description' in data:
        family.zibei_description = data['zibei_description']

    db.session.commit()
    return jsonify({
        'message': '字辈诗已更新',
        'zibei_text': family.zibei_text,
        'zibei_start_generation': family.zibei_start_generation,
        'zibei_assignment': family.zibei_assignment,
        'zibei_description': family.zibei_description,
        'parsed_chars': zibei_service.parse_chars(family.zibei_text or ''),
    })


@zibei_bp.route('/<int:family_id>/zibei/lookup', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def lookup_zibei(family_id):
    """根据代数查字辈，或根据字辈反查代数范围"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    gen = request.args.get('generation', type=int)
    char = request.args.get('char', type=str)
    if gen is not None:
        return jsonify({
            'generation': gen,
            'char': zibei_service.char_for_generation(family, gen),
        })
    if char:
        return jsonify(zibei_service.generations_for_char(family, char))
    return jsonify({'error': '请提供 generation 或 char 参数'}), 400


@zibei_bp.route('/<int:family_id>/zibei/suggestions', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def suggest_for_members(family_id):
    """为族谱所有成员推荐字辈（按代数 + 名取首字）"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    members = Member.query.filter_by(family_id=family_id).all()
    suggestions = []
    for m in members:
        expected = zibei_service.char_for_generation(family, m.generation or 0)
        first_name_char = (m.name or '')[1] if m.name and len(m.name) > 1 else ''
        match = expected is not None and expected == first_name_char
        suggestions.append({
            'member_id': m.id,
            'name': m.name,
            'generation': m.generation,
            'expected_zibei': expected,
            'actual_first_name_char': first_name_char,
            'match': match,
        })
    return jsonify({'suggestions': suggestions})


@zibei_bp.route('/<int:family_id>/zibei/suggest-names', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def suggest_names(family_id):
    """根据姓氏+世代+性别推荐候选名字"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    data = request.get_json(silent=True) or {}
    try:
        generation = int(data.get('generation', 0))
    except (TypeError, ValueError):
        generation = 0
    surname = (data.get('surname') or family.surname or '').strip()
    gender = (data.get('gender') or 'unknown').lower()
    try:
        count = max(1, min(20, int(data.get('count', 8))))
    except (TypeError, ValueError):
        count = 8
    if gender not in ('male', 'female', 'unknown'):
        gender = 'unknown'
    return jsonify(zibei_service.suggest_names(family, surname, generation, gender, count))


@zibei_bp.route('/<int:family_id>/zibei/check', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def check_compliance(family_id):
    """校验一个名字是否符合字辈诗规则"""
    family = db.session.get(Family, family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    try:
        generation = int(data.get('generation', 0))
    except (TypeError, ValueError):
        generation = 0
    return jsonify(zibei_service.check_compliance(family, name, generation))
