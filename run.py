import sys
import os

# 绕过 Windows asyncio _overlapped 问题
# 使用 try/except 包裹，避免在某些受限环境（如沙盒、stdio 重定向）中
# `import asyncio` 失败导致整个应用无法启动
if sys.platform == 'win32':
    try:
        import asyncio  # noqa: F401
        # 使用 WindowsSelectorEventLoopPolicy 避免 _overlapped 问题
        if hasattr(asyncio, 'WindowsSelectorEventLoopPolicy'):
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        # 在受限环境下 _overlapped 无法加载时，跳过此优化
        # Python 3.11+ 默认即为 SelectorEventLoop，可直接使用
        pass

from app import create_app

app = create_app()

if __name__ == '__main__':
    # 开发环境只监听本地，避免局域网暴露
    # 如需局域网访问，设置环境变量 HOST=0.0.0.0
    import os
    app.run(
        host=os.environ.get('HOST', '127.0.0.1'),
        port=int(os.environ.get('PORT', '5000')),
        debug=True,
    )
