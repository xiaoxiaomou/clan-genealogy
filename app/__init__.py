import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()


def setup_logging(app):
    """配置日志系统"""
    log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    log_level = logging.DEBUG if app.debug else logging.INFO

    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'zupu.log'),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8',
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    ))

    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(
        '[%(levelname)s] %(message)s',
    ))

    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)

    # 第三方库的日志级别
    logging.getLogger('werkzeug').setLevel(logging.WARNING)


def create_app(config_name='default'):
    """应用工厂函数"""
    from app.config import config

    app = Flask(__name__)
    app.config.from_object(config[config_name])
    setup_logging(app)

    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)

    # CORS 白名单：从配置读取，不再使用 origins="*"
    cors_origins_raw = app.config.get('CORS_ORIGINS', '')
    cors_origins = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]
    if cors_origins:
        CORS(app, supports_credentials=True, origins=cors_origins)
    else:
        # 未配置时降级为不允许任何源（严格模式）
        app.logger.warning('CORS_ORIGINS is empty; CORS will block all cross-origin requests.')
        CORS(app, supports_credentials=True, origins=[])

    # 确保上传目录存在
    import os
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # 注册蓝图
    from app.routes.auth import auth_bp
    from app.routes.family import family_bp
    from app.routes.generation import generation_bp
    from app.routes.upload import upload_bp
    from app.routes.export import export_bp
    from app.routes.notification import notification_bp
    from app.routes.events import events_bp
    from app.routes.album import album_bp
    from app.routes.search import search_bp
    from app.routes.kinship import kinship_bp
    from app.routes.invitation import invitation_bp
    from app.routes.branch import branch_bp
    from app.routes.audit import audit_bp
    from app.routes.config import config_bp
    from app.routes.story import story_bp
    from app.routes.memorial import memorial_bp
    from app.routes.ocr import ocr_bp
    from app.routes.zibei import zibei_bp
    from app.routes.lineage import lineage_bp
    from app.routes.history import history_bp
    from app.routes.honor import honor_bp
    from app.routes.post import post_bp
    from app.routes.chat import chat_bp
    from app.routes.community import community_bp
    from app.routes.global_search import global_search_bp
    from app.routes.share import share_bp, public_share_bp
    from app.routes.memorial_reminder import memorial_reminder_bp
    from app.routes.ai import ai_bp
    from app.routes.family_merge import family_merge_bp
    from app.routes.member_history import member_history_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(family_bp, url_prefix='/api/family')
    app.register_blueprint(generation_bp, url_prefix='/api/family')
    app.register_blueprint(upload_bp, url_prefix='/api/upload')
    app.register_blueprint(export_bp, url_prefix='/api/export')
    app.register_blueprint(notification_bp, url_prefix='/api/notification')
    app.register_blueprint(events_bp, url_prefix='/api/family')
    app.register_blueprint(album_bp, url_prefix='/api/family')
    app.register_blueprint(search_bp, url_prefix='/api/family')
    app.register_blueprint(kinship_bp, url_prefix='/api/family')
    app.register_blueprint(invitation_bp, url_prefix='/api/family')
    app.register_blueprint(branch_bp, url_prefix='/api/family')
    app.register_blueprint(audit_bp, url_prefix='/api/family')
    app.register_blueprint(config_bp, url_prefix='/api')
    app.register_blueprint(story_bp, url_prefix='/api/family')
    app.register_blueprint(memorial_bp, url_prefix='/api/family')
    app.register_blueprint(ocr_bp, url_prefix='/api/family')
    app.register_blueprint(zibei_bp, url_prefix='/api/family')
    app.register_blueprint(lineage_bp, url_prefix='/api/family')
    app.register_blueprint(history_bp, url_prefix='/api/family')
    app.register_blueprint(honor_bp, url_prefix='/api/family')
    app.register_blueprint(post_bp, url_prefix='/api/family')
    app.register_blueprint(chat_bp, url_prefix='/api/family')
    app.register_blueprint(community_bp, url_prefix='/api/family')
    app.register_blueprint(global_search_bp, url_prefix='/api')
    app.register_blueprint(share_bp, url_prefix='/api/family')
    app.register_blueprint(public_share_bp, url_prefix='/api')
    app.register_blueprint(memorial_reminder_bp, url_prefix='/api/family')
    app.register_blueprint(family_merge_bp, url_prefix='/api/family')
    app.register_blueprint(member_history_bp, url_prefix='/api/family')
    app.register_blueprint(ai_bp, url_prefix='/api/family')

    # 注册前端路由
    from app.routes.pages import page_bp
    app.register_blueprint(page_bp)

    # 创建数据库表
    with app.app_context():
        db.create_all()
        # 自动迁移：给已有表加模型新增的列
        from app.migration import run_migrations
        run_migrations(db)
        # 初始化默认系统配置
        from app.services.config_service import ConfigService
        ConfigService.initialize_defaults()

    # 启动祭日提醒调度器（后台）
    from app.services.memorial_reminder import init_scheduler
    init_scheduler(app)

    return app
