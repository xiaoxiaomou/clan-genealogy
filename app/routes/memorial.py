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
from app import db
from app.models.user import User
from app.models.memorial import MemorialRitual, MemorialMessage
from app.utils.decorators import login_required, admin_required
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


@memorial_bp.route('/<int:family_id>/memorial/year-only', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_year_only_memorial(family_id):
    """周年祭名单：逝世只登记了年份（无月日）、无法排入忌日历的成员"""
    members = FamilyService.get_family_members(family_id)
    items = []
    for m in members:
        if getattr(m, 'is_alive', True):
            continue
        death = str(m.death_date or '')
        if not death:
            continue
        # 有月日（能解析出完整日期）的成员由忌日历覆盖，不在此列
        if parse_date_string(m.death_date):
            continue
        year_text = death[:4] if death[:4].isdigit() else death
        items.append({
            'member_id': m.id,
            'member_name': m.name,
            'avatar': m.avatar,
            'death_year': year_text,
            'generation': m.generation,
            'gender': m.gender,
        })
    # 昭穆有序：辈分（世代）升序，同辈按卒年、姓名
    items.sort(key=lambda x: (
        x['generation'] if x['generation'] is not None else 9999,
        x['death_year'],
        x['member_name'],
    ))
    return jsonify({'count': len(items), 'items': items})


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


# ═══ 线上祭祀：祭拜动作 + 追思留言 ═══

RITUAL_KINDS = ('flower', 'candle', 'incense', 'kowtow')
RITUAL_LABELS = {'flower': '献花', 'candle': '点烛', 'incense': '上香', 'kowtow': '叩首'}


def _user_name_map(user_ids):
    users = User.query.filter(User.id.in_(set(user_ids))).all() if user_ids else []
    return {u.id: (u.display_name or u.username) for u in users}


@memorial_bp.route('/<int:family_id>/memorial/rituals', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_memorial_rituals(family_id):
    """某位先人的祭拜统计与最近记录"""
    member_id = request.args.get('member_id', type=int)
    if not member_id:
        return jsonify({'error': '缺少 member_id'}), 400

    rows = (MemorialRitual.query
            .filter_by(family_id=family_id, member_id=member_id)
            .order_by(MemorialRitual.created_at.desc())
            .all())
    names = _user_name_map([r.user_id for r in rows])
    # created_at 存 UTC，「今日祭拜」统一按 UTC 日切，避免时区错位
    today = datetime.utcnow().date()
    today_counts = {k: 0 for k in RITUAL_KINDS}
    total_counts = {k: 0 for k in RITUAL_KINDS}
    mine_today = []
    recent = []
    for r in rows:
        total_counts[r.kind] = total_counts.get(r.kind, 0) + 1
        if r.created_at.date() == today:
            today_counts[r.kind] = today_counts.get(r.kind, 0) + 1
        if r.user_id == int(get_jwt_identity()) and r.created_at.date() == today:
            mine_today.append(r.kind)
        if len(recent) < 20:
            recent.append(r.to_dict(names.get(r.user_id)))
    return jsonify({
        'today_counts': today_counts,
        'total_counts': total_counts,
        'mine_today': mine_today,
        'recent': recent,
    })


@memorial_bp.route('/<int:family_id>/memorial/rituals/today-summary', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_ritual_today_summary(family_id):
    """牌位墙直拜用：今日全族每位先人各祭拜动作次数 + 谁来过（按人聚合）"""
    # created_at 存 UTC，「今日」按 UTC 日切，与 created_at 同口径
    rows = (MemorialRitual.query
            .filter_by(family_id=family_id)
            .filter(MemorialRitual.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0))
            .all())
    summary = {}
    for r in rows:
        bucket = summary.setdefault(r.member_id, {k: 0 for k in RITUAL_KINDS})
        if r.kind in bucket:
            bucket[r.kind] += 1

    # 谁来过：按 先人×用户 聚合（动作与次数），按最近时间倒序，每人最多 6 条
    names = _user_name_map({r.user_id for r in rows})
    grouped = {}
    for r in sorted(rows, key=lambda x: x.created_at):
        users = grouped.setdefault(r.member_id, {})
        u = users.setdefault(r.user_id, {'user_name': names.get(r.user_id), 'kinds': {}, 'last_at': None})
        u['kinds'][r.kind] = u['kinds'].get(r.kind, 0) + 1
        u['last_at'] = r.created_at.isoformat()
    visitors = {}
    for mid, users in grouped.items():
        lst = sorted(users.values(), key=lambda x: x['last_at'], reverse=True)[:6]
        for u in lst:
            u['kinds'] = [{'kind': k, 'n': n} for k, n in u['kinds'].items()]
        visitors[mid] = lst

    # 各类动作最近一次时间（供前端按真实时长控制香/烛/花的存留）
    last_kinds = {}
    for r in rows:
        bucket = last_kinds.setdefault(r.member_id, {})
        iso = r.created_at.isoformat()
        if r.kind not in bucket or iso > bucket[r.kind]:
            bucket[r.kind] = iso
    return jsonify({'summary': summary, 'visitors': visitors, 'last_kinds': last_kinds})


@memorial_bp.route('/<int:family_id>/memorial/rituals', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def add_memorial_ritual(family_id):
    """记录一次线上祭拜"""
    data = request.get_json() or {}
    member_id = data.get('member_id')
    kind = data.get('kind')
    if not member_id or kind not in RITUAL_KINDS:
        return jsonify({'error': '参数不合法'}), 400
    ritual = MemorialRitual(
        family_id=family_id,
        member_id=member_id,
        user_id=int(get_jwt_identity()),
        kind=kind,
    )
    db.session.add(ritual)
    db.session.commit()
    return jsonify({'message': f'{RITUAL_LABELS[kind]}已奉上', 'ritual': ritual.to_dict()}), 201


@memorial_bp.route('/<int:family_id>/memorial/messages', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def get_memorial_messages(family_id):
    """某位先人的追思留言"""
    member_id = request.args.get('member_id', type=int)
    if not member_id:
        return jsonify({'error': '缺少 member_id'}), 400
    rows = (MemorialMessage.query
            .filter_by(family_id=family_id, member_id=member_id)
            .order_by(MemorialMessage.created_at.desc())
            .limit(100)
            .all())
    names = _user_name_map([r.user_id for r in rows])
    me = int(get_jwt_identity())
    return jsonify({'messages': [r.to_dict(names.get(r.user_id)) | {'mine': r.user_id == me} for r in rows]})


@memorial_bp.route('/<int:family_id>/memorial/messages', methods=['POST'])
@jwt_required()
@family_permission_required('viewer')
def add_memorial_message(family_id):
    """添加追思留言"""
    data = request.get_json() or {}
    member_id = data.get('member_id')
    content = (data.get('content') or '').strip()
    if not member_id or not content:
        return jsonify({'error': '留言内容不能为空'}), 400
    msg = MemorialMessage(
        family_id=family_id,
        member_id=member_id,
        user_id=int(get_jwt_identity()),
        content=content[:500],
    )
    db.session.add(msg)
    db.session.commit()
    return jsonify({'message': '留言已提交', 'message_item': msg.to_dict()}), 201


@memorial_bp.route('/<int:family_id>/memorial/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('viewer')
def delete_memorial_message(family_id, message_id):
    """删除留言（本人或家族管理员/编辑者）"""
    msg = MemorialMessage.query.filter_by(id=message_id, family_id=family_id).first()
    if not msg:
        return jsonify({'error': '留言不存在'}), 404
    me = int(get_jwt_identity())
    if msg.user_id != me:
        user = db.session.get(User, me)
        fm_ok = user and (user.is_admin or _is_family_editor(family_id, me))
        if not fm_ok:
            return jsonify({'error': '只能删除自己的留言'}), 403
    db.session.delete(msg)
    db.session.commit()
    return jsonify({'message': '留言已删除'})


def _is_family_editor(family_id, user_id):
    from app.models.family import FamilyMember
    fm = FamilyMember.query.filter_by(family_id=family_id, user_id=user_id).first()
    return bool(fm and fm.role in ('owner', 'admin', 'editor'))
