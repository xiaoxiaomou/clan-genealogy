"""字辈诗解析与计算服务

字辈诗是家族中各代成员按代使用的特定字，例如：
    民国二十六年丁丑岁阖族议定字辈：
    道德建鸿勋，家声丕焕新。
    诗书承祖训，礼义裕孙昆。
    本固枝荣远，源深流自清。
    文章开运泰，福祉耀庭前。

约定：
- zibei_text 中非汉字字符（标点、空格、换行、罗马数字、英文）会被剔除
- sequential: 第 N 代对应 zibei_chars[N-1]
- generation_based: 第 N 代对应 zibei_chars[N - zibei_start_generation]
"""
import re
import hashlib

NON_CHINESE_RE = re.compile(r'[^\u4e00-\u9fff]')

# 常见男性取名用字（第二字，给名首字）
MALE_GIVEN_CHARS = [
    '伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超',
    '涛', '鹏', '飞', '龙', '虎', '斌', '浩', '俊', '凯', '旭',
    '宇', '哲', '昊', '翰', '辰', '睿', '轩', '阳', '铮', '毅',
    '安', '平', '文', '武', '德', '建', '宏', '盛', '国', '家',
]
# 常见女性取名用字
FEMALE_GIVEN_CHARS = [
    '芳', '娟', '英', '敏', '静', '丽', '艳', '娜', '婷', '雪',
    '玲', '倩', '婧', '颖', '涵', '悦', '雯', '雨', '欣', '怡',
    '雅', '诗', '琴', '兰', '萍', '华', '君', '莎', '燕', '晓',
    '宁', '安', '颖', '慧', '璇', '茜', '梦', '瑶', '梅', '莲',
]
# 中性字（男女皆可）
NEUTRAL_GIVEN_CHARS = [
    '安', '平', '文', '武', '德', '建', '宏', '盛', '国', '家',
    '明', '瑞', '祥', '礼', '义', '信', '仁', '智', '行', '道',
]


def parse_chars(text: str) -> list[str]:
    """把字辈诗文本解析成汉字字符列表（剔除标点空格）"""
    if not text:
        return []
    return NON_CHINESE_RE.sub('', text)


def char_for_generation(family, generation: int) -> str | None:
    """根据世代数返回对应的字辈字"""
    chars = parse_chars(family.zibei_text or '')
    if not chars:
        return None
    start = 1
    if family.zibei_assignment == 'generation_based':
        start = family.zibei_start_generation or 1
    idx = generation - start
    if idx < 0 or idx >= len(chars):
        return None
    return chars[idx]


def generations_for_char(family, char: str) -> dict:
    """查找字辈中某个字对应的代数范围"""
    chars = parse_chars(family.zibei_text or '')
    if not char or char not in chars:
        return {'char': char, 'indices': [], 'generations': []}
    indices = [i for i, c in enumerate(chars) if c == char]
    if family.zibei_assignment == 'generation_based':
        start = family.zibei_start_generation or 1
        generations = [start + i for i in indices]
    else:
        generations = [i + 1 for i in indices]
    return {'char': char, 'indices': indices, 'generations': generations}


def _deterministic_pick(pool: list[str], seed: str, n: int) -> list[str]:
    """基于 seed 做确定性的轮盘抽取（同一 seed 同一结果），保证相同世代/姓氏总得到相同建议"""
    if not pool:
        return []
    digest = hashlib.md5(seed.encode('utf-8')).digest()
    picks: list[str] = []
    cursor = 0
    used: set[int] = set()
    while len(picks) < n and len(used) < len(pool):
        b = digest[cursor % len(digest)]
        idx = b % len(pool)
        if idx not in used:
            used.add(idx)
            picks.append(pool[idx])
        cursor += 1
    if len(picks) < n:
        for i, c in enumerate(pool):
            if i not in used:
                picks.append(c)
                if len(picks) >= n:
                    break
    return picks


def suggest_names(family, surname: str, generation: int, gender: str = 'unknown', count: int = 8) -> dict:
    """根据字辈诗+姓氏+世代+性别，推荐候选全名

    返回:
        zibei_char: 当前世代对应的字辈字（可能 None）
        candidates: 候选全名列表（带性别标记）
    """
    zibei_char = char_for_generation(family, generation)
    surname = (surname or '').strip()
    if not surname:
        surname = ''
    if not zibei_char:
        return {
            'surname': surname,
            'generation': generation,
            'gender': gender,
            'zibei_char': None,
            'candidates': [],
            'reason': '当前世代无字辈诗对应字，请检查字辈诗配置',
        }

    g = (gender or 'unknown').lower()
    if g == 'male':
        pool = MALE_GIVEN_CHARS
    elif g == 'female':
        pool = FEMALE_GIVEN_CHARS
    else:
        pool = NEUTRAL_GIVEN_CHARS

    seed = f"{family.id}:{surname}:{generation}:{g}"
    second_chars = _deterministic_pick(pool, seed + ':2', count)

    candidates: list[dict] = []
    for i, second in enumerate(second_chars):
        two_char = f"{surname}{zibei_char}{second}" if surname else f"{zibei_char}{second}"
        candidates.append({
            'name': two_char,
            'form': '二字名',
            'zibei_char': zibei_char,
            'given_char': second,
        })

    extra_chars = _deterministic_pick(pool, seed + ':3', max(0, count - len(second_chars)))
    for third in extra_chars[:4]:
        three_char = f"{surname}{zibei_char}{second_chars[0]}{third}" if surname else f"{zibei_char}{second_chars[0]}{third}"
        candidates.append({
            'name': three_char,
            'form': '三字名',
            'zibei_char': zibei_char,
            'given_char': f"{second_chars[0]}{third}",
        })

    return {
        'surname': surname,
        'generation': generation,
        'gender': gender,
        'zibei_char': zibei_char,
        'candidates': candidates[:count + 2],
    }


def check_compliance(family, name: str, generation: int) -> dict:
    """校验一个名字是否符合字辈诗规则

    规则:
        1. 跳过姓氏（首个非字辈字），取名字第 1 位（如果是 2 字名）或第 2 位（3 字名）作为辈分字
        2. 实际辈分字必须等于该世代的字辈字
    """
    zibei_char = char_for_generation(family, generation) if generation else None
    result = {
        'name': name,
        'generation': generation,
        'zibei_char': zibei_char,
        'actual_zibei_char': None,
        'match': False,
        'reason': '',
    }
    if not name:
        result['reason'] = '姓名为空'
        return result
    cleaned = parse_chars(name)
    if not cleaned:
        result['reason'] = '姓名不含汉字'
        return result
    # 启发式: 第一个字是姓，剩下的第 1 个字即"字辈字"
    # 如果 cleaned 只有 1 个字：那它就是字辈字
    # 如果 cleaned 2 个字：第二字是名，第 1 字是字辈字（姓已被假设为非汉字或未给）
    if len(cleaned) >= 2:
        actual = cleaned[1]
    else:
        actual = cleaned[0]
    result['actual_zibei_char'] = actual
    if zibei_char is None:
        result['reason'] = '当前世代无字辈诗规则'
    elif actual == zibei_char:
        result['match'] = True
        result['reason'] = '符合字辈'
    else:
        result['reason'] = f'字辈应为「{zibei_char}」，实际为「{actual}」'
    return result
