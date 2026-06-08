import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# 注册中文字体
FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fonts')
MSYH_PATH = os.path.join(FONTS_DIR, 'msyh.ttc')
MSYHBD_PATH = os.path.join(FONTS_DIR, 'msyhbd.ttc')
if os.path.exists(MSYH_PATH):
    pdfmetrics.registerFont(TTFont('MSYH', MSYH_PATH))
    pdfmetrics.registerFont(TTFont('MSYH-Bold', MSYHBD_PATH))
    FONT_NAME = 'MSYH'
    FONT_NAME_BOLD = 'MSYH-Bold'
else:
    FONT_NAME = 'Helvetica'
    FONT_NAME_BOLD = 'Helvetica-Bold'


def generate_pdf(family, members, relationships, tree_data):
    """生成族谱 PDF"""
    from io import BytesIO
    from reportlab.lib.utils import Image

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                          leftMargin=1*cm, rightMargin=1*cm,
                          topMargin=1*cm, bottomMargin=1*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName=FONT_NAME_BOLD,
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=10,
        fontName=FONT_NAME_BOLD,
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontName=FONT_NAME,
    )

    story = []

    title = Paragraph(f"{family.name}", title_style)
    story.append(title)

    info_parts = []
    if family.surname:
        info_parts.append(f"姓氏：{family.surname}")
    if family.origin:
        info_parts.append(f"籍贯：{family.origin}")
    if family.description:
        info_parts.append(f"简介：{family.description}")
    info_parts.append(f"成员数量：{len(members)}人")

    for info in info_parts:
        p = Paragraph(info, normal_style)
        story.append(p)

    story.append(Spacer(1, 0.5*cm))

    if members:
        story.append(Paragraph("成员列表", heading_style))

        data = [['姓名', '性别', '辈分', '辈分名', '出生日期', '在世状态']]
        for m in members:
            gender_label = {'male': '男', 'female': '女', 'unknown': '未知'}.get(m.gender, '未知')
            gen_name = m.generation_name or '-'
            birth = m.birth_date or '-'
            alive = '在世' if m.is_alive else '已故'
            data.append([
                m.name,
                gender_label,
                f"第{m.generation}代" if m.generation else '-',
                gen_name,
                birth,
                alive
            ])

        table = Table(data, colWidths=[3*cm, 2*cm, 2*cm, 2.5*cm, 3*cm, 2*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
        ]))
        story.append(table)

    if relationships:
        story.append(PageBreak())
        story.append(Paragraph("家族关系", heading_style))

        node_map = {n['id']: n['name'] for n in tree_data['nodes']}
        rel_data = [['成员', '关系', '相关成员', '关系类型']]

        for r in relationships:
            member_name = node_map.get(r.member_id, '未知')
            related_name = node_map.get(r.related_member_id, '未知')
            rel_type = {'parent': '父母', 'spouse': '配偶', 'sibling': '兄弟'}.get(r.relationship_type, r.relationship_type)
            rel_data.append([member_name, rel_type, related_name, r.relationship_type])

        table = Table(rel_data, colWidths=[4*cm, 2.5*cm, 4*cm, 2.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
        ]))
        story.append(table)

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_traditional_pdf(family, members, relationships, tree_data, style='su'):
    """生成传统谱式 PDF
    
    Args:
        family: 家族对象
        members: 成员列表
        relationships: 关系列表
        tree_data: 树数据
        style: 谱式类型 'su'(苏式), 'ou'(欧式), 'bao'(宝塔式)
    """
    from io import BytesIO
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                          leftMargin=1*cm, rightMargin=1*cm,
                          topMargin=1*cm, bottomMargin=1*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName=FONT_NAME_BOLD,
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=15,
        fontName=FONT_NAME_BOLD,
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        fontName=FONT_NAME,
    )

    story = []

    style_names = {'su': '苏式族谱', 'ou': '欧式族谱', 'bao': '宝塔式族谱'}
    title = Paragraph(f"{family.name} {style_names.get(style, '族谱')}", title_style)
    story.append(title)
    story.append(Spacer(1, 0.3*cm))

    if style == 'su':
        story.extend(_generate_su_style(family, members, normal_style, heading_style))
    elif style == 'ou':
        story.extend(_generate_ou_style(family, members, relationships, tree_data, normal_style, heading_style))
    elif style == 'bao':
        story.extend(_generate_bao_style(family, members, normal_style, heading_style))

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} · {style_names.get(style, '传统谱')}", normal_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _generate_su_style(family, members, normal_style, heading_style):
    """苏式族谱 - 表格形式"""
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors
    
    story = []
    
    story.append(Paragraph("一、世系图", heading_style))
    
    gen_members = {}
    for m in members:
        gen = m.generation or 1
        if gen not in gen_members:
            gen_members[gen] = []
        gen_members[gen].append(m)
    
    for gen in sorted(gen_members.keys()):
        story.append(Paragraph(f"第{gen}世", normal_style))
        gen_members[gen].sort(key=lambda x: x.name)
        
        rows = [['序号', '姓名', '字号', '性别', '出生日期', '配偶', '备注']]
        for i, m in enumerate(gen_members[gen], 1):
            gender = {'male': '男', 'female': '女'}.get(m.gender, '')
            birth = m.birth_date or ''
            spouse = ''
            if m.bio:
                remark = m.bio[:20]
            else:
                remark = ''
            rows.append([str(i), m.name, m.generation_name or '', gender, birth, spouse, remark])
        
        if len(rows) > 1:
            colWidths = [1.5*cm, 3*cm, 2.5*cm, 1.5*cm, 2.5*cm, 3*cm, 3*cm]
            table = Table(rows, colWidths=colWidths)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8b2500')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
                ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fafafa')]),
            ]))
            story.append(table)
            story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph("二、齿录", heading_style))
    for gen in sorted(gen_members.keys()):
        story.append(Paragraph(f"第{gen}世", normal_style))
        for m in gen_members[gen]:
            bio_text = f"{m.name}，{'男' if m.gender == 'male' else '女'}"
            if m.generation_name:
                bio_text += f"，字号{m.generation_name}"
            if m.birth_date:
                bio_text += f"，生{m.birth_date}"
            if m.birth_date and not m.is_alive and m.death_date:
                bio_text += f"，没{m.death_date}"
            elif not m.is_alive:
                bio_text += f"，已故"
            if m.bio:
                bio_text += f"，{m.bio}"
            story.append(Paragraph(f"  {m.name}", normal_style))
            story.append(Paragraph(f"    {bio_text}", normal_style))
    
    return story


