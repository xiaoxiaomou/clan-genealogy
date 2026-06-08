"""审计日志工具"""
from app import db
from app.models.audit_log import AuditLog


def log_action(
    user_id: int,
    action: str,
    entity_type: str,
    family_id: int = None,
    details: dict = None,
    entity_id: int = None,
    ip_address: str = None,
    description: str = None,
) -> AuditLog:
    """记录一条审计日志

    Args:
        user_id: 操作用户ID
        action: 操作类型（create/update/delete/import/export 等）
        entity_type: 实体类型（member/family/event/...）
        family_id: 关联族谱ID（可选）
        details: 额外详情 dict（可选）
        entity_id: 关联实体ID（可选）
        ip_address: IP 地址（可选）
        description: 描述（可选）
    """
    log = AuditLog(
        family_id=family_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description or (str(details) if details else None),
        ip_address=ip_address,
    )
    db.session.add(log)
    return log
