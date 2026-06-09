# ---- 前端构建阶段 ----
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 后端运行阶段 ----
FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=run.py \
    FLASK_ENV=production

WORKDIR /app

# 安装系统依赖（reportlab 需要字体、Pillow 需要 libjpeg）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libjpeg-dev zlib1g-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 复制后端代码
COPY app/ ./app/
COPY migrations/ ./migrations/
COPY run.py .

# 复制前端构建产物到 Flask 可服务的位置
COPY --from=frontend-builder /build/dist ./frontend/dist

# 创建上传和日志目录
RUN mkdir -p app/static/images/avatars app/static/images/albums logs

# 非 root 用户运行
RUN useradd --create-home --shell /bin/bash zupu && \
    chown -R zupu:zupu /app
USER zupu

EXPOSE 5000

# 默认使用 gunicorn，可覆盖 CMD 切换为开发模式
CMD ["gunicorn", "-c", "gunicorn.conf.py", "run:app"]
