"""
内置示例族谱数据集 —— 李氏家族（30 人，4 代）
覆盖场景：多代际、多分支、在世/已故、配偶/无配偶、有子女/无子女、字/号
"""

from app import db
from app.models.member import Member
from app.models.relationship import Relationship


LI_MEMBERS = [
    # === 第 1 代：始祖（2人） ===
    {'key': 'lizu', 'name': '李祖', 'gender': 'male', 'generation': 1,
     'generation_name': '德', 'birth_date': '1900', 'death_date': '1960',
     'bio': '李氏始祖，民国年间迁居洛阳。', 'is_alive': False,
     'courtesy_name': '德厚', 'art_name': '朴庵'},
    {'key': 'lipopo', 'name': '李婆', 'gender': 'female', 'generation': 1,
     'generation_name': '德', 'birth_date': '1902', 'death_date': '1985',
     'bio': '李祖之妻。', 'is_alive': False},

    # === 第 2 代（4人） ===
    {'key': 'libo', 'name': '李伯', 'gender': 'male', 'generation': 2,
     'generation_name': '建', 'birth_date': '1925', 'death_date': '2000',
     'bio': '李祖长子，务农。', 'is_alive': False, 'courtesy_name': '建农'},
    {'key': 'libopo', 'name': '李伯婆', 'gender': 'female', 'generation': 2,
     'generation_name': '建', 'birth_date': '1927', 'death_date': '2005',
     'bio': '李伯之妻。', 'is_alive': False},
    {'key': 'lifu', 'name': '李父', 'gender': 'male', 'generation': 2,
     'generation_name': '建', 'birth_date': '1930', 'death_date': '2010',
     'bio': '李祖次子，退休教师。', 'is_alive': False, 'courtesy_name': '建文'},
    {'key': 'limu', 'name': '李母', 'gender': 'female', 'generation': 2,
     'generation_name': '建', 'birth_date': '1932', 'death_date': '2018',
     'bio': '李父之妻，教师。', 'is_alive': False},

    # === 第 3 代（12人） ===
    # 李伯的子女（4人）
    {'key': 'litangge', 'name': '李堂哥', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1950', 'death_date': '2023',
     'bio': '李伯长子，工人。', 'is_alive': False, 'courtesy_name': '守业'},
    {'key': 'litangsaos', 'name': '李堂嫂', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1952', 'death_date': None,
     'bio': '李堂哥之妻。', 'is_alive': True},
    {'key': 'litangdi', 'name': '李堂弟', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1955', 'death_date': None,
     'bio': '李伯次子，个体户。', 'is_alive': True},
    {'key': 'litangmei', 'name': '李堂妹', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1958', 'death_date': None,
     'bio': '李伯之女，已出嫁。', 'is_alive': True},

    # 李父的子女（8人）
    {'key': 'lidage', 'name': '李大哥', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1953', 'death_date': None,
     'bio': '李父长子，工程师。', 'is_alive': True, 'courtesy_name': '守正'},
    {'key': 'lidasaos', 'name': '李大嫂', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1955', 'death_date': None,
     'bio': '李大哥之妻。', 'is_alive': True},
    {'key': 'lierge', 'name': '李二哥', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1958', 'death_date': '2022',
     'bio': '李父次子，医生。', 'is_alive': False, 'courtesy_name': '守仁',
     'art_name': '杏林散人'},
    {'key': 'liersao', 'name': '李二嫂', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1960', 'death_date': None,
     'bio': '李二哥之妻。', 'is_alive': True},
    {'key': 'lisanjie', 'name': '李三姐', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1962', 'death_date': None,
     'bio': '李父长女。', 'is_alive': True},
    {'key': 'lisi', 'name': '李四', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1965', 'death_date': '1990',
     'bio': '李父三子，英年早逝，未婚。', 'is_alive': False},
    {'key': 'liwu', 'name': '李五', 'gender': 'male', 'generation': 3,
     'generation_name': '守', 'birth_date': '1968', 'death_date': None,
     'bio': '李父四子，未婚，在外地工作。', 'is_alive': True},
    {'key': 'limei', 'name': '李妹', 'gender': 'female', 'generation': 3,
     'generation_name': '守', 'birth_date': '1970', 'death_date': None,
     'bio': '李父幼女。', 'is_alive': True},

    # === 第 4 代（12人） ===
    # 李堂哥的子女（2人）
    {'key': 'liyuanzhi', 'name': '李远志', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1975', 'death_date': None,
     'bio': '李堂哥之子。', 'is_alive': True},
    {'key': 'liyuanfang', 'name': '李远芳', 'gender': 'female', 'generation': 4,
     'generation_name': '承', 'birth_date': '1978', 'death_date': None,
     'bio': '李堂哥之女。', 'is_alive': True},

    # 李大哥的子女（3人）
    {'key': 'lichangsun', 'name': '李长孙', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1978', 'death_date': None,
     'bio': '李大哥之子，留学归国。', 'is_alive': True, 'courtesy_name': '承先'},
    {'key': 'lichangsunnv', 'name': '李长孙女', 'gender': 'female', 'generation': 4,
     'generation_name': '承', 'birth_date': '1980', 'death_date': None,
     'bio': '李大哥之女。', 'is_alive': True},
    {'key': 'licixi', 'name': '李次息', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1983', 'death_date': None,
     'bio': '李大哥次子。', 'is_alive': True},

    # 李二哥的子女（2人）
    {'key': 'liyilin', 'name': '李艺林', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1985', 'death_date': None,
     'bio': '李二哥之子，画家。', 'is_alive': True, 'art_name': '墨石'},
    {'key': 'liyishu', 'name': '李艺书', 'gender': 'female', 'generation': 4,
     'generation_name': '承', 'birth_date': '1988', 'death_date': None,
     'bio': '李二哥之女，教师。', 'is_alive': True},

    # 李三姐的子女（2人 - 外姓，但作为成员记录）
    {'key': 'lisanwai', 'name': '李三外甥', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1990', 'death_date': None,
     'bio': '李三姐之子。', 'is_alive': True},
    {'key': 'lisanwainv', 'name': '李三外甥女', 'gender': 'female', 'generation': 4,
     'generation_name': '承', 'birth_date': '1993', 'death_date': None,
     'bio': '李三姐之女。', 'is_alive': True},

    # 李堂弟之子（1人）
    {'key': 'litangsun', 'name': '李堂孙', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1980', 'death_date': None,
     'bio': '李堂弟之子。', 'is_alive': True},

    # 李堂妹之子（1人 - 外姓，但作为成员记录）
    {'key': 'litangmeizi', 'name': '李堂妹之子', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '1985', 'death_date': None,
     'bio': '李堂妹之子。', 'is_alive': True},

    # 李五之子（1人 - 晚育）
    {'key': 'liwanzi', 'name': '李晚子', 'gender': 'male', 'generation': 4,
     'generation_name': '承', 'birth_date': '2000', 'death_date': None,
     'bio': '李五之子。', 'is_alive': True},
]