def _generate_ou_style(family, members, relationships, tree_data, normal_style, heading_style):
    """欧式族谱 - 树形图形式"""
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors
    
    story = []
    
    story.append(Paragraph("一、族谱总览", heading_style))
    
    nodes = tree_data.get('nodes', [])
    edges = tree_data.get('edges', [])
    
    node_map = {n['id']: n for n in nodes}
    
    parents = {}
    for e in edges:
        if e.get('relationship_type') == 'parent':
            parent_id = e.get('member_id')
            child_id = e.get('related_member_id')
            if parent_id not in parents:
                parents[parent_id] = []
            parents[parent_id].append(child_id)
    
    def build_tree_html(member_id, level=0):
        if member_id not in node_map:
            return []
        m = node_map[member_id]
        result = [f"{'  ' * level}· {m['name']} ({m.get('generation_name', '')})"]
        for child_id in parents.get(member_id, []):
            result.extend(build_tree_html(child_id, level + 1))
        return result
    
    root_members = [n for n in nodes if n.get('generation') == 1]
    for root in root_members:
        tree_text = build_tree_html(root['id'])
        for line in tree_text:
            story.append(Paragraph(line, normal_style))
    
    story.append(Paragraph("二、配偶关系", heading_style))
    spouses = {}
    for e in edges:
        if e.get('relationship_type') == 'spouse':
            m1 = e.get('member_id')
            m2 = e.get('related_member_id')
            name1 = node_map.get(m1, {}).get('name', '未知')
            name2 = node_map.get(m2, {}).get('name', '未知')
            if m1 not in spouses:
                spouses[m1] = name2
    
    for m_id, spouse_name in spouses.items():
        name = node_map.get(m_id, {}).get('name', '未知')
        story.append(Paragraph(f"{name} ≡ {spouse_name}", normal_style))
    
    return story


