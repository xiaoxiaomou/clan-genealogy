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