LI_PARENT_EDGES = [
    # 第 1 代 -> 第 2 代
    ('lizu', 'libo'),
    ('lizu', 'lifu'),
    # 第 2 代 -> 第 3 代
    ('libo', 'litangge'),
    ('libo', 'litangdi'),
    ('libo', 'litangmei'),
    ('lifu', 'lidage'),
    ('lifu', 'lierge'),
    ('lifu', 'lisanjie'),
    ('lifu', 'lisi'),
    ('lifu', 'liwu'),
    ('lifu', 'limei'),
    # 第 3 代 -> 第 4 代
    ('litangge', 'liyuanzhi'),
    ('litangge', 'liyuanfang'),
    ('lidage', 'lichangsun'),
    ('lidage', 'lichangsunnv'),
    ('lidage', 'licixi'),
    ('lierge', 'liyilin'),
    ('lierge', 'liyishu'),
    ('lisanjie', 'lisanwai'),
    ('lisanjie', 'lisanwainv'),
    ('litangdi', 'litangsun'),
    ('litangmei', 'litangmeizi'),
    ('liwu', 'liwanzi'),
]

LI_SPOUSE_EDGES = [
    ('lizu', 'lipopo'),
    ('libo', 'libopo'),
    ('lifu', 'limu'),
    ('litangge', 'litangsaos'),
    ('lidage', 'lidasaos'),
    ('lierge', 'liersao'),
]