def _generate_bao_style(family, members, normal_style, heading_style):
    """宝塔式族谱 - 金字塔形式"""
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors

    story = []

    story.append(Paragraph("一、宝塔式", heading_style))
    story.append(Paragraph("（按辈分由上而下排列）", normal_style))
    story.append(Spacer(1, 0.3*cm))

    gen_counts = {}
    for m in members:
        gen = m.generation or 1
        gen_counts[gen] = gen_counts.get(gen, 0) + 1

    max_count = max(gen_counts.values()) if gen_counts else 1

    for gen in sorted(gen_counts.keys()):
        count = gen_counts[gen]
        bar_width = int((count / max_count) * 20) + 1
        bar = '█' * bar_width
        story.append(Paragraph(f"第{gen}世 {bar} {count}人", normal_style))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("二、各房分支", heading_style))

    gen_members = {}
    for m in members:
        gen = m.generation or 1
        if gen not in gen_members:
            gen_members[gen] = []
        gen_members[gen].append(m.name)

    for gen in sorted(gen_members.keys()):
        names = ' · '.join(gen_members[gen][:10])
        if len(gen_members[gen]) > 10:
            names += f' · ...等{len(gen_members[gen])}人'
        story.append(Paragraph(f"第{gen}世：{names}", normal_style))

    return story


# === 古籍线装样式 ===
_GUZHI_BROWN = colors.HexColor('#f5e6d3')
_GUZHI_RED = colors.HexColor('#8b2500')
_GUZHI_DARK = colors.HexColor('#3d2817')
_GUZHI_GOLD = colors.HexColor('#b08d57')


def _can_register_chinese():
    """检测是否已注册中文字体"""
    try:
        pdfmetrics.getFont('MSYH')
        return True
    except KeyError:
        return False


