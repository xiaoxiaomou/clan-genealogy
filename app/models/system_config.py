"""
系统配置模型 - 存储平台所有可配置项
"""
from datetime import datetime
from app import db


class SystemConfig(db.Model):
    """系统配置表"""
    __tablename__ = 'system_configs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category = db.Column(db.String(50), nullable=False, index=True)  # user/family/content/notification/ui
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=True)
    value_type = db.Column(db.String(20), nullable=False, default='string')  # boolean/number/string/json
    label = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    min_value = db.Column(db.Integer, nullable=True)
    max_value = db.Column(db.Integer, nullable=True)
    options = db.Column(db.Text, nullable=True)  # JSON array for dropdown options
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_public = db.Column(db.Boolean, default=False, nullable=False)  # 前端可读
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'category': self.category,
            'key': self.key,
            'value': self.value,
            'value_type': self.value_type,
            'label': self.label,
            'description': self.description,
            'min_value': self.min_value,
            'max_value': self.max_value,
            'options': self.options,
            'is_active': self.is_active,
            'is_public': self.is_public,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    @staticmethod
    def get_value(key, default=None):
        """获取配置值（带默认值）"""
        config = SystemConfig.query.filter_by(key=key, is_active=True).first()
        if config is None:
            return default
        return SystemConfig.parse_value(config.value, config.value_type, default)

    @staticmethod
    def parse_value(value, value_type, default=None):
        """根据类型解析配置值"""
        if value is None:
            return default

        if value_type == 'boolean':
            return value.lower() in ('true', '1', 'yes') if isinstance(value, str) else bool(value)
        elif value_type == 'number':
            try:
                return int(value)
            except (ValueError, TypeError):
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return default
        elif value_type == 'json':
            import json
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return default
        else:
            return value

    def __repr__(self):
        return f'<SystemConfig {self.key}={self.value}>'
