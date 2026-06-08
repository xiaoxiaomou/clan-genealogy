import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple


class GedcomExporter:
    """GEDCOM 5.5.1 格式导出器"""
    
    GEDCOM_VERSION = "5.5.1"
    GEDCOM_FORM = "LINEAGE-LINKED"
    
    def __init__(self, family_name: str):
        self.family_name = family_name
        self.lines = []
        self.xref_map: Dict[int, str] = {}  # member_id -> @I{N}@
        self.fam_xref_map: Dict[int, str] = {}  # family_id -> @F{N}@
    
    def export(self, members: List, relationships: List) -> str:
        """导出为 GEDCOM 格式字符串"""
        self.lines = []
        self.xref_map = {}
        self.fam_xref_map = {}
        
        self._add_header()
        self._add_individuals(members)
        self._add_families(members, relationships)
        self._add_trailer()
        
        return '\n'.join(self.lines) + '\n'
    
    def _add_header(self):
        """添加 GEDCOM 头部"""
        self.lines.extend([
            "0 HEAD",
            "1 SOUR FamilyTree",
            "2 NAME 族谱",
            "2 VERS " + self.GEDCOM_VERSION,
            "1 DEST FamilyTree",
            "1 DATE " + datetime.now().strftime("%d %b %Y").upper(),
            "2 TIME " + datetime.now().strftime("%H:%M:%S"),
            "1 FILE " + self.family_name,
            "1 GEDC",
            "2 VERS " + self.GEDCOM_VERSION,
            "2 FORM " + self.GEDCOM_FORM,
            "1 CHAR UTF-8",
        ])
    
    def _add_individuals(self, members: List):
        """添加个人记录 (INDI)"""
        for idx, member in enumerate(members, 1):
            xref = f"@I{idx}@"
            self.xref_map[member.id] = xref
            
            self.lines.append(f"0 {xref} INDI")
            
            # 姓名
            name_parts = member.name.split()
            if len(name_parts) > 1:
                # 有字辈
                self.lines.append(f"1 NAME {name_parts[0]} /{member.generation_name or ''}/")
            else:
                self.lines.append(f"1 NAME {member.name} //")
            
            # 性别
            gender_map = {'male': 'M', 'female': 'F', 'unknown': 'U'}
            self.lines.append(f"1 SEX {gender_map.get(member.gender, 'U')}")
            
            # 出生
            if member.birth_date:
                self.lines.append("1 BIRT")
                self.lines.append("2 DATE " + member.birth_date)
            
            # 逝世
            if member.death_date and not member.is_alive:
                self.lines.append("1 DEAT")
                self.lines.append("2 DATE " + member.death_date)
            elif not member.is_alive:
                self.lines.append("1 DEAT")
                self.lines.append("2 Y")
            
            # 个人事实
            if member.bio:
                self.lines.append("1 NOTE " + self._escape_gedcom(member.bio))
            
            # 变更时间
            if member.updated_at:
                self.lines.append("1 CHAN")
                self.lines.append("2 DATE " + member.updated_at.strftime("%d %b %Y").upper())
    
    def _add_families(self, members: List, relationships: List):
        """添加家庭记录 (FAM) 并建立亲子/配偶关系"""
        # 收集家庭信息
        parent_to_children: Dict[int, List[int]] = {}  # parent_id -> [child_ids]
        spouses: Dict[int, List[int]] = {}  # member_id -> [spouse_ids]
        
        for rel in relationships:
            if rel.relationship_type == 'parent':
                # source 是父母, target 是子女
                if rel.member_id not in parent_to_children:
                    parent_to_children[rel.member_id] = []
                parent_to_children[rel.member_id].append(rel.related_member_id)
            elif rel.relationship_type == 'spouse':
                if rel.member_id not in spouses:
                    spouses[rel.member_id] = []
                spouses[rel.member_id].append(rel.related_member_id)
        
        # 为每个成员的配偶创建家庭
        fam_idx = 1
        processed_spouses = set()
        
        for member_id, spouse_ids in spouses.items():
            for spouse_id in spouse_ids:
                if (member_id, spouse_id) in processed_spouses:
                    continue
                processed_spouses.add((member_id, spouse_id))
                processed_spouses.add((spouse_id, member_id))
                
                fam_xref = f"@F{fam_idx}@"
                self.fam_xref_map[member_id] = fam_xref
                
                self.lines.append(f"0 {fam_xref} FAM")
                
                # 丈夫
                husb_xref = self.xref_map.get(member_id)
                if husb_xref:
                    self.lines.append(f"1 HUSB {husb_xref}")
                
                # 妻子  
                wife_xref = self.xref_map.get(spouse_id)
                if wife_xref:
                    self.lines.append(f"1 WIFE {wife_xref}")
                
                # 子女
                children = parent_to_children.get(member_id, []) + parent_to_children.get(spouse_id, [])
                for child_id in children:
                    child_xref = self.xref_map.get(child_id)
                    if child_xref:
                        self.lines.append(f"1 CHIL {child_xref}")
                
                fam_idx += 1
        
        # 处理没有配偶但有子女的成员
        for member_id, children in parent_to_children.items():
            if member_id in self.fam_xref_map:
                continue  # 已经在家庭中了
            
            # 检查成员是否有配偶
            if member_id not in spouses or not spouses[member_id]:
                if children:
                    fam_xref = f"@F{fam_idx}@"
                    self.fam_xref_map[member_id] = fam_xref
                    
                    self.lines.append(f"0 {fam_xref} FAM")
                    
                    member_xref = self.xref_map.get(member_id)
                    if member_xref:
                        self.lines.append(f"1 HUSB {member_xref}")
                    
                    for child_id in children:
                        child_xref = self.xref_map.get(child_id)
                        if child_xref:
                            self.lines.append(f"1 CHIL {child_xref}")
                    
                    fam_idx += 1
    
    def _add_trailer(self):
        """添加 GEDCOM 尾部"""
        self.lines.append("0 TRLR")
    
    def _escape_gedcom(self, text: str) -> str:
        """转义 GEDCOM 特殊字符"""
        if not text:
            return ""
        return text.replace('\n', '~').replace('\r', '')


