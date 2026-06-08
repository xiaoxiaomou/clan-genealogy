"""GEDCOM 5.5.1 导入导出服务

GEDCOM（Genealogical Data Communication）标准族谱交换格式。
本服务实现：
  - 导出：将本族数据生成 .ged 文件
  - 导入：解析 .ged 文件并批量写入 Member / Relationship

只支持最常用的标签：INDI / FAM / NAME / SEX / BIRT / DEAT / DATE / PLAC / FAMS / FAMC / HUSB / WIFE / CHIL
"""
import io
import re
from datetime import datetime
from typing import Dict, List, Tuple

from app import db
from app.models.member import Member
from app.models.relationship import Relationship
from app.models.family import Family as FamilyModel


MONTHS = {
    'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
    'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
}


def _format_date(date_str: str) -> str:
    """GEDCOM 日期 → YYYY-MM-DD。无法解析时返回空串。"""
    if not date_str:
        return ''
    s = date_str.strip().upper()
    m = re.match(r'^(?:(\d{1,2})\s+)?([A-Z]{3,9})?\s*(\d{3,4})$', s)
    if not m:
        return ''
    day_s, mon_s, year_s = m.group(1), m.group(2), m.group(3)
    if not year_s:
        return ''
    try:
        y = int(year_s)
    except ValueError:
        return ''
    if y < 1 or y > 9999:
        return ''
    mo = MONTHS.get(mon_s) if mon_s else None
    d = int(day_s) if day_s else None
    if mo and d:
        try:
            dt = datetime(y, mo, d)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            return ''
    if mo:
        return f'{y:04d}-{mo:02d}'
    return f'{y:04d}'


def export_family(family_id: int) -> str:
    """将本族数据导出为 GEDCOM 5.5.1 文本。"""
    fam = FamilyModel.query.get(family_id)
    if not fam:
        raise ValueError('家族不存在')
    members = Member.query.filter_by(family_id=family_id).all()
    # 关系通过 members 查（Relationship 没 family_id 字段）
    rels = Relationship.query.join(
        Member, db.or_(
            Relationship.member_id == Member.id,
            Relationship.related_member_id == Member.id,
        )
    ).filter(Member.family_id == family_id).all()

    # 按 type 分桶
    spouses: List[Tuple[int, int]] = []
    parent_to_children: Dict[int, List[int]] = {}
    seen_pair = set()
    for r in rels:
        if r.relationship_type == 'spouse':
            pair = tuple(sorted([r.member_id, r.related_member_id]))
            if pair in seen_pair:
                continue
            seen_pair.add(pair)
            spouses.append((r.member_id, r.related_member_id))
        elif r.relationship_type == 'parent':
            # member_id = 父，related_member_id = 子
            parent_to_children.setdefault(r.member_id, []).append(r.related_member_id)
        elif r.relationship_type in ('child', 'son', 'daughter'):
            # 也可能是反过来
            parent_to_children.setdefault(r.related_member_id, []).append(r.member_id)

    # 构造 FAM 记录
    member_by_id = {m.id: m for m in members}
    fam_records: List[Dict] = []
    used_children = set()

    for a, b in spouses:
        children = []
        for p in (a, b):
            for c in parent_to_children.get(p, []):
                if c not in used_children:
                    children.append(c)
        used_children.update(children)
        ma = member_by_id.get(a)
        mb = member_by_id.get(b)
        if ma and ma.gender == 'male':
            husb, wife = a, b
        elif mb and mb.gender == 'male':
            husb, wife = b, a
        else:
            husb, wife = a, b
        fam_records.append({'husb': husb, 'wife': wife, 'children': children})

    # 单亲家庭
    for parent_id, child_ids in parent_to_children.items():
        if all(c in used_children for c in child_ids):
            continue
        new_children = [c for c in child_ids if c not in used_children]
        used_children.update(new_children)
        m = member_by_id.get(parent_id)
        if not m:
            continue
        if m.gender == 'male':
            fam_records.append({'husb': parent_id, 'wife': None, 'children': new_children})
        else:
            fam_records.append({'husb': None, 'wife': parent_id, 'children': new_children})

    out = io.StringIO()
    out.write('0 HEAD\n')
    out.write('1 SOUR ZupuApp\n')
    out.write('2 VERS 1.0\n')
    out.write('2 NAME ZhangShiZupuSystem\n')
    out.write('1 GEDC\n')
    out.write('2 VERS 5.5.1\n')
    out.write('2 FORM LINEAGE-LINKED\n')
    out.write('1 CHAR UTF-8\n')
    out.write(f'1 FAM {fam.name or ""}\n')
    out.write('1 SUBM @SUBM1@\n')
    out.write('0 @SUBM1@ SUBM\n')
    out.write('1 NAME ZupuApp User\n')

    member_to_xref: Dict[int, str] = {}
    for i, m in enumerate(members, start=1):
        xref = f'@I{i}@'
        member_to_xref[m.id] = xref
        out.write(f'0 {xref} INDI\n')
        out.write(f'1 NAME {m.name or "未知"}\n')
        out.write(f'1 SEX {"M" if m.gender == "male" else "F"}\n')
        if m.birth_date:
            try:
                dt = datetime.strptime(m.birth_date, '%Y-%m-%d')
                d = dt.strftime('%d %b %Y').upper()
            except (ValueError, TypeError):
                d = m.birth_date
            out.write('1 BIRT\n')
            out.write(f'2 DATE {d}\n')
            if m.birth_place:
                out.write(f'2 PLAC {m.birth_place}\n')
        if m.death_date:
            try:
                dt = datetime.strptime(m.death_date, '%Y-%m-%d')
                d = dt.strftime('%d %b %Y').upper()
            except (ValueError, TypeError):
                d = m.death_date
            out.write('1 DEAT\n')
            out.write(f'2 DATE {d}\n')
        if m.bio:
            out.write(f'1 NOTE {m.bio[:200]}\n')

    for j, fr in enumerate(fam_records, start=1):
        xref = f'@F{j}@'
        out.write(f'0 {xref} FAM\n')
        if fr['husb']:
            out.write(f'1 HUSB {member_to_xref.get(fr["husb"], "")}\n')
        if fr['wife']:
            out.write(f'1 WIFE {member_to_xref.get(fr["wife"], "")}\n')
        for c in fr['children']:
            out.write(f'1 CHIL {member_to_xref.get(c, "")}\n')

    out.write('0 TRLR\n')
    return out.getvalue()


