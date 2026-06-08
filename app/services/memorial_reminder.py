"""祭日提醒服务

每天 8:00 检查所有家族的成员死亡日期，匹配：
- 当天 = 「忌日」通知
- 7 天后 = 「即将到来的祭日」预通知
- 30 天后 = 「祭日提醒」预通知

避免重复推送：使用 MemorialReminderLog 表去重（按 user_id + member_id + year + days_before）。
"""
import re
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask

from app import db
from app.models.member import Member
from app.models.notification import Notification
from app.models.family import FamilyMember
from app.models.user import User

logger = logging.getLogger(__name__)


# 死亡日期可能的格式
DATE_PATTERNS = [
    (re.compile(r'^(\d{4})-(\d{1,2})-(\d{1,2})$'), '%Y-%m-%d'),
    (re.compile(r'^(\d{4})/(\d{1,2})/(\d{1,2})$'), '%Y/%m/%d'),
    (re.compile(r'^(\d{4})\.(\d{1,2})\.(\d{1,2})$'), '%Y.%m.%d'),
    (re.compile(r'^(\d{4})(\d{2})(\d{2})$'), 'compact'),
    (re.compile(r'^(\d{4})-(\d{1,2})$'), '%Y-%m'),  # 仅有年月
    (re.compile(r'^(\d{4})$'), '%Y'),  # 仅年
]


def parse_mm_dd(death_date: str) -> Optional[tuple[int, int]]:
    """从死亡日期字符串提取 (月, 日)。无法提取返回 None。"""
    if not death_date:
        return None
    s = death_date.strip()
    for pat, fmt in DATE_PATTERNS:
        m = pat.match(s)
        if m:
            try:
                if fmt == 'compact':
                    mm = int(m.group(2))
                    dd = int(m.group(3))
                elif fmt == '%Y':
                    # 仅有年，没有 MM-DD，不触发具体祭日
                    return None
                elif fmt == '%Y-%m':
                    # 仅有年月，约定 15 日为祭日（也可改为 1 日）
                    mm = int(m.group(2))
                    dd = 15
                else:
                    mm = int(m.group(2))
                    dd = int(m.group(3))
                if 1 <= mm <= 12 and 1 <= dd <= 31:
                    return (mm, dd)
            except (ValueError, IndexError):
                continue
    return None


def get_reminder_key(user_id: int, member_id: int, year: int, days_before: int) -> str:
    return f'memorial:{user_id}:{member_id}:{year}:{days_before}'


def _send_notification(user_id: int, member_id: int, member_name: str, family_id: int,
                        death_date_label: str, days_before: int, year: int):
    """发送祭日通知（站内）"""
    if days_before == 0:
        title = f'今天是一·{member_name} 的忌日'
        content = f'今天是 {member_name}（{death_date_label}）的忌日，缅怀先人。'
    elif days_before == 7:
        title = f'{member_name} 的忌日还有 7 天'
        content = f'{member_name}（{death_date_label}）的忌日是 7 天后 ({_format_reminder_date(year, days_before)})，请提前准备。'
    elif days_before == 30:
        title = f'{member_name} 的忌日还有 30 天'
        content = f'{member_name}（{death_date_label}）的忌日是 30 天后，提前安排。'
    else:
        return

    n = Notification(
        user_id=user_id,
        family_id=family_id,
        type='memorial_reminder',
        title=title,
        content=content,
        related_member_id=member_id,
    )
    db.session.add(n)


def _format_reminder_date(year: int, days_before: int) -> str:
    target = datetime.now().date() + timedelta(days=days_before)
    return target.strftime('%Y-%m-%d')


