"""
祭日 / 忌日 API

功能：
- 列出家族的祭日（基于已故成员的死亡日期自动计算）
- "今日忌日"、"本月忌日"、"即将到来"分类
- 支持按家族筛选
- 农历转写显示

注意：本 API 不修改 Member 表的 schema，而是从现有 death_date 字段动态计算。
      如果想记录"农历忌日"，可以解析 death_date 中的"农历"前缀。
"""
from datetime import date, datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.family_service import FamilyService
from app.utils.decorators import family_permission_required
from app.utils.lunar_utils import (
    solar_to_lunar, find_next_memorial_date, parse_date_string, get_year_ganzhi
)

memorial_bp = Blueprint('memorial', __name__)


def _gather_memorials(family_id: int):
    """收集家族的祭日数据：已故成员的死亡日期 → 阳历 → 农历"""
    members = FamilyService.get_family_members(family_id)
    result = []
    for m in members:
        if getattr(m, 'is_alive', True):
            continue
        if not m.death_date:
            continue
        d = parse_date_string(m.death_date)
        if not d:
            continue
        lunar = solar_to_lunar(d)
        result.append({
            'member_id': m.id,
            'member_name': m.name,
            'avatar': m.avatar,
            'death_date_solar': d.isoformat(),
            'death_date_lunar': lunar.get('full_str', ''),
            'lunar_month': lunar.get('month', 0),
            'lunar_day': lunar.get('day', 0),
            'lunar_is_leap': lunar.get('is_leap', False),
            'year_ganzhi': lunar.get('year_ganzhi', ''),
            'shengxiao': lunar.get('shengxiao', ''),
        })
    return result


@memorial_bp.route('/<int:family_id>/memorial/today', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_today_memorial(family_id):
    """今日忌日（按农历匹配今天的月日）"""
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    today_lunar = solar_to_lunar(date.today())
    today_md = (today_lunar.get('month', 0), today_lunar.get('day', 0))

    items = _gather_memorials(family_id)
    matches = [
        it for it in items
        if (it['lunar_month'], it['lunar_day']) == today_md
    ]
    return jsonify({
        'date_solar': date.today().isoformat(),
        'date_lunar': today_lunar.get('full_str', ''),
        'count': len(matches),
        'items': matches,
    })


@memorial_bp.route('/<int:family_id>/memorial/upcoming', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_upcoming_memorial(family_id):
    """即将到来的忌日（默认未来 60 天，按农历月日匹配）"""
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    days = int(request.args.get('days', 60))
    today = date.today()

    items = _gather_memorials(family_id)
    upcoming = []
    seen = set()
    for offset in range(days):
        target = today + timedelta(days=offset)
        tl = solar_to_lunar(target)
        md = (tl.get('month', 0), tl.get('day', 0))
        if md in seen:
            continue
        seen.add(md)
        matches = [it for it in items if (it['lunar_month'], it['lunar_day']) == md]
        if matches:
            upcoming.append({
                'date_solar': target.isoformat(),
                'date_lunar': tl.get('full_str', ''),
                'offset_days': offset,
                'items': matches,
            })

    return jsonify({
        'days': days,
        'count': len(upcoming),
        'upcoming': upcoming,
    })


@memorial_bp.route('/<int:family_id>/memorial/this-month', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_this_month_memorial(family_id):
    """本月忌日（按本月阳历每一天的农历月日匹配）"""
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    today = date.today()
    # 本月范围
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    last_day = (next_month - timedelta(days=1)).day

    items = _gather_memorials(family_id)
    result = []
    for day in range(1, last_day + 1):
        try:
            d = date(today.year, today.month, day)
        except ValueError:
            continue
        tl = solar_to_lunar(d)
        md = (tl.get('month', 0), tl.get('day', 0))
        matches = [it for it in items if (it['lunar_month'], it['lunar_day']) == md]
        if matches:
            result.append({
                'date_solar': d.isoformat(),
                'date_lunar': tl.get('full_str', ''),
                'is_today': d == today,
                'is_past': d < today,
                'items': matches,
            })

    return jsonify({
        'year': today.year,
        'month': today.month,
        'count': len(result),
        'days': result,
    })


@memorial_bp.route('/<int:family_id>/memorial/all', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_all_memorial(family_id):
    """所有已故成员的祭日（按阳历月份分组）"""
    family = FamilyService.get_family(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404

    items = _gather_memorials(family_id)
    return jsonify({
        'count': len(items),
        'items': items,
    })
