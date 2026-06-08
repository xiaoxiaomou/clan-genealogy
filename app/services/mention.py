"""@提及 解析 + 通知服务

支持的提及语法：
  @张三      （按 display_name 匹配，优先精确匹配）
  @admin     （按 username 匹配）
  @admin,@张三  （多个，逗号或空格分隔）

匹配范围：本家族用户（FamilyMember.family_id == 目标家族）。
"""
import re
from typing import List, Tuple
from app import db
from app.models.user import User
from app.models.family import FamilyMember
from app.models.notification import Notification

MENTION_RE = re.compile(r'@([一-龥A-Za-z0-9_]{1,30})')


def parse_mentions(text: str) -> List[str]:
    """提取所有被提及的用户名/显示名（去重，按出现顺序）"""
    if not text:
        return []
    seen = set()
    out = []
    for m in MENTION_RE.finditer(text):
        name = m.group(1)
        if name and name not in seen:
            seen.add(name)
            out.append(name)
    return out


def resolve_mentions(family_id: int, mentions: List[str]) -> List[User]:
    """把提及的 username/display_name 解析为 User 列表，限定在本家族成员内。"""
    if not mentions:
        return []
    family_user_ids = [
        fm.user_id
        for fm in FamilyMember.query.filter_by(family_id=family_id).all()
    ]
    if not family_user_ids:
        return []
    users = User.query.filter(User.id.in_(family_user_ids)).all()

    matched: List[User] = []
    seen_ids = set()
    for name in mentions:
        # 优先 username 完全匹配，其次 display_name
        u = next((x for x in users if x.username == name), None)
        if not u:
            u = next((x for x in users if (x.display_name or '').strip() == name), None)
        if not u:
            # 模糊匹配（display_name 包含 name）
            u = next((x for x in users if name in (x.display_name or '')), None)
        if u and u.id not in seen_ids:
            matched.append(u)
            seen_ids.add(u.id)
    return matched


def notify_mentions(family_id: int, post_id: int, comment_id: int | None,
                     mentioned: List[User], from_user_id: int,
                     source_kind: str = 'post'):
    """给被提及者创建 Notification"""
    if not mentioned:
        return
    for u in mentioned:
        if u.id == from_user_id:
            continue
        n = Notification(
            user_id=u.id,
            family_id=family_id,
            type='mention',
            title=f'有人在{source_kind}中@了你',
            content=f'你被提及了，查看{source_kind}内容。',
            related_post_id=post_id,
        )
        db.session.add(n)


def notify_comment_to_post_author(family_id: int, post_id: int, post_author_id: int,
                                    commenter_id: int, comment_preview: str):
    """评论时通知帖子作者"""
    if post_author_id == commenter_id:
        return
    n = Notification(
        user_id=post_author_id,
        family_id=family_id,
        type='comment',
        title='有人评论了你的帖子',
        content=comment_preview[:100],
        related_post_id=post_id,
    )
    db.session.add(n)
