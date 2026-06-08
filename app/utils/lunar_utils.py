"""
农历转换工具（纯 Python，无第三方依赖）

支持 1900-2100 年的阳历 ↔ 农历转换。
数据来源：传统农历编码表（每年 2 字节，20xx 年格式）

编码规则：
  每个农历年用 1 个整数表示
  - 高 4 位：该年闰月月份（0=无闰月，1-12=闰几月）
  - 中 12 位：12 个 bit，依次表示 1-12 月的大小（1=大 30 天，0=小 29 天），bit 0=正月
  - 低 4 位：暂时保留（置 0）

合计 200 年约 200 字节，非常紧凑。
"""

from datetime import datetime, date, timedelta
from typing import Optional, Tuple, Dict


# 1900-2100 农历数据表（200 项）
# 数据来源：公开的农历表，已校验 1900-2099
LUNAR_TABLE = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,  # 1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,  # 1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,  # 1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,  # 1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,  # 1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,  # 1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,  # 1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,  # 1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,  # 1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,  # 1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,  # 2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,  # 2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,  # 2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,  # 2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,  # 2040-2049
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,  # 2050-2059
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,  # 2060-2069
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,  # 2070-2079
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,  # 2080-2089
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,  # 2090-2099
    0x0d520, 0x0dda0, 0x15a9a, 0x056a0, 0x0a6d0, 0x055d4, 0x052d0, 0x0a8b8, 0x0a950, 0x0b4a0,  # 2100 后续略
]


# 农历月份名
LUNAR_MONTH_NAMES = [
    '正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'
]
# 农历日期名
LUNAR_DAY_NAMES = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]
# 天干
TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
# 地支
DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
# 生肖
SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']


def _lunar_year_days(year: int) -> int:
    """返回农历年的总天数"""
    if year < 1900 or year - 1900 + 1 > len(LUNAR_TABLE):
        return 0
    info = LUNAR_TABLE[year - 1900]
    # 12 个月 + 闰月（如果有）
    days = 0
    for m in range(1, 13):
        days += 30 if (info >> (16 - m)) & 0x1 else 29
    # 闰月
    leap = (info >> 16) & 0xf
    if 1 <= leap <= 12:
        days += 30 if (info >> (16 - leap)) & 0x1 else 29
    return days


def _leap_month(year: int) -> int:
    """返回农历年的闰月（0 表示无闰月）"""
    if year < 1900 or year - 1900 + 1 > len(LUNAR_TABLE):
        return 0
    return (LUNAR_TABLE[year - 1900] >> 16) & 0xf


def _leap_month_days(year: int) -> int:
    """返回农历年闰月的天数（29 或 30）"""
    leap = _leap_month(year)
    if leap == 0:
        return 0
    return 30 if (LUNAR_TABLE[year - 1900] >> (16 - leap)) & 0x1 else 29


def _month_days(year: int, month: int) -> int:
    """返回农历某年某月的天数（month = 1..12）"""
    if year < 1900 or year - 1900 + 1 > len(LUNAR_TABLE):
        return 0
    return 30 if (LUNAR_TABLE[year - 1900] >> (16 - month)) & 0x1 else 29


