"""
内置示例族谱数据集
- 汉朝皇室刘氏（约 30 人，5 代）
- 酉阳胜氏（约 20 人，4 代）
"""

from app import db
from app.models.member import Member
from app.models.relationship import Relationship


# ============================================================
# 汉朝皇室刘氏（5 代，~30 人）
# 以西汉前几位皇帝为主线
# ============================================================
HAN_LIU_MEMBERS = [
    # 第 1 代：始祖
    {'key': 'liubang', 'name': '刘邦', 'gender': 'male', 'generation': 1,
     'generation_name': '高祖', 'birth_date': '-256', 'death_date': '-195',
     'bio': '汉高祖，西汉开国皇帝，沛县丰邑人。', 'is_alive': False},
    {'key': 'lvzhi', 'name': '吕雉', 'gender': 'female', 'generation': 1,
     'generation_name': '高祖', 'birth_date': '-241', 'death_date': '-180',
     'bio': '汉高祖皇后，中国历史上第一位临朝称制的女性。', 'is_alive': False},

    # 第 2 代
    {'key': 'liuying', 'name': '刘盈', 'gender': 'male', 'generation': 2,
     'generation_name': '惠帝', 'birth_date': '-210', 'death_date': '-188',
     'bio': '汉惠帝，刘邦嫡长子，西汉第二位皇帝。', 'is_alive': False},
    {'key': 'liuruyi', 'name': '刘如意', 'gender': 'male', 'generation': 2,
     'generation_name': '惠帝', 'birth_date': '-207', 'death_date': '-194',
     'bio': '赵隐王，刘邦第三子，戚夫人所生。', 'is_alive': False},
    {'key': 'liuheng', 'name': '刘恒', 'gender': 'male', 'generation': 2,
     'generation_name': '文帝', 'birth_date': '-203', 'death_date': '-157',
     'bio': '汉文帝，刘邦第四子，开创文景之治。', 'is_alive': False},
    {'key': 'liuchang', 'name': '刘长', 'gender': 'male', 'generation': 2,
     'generation_name': '文帝', 'birth_date': '-198', 'death_date': '-174',
     'bio': '淮南厉王，刘邦幼子。', 'is_alive': False},
    {'key': 'liujian', 'name': '刘建', 'gender': 'male', 'generation': 2,
     'generation_name': '文帝', 'birth_date': '-200', 'death_date': '-181',
     'bio': '燕灵王，刘邦之子。', 'is_alive': False},

    # 第 3 代
    {'key': 'liuqi', 'name': '刘启', 'gender': 'male', 'generation': 3,
     'generation_name': '景帝', 'birth_date': '-188', 'death_date': '-141',
     'bio': '汉景帝，刘恒长子，延续文景之治。', 'is_alive': False},
    {'key': 'liuwu', 'name': '刘武', 'gender': 'male', 'generation': 3,
     'generation_name': '景帝', 'birth_date': '-184', 'death_date': '-144',
     'bio': '梁孝王，刘恒次子，封梁国。', 'is_alive': False},
    {'key': 'liucan', 'name': '刘参', 'gender': 'male', 'generation': 3,
     'generation_name': '景帝', 'birth_date': '-180', 'death_date': '-162',
     'bio': '太原王，刘恒之子。', 'is_alive': False},
    {'key': 'liuyi', 'name': '刘揖', 'gender': 'male', 'generation': 3,
     'generation_name': '景帝', 'birth_date': '-176', 'death_date': '-168',
     'bio': '梁怀王，刘恒幼子。', 'is_alive': False},

    # 第 4 代
    {'key': 'liuche', 'name': '刘彻', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-156', 'death_date': '-87',
     'bio': '汉武帝，西汉第七位皇帝，雄才大略，开疆拓土。', 'is_alive': False},
    {'key': 'liurong', 'name': '刘荣', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-170', 'death_date': '-148',
     'bio': '临江闵王，刘启长子，曾为太子后废。', 'is_alive': False},
    {'key': 'liude', 'name': '刘德', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-165', 'death_date': '-130',
     'bio': '河间献王，刘启之子，好儒学。', 'is_alive': False},
    {'key': 'liue', 'name': '刘阏', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-162', 'death_date': '-154',
     'bio': '临江哀王，刘启之子。', 'is_alive': False},
    {'key': 'liuyu', 'name': '刘余', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-160', 'death_date': '-128',
     'bio': '鲁共王，刘启之子。', 'is_alive': False},
    {'key': 'liufei', 'name': '刘非', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-158', 'death_date': '-127',
     'bio': '江都易王，刘启之子。', 'is_alive': False},
    {'key': 'liuduan', 'name': '刘端', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-155', 'death_date': '-108',
     'bio': '胶西于王，刘启之子。', 'is_alive': False},
    {'key': 'liusheng', 'name': '刘胜', 'gender': 'male', 'generation': 4,
     'generation_name': '武帝', 'birth_date': '-153', 'death_date': '-113',
     'bio': '中山靖王，刘启之子，其后裔即三国刘备。', 'is_alive': False},

    # 第 5 代
    {'key': 'liuju', 'name': '刘据', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-128', 'death_date': '-91',
     'bio': '戾太子，刘彻长子，巫蛊之祸中自杀。', 'is_alive': False},
    {'key': 'liubo', 'name': '刘髆', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-120', 'death_date': '-88',
     'bio': '昌邑哀王，刘彻之子。', 'is_alive': False},
    {'key': 'liufuling', 'name': '刘弗陵', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-94', 'death_date': '-74',
     'bio': '汉昭帝，刘彻幼子，西汉第八位皇帝。', 'is_alive': False},
    {'key': 'liueyi', 'name': '刘旦', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-117', 'death_date': '-80',
     'bio': '燕剌王，刘彻之子。', 'is_alive': False},
    {'key': 'liuxu', 'name': '刘胥', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-115', 'death_date': '-54',
     'bio': '广陵厉王，刘彻之子。', 'is_alive': False},
    # 刘胜之子（中山王系分支）
    {'key': 'liuzhen', 'name': '刘贞', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-130', 'death_date': '-90',
     'bio': '陆城侯，刘胜之子，刘备先祖。', 'is_alive': False},
    {'key': 'liuyi2', 'name': '刘义', 'gender': 'male', 'generation': 5,
     'generation_name': '昭帝', 'birth_date': '-125', 'death_date': '-85',
     'bio': '中山王嗣，刘胜之子。', 'is_alive': False},
]

