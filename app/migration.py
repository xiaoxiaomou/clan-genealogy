"""数据库自动迁移：给已有表添加模型新增的列"""
import logging
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)


def run_migrations(db: SQLAlchemy):
    """检查并添加缺少的列"""
    engine = db.engine
    inspector = inspect(engine)

    # 需要检查的模型表和新加的列
    # 格式: {表名: [(列名, 类型定义), ...]}
    migrations = {
        'families': [
            ('intro', "TEXT DEFAULT ''"),
            ('motto', "TEXT DEFAULT ''"),
            ('origin_lat', "REAL"),
            ('origin_lng', "REAL"),
            ('zibei_text', "TEXT"),
            ('zibei_start_generation', "INTEGER DEFAULT 1"),
            ('zibei_assignment', "VARCHAR(20) DEFAULT 'sequential'"),
            ('zibei_description', "TEXT"),
        ],
        # 新表通过 db.create_all() 在 __init__.py 自动创建；以下只是补列
        'posts': [
            ('pinned', "BOOLEAN DEFAULT 0"),
        ],
        'honors': [
            ('awarder', "VARCHAR(200)"),
        ],
        'users': [
            ('linked_member_id', "INTEGER"),
            ('reset_token', "VARCHAR(128)"),
            ('reset_token_expires', "DATETIME"),
        ],
        'members': [
            ('birth_place', "VARCHAR(200)"),
            ('birth_place_lat', "REAL"),
            ('birth_place_lng', "REAL"),
            ('death_place', "VARCHAR(200)"),
            ('death_place_lat', "REAL"),
            ('death_place_lng', "REAL"),
            ('sort_order', "INTEGER DEFAULT 0"),
            ('courtesy_name', "VARCHAR(50)"),
            ('art_name', "VARCHAR(100)"),
            ('posthumous_name', "VARCHAR(100)"),
            ('privacy_level', "VARCHAR(20) DEFAULT 'public'"),
            ('privacy_override', "BOOLEAN DEFAULT 0"),
        ],
    }

    for table_name, columns in migrations.items():
        if table_name not in inspector.get_table_names():
            logger.info(f'表 {table_name} 不存在，跳过迁移')
            continue

        existing_cols = {col['name'] for col in inspector.get_columns(table_name)}
        for col_name, col_type in columns:
            if col_name not in existing_cols:
                logger.info(f'迁移：{table_name}.{col_name} 不存在，正在添加...')
                with engine.connect() as conn:
                    conn.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}'))
                    conn.commit()
                logger.info(f'迁移完成：{table_name}.{col_name} 已添加')
