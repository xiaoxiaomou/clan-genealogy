"""
配置管理服务 - 系统配置的业务逻辑层
"""
import json
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from flask import current_app

from app import db
from app.models.system_config import SystemConfig
from app.models.audit_log import AuditLog


class ConfigService:
    """配置管理服务类"""

    # 配置分类
    CATEGORIES = ['user', 'family', 'content', 'notification', 'ui']

    # 预置配置项定义
    DEFAULT_CONFIGS = [
        # ========== 用户管理 (user) ==========
        {'category': 'user', 'key': 'user.allow_register', 'value': 'true', 'value_type': 'boolean',
         'label': '允许用户注册', 'description': '是否允许新用户自主注册', 'is_public': True},
        {'category': 'user', 'key': 'user.require_email_verify', 'value': 'false', 'value_type': 'boolean',
         'label': '注册需邮箱验证', 'description': '新用户注册需要邮箱验证才能激活', 'is_public': True},
        {'category': 'user', 'key': 'user.auto_approve', 'value': 'false', 'value_type': 'boolean',
         'label': '自动审批注册', 'description': '新用户注册自动审批通过，无需管理员审核', 'is_public': True},
        {'category': 'user', 'key': 'user.max_families_per_user', 'value': '5', 'value_type': 'number',
         'label': '单用户最大族谱数', 'description': '单个用户最多能创建的族谱数量', 'min_value': 1, 'max_value': 100, 'is_public': True},
        {'category': 'user', 'key': 'user.session_timeout', 'value': '3600', 'value_type': 'number',
         'label': '会话超时', 'description': '用户无操作后会话超时时间（秒）', 'min_value': 300, 'max_value': 86400},
        {'category': 'user', 'key': 'user.min_password_length', 'value': '6', 'value_type': 'number',
         'label': '最小密码长度', 'description': '密码最小字符数', 'min_value': 6, 'max_value': 32, 'is_public': True},
        {'category': 'user', 'key': 'user.require_strong_password', 'value': 'false', 'value_type': 'boolean',
         'label': '强制强密码', 'description': '要求密码包含大小写字母、数字和特殊字符', 'is_public': True},
        {'category': 'user', 'key': 'user.allow_oauth', 'value': 'false', 'value_type': 'boolean',
         'label': '允许OAuth登录', 'description': '启用第三方OAuth登录（微信、QQ等）', 'is_public': True},
        {'category': 'user', 'key': 'user.default_role', 'value': 'viewer', 'value_type': 'string',
         'label': '新用户默认角色', 'description': '新用户加入族谱时的默认角色', 'options': '["viewer","editor"]', 'is_public': True},
        {'category': 'user', 'key': 'user.audit_login', 'value': 'true', 'value_type': 'boolean',
         'label': '记录登录日志', 'description': '记录所有用户登录行为到审计日志'},
        {'category': 'user', 'key': 'user.max_login_attempts', 'value': '5', 'value_type': 'number',
         'label': '最大登录尝试', 'description': '密码错误后最大允许尝试次数', 'min_value': 3, 'max_value': 10},
        {'category': 'user', 'key': 'user.lockout_duration', 'value': '300', 'value_type': 'number',
         'label': '锁定时长', 'description': '登录失败过多后账户锁定时间（秒）', 'min_value': 60, 'max_value': 3600},

        # ========== 族谱功能 (family) ==========
        {'category': 'family', 'key': 'family.max_members', 'value': '10000', 'value_type': 'number',
         'label': '族谱最大成员数', 'description': '单个族谱最大允许的成员数量', 'min_value': 100, 'max_value': 100000},
        {'category': 'family', 'key': 'family.allow_import', 'value': 'true', 'value_type': 'boolean',
         'label': '允许数据导入', 'description': '是否允许导入JSON/CSV数据', 'is_public': True},
        {'category': 'family', 'key': 'family.allow_export', 'value': 'true', 'value_type': 'boolean',
         'label': '允许数据导出', 'description': '是否允许导出族谱数据', 'is_public': True},
        {'category': 'family', 'key': 'family.allow_gedcom', 'value': 'true', 'value_type': 'boolean',
         'label': '允许GEDCOM格式', 'description': '是否允许导入导出GEDCOM标准格式', 'is_public': True},
        {'category': 'family', 'key': 'family.default_privacy', 'value': 'private', 'value_type': 'string',
         'label': '默认隐私设置', 'description': '新建族谱的默认隐私设置', 'options': '["private","public","invite"]', 'is_public': True},
        {'category': 'family', 'key': 'family.allow_public_view', 'value': 'false', 'value_type': 'boolean',
         'label': '允许公开浏览', 'description': '公开族谱是否允许游客浏览', 'is_public': True},
        {'category': 'family', 'key': 'family.enable_kinship', 'value': 'true', 'value_type': 'boolean',
         'label': '启用亲属计算', 'description': '启用亲属关系计算功能', 'is_public': True},
        {'category': 'family', 'key': 'family.enable_wufu', 'value': 'true', 'value_type': 'boolean',
         'label': '启用五服图', 'description': '启用传统五服关系可视化功能', 'is_public': True},
        {'category': 'family', 'key': 'family.enable_graph_view', 'value': 'true', 'value_type': 'boolean',
         'label': '启用图谱视图', 'description': '启用网状图谱视图', 'is_public': True},
        {'category': 'family', 'key': 'family.enable_tree_view', 'value': 'true', 'value_type': 'boolean',
         'label': '启用树形视图', 'description': '启用传统树形结构视图', 'is_public': True},
        {'category': 'family', 'key': 'family.enable_fan_view', 'value': 'true', 'value_type': 'boolean',
         'label': '启用扇形视图', 'description': '启用扇形分布视图', 'is_public': True},
        {'category': 'family', 'key': 'family.auto_save_interval', 'value': '30', 'value_type': 'number',
         'label': '自动保存间隔', 'description': '编辑器自动保存间隔（秒）', 'min_value': 10, 'max_value': 300},

        # ========== 家族内容 (content) ==========
        {'category': 'content', 'key': 'content.max_events', 'value': '1000', 'value_type': 'number',
         'label': '最大事件数', 'description': '单个族谱最大事件记录数', 'min_value': 10, 'max_value': 10000},
        {'category': 'content', 'key': 'content.max_albums', 'value': '50', 'value_type': 'number',
         'label': '最大相册数', 'description': '单个族谱最大相册数量', 'min_value': 1, 'max_value': 500},
        {'category': 'content', 'key': 'content.max_photos', 'value': '5000', 'value_type': 'number',
         'label': '最大照片数', 'description': '单个相册最大照片数量', 'min_value': 10, 'max_value': 50000},
        {'category': 'content', 'key': 'content.max_photo_size', 'value': '10', 'value_type': 'number',
         'label': '单张照片大小限制', 'description': '上传照片大小限制（MB）', 'min_value': 1, 'max_value': 100},
        {'category': 'content', 'key': 'content.max_branch_depth', 'value': '10', 'value_type': 'number',
         'label': '最大分支深度', 'description': '家族分支树的最大深度', 'min_value': 2, 'max_value': 20},
        {'category': 'content', 'key': 'content.allow_branch', 'value': 'true', 'value_type': 'boolean',
         'label': '允许分支管理', 'description': '是否启用家族分支管理功能', 'is_public': True},
        {'category': 'content', 'key': 'content.allow_event', 'value': 'true', 'value_type': 'boolean',
         'label': '允许家族事件', 'description': '是否启用家族事件记录功能', 'is_public': True},
        {'category': 'content', 'key': 'content.allow_album', 'value': 'true', 'value_type': 'boolean',
         'label': '允许家族相册', 'description': '是否启用家族相册功能', 'is_public': True},
        {'category': 'content', 'key': 'content.allow_generation', 'value': 'true', 'value_type': 'boolean',
         'label': '允许辈分字派', 'description': '是否启用辈分字派管理功能', 'is_public': True},
        {'category': 'content', 'key': 'content.photo_thumbnail_size', 'value': '200', 'value_type': 'number',
         'label': '缩略图尺寸', 'description': '照片缩略图边长（像素）', 'min_value': 100, 'max_value': 500},
        {'category': 'content', 'key': 'content.enable_comments', 'value': 'false', 'value_type': 'boolean',
         'label': '允许评论', 'description': '是否启用成员/事件评论功能'},
        {'category': 'content', 'key': 'content.max_description_length', 'value': '5000', 'value_type': 'number',
         'label': '最大描述长度', 'description': '成员/事件描述的最大字符数', 'min_value': 100, 'max_value': 50000},
        {'category': 'content', 'key': 'content.enable_tags', 'value': 'false', 'value_type': 'boolean',
         'label': '允许标签', 'description': '是否启用标签功能'},
        {'category': 'content', 'key': 'content.auto_generation_naming', 'value': 'false', 'value_type': 'boolean',
         'label': '自动代际命名', 'description': '是否根据辈分自动建议名字用字'},

        # ========== 通知系统 (notification) ==========
        {'category': 'notification', 'key': 'notification.enable_email', 'value': 'true', 'value_type': 'boolean',
         'label': '启用邮件通知', 'description': '是否启用电子邮件通知功能'},
        {'category': 'notification', 'key': 'notification.email_from', 'value': 'noreply@family.com', 'value_type': 'string',
         'label': '发件人邮箱', 'description': '系统邮件的发件人地址'},
        {'category': 'notification', 'key': 'notification.notify_on_join', 'value': 'true', 'value_type': 'boolean',
         'label': '新成员加入通知', 'description': '新成员加入族谱时发送通知', 'is_public': True},
        {'category': 'notification', 'key': 'notification.notify_on_approve', 'value': 'true', 'value_type': 'boolean',
         'label': '审批结果通知', 'description': '用户注册审批结果发送通知', 'is_public': True},
        {'category': 'notification', 'key': 'notification.notify_on_edit', 'value': 'false', 'value_type': 'boolean',
         'label': '内容编辑通知', 'description': '重要内容被编辑时发送通知'},
        {'category': 'notification', 'key': 'notification.notify_on_delete', 'value': 'true', 'value_type': 'boolean',
         'label': '删除操作通知', 'description': '重要内容被删除时发送通知'},
        {'category': 'notification', 'key': 'notification.notify_digest', 'value': 'false', 'value_type': 'boolean',
         'label': '日报/周报摘要', 'description': '定期发送活动摘要邮件'},
        {'category': 'notification', 'key': 'notification.digest_frequency', 'value': 'weekly', 'value_type': 'string',
         'label': '摘要频率', 'description': '摘要邮件发送频率', 'options': '["daily","weekly","monthly"]'},
        {'category': 'notification', 'key': 'notification.max_per_day', 'value': '100', 'value_type': 'number',
         'label': '每日最大通知数', 'description': '单个用户每日最大通知数', 'min_value': 10, 'max_value': 1000},
        {'category': 'notification', 'key': 'notification.retention_days', 'value': '90', 'value_type': 'number',
         'label': '通知保留天数', 'description': '通知记录保留天数', 'min_value': 7, 'max_value': 365},

        # ========== 界面定制 (ui) ==========
        {'category': 'ui', 'key': 'ui.site_name', 'value': '族谱管理平台', 'value_type': 'string',
         'label': '网站名称', 'description': '显示在浏览器标题和首页', 'is_public': True},
        {'category': 'ui', 'key': 'ui.site_logo', 'value': '', 'value_type': 'string',
         'label': '网站Logo', 'description': '网站Logo图片URL'},
        {'category': 'ui', 'key': 'ui.primary_color', 'value': '#1976d2', 'value_type': 'string',
         'label': '主色调', 'description': '系统主色调（HEX格式）'},
        {'category': 'ui', 'key': 'ui.secondary_color', 'value': '#424242', 'value_type': 'string',
         'label': '次要色调', 'description': '系统次要色调（HEX格式）'},
        {'category': 'ui', 'key': 'ui.homepage_welcome', 'value': '', 'value_type': 'string',
         'label': '首页欢迎语', 'description': '首页显示的欢迎文本', 'is_public': True},
        {'category': 'ui', 'key': 'ui.footer_text', 'value': '', 'value_type': 'string',
         'label': '页脚文本', 'description': '页面底部显示的文本', 'is_public': True},
        {'category': 'ui', 'key': 'ui.default_language', 'value': 'zh-CN', 'value_type': 'string',
         'label': '默认语言', 'description': '系统默认语言', 'options': '["zh-CN","en-US"]', 'is_public': True},
        {'category': 'ui', 'key': 'ui.allow_theme_switch', 'value': 'true', 'value_type': 'boolean',
         'label': '允许切换主题', 'description': '是否允许用户切换浅色/深色主题', 'is_public': True},
        {'category': 'ui', 'key': 'ui.default_theme', 'value': 'light', 'value_type': 'string',
         'label': '默认主题', 'description': '默认界面主题', 'options': '["light","dark","auto"]', 'is_public': True},
        {'category': 'ui', 'key': 'ui.show_avatar', 'value': 'true', 'value_type': 'boolean',
         'label': '显示头像', 'description': '是否在界面显示用户头像', 'is_public': True},
        {'category': 'ui', 'key': 'ui.show_statistics', 'value': 'true', 'value_type': 'boolean',
         'label': '显示统计信息', 'description': '是否在首页显示族谱统计信息', 'is_public': True},
        {'category': 'ui', 'key': 'ui.custom_css', 'value': '', 'value_type': 'string',
         'label': '自定义CSS', 'description': '自定义CSS样式（高级）'},
    ]

    @classmethod
    def initialize_defaults(cls):
        """初始化默认配置（仅插入不存在的配置项）"""
        for config_data in cls.DEFAULT_CONFIGS:
            existing = SystemConfig.query.filter_by(key=config_data['key']).first()
            if not existing:
                config = SystemConfig(**config_data)
                db.session.add(config)
        db.session.commit()

    @classmethod
    def get_all_configs(cls) -> List[Dict[str, Any]]:
        """获取所有配置"""
        configs = SystemConfig.query.order_by(
            SystemConfig.category, SystemConfig.sort_order
        ).all()
        return [c.to_dict() for c in configs]

    @classmethod
    def get_configs_by_category(cls, category: str) -> List[Dict[str, Any]]:
        """按分类获取配置"""
        configs = SystemConfig.query.filter_by(
            category=category
        ).order_by(SystemConfig.sort_order).all()
        return [c.to_dict() for c in configs]

    @classmethod
    def get_config_by_key(cls, key: str) -> Optional[Dict[str, Any]]:
        """获取单个配置"""
        config = SystemConfig.query.filter_by(key=key).first()
        return config.to_dict() if config else None

    @classmethod
    def get_public_configs(cls) -> Dict[str, Any]:
        """获取公开配置（前端可读）"""
        configs = SystemConfig.query.filter_by(is_public=True, is_active=True).all()
        result = {}
        for c in configs:
            result[c.key] = SystemConfig.parse_value(c.value, c.value_type)
        return result

    @classmethod
    def update_config(cls, key: str, value: str, operator_id: int,
                      reason: str = None, ip_address: str = None) -> Tuple[bool, str, Dict[str, Any]]:
        """更新单个配置"""
        config = SystemConfig.query.filter_by(key=key).first()
        if not config:
            return False, f"配置项 {key} 不存在", {}

        old_value = config.value

        # 类型验证
        if config.value_type == 'number':
            try:
                float(value)
            except (ValueError, TypeError):
                return False, "值必须是有效数字", {}
            if config.min_value is not None and float(value) < config.min_value:
                return False, f"值不能小于 {config.min_value}", {}
            if config.max_value is not None and float(value) > config.max_value:
                return False, f"值不能大于 {config.max_value}", {}

        elif config.value_type == 'boolean':
            if value.lower() not in ('true', 'false', '1', '0', 'yes', 'no'):
                return False, "布尔值必须是 true/false", {}

        config.value = value
        config.updated_at = datetime.utcnow()

        # 记录审计日志
        cls._log_change(
            user_id=operator_id,
            action='update',
            target_type='config',
            target_id=config.id,
            config_key=key,
            old_value=old_value,
            new_value=value,
            reason=reason,
            ip_address=ip_address
        )

        db.session.commit()
        return True, "更新成功", config.to_dict()

    @classmethod
    def batch_update_configs(cls, updates: List[Dict[str, str]], operator_id: int,
                             reason: str = None, ip_address: str = None) -> Tuple[bool, str, List[Dict[str, Any]]]:
        """批量更新配置"""
        results = []
        errors = []

        for item in updates:
            key = item.get('key')
            value = item.get('value')
            if not key:
                errors.append("缺少配置键")
                continue

            success, msg, result = cls.update_config(key, value, operator_id, reason, ip_address)
            if success:
                results.append(result)
            else:
                errors.append(f"{key}: {msg}")

        if errors:
            return False, "; ".join(errors), results
        return True, f"成功更新 {len(results)} 项配置", results

    @classmethod
    def reset_to_defaults(cls, category: str = None, operator_id: int = 0) -> Tuple[bool, str]:
        """重置配置到默认值"""
        query = SystemConfig.query
        if category:
            query = query.filter_by(category=category)

        configs = query.all()
        for config in configs:
            # 找到默认配置
            for default in cls.DEFAULT_CONFIGS:
                if default['key'] == config.key:
                    old_value = config.value
                    config.value = default['value']
                    config.updated_at = datetime.utcnow()

                    cls._log_change(
                        user_id=operator_id,
                        action='reset',
                        target_type='config',
                        target_id=config.id,
                        config_key=config.key,
                        old_value=old_value,
                        new_value=default['value']
                    )
                    break

        db.session.commit()
        return True, f"已重置 {len(configs)} 项配置"

    @classmethod
    def _log_change(cls, user_id: int, action: str, target_type: str, target_id: int,
                    config_key: str = None, old_value: str = None, new_value: str = None,
                    reason: str = None, ip_address: str = None):
        """记录配置变更日志"""
        log = AuditLog(
            user_id=user_id,
            action=f'config_{action}',
            target_type=target_type,
            entity_id=target_id,
            entity_type=target_type,
            description=reason or f"修改配置 {config_key}",
            ip_address=ip_address
        )
        db.session.add(log)