HAN_LIU_PARENT_EDGES = [
    # 第 1 代 -> 第 2 代
    ('liubang', 'liuying'),
    ('liubang', 'liuruyi'),
    ('liubang', 'liuheng'),
    ('liubang', 'liuchang'),
    ('liubang', 'liujian'),
    # 第 2 代 -> 第 3 代
    ('liuheng', 'liuqi'),
    ('liuheng', 'liuwu'),
    ('liuheng', 'liucan'),
    ('liuheng', 'liuyi'),
    # 第 3 代 -> 第 4 代
    ('liuqi', 'liuche'),
    ('liuqi', 'liurong'),
    ('liuqi', 'liude'),
    ('liuqi', 'liue'),
    ('liuqi', 'liuyu'),
    ('liuqi', 'liufei'),
    ('liuqi', 'liuduan'),
    ('liuqi', 'liusheng'),
    # 第 4 代 -> 第 5 代
    ('liuche', 'liuju'),
    ('liuche', 'liubo'),
    ('liuche', 'liufuling'),
    ('liuche', 'liueyi'),
    ('liuche', 'liuxu'),
    ('liusheng', 'liuzhen'),
    ('liusheng', 'liuyi2'),
]

HAN_LIU_SPOUSE_EDGES = [
    ('liubang', 'lvzhi'),
]


