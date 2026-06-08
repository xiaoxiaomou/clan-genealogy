import sys
import os

# 绕过 Windows asyncio _overlapped 问题
if sys.platform == 'win32':
    import asyncio
    # 使用 WindowsSelectorEventLoopPolicy 避免 _overlapped 问题
    if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
