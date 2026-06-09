"""gunicorn 生产配置"""
import multiprocessing

# 监听地址
bind = '0.0.0.0:5000'

# worker 数量：CPU 核心数 * 2 + 1（IO 密集型可适当增加）
workers = multiprocessing.cpu_count() * 2 + 1

# worker 类型：同步 worker 对 SQLite 兼容性最好
# 若切换 PostgreSQL 可改为 gevent / eventlet
worker_class = 'sync'

# 超时时间（秒）——大型 PDF 导出可能需要较长时间
timeout = 120
graceful_timeout = 30

# 最大请求数（防内存泄漏，到达后 worker 自动重启）
max_requests = 1000
max_requests_jitter = 50

# 日志
accesslog = '-'          # stdout
errorlog = '-'           # stderr
loglevel = 'info'

# 预加载应用（节省内存，worker 共享同一进程映像）
preload_app = True
