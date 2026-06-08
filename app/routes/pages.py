import os
from flask import Blueprint, send_from_directory, jsonify

page_bp = Blueprint('pages', __name__)

# 前端构建产物目录
FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'frontend', 'dist'
)


@page_bp.route('/')
def index():
    """前端首页 - 提供构建后的前端应用"""
    index_file = os.path.join(FRONTEND_DIST, 'index.html')
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    # 开发模式下，返回提示信息
    return jsonify({
        'message': '族谱管理系统 API 服务器运行中',
        'api_docs': {
            'auth': '/api/auth/login, /api/auth/register',
            'family': '/api/family/',
            'frontend_dev': 'http://localhost:3000',
        },
        'hint': '前端开发服务器请访问 http://localhost:3000',
    })


@page_bp.route('/assets/<path:filename>')
def frontend_assets(filename):
    """前端静态资源"""
    if os.path.exists(FRONTEND_DIST):
        return send_from_directory(os.path.join(FRONTEND_DIST, 'assets'), filename)
    return '', 404
