import os
from datetime import timedelta


class Config:
    """基础配置"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'zupu-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'images', 'avatars')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB


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