# ============================================================
# 王氏家族（5 代，22 人）
# 场景：五代同堂、多配偶、隔代年龄差大
# ============================================================
WANG_MEMBERS = [
    {'key': 'wangtai', 'name': '王太公', 'gender': 'male', 'generation': 1,
     'generation_name': '元', 'birth_date': '1850', 'death_date': '1920',
     'bio': '王氏始祖，晚清商人。', 'is_alive': False, 'courtesy_name': '元昌'},
    {'key': 'wangtaipe', 'name': '王太婆', 'gender': 'female', 'generation': 1,
     'generation_name': '元', 'birth_date': '1852', 'death_date': '1918',
     'bio': '王太公原配。', 'is_alive': False},
    {'key': 'wangce', 'name': '王侧室', 'gender': 'female', 'generation': 1,
     'generation_name': '元', 'birth_date': '1870', 'death_date': '1935',
     'bio': '王太公侧室。', 'is_alive': False},

    {'key': 'wangda', 'name': '王大', 'gender': 'male', 'generation': 2,
     'generation_name': '亨', 'birth_date': '1875', 'death_date': '1940',
     'bio': '王太公长子（原配出）。', 'is_alive': False, 'courtesy_name': '亨通'},
    {'key': 'wanger', 'name': '王二', 'gender': 'male', 'generation': 2,
     'generation_name': '亨', 'birth_date': '1890', 'death_date': '1955',
     'bio': '王太公次子（侧室出）。', 'is_alive': False},
    {'key': 'wangsan', 'name': '王三', 'gender': 'male', 'generation': 2,
     'generation_name': '亨', 'birth_date': '1895', 'death_date': '1960',
     'bio': '王太公三子（侧室出）。', 'is_alive': False},
    {'key': 'wangdape', 'name': '王大妻', 'gender': 'female', 'generation': 2,
     'generation_name': '亨', 'birth_date': '1877', 'death_date': '1945',
     'bio': '王大之妻。', 'is_alive': False},

    {'key': 'wangchang', 'name': '王长', 'gender': 'male', 'generation': 3,
     'generation_name': '利', 'birth_date': '1900', 'death_date': '1975',
     'bio': '王大之子。', 'is_alive': False},
    {'key': 'wangchangpe', 'name': '王长妻', 'gender': 'female', 'generation': 3,
     'generation_name': '利', 'birth_date': '1902', 'death_date': '1980',
     'bio': '王长之妻。', 'is_alive': False},
    {'key': 'wangfu', 'name': '王富', 'gender': 'male', 'generation': 3,
     'generation_name': '利', 'birth_date': '1920', 'death_date': '2000',
     'bio': '王二之子。', 'is_alive': False, 'courtesy_name': '利民'},

    {'key': 'wangdaa', 'name': '王大安', 'gender': 'male', 'generation': 4,
     'generation_name': '贞', 'birth_date': '1925', 'death_date': '2010',
     'bio': '王长之子，退休干部。', 'is_alive': False},
    {'key': 'wangdaape', 'name': '王大安妻', 'gender': 'female', 'generation': 4,
     'generation_name': '贞', 'birth_date': '1928', 'death_date': '2015',
     'bio': '王大安之妻。', 'is_alive': False},
    {'key': 'wangeran', 'name': '王二安', 'gender': 'male', 'generation': 4,
     'generation_name': '贞', 'birth_date': '1930', 'death_date': '2005',
     'bio': '王长次子。', 'is_alive': False},
    {'key': 'wangxiao', 'name': '王小', 'gender': 'female', 'generation': 4,
     'generation_name': '贞', 'birth_date': '1935', 'death_date': None,
     'bio': '王长之女。', 'is_alive': True},
    {'key': 'wangfuzi', 'name': '王富子', 'gender': 'male', 'generation': 4,
     'generation_name': '贞', 'birth_date': '1950', 'death_date': None,
     'bio': '王富之子，中年得子。', 'is_alive': True},

    {'key': 'wangsun', 'name': '王孙', 'gender': 'male', 'generation': 5,
     'generation_name': '祥', 'birth_date': '1955', 'death_date': None,
     'bio': '王大安之子。', 'is_alive': True, 'courtesy_name': '祥瑞'},
    {'key': 'wangsunv', 'name': '王孙女', 'gender': 'female', 'generation': 5,
     'generation_name': '祥', 'birth_date': '1960', 'death_date': None,
     'bio': '王大安之女。', 'is_alive': True},
    {'key': 'wangchong', 'name': '王重孙', 'gender': 'male', 'generation': 5,
     'generation_name': '祥', 'birth_date': '1975', 'death_date': None,
     'bio': '王二安之子。', 'is_alive': True},
    {'key': 'wangchongnv', 'name': '王重孙女', 'gender': 'female', 'generation': 5,
     'generation_name': '祥', 'birth_date': '1980', 'death_date': None,
     'bio': '王富子之女，王富50岁得女。', 'is_alive': True},
    {'key': 'wangxiaozi', 'name': '王小曾', 'gender': 'male', 'generation': 5,
     'generation_name': '祥', 'birth_date': '2005', 'death_date': None,
     'bio': '王之之后。', 'is_alive': True},
]

WANG_PARENT_EDGES = [
    ('wangtai', 'wangda'), ('wangtai', 'wanger'), ('wangtai', 'wangsan'),
    ('wangda', 'wangchang'), ('wanger', 'wangfu'),
    ('wangchang', 'wangdaa'), ('wangchang', 'wangeran'), ('wangchang', 'wangxiao'),
    ('wangfu', 'wangfuzi'),
    ('wangdaa', 'wangsun'), ('wangdaa', 'wangsunv'),
    ('wangeran', 'wangchong'),
    ('wangfuzi', 'wangchongnv'),
]

WANG_SPOUSE_EDGES = [
    ('wangtai', 'wangtaipe'), ('wangtai', 'wangce'),
    ('wangda', 'wangdape'),
    ('wangchang', 'wangchangpe'),
    ('wangdaa', 'wangdaape'),
]