class GedcomImporter:
    """GEDCOM 5.5.1 格式导入器"""
    
    def __init__(self):
        self.records: List[Dict] = []
        self.families: List[Dict] = []
        self.current_record: Dict = {}
        self.current_tag: str = ""
        self.current_value: str = ""
    
    def import_data(self, gedcom_text: str) -> Tuple[List[Dict], List[Dict]]:
        """解析 GEDCOM 文本, 返回 (members, relationships)"""
        self.records = []
        self.families = []
        self._parse(gedcom_text)
        return self._convert_to_members(), self._convert_to_relationships()
    
    def _parse(self, gedcom_text: str):
        """解析 GEDCOM 文本"""
        lines = gedcom_text.split('\n')
        level = 0
        stack = []
        
        for line in lines:
            if not line.strip():
                continue
            
            parts = line.split(' ', 2)
            if len(parts) < 2:
                continue
            
            new_level = int(parts[0])
            xref = parts[1] if len(parts) > 1 and parts[1].startswith('@') else None
            tag = parts[1] if xref else parts[1]
            value = parts[2] if len(parts) > 2 else ""
            
            if new_level == 0:
                # 保存前一个记录
                if self.current_record:
                    if self.current_record.get('type') == 'INDI':
                        self.records.append(self.current_record)
                    elif self.current_record.get('type') == 'FAM':
                        self.families.append(self.current_record)
                
                # 新记录
                self.current_record = {'type': tag, 'xref': xref, 'tags': []}
                if xref:
                    self.current_record['xref'] = xref
                level = 0
                stack = [(level, self.current_record)]
            elif new_level <= level:
                # 上移到正确层级
                while stack and stack[-1][0] >= new_level:
                    stack.pop()
            
            # 添加标签
            tag_obj = {'tag': tag, 'value': value, 'level': new_level}
            if stack:
                parent = stack[-1][1]
                if 'sub_tags' not in parent:
                    parent['sub_tags'] = []
                parent['sub_tags'].append(tag_obj)
            
            if tag in ('INDI', 'FAM', 'HEAD', 'TRLR'):
                self.current_record['type'] = tag
            
            level = new_level
            stack.append((level, tag_obj))
    
    def _convert_to_members(self) -> List[Dict]:
        """转换为成员数据"""
        members = []
        for record in self.records:
            if record.get('type') != 'INDI':
                continue
            
            member = {'name': '', 'gender': 'unknown'}
            
            # 解析姓名
            name_tag = self._find_tag(record, 'NAME')
            if name_tag:
                name_value = name_tag.get('value', '')
                # 格式: 名 /字辈/
                if '/' in name_value:
                    parts = name_value.split('/')
                    member['name'] = parts[0].strip()
                    if len(parts) > 1:
                        member['generation_name'] = parts[1].strip()
            
            # 性别
            sex_tag = self._find_tag(record, 'SEX')
            if sex_tag:
                gender_map = {'M': 'male', 'F': 'female', 'U': 'unknown'}
                member['gender'] = gender_map.get(sex_tag.get('value', 'U'), 'unknown')
            
            # 出生日期
            birt_tag = self._find_tag(record, 'BIRT')
            if birt_tag:
                date_tag = self._find_sub_tag(birt_tag, 'DATE')
                if date_tag:
                    member['birth_date'] = date_tag.get('value', '')
            
            # 逝世日期
            death_tag = self._find_tag(record, 'DEAT')
            if death_tag:
                date_tag = self._find_sub_tag(death_tag, 'DATE')
                if date_tag:
                    member['death_date'] = date_tag.get('value', '')
                    member['is_alive'] = False
                else:
                    member['is_alive'] = False
            
            # 个人简介
            note_tag = self._find_tag(record, 'NOTE')
            if note_tag:
                member['bio'] = note_tag.get('value', '').replace('~', '\n')
            
            members.append(member)
        
        return members
    
    def _convert_to_relationships(self) -> List[Dict]:
        """转换为关系数据"""
        relationships = []
        
        for fam in self.families:
            # 丈夫
            husb_tag = self._find_tag(fam, 'HUSB')
            # 妻子
            wife_tag = self._find_tag(fam, 'WIFE')
            
            # 配偶关系
            if husb_tag and wife_tag:
                relationships.append({
                    'member_id': self._xref_to_id(husb_tag.get('value', '')),
                    'related_member_id': self._xref_to_id(wife_tag.get('value', '')),
                    'relationship_type': 'spouse'
                })
            
            # 子女关系
            chil_tags = self._get_sub_tags(fam, 'CHIL')
            parent_xref = husb_tag.get('value') or wife_tag.get('value')
            
            for chil_tag in chil_tags:
                relationships.append({
                    'member_id': self._xref_to_id(parent_xref),
                    'related_member_id': self._xref_to_id(chil_tag.get('value', '')),
                    'relationship_type': 'parent'
                })
        
        return relationships
    
    def _find_tag(self, record: Dict, tag: str) -> Optional[Dict]:
        """查找标签"""
        sub_tags = record.get('sub_tags', [])
        for st in sub_tags:
            if st.get('tag') == tag:
                return st
        return None
    
    def _find_sub_tag(self, parent: Dict, tag: str) -> Optional[Dict]:
        """在父标签下查找子标签"""
        sub_tags = parent.get('sub_tags', [])
        for st in sub_tags:
            if st.get('tag') == tag:
                return st
        return None
    
    def _get_sub_tags(self, record: Dict, tag: str) -> List[Dict]:
        """获取所有子标签"""
        sub_tags = record.get('sub_tags', [])
        return [st for st in sub_tags if st.get('tag') == tag]
    
    def _xref_to_id(self, xref: str) -> Optional[int]:
        """将 XREF 转换为 ID"""
        if not xref:
            return None
        # @I1@ -> 1
        match = re.match(r'@I(\d+)@', xref)
        if match:
            return int(match.group(1))
        return None