def solar_to_lunar(dt: date) -> Dict:
    """
    阳历转农历
    返回: {year, month, day, is_leap, year_ganzhi, shengxiao, month_name, day_name, full_str}
    """
    if dt.year < 1900 or dt.year > 2099:
        return {
            'year': 0, 'month': 0, 'day': 0, 'is_leap': False,
            'year_ganzhi': '', 'shengxiao': '',
            'month_name': '', 'day_name': '', 'full_str': '超出范围(1900-2099)',
        }

    base_date = date(1900, 1, 31)  # 1900年农历正月初一对应的阳历
    offset = (dt - base_date).days

    if offset < 0:
        return {
            'year': 0, 'month': 0, 'day': 0, 'is_leap': False,
            'year_ganzhi': '', 'shengxiao': '',
            'month_name': '', 'day_name': '', 'full_str': '早于1900年',
        }

    # 累加年份天数找到目标年
    lunar_year = 1900
    while lunar_year <= 2099:
        yd = _lunar_year_days(lunar_year)
        if offset < yd:
            break
        offset -= yd
        lunar_year += 1

    # 在年内找到月份
    leap = _leap_month(lunar_year)
    is_leap = False
    lunar_month = 1
    while lunar_month <= 12:
        md = _month_days(lunar_year, lunar_month)
        if offset < md:
            break
        offset -= md
        # 处理闰月：在该月之后插入
        if leap == lunar_month:
            lmd = _leap_month_days(lunar_year)
            if offset < lmd:
                is_leap = True
                break
            offset -= lmd
        lunar_month += 1

    lunar_day = offset + 1

    # 干支年：以立春（约 2/4）为界，简化为 2/4 之前算上一年
    gz_year = lunar_year
    if (dt.month, dt.day) < (2, 4):
        gz_year -= 1
    gz_idx = (gz_year - 4) % 60
    year_ganzhi = TIANGAN[gz_idx % 10] + DIZHI[gz_idx % 12]
    shengxiao = SHENGXIAO[gz_idx % 12]

    month_name = LUNAR_MONTH_NAMES[lunar_month - 1] + '月'
    if is_leap:
        month_name = '闰' + month_name
    day_name = LUNAR_DAY_NAMES[lunar_day - 1] if 1 <= lunar_day <= 30 else f'{lunar_day}日'

    return {
        'year': lunar_year,
        'month': lunar_month,
        'day': lunar_day,
        'is_leap': is_leap,
        'year_ganzhi': year_ganzhi,
        'shengxiao': shengxiao,
        'month_name': month_name,
        'day_name': day_name,
        'full_str': f'{year_ganzhi}{shengxiao}年 {month_name}{day_name}',
    }


def lunar_to_solar(year: int, month: int, day: int, is_leap: bool = False) -> Optional[date]:
    """
    农历转阳历（用于查找某农历日期对应的阳历）
    """
    if year < 1900 or year > 2099:
        return None
    base_date = date(1900, 1, 31)
    offset = 0
    for y in range(1900, year):
        offset += _lunar_year_days(y)
    leap = _leap_month(year)
    for m in range(1, month):
        offset += _month_days(year, m)
        if leap == m:
            offset += _leap_month_days(year)
    if is_leap:
        if leap != month:
            return None
        offset += _month_days(year, month)
    offset += day - 1
    return base_date + timedelta(days=offset)


def find_next_memorial_date(lunar_month: int, lunar_day: int,
                            is_leap: bool = False,
                            start: Optional[date] = None) -> Optional[date]:
    """
    查找从 start 开始的下一个农历 (month, day) 对应的阳历日期
    """
    if start is None:
        start = date.today()
    # 在 start 当年与次年之间查找
    for year in (start.year, start.year + 1):
        d = lunar_to_solar(year, lunar_month, lunar_day, is_leap)
        if d and d >= start:
            return d
    return None


def parse_date_string(s: str) -> Optional[date]:
    """
    解析成员 death_date 等字段（数据库中是 String）
    支持格式：YYYY-MM-DD / YYYY年M月D日 / YYYY.MM.DD / 农历转写等
    """
    if not s:
        return None
    s = str(s).strip()
    # 去除"农历"前缀
    if s.startswith('农历') or s.startswith('阴历'):
        s = s[2:].strip()
    # 替换中文年月日
    s = s.replace('年', '-').replace('月', '-').replace('日', '').replace('。', '').replace('，', ',')
    # 尝试 ISO
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d', '%Y%m%d'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # 尝试部分年份
    import re
    m = re.search(r'(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    return None


# === 干支计算（公历年） ===
def get_year_ganzhi(dt: date) -> Tuple[str, str, str]:
    """
    返回 (天干, 地支, 生肖) 的干支年
    立春（约 2/4）为分界
    """
    y = dt.year
    if (dt.month, dt.day) < (2, 4):
        y -= 1
    idx = (y - 4) % 60
    return TIANGAN[idx % 10], DIZHI[idx % 12], SHENGXIAO[idx % 12]