# ============================================================
# 酉阳胜氏（4 代，~20 人）
# ============================================================
SHENG_MEMBERS = [
    # 第 1 代：始祖
    {'key': 'shengde', 'name': '胜德', 'gender': 'male', 'generation': 1,
     'generation_name': '德', 'birth_date': '1780', 'death_date': '1850',
     'bio': '酉阳胜氏始祖，清乾隆年间迁居酉阳。', 'is_alive': False},
    {'key': 'shengmu1', 'name': '杨氏', 'gender': 'female', 'generation': 1,
     'generation_name': '德', 'birth_date': '1785', 'death_date': '1855',
     'bio': '胜德之妻。', 'is_alive': False},

    # 第 2 代
    {'key': 'shengren', 'name': '胜仁', 'gender': 'male', 'generation': 2,
     'generation_name': '仁', 'birth_date': '1810', 'death_date': '1875',
     'bio': '胜德长子，清道光年间举人。', 'is_alive': False},
    {'key': 'shenyi', 'name': '胜义', 'gender': 'male', 'generation': 2,
     'generation_name': '仁', 'birth_date': '1815', 'death_date': '1880',
     'bio': '胜德次子，务农。', 'is_alive': False},
    {'key': 'shengli', 'name': '胜利', 'gender': 'male', 'generation': 2,
     'generation_name': '仁', 'birth_date': '1818', 'death_date': '1882',
     'bio': '胜德三子，经商。', 'is_alive': False},
    {'key': 'shengmu2', 'name': '田氏', 'gender': 'female', 'generation': 2,
     'generation_name': '仁', 'birth_date': '1812', 'death_date': '1878',
     'bio': '胜仁之妻。', 'is_alive': False},

    # 第 3 代
    {'key': 'shengwen', 'name': '胜文', 'gender': 'male', 'generation': 3,
     'generation_name': '文', 'birth_date': '1840', 'death_date': '1910',
     'bio': '胜仁长子，清光绪年间秀才。', 'is_alive': False},
    {'key': 'shengwu', 'name': '胜武', 'gender': 'male', 'generation': 3,
     'generation_name': '文', 'birth_date': '1845', 'death_date': '1915',
     'bio': '胜仁次子，习武从军。', 'is_alive': False},
    {'key': 'shengfu', 'name': '胜富', 'gender': 'male', 'generation': 3,
     'generation_name': '文', 'birth_date': '1842', 'death_date': '1905',
     'bio': '胜义之子，继承家业务农。', 'is_alive': False},
    {'key': 'shenggui', 'name': '胜贵', 'gender': 'male', 'generation': 3,
     'generation_name': '文', 'birth_date': '1848', 'death_date': '1920',
     'bio': '胜利之子，经商有成。', 'is_alive': False},
    {'key': 'shengmu3', 'name': '冉氏', 'gender': 'female', 'generation': 3,
     'generation_name': '文', 'birth_date': '1843', 'death_date': '1912',
     'bio': '胜文之妻。', 'is_alive': False},

    # 第 4 代
    {'key': 'shengchang', 'name': '胜昌', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1870', 'death_date': '1940',
     'bio': '胜文长子，民国时期教员。', 'is_alive': False},
    {'key': 'shengming', 'name': '胜明', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1875', 'death_date': '1945',
     'bio': '胜文次子，从商。', 'is_alive': False},
    {'key': 'shenglong', 'name': '胜龙', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1872', 'death_date': '1938',
     'bio': '胜武之子，习武。', 'is_alive': False},
    {'key': 'shengfeng', 'name': '胜凤', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1868', 'death_date': '1935',
     'bio': '胜富长子。', 'is_alive': False},
    {'key': 'shenghu', 'name': '胜虎', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1873', 'death_date': '1942',
     'bio': '胜富次子。', 'is_alive': False},
    {'key': 'shengrong', 'name': '胜荣', 'gender': 'male', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1876', 'death_date': '1950',
     'bio': '胜贵之子，经商。', 'is_alive': False},
    {'key': 'shengfang', 'name': '胜芳', 'gender': 'female', 'generation': 4,
     'generation_name': '昌', 'birth_date': '1880', 'death_date': '1955',
     'bio': '胜贵之女。', 'is_alive': False},
]

