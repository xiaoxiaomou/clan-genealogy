from datetime import datetime
from app.models.member import Member

# 活人保护：出生距今在 PROTECTION_YEARS 年内且在世，视为应保护
PROTECTION_YEARS = 100

def is_living_protected(member: Member) -> bool:
    if member.is_alive is False:
        return False
    if member.birth_date:
        bd = member.birth_date
        if isinstance(bd, str):
            try:
                birth_year = int(bd[:4])
            except (ValueError, IndexError):
                return False
        else:
            birth_year = bd.year
        current_year = datetime.now().year
        if current_year - birth_year < PROTECTION_YEARS:
            return True
    return False


def get_effective_privacy_level(member: Member) -> str:
    if member.privacy_override:
        return member.privacy_level
    if is_living_protected(member):
        return 'private'
    return member.privacy_level


def get_member_visibility(member: Member, role: str) -> str:
    level = get_effective_privacy_level(member)
    if level == 'public':
        return 'visible'
    if level == 'family':
        return 'visible' if role in ('admin', 'editor', 'member') else 'hidden'
    if level == 'private':
        return 'visible' if role == 'admin' else 'hidden'
    return 'visible'


def filter_member_dict(member_dict: dict, role: str) -> dict:
    level = member_dict.get('privacy_level', 'public')
    if member_dict.get('_effective_privacy'):
        level = member_dict['_effective_privacy']

    if role == 'admin':
        result = dict(member_dict)
        result.pop('_effective_privacy', None)
        return result

    if level == 'public':
        result = dict(member_dict)
        result.pop('_effective_privacy', None)
        return result

    if level == 'private':
        return {
            'id': member_dict.get('id'),
            'name': member_dict.get('name'),
            'gender': member_dict.get('gender'),
            'visibility': 'hidden',
            'privacy_level': 'private',
        }

    if level == 'family':
        result = dict(member_dict)
        if role not in ('admin', 'editor', 'member'):
            result['visibility'] = 'hidden'
        result.pop('_effective_privacy', None)
        return result

    result = dict(member_dict)
    result.pop('_effective_privacy', None)
    return result


def filter_member_list(members: list, members_data: list[dict], role: str) -> list[dict]:
    member_map = {m.id: m for m in members if hasattr(m, 'id')}
    result = []
    for d in members_data:
        m = member_map.get(d.get('id'))
        if m:
            effective = get_effective_privacy_level(m)
            d['_effective_privacy'] = effective
        result.append(filter_member_dict(d, role))
    return result

