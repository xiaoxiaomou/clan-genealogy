"""
内置示例族谱数据集
"""

from app import db
from app.models.member import Member
from app.models.relationship import Relationship


SAMPLE_DATASETS = {}


def get_sample_dataset_list():
    return []


def load_sample_data(family_id: int, dataset_key: str):
    raise ValueError(f'未知的示例数据集: {dataset_key}，暂无可用的示例数据集')