# 极简 GEDCOM 解析器
class _GedLine:
    __slots__ = ('level', 'xref', 'tag', 'value')
    def __init__(self, level: int, xref: str, tag: str, value: str):
        self.level = level
        self.xref = xref
        self.tag = tag
        self.value = value


def _parse_gedcom(text: str) -> List[_GedLine]:
    lines: List[_GedLine] = []
    for raw in text.splitlines():
        if not raw.strip():
            continue
        m = re.match(r'^(\d+)\s+(?:(@[^@]+@)\s+)?(\w+)\s*(.*)$', raw)
        if not m:
            continue
        lines.append(_GedLine(int(m.group(1)), m.group(2) or '', m.group(3), m.group(4).strip()))
    return lines


def _indiv_block(lines: List[_GedLine], idx: int) -> Tuple[Dict, int]:
    rec: Dict = {'name': '', 'sex': 'M', 'birth': '', 'death': '', 'note': ''}
    i = idx + 1
    while i < len(lines) and lines[i].level > 0:
        ln = lines[i]
        if ln.level == 1:
            if ln.tag == 'NAME':
                rec['name'] = ln.value.split('/')[0].strip() or ln.value
            elif ln.tag == 'SEX':
                rec['sex'] = ln.value
            elif ln.tag == 'NOTE':
                rec['note'] = ln.value
            elif ln.tag == 'BIRT':
                for j in range(i + 1, len(lines)):
                    if lines[j].level <= 1:
                        break
                    if lines[j].level == 2 and lines[j].tag == 'DATE':
                        rec['birth'] = lines[j].value
            elif ln.tag == 'DEAT':
                for j in range(i + 1, len(lines)):
                    if lines[j].level <= 1:
                        break
                    if lines[j].level == 2 and lines[j].tag == 'DATE':
                        rec['death'] = lines[j].value
        i += 1
    return rec, i


def import_family(family_id: int, ged_text: str) -> Dict:
    """解析 GEDCOM 并写入家族成员。返回 {imported, relations, errors}。"""
    fam = FamilyModel.query.get(family_id)
    if not fam:
        raise ValueError('家族不存在')
    lines = _parse_gedcom(ged_text)
    if not lines:
        raise ValueError('GEDCOM 文件为空或格式错误')

    indis: List[Tuple[str, Dict]] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.level == 0 and ln.tag == 'INDI' and ln.xref:
            rec, nxt = _indiv_block(lines, i)
            indis.append((ln.xref, rec))
            i = nxt
        else:
            i += 1

    surname = fam.surname or ''
    xref_to_member: Dict[str, Member] = {}
    imported = 0
    for xref, rec in indis:
        name = rec['name'] or '未知'
        if surname and not name.startswith(surname) and len(name) <= 2:
            full_name = f'{surname}{name}'
        else:
            full_name = name
        gender = 'male' if rec['sex'].upper().startswith('M') else 'female'
        birth = _format_date(rec['birth'])
        death = _format_date(rec['death'])
        is_alive = not bool(death)
        m = Member(
            family_id=family_id,
            name=full_name,
            gender=gender,
            birth_date=birth or None,
            death_date=death or None,
            is_alive=is_alive,
            bio=rec['note'] or '',
        )
        db.session.add(m)
        xref_to_member[xref] = m
        imported += 1
    db.session.flush()

    rel_count = 0
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.level == 0 and ln.tag == 'FAM' and ln.xref:
            husb_xref = wife_xref = None
            children: List[str] = []
            j = i + 1
            while j < len(lines) and lines[j].level > 0:
                if lines[j].level == 1:
                    if lines[j].tag == 'HUSB':
                        husb_xref = lines[j].value
                    elif lines[j].tag == 'WIFE':
                        wife_xref = lines[j].value
                    elif lines[j].tag == 'CHIL':
                        children.append(lines[j].value)
                j += 1
            if husb_xref and wife_xref:
                h = xref_to_member.get(husb_xref)
                w = xref_to_member.get(wife_xref)
                if h and w and h.id != w.id:
                    db.session.add(Relationship(
                        member_id=h.id, related_member_id=w.id,
                        relationship_type='spouse'
                    ))
                    rel_count += 1
            for child_xref in children:
                c = xref_to_member.get(child_xref)
                if not c:
                    continue
                if husb_xref:
                    p = xref_to_member.get(husb_xref)
                    if p:
                        db.session.add(Relationship(
                            member_id=p.id, related_member_id=c.id,
                            relationship_type='parent'
                        ))
                        rel_count += 1
                if wife_xref:
                    p = xref_to_member.get(wife_xref)
                    if p:
                        db.session.add(Relationship(
                            member_id=p.id, related_member_id=c.id,
                            relationship_type='parent'
                        ))
                        rel_count += 1
            i = j
        else:
            i += 1

    db.session.commit()
    return {'imported': imported, 'relations': rel_count}
