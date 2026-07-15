# 部署文档 / Deployment Guide

本文档介绍族谱管理平台的本地开发、Docker 部署与生产环境部署方式。

## 目录

- [环境要求](#环境要求)
- [环境变量](#环境变量)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署推荐)
- [生产部署（Gunicorn + 反向代理）](#生产部署gunicorn--反向代理)
- [数据库](#数据库)
- [常见问题](#常见问题)

---

## 环境要求

| 组件 | 版本 |
|---|---|
| Python | 3.11+ |
| Node.js | 20+（构建前端） |
| 数据库 | SQLite（默认）/ MySQL 8+ / PostgreSQL 14+ |
| Docker | 可选，用于容器化部署 |

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改。核心变量：

| 变量 | 说明 | 默认 |
|---|---|---|
| `FLASK_CONFIG` | `development` / `production` / `testing` | `development` |
| `SECRET_KEY` | Flask 会话密钥，**生产必填** | 开发默认值 |
| `JWT_SECRET_KEY` | JWT 签名密钥，**生产必填** | 开发默认值 |
| `DATABASE_URI` | 数据库连接串，留空用 SQLite | SQLite |
| `CORS_ORIGINS` | 允许跨域来源，逗号分隔 | 本地 Vite 地址 |
| `LIVING_PROTECTION_YEARS` | 活人隐私保护年限 | `100` |
| `HOST` / `PORT` | 监听地址与端口 | `127.0.0.1` / `5000` |

生成安全密钥：

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> ⚠️ 生产环境若 `SECRET_KEY` / `JWT_SECRET_KEY` 仍为默认值，应用会**拒绝启动**（见 `app/config.py` 的 `_check_production_secrets`）。

---

## 本地开发

### 后端

```bash
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
python run.py                      # http://127.0.0.1:5000
```

- 默认使用 SQLite，会在项目根自动生成 `zupu.db`。
- 首次启动会自动 `create_all()` 建表、执行轻量迁移并初始化默认系统配置。
- 后台会启动祭日提醒调度器（APScheduler）。

### 前端

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

- 开发模式下前端独立运行，通过 `CORS_ORIGINS` 允许跨域访问后端 API。
- 生产模式下执行 `npm run build`，构建产物 `frontend/dist` 由 Flask 直接托管（见 `app/routes/pages.py`）。

---

## Docker 部署（推荐）

项目提供多阶段 `Dockerfile`（前端构建 + 后端运行）与 `docker-compose.yml`，默认 SQLite，开箱即用。

```bash
# 1. 准备密钥
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")
export JWT_SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")

# 2. 启动
docker compose up -d

# 3. 查看日志 / 状态
docker compose logs -f
docker compose ps
```

访问 http://localhost:5000 。

- 数据持久化在命名卷 `zupu-data`（SQLite + 上传文件）与 `zupu-logs`。
- 内置健康检查：`GET /api/config/public`。
- 可通过 `.env` 或环境变量覆盖 `PORT`、`CORS_ORIGINS`、`DATABASE_URI` 等。

### 切换到 PostgreSQL

`docker-compose.yml` 中已注释了一个 `db` 服务，取消注释后设置：

```yaml
environment:
  DATABASE_URI: "postgresql+psycopg://zupu:zupu_secret@db:5432/zupu"
```

并确保安装对应驱动（如 `psycopg`）。

---

## 生产部署（Gunicorn + 反向代理）

容器内默认以 Gunicorn 启动（见 `gunicorn.conf.py`）：

```bash
gunicorn -c gunicorn.conf.py run:app
```

非容器部署示例：

```bash
export FLASK_CONFIG=production
export SECRET_KEY=...      JWT_SECRET_KEY=...
export DATABASE_URI="mysql+pymysql://user:pass@localhost:3306/zupu?charset=utf8mb4"
export CORS_ORIGINS="https://your-domain.com"

gunicorn -c gunicorn.conf.py run:app
```

建议在前面加 Nginx 反向代理，处理 HTTPS 与静态资源：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/fullchain.pem;
    ssl_certificate_key /path/privkey.pem;

    client_max_body_size 10m;   # 上传图片 <= 5MB，留出余量

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 数据库

- **SQLite（默认）**：零配置，适合个人 / 小家族使用，数据存于 `zupu.db`。
- **MySQL**：`mysql+pymysql://user:pass@host:3306/zupu?charset=utf8mb4`，需创建 `utf8mb4` 数据库。
- **PostgreSQL**：`postgresql+psycopg://user:pass@host:5432/zupu`。

`migrations/` 下提供 `init.sql`（初始化）与 `seed.sql`（示例种子数据）。应用启动时也会自动建表与执行轻量列迁移（见 `app/migration.py`）。

---

## 常见问题

**Q：生产启动时报 "insecure defaults. Aborting."？**
A：说明 `SECRET_KEY` 或 `JWT_SECRET_KEY` 仍为默认值，设置真实密钥后重启。

**Q：前端能访问但接口跨域被拦截？**
A：检查 `CORS_ORIGINS` 是否包含你的前端域名（逗号分隔，无空格），未配置时默认严格拦截所有跨域。

**Q：上传图片失败？**
A：单文件上限 5MB（`MAX_CONTENT_LENGTH`），并确认反向代理的 `client_max_body_size` 足够。

**Q：如何迁移旧数据？**
A：支持 GEDCOM 导入导出（见 `app/services/gedcom_service.py` 与导出接口），可从其它族谱软件迁移。