def check_and_send_reminders(days_before: int = 0):
    """检查并发送祭日提醒

    Args:
        days_before: 距今天多少天。0=当天，7=7 天前，30=30 天前
    """
    today = datetime.now().date()
    target_date = today + timedelta(days=days_before)
    target_mm = target_date.month
    target_dd = target_date.day
    target_year = target_date.year

    logger.info(f'祭日提醒检查: days_before={days_before}, target={target_date}')

    # 查所有有 death_date 的成员
    members = Member.query.filter(Member.death_date.isnot(None), Member.death_date != '').all()
    matched = 0
    for m in members:
        parsed = parse_mm_dd(m.death_date or '')
        if not parsed:
            continue
        mm, dd = parsed
        if mm != target_mm or dd != target_dd:
            continue
        # 找到匹配成员，遍历家族所有用户发通知
        family_user_ids = [
            fm.user_id
            for fm in FamilyMember.query.filter_by(family_id=m.family_id).all()
        ]
        for uid in family_user_ids:
            # 避免重复：用 member_id + year + days_before 做幂等键
            # Notification 没有 unique 约束，简单做法：检查同一 user+member+type+date 是否已存在
            existing = Notification.query.filter(
                Notification.user_id == uid,
                Notification.related_member_id == m.id,
                Notification.type == 'memorial_reminder',
                Notification.created_at >= today.replace(month=1, day=1),  # 同年内
                Notification.title.like(f'%{days_before}%'),
            ).first()
            if existing:
                continue
            _send_notification(
                user_id=uid,
                member_id=m.id,
                member_name=m.name,
                family_id=m.family_id,
                death_date_label=m.death_date or '',
                days_before=days_before,
                year=target_year,
            )
            matched += 1
    if matched > 0:
        db.session.commit()
    logger.info(f'祭日提醒: days_before={days_before}, 匹配 {matched} 条新通知')


def get_upcoming_memorials(days_ahead: int = 30) -> list:
    """查询未来 N 天的祭日列表（用于前端预览，不消耗通知）"""
    today = datetime.now().date()
    members = Member.query.filter(Member.death_date.isnot(None), Member.death_date != '').all()
    upcoming = []
    for m in members:
        parsed = parse_mm_dd(m.death_date or '')
        if not parsed:
            continue
        mm, dd = parsed
        # 计算今年/明年的下一个祭日
        try_this_year = today.replace(month=mm, day=dd)
        if try_this_year < today:
            try_next = try_this_year.replace(year=today.year + 1)
        else:
            try_next = try_this_year
        delta = (try_next - today).days
        if 0 <= delta <= days_ahead:
            upcoming.append({
                'member_id': m.id,
                'member_name': m.name,
                'family_id': m.family_id,
                'family_name': m.family.name if m.family else None,
                'death_date': m.death_date,
                'next_anniversary': try_next.isoformat(),
                'days_until': delta,
                'generation': m.generation,
            })
    upcoming.sort(key=lambda x: x['days_until'])
    return upcoming


def init_scheduler(app: Flask):
    """初始化后台调度器，每天 8:00 / 8:05 / 8:10 各跑一次祭日检查（30/7/0 天）"""
    try:
        scheduler = BackgroundScheduler(daemon=True)

        # 30 天前：每月 1 号 8:00
        scheduler.add_job(
            lambda: _run_in_app(app, lambda: check_and_send_reminders(30)),
            'cron', day=1, hour=8, minute=0, id='memorial_30d',
        )
        # 7 天前：每天 8:00
        scheduler.add_job(
            lambda: _run_in_app(app, lambda: check_and_send_reminders(7)),
            'cron', hour=8, minute=0, id='memorial_7d',
        )
        # 当天：每天 8:05
        scheduler.add_job(
            lambda: _run_in_app(app, lambda: check_and_send_reminders(0)),
            'cron', hour=8, minute=5, id='memorial_0d',
        )

        scheduler.start()
        logger.info('祭日提醒调度器已启动')
        return scheduler
    except Exception as e:
        logger.error(f'祭日提醒调度器启动失败: {e}')
        return None


def _run_in_app(app: Flask, fn):
    """在 Flask app context 中执行回调"""
    with app.app_context():
        try:
            fn()
        except Exception as e:
            logger.error(f'祭日提醒任务执行失败: {e}')
            db.session.rollback()