def generate_guzhi_pdf(family, members, relationships, tree_data, opts=None):
    """古籍线装 PDF：宣纸色 + 红色印章 + 仿古标题 + 世系表 + 跋文
    风格仿清代木刻本族谱。
    """
    from io import BytesIO
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    opts = opts or {}
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2.2*cm, rightMargin=2.2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    title_style = ParagraphStyle(
        'GuZhiTitle', fontName=FONT_NAME_BOLD, fontSize=42,
        alignment=TA_CENTER, textColor=_GUZHI_DARK, spaceAfter=8, leading=50,
    )
    sub_style = ParagraphStyle(
        'GuZhiSub', fontName=FONT_NAME, fontSize=14,
        alignment=TA_CENTER, textColor=_GUZHI_RED, spaceAfter=30, leading=20,
    )
    seal_style = ParagraphStyle(
        'Seal', fontName=FONT_NAME_BOLD, fontSize=22,
        alignment=TA_CENTER, textColor=_GUZHI_RED, leading=24,
    )
    motto_style = ParagraphStyle(
        'Motto', fontName=FONT_NAME, fontSize=13,
        alignment=TA_CENTER, textColor=_GUZHI_DARK, spaceAfter=8, leading=22,
    )
    chapter_style = ParagraphStyle(
        'Chapter', fontName=FONT_NAME_BOLD, fontSize=20,
        alignment=TA_CENTER, textColor=_GUZHI_DARK, spaceBefore=24, spaceAfter=16, leading=28,
    )
    section_style = ParagraphStyle(
        'Section', fontName=FONT_NAME_BOLD, fontSize=14,
        alignment=TA_LEFT, textColor=_GUZHI_RED, spaceBefore=12, spaceAfter=8, leading=20,
    )
    body_style = ParagraphStyle(
        'Body', fontName=FONT_NAME, fontSize=11,
        alignment=TA_LEFT, textColor=_GUZHI_DARK, leading=18, spaceAfter=4,
    )
    poet_style = ParagraphStyle(
        'Poet', fontName=FONT_NAME, fontSize=12,
        alignment=TA_CENTER, textColor=_GUZHI_DARK, leading=24, spaceAfter=6,
    )

    def _seal_table(text):
        """渲染红色印章样式的方框"""
        return Table([[text]], colWidths=[3*cm], rowHeights=[3*cm],
                     style=TableStyle([
                         ('FONTNAME', (0, 0), (-1, -1), FONT_NAME_BOLD),
                         ('FONTSIZE', (0, 0), (-1, -1), 28),
                         ('TEXTCOLOR', (0, 0), (-1, -1), _GUZHI_RED),
                         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                         ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                         ('BOX', (0, 0), (-1, -1), 3, _GUZHI_RED),
                         ('BACKGROUND', (0, 0), (-1, -1), _GUZHI_BROWN),
                     ]))

    def _seal_flowable(text):
        """印章 Flowable 包装（用于 Paragraph 之间）"""
        from reportlab.platypus.flowables import KeepTogether
        return _seal_table(text)

    def _on_page(canvas, doc_):
        """每页加宣纸色背景 + 边栏"""
        canvas.saveState()
        canvas.setFillColor(_GUZHI_BROWN)
        canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
        # 红色双边框
        canvas.setStrokeColor(_GUZHI_RED)
        canvas.setLineWidth(0.8)
        canvas.rect(1.5*cm, 1.5*cm, A4[0]-3*cm, A4[1]-3*cm, stroke=1, fill=0)
        canvas.setLineWidth(0.3)
        canvas.rect(1.7*cm, 1.7*cm, A4[0]-3.4*cm, A4[1]-3.4*cm, stroke=1, fill=0)
        # 页码
        canvas.setFont(FONT_NAME, 9)
        canvas.setFillColor(_GUZHI_DARK)
        canvas.drawCentredString(A4[0]/2, 1.1*cm, f"— {doc_.page} —")
        canvas.restoreState()

    story = []

    # === 封面 ===
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"{(family.surname or '')}氏族谱", title_style))
    story.append(Paragraph("— 家 之 大 乘 —", sub_style))
    story.append(Spacer(1, 1*cm))

    if family.motto:
        story.append(Paragraph(f"家 训", section_style))
        story.append(Paragraph(family.motto, motto_style))
        story.append(Spacer(1, 0.5*cm))

    story.append(Spacer(1, 1*cm))
    story.append(_seal_table('族'))
    story.append(Spacer(1, 0.8*cm))
    info_text = f"戊辰年·{datetime.now().year} 编修"
    story.append(Paragraph(info_text, motto_style))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("承先启后  源远流长", poet_style))

    story.append(PageBreak())

    # === 序言 ===
    story.append(Paragraph("序", chapter_style))
    preface = (
        "盖闻万物本乎天，人本乎祖。族之有谱，犹水之有源、木之有本也。"
        "本源既清，则枝叶自茂；祖德既厚，则子孙自昌。"
    )
    if family.origin:
        preface += f"\n\n{family.surname or '本'}氏一族，源出{family.origin}，"
    preface += (
        f"瓜瓞绵延，迄今已传若干世，族人凡{len(members)}口。"
    )
    if family.description:
        preface += f"\n\n{family.description}"
    preface += (
        "\n\n今逢盛世，百业俱兴。族人倡议重修族谱，"
        "上以敬宗收族，下以启牒传家。编修诸君，殚精竭虑，"
        "历时数月，始克竣事。谨以此谱，告慰先灵，昭示来者。"
    )
    for para in preface.split('\n\n'):
        story.append(Paragraph(para, body_style))

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("谨序", body_style))
    story.append(Paragraph(f"   戊辰年 仲春", body_style))

    story.append(PageBreak())

    # === 凡例 ===
    story.append(Paragraph("凡 例", chapter_style))
    rules = [
        "一、本谱按世系分卷，自始祖而下，依次排列。",
        "二、族人以辈分排序，同辈按年齿长幼为序。",
        "三、已故者注明生殁年，在世者仅注生年。",
        "四、女性配偶入谱，注明姓氏与娘家。",
        "五、名讳字第皆遵祖训，子孙不得擅改。",
        "六、本谱每三十年续修一次，由族长主持。",
    ]
    for r in rules:
        story.append(Paragraph(r, body_style))

    story.append(PageBreak())

    # === 世系表（按辈分）===
    story.append(Paragraph("世 系 表", chapter_style))
    story.append(Paragraph("一、始祖至今，源流备述", section_style))

    gen_members = {}
    for m in members:
        gen = m.generation or 1
        gen_members.setdefault(gen, []).append(m)
    for g in gen_members:
        gen_members[g].sort(key=lambda x: (x.birth_date or '', x.name))

    for gen in sorted(gen_members.keys()):
        story.append(Paragraph(f"第 {gen} 世", section_style))
        rows = [['姓名', '性别', '字号', '生年', '殁年', '备考']]
        for m in gen_members[gen]:
            rows.append([
                m.name,
                {'male': '男', 'female': '女'}.get(m.gender, ''),
                m.generation_name or '—',
                (m.birth_date or '—').replace('-', '年', 1).replace('-', '月') + ('日' if m.birth_date and m.birth_date.count('-') == 2 else ''),
                ((m.death_date or '').replace('-', '年', 1).replace('-', '月') + '日') if m.death_date else '—',
                m.bio[:20] if m.bio else '',
            ])
        if len(rows) > 1:
            t = Table(rows, colWidths=[2.2*cm, 1.2*cm, 2.5*cm, 2.5*cm, 2.5*cm, 3.5*cm])
            t.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, 0), FONT_NAME_BOLD),
                ('FONTNAME', (0, 1), (-1, -1), FONT_NAME),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('TEXTCOLOR', (0, 0), (-1, -1), _GUZHI_DARK),
                ('BACKGROUND', (0, 0), (-1, 0), _GUZHI_GOLD),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.4, _GUZHI_DARK),
                ('BACKGROUND', (0, 1), (-1, -1), _GUZHI_BROWN),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_GUZHI_BROWN, colors.HexColor('#ede0c8')]),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(t)
        story.append(Spacer(1, 0.2*cm))

    story.append(PageBreak())

    # === 跋文 ===
    story.append(Paragraph("跋", chapter_style))
    afterword = (
        "家之有谱，俾后人知木本水源，敦亲睦族也。"
        "是谱也，自始祖讫于今兹，凡若干世，族人若干口，"
        "生殁嫁娶，咸得其详。"
    )
    afterword += (
        "\n\n余少时，见族中长老手持残谱，喟然叹曰："
        "「此吾家之宝也，子孙其永宝之。」言犹在耳，"
        "而长老已逝。今也距其所言，又若干年矣。"
    )
    afterword += (
        "\n\n戊辰之春，族人聚而议修谱事，"
        "奔走于海内外，稽核于档案库，"
        "历时数月，稿凡三易，始付剞劂。"
        "虽不敢谓无遗漏，然心力已尽于是矣。"
    )
    afterword += (
        "\n\n后之览者，倘有阙遗，惠予补苴，"
        "则幸甚。是为跋。"
    )
    for para in afterword.split('\n\n'):
        story.append(Paragraph(para, body_style))

    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"岁在戊辰  仲春  后人敬识", body_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(_seal_table('印'))

    story.append(PageBreak())

    # === 收卷信息 ===
    story.append(Paragraph("收卷信息", chapter_style))
    info = [
        f"族谱名称：{(family.surname or '')}氏族谱",
        f"建祠年代：戊辰年（公元 {datetime.now().year} 年）",
        f"族人总数：{len(members)} 人",
        f"已传世次：{len(gen_members)} 代",
        f"编修完成：{datetime.now().strftime('%Y 年 %m 月 %d 日')}",
        "",
        "愿家族昌盛，子孙兴旺。",
    ]
    for line in info:
        story.append(Paragraph(line, body_style))

    doc.build(story, onFirstPage=_on_page, onLaterPages=_on_page)
    buffer.seek(0)
    return buffer.getvalue()