SHENG_PARENT_EDGES = [
    # 第 1 代 -> 第 2 代
    ('shengde', 'shengren'),
    ('shengde', 'shenyi'),
    ('shengde', 'shengli'),
    # 第 2 代 -> 第 3 代
    ('shengren', 'shengwen'),
    ('shengren', 'shengwu'),
    ('shenyi', 'shengfu'),
    ('shengli', 'shenggui'),
    # 第 3 代 -> 第 4 代
    ('shengwen', 'shengchang'),
    ('shengwen', 'shengming'),
    ('shengwu', 'shenglong'),
    ('shengfu', 'shengfeng'),
    ('shengfu', 'shenghu'),
    ('shenggui', 'shengrong'),
    ('shenggui', 'shengfang'),
]

SHENG_SPOUSE_EDGES = [
    ('shengde', 'shengmu1'),
    ('shengren', 'shengmu2'),
    ('shengwen', 'shengmu3'),
]


# ============================================================
# 通用数据加载函数
# ============================================================

SAMPLE_DATASETS = {
    'han_liu': {
        'name': '汉朝皇室刘氏',
        'description': '西汉皇室刘氏族谱，从高祖刘邦到昭帝刘弗陵，涵盖五代约30人。',
        'surname': '刘',
        'origin': '沛县',
        'members': HAN_LIU_MEMBERS,
        'parent_edges': HAN_LIU_PARENT_EDGES,
        'spouse_edges': HAN_LIU_SPOUSE_EDGES,
    },
    'sheng': {
        'name': '酉阳胜氏',
        'description': '重庆酉阳胜氏族谱，清乾隆年间至今，涵盖四代约20人。',
        'surname': '胜',
        'origin': '重庆酉阳',
        'members': SHENG_MEMBERS,
        'parent_edges': SHENG_PARENT_EDGES,
        'spouse_edges': SHENG_SPOUSE_EDGES,
    },
}


def get_sample_dataset_list():
    """返回所有可用示例数据集的摘要"""
    result = []
    for key, ds in SAMPLE_DATASETS.items():
        result.append({
            'key': key,
            'name': ds['name'],
            'description': ds['description'],
            'surname': ds['surname'],
            'origin': ds['origin'],
            'member_count': len(ds['members']),
            'generation_count': max(m['generation'] for m in ds['members']),
        })
    return result


def load_sample_data(family_id: int, dataset_key: str):
    """将示例数据加载到指定家族中

    Returns:
        dict: {message, member_count, relationship_count}
    """
    if dataset_key not in SAMPLE_DATASETS:
        raise ValueError(f'未知的示例数据集: {dataset_key}，可选: {list(SAMPLE_DATASETS.keys())}')

    ds = SAMPLE_DATASETS[dataset_key]

    # 1. 创建所有成员，记录 key -> member_id 映射
    key_to_id = {}
    for m in ds['members']:
        member = Member(
            family_id=family_id,
            name=m['name'],
            gender=m['gender'],
            generation=m['generation'],
            generation_name=m.get('generation_name'),
            birth_date=m.get('birth_date'),
            death_date=m.get('death_date'),
            bio=m.get('bio'),
            is_alive=m.get('is_alive', True),
            sort_order=m.get('sort_order', 0),
        )
        db.session.add(member)
        db.session.flush()
        key_to_id[m['key']] = member.id

    # 2. 创建父子关系
    parent_count = 0
    for parent_key, child_key in ds['parent_edges']:
        if parent_key in key_to_id and child_key in key_to_id:
            rel = Relationship(
                member_id=key_to_id[parent_key],
                related_member_id=key_to_id[child_key],
                relationship_type='parent',
            )
            db.session.add(rel)
            parent_count += 1

    # 3. 创建配偶关系
    spouse_count = 0
    for key1, key2 in ds['spouse_edges']:
        if key1 in key_to_id and key2 in key_to_id:
            rel = Relationship(
                member_id=key_to_id[key1],
                related_member_id=key_to_id[key2],
                relationship_type='spouse',
            )
            db.session.add(rel)
            spouse_count += 1

    db.session.commit()

    return {
        'message': f'成功加载示例数据集「{ds["name"]}」',
        'member_count': len(ds['members']),
        'relationship_count': parent_count + spouse_count,
        'dataset_name': ds['name'],
    }
