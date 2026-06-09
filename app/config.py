import os
import sys
import logging
from datetime import timedelta


_DEFAULT_JWT_SECRET = 'jwt-secret-key-change-in-production'
_DEFAULT_SECRET_KEY = 'zupu-secret-key-change-in-production'

logger = logging.getLogger(__name__)


class Config:
    """基础配置"""
    SECRET_KEY = os.environ.get('SECRET_KEY', _DEFAULT_SECRET_KEY)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', _DEFAULT_JWT_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'avatars')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB

    # CORS 白名单，逗号分隔；开发环境默认允许本地 Vite 地址
    CORS_ORIGINS = os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'
    )

    # 活人隐私保护：出生距今不超过此年份的成员视为"活人"，对非 owner/editor 隐藏敏感字段
    LIVING_PROTECTION_YEARS = int(os.environ.get('LIVING_PROTECTION_YEARS', '100'))

    @classmethod
    def _check_production_secrets(cls):
        """生产环境必须配置真实密钥，否则拒绝启动"""
        errors = []
        if cls.JWT_SECRET_KEY == _DEFAULT_JWT_SECRET:
            errors.append(
                '[SECURITY] JWT_SECRET_KEY is using the default value. '
                'Set environment variable JWT_SECRET_KEY before starting production.'
            )
        if cls.SECRET_KEY == _DEFAULT_SECRET_KEY:
            errors.append(
                '[SECURITY] SECRET_KEY is using the default value. '
                'Set environment variable SECRET_KEY before starting production.'
            )
        if errors:
            for e in errors:
                logger.error(e)
            sys.exit('Fatal: production configuration has insecure defaults. Aborting.')


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    # 默认使用SQLite，设置环境变量DATABASE_URI可切换为MySQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URI',
        'sqlite:///' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'zupu.db')
    )
    # SQLite 专用配置
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False},
    }


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URI',
        'mysql+pymysql://root:password@localhost:3306/zupu?charset=utf8mb4'
    )

    def __init__(self):
        self._check_production_secrets()


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # SQLite 专用配置
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False},
    }


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}