# ============================================================
# 赵氏家族（3 代，8 人）
# 场景：三代小家庭、独生子女、单亲
# ============================================================
ZHAO_MEMBERS = [
    {'key': 'zhaoyeye', 'name': '赵爷爷', 'gender': 'male', 'generation': 1,
     'generation_name': '福', 'birth_date': '1940', 'death_date': '2020',
     'bio': '退休工人。', 'is_alive': False},
    {'key': 'zhaonainai', 'name': '赵奶奶', 'gender': 'female', 'generation': 1,
     'generation_name': '福', 'birth_date': '1942', 'death_date': None,
     'bio': '赵爷爷之妻。', 'is_alive': True},

    {'key': 'zhaoba', 'name': '赵爸', 'gender': 'male', 'generation': 2,
     'generation_name': '禄', 'birth_date': '1965', 'death_date': None,
     'bio': '赵爷爷独子。', 'is_alive': True, 'courtesy_name': '禄安'},
    {'key': 'zhaoma', 'name': '赵妈', 'gender': 'female', 'generation': 2,
     'generation_name': '禄', 'birth_date': '1967', 'death_date': None,
     'bio': '赵爸之妻。', 'is_alive': True},

    {'key': 'zhaoming', 'name': '赵明', 'gender': 'male', 'generation': 3,
     'generation_name': '寿', 'birth_date': '1995', 'death_date': None,
     'bio': '独生子，大学毕业。', 'is_alive': True, 'courtesy_name': '寿康'},
    {'key': 'zhaomingqi', 'name': '赵明妻', 'gender': 'female', 'generation': 3,
     'generation_name': '寿', 'birth_date': '1997', 'death_date': None,
     'bio': '赵明之妻。', 'is_alive': True},

    {'key': 'zhaotong', 'name': '赵彤', 'gender': 'female', 'generation': 3,
     'generation_name': '寿', 'birth_date': '2022', 'death_date': None,
     'bio': '赵明之女，独生女。', 'is_alive': True},

    # 单亲场景：赵姑（赵爸之妹，独自抚养孩子）
    {'key': 'zhaogu', 'name': '赵姑', 'gender': 'female', 'generation': 2,
     'generation_name': '禄', 'birth_date': '1970', 'death_date': None,
     'bio': '赵爷爷之女，单亲母亲。', 'is_alive': True},
    {'key': 'zhaobiaodi', 'name': '赵表弟', 'gender': 'male', 'generation': 3,
     'generation_name': '寿', 'birth_date': '2000', 'death_date': None,
     'bio': '赵姑之子，单亲家庭。', 'is_alive': True},
]

ZHAO_PARENT_EDGES = [
    ('zhaoyeye', 'zhaoba'), ('zhaoyeye', 'zhaogu'),
    ('zhaoba', 'zhaoming'),
    ('zhaoming', 'zhaotong'),
    ('zhaogu', 'zhaobiaodi'),
]

ZHAO_SPOUSE_EDGES = [
    ('zhaoyeye', 'zhaonainai'),
    ('zhaoba', 'zhaoma'),
    ('zhaoming', 'zhaomingqi'),
]


SAMPLE_DATASETS = {
    'li': {
        'name': '李氏家族',
        'description': '李氏四代家族，涵盖多分支、多场景共30人。',
        'surname': '李',
        'origin': '河南洛阳',
        'members': LI_MEMBERS,
        'parent_edges': LI_PARENT_EDGES,
        'spouse_edges': LI_SPOUSE_EDGES,
    },
    'wang': {
        'name': '王氏家族',
        'description': '王氏五代同堂，含多配偶、隔代年龄差大等场景，共22人。',
        'surname': '王',
        'origin': '山西太原',
        'members': WANG_MEMBERS,
        'parent_edges': WANG_PARENT_EDGES,
        'spouse_edges': WANG_SPOUSE_EDGES,
    },
    'zhao': {
        'name': '赵氏家族',
        'description': '赵氏三代小家庭，含独生子女、单亲家庭场景，共8人。',
        'surname': '赵',
        'origin': '河北石家庄',
        'members': ZHAO_MEMBERS,
        'parent_edges': ZHAO_PARENT_EDGES,
        'spouse_edges': ZHAO_SPOUSE_EDGES,
    },
}


def get_sample_dataset_list():
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
    if dataset_key not in SAMPLE_DATASETS:
        raise ValueError(f'未知的示例数据集: {dataset_key}')

    ds = SAMPLE_DATASETS[dataset_key]
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
            courtesy_name=m.get('courtesy_name'),
            art_name=m.get('art_name'),
            sort_order=m.get('sort_order', 0),
        )
        db.session.add(member)
        db.session.flush()
        key_to_id[m['key']] = member.id

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
