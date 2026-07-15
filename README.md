<div align="center">

# 族谱管理平台 (Zupu)

**一个现代化、开源的家族族谱管理与可视化平台**

用可视化家族树、字辈世系、相册故事、祭日纪念与家族社区，把家族记忆完整地传承下去。

[English](./README.en.md) · [部署文档](./docs/DEPLOYMENT.md) · [API 文档](./docs/API.md) · [贡献指南](./CONTRIBUTING.md)

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-3776AB.svg?logo=python&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB.svg?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/flask-3.0-000000.svg?logo=flask&logoColor=white)

</div>

---

## 📖 项目简介

族谱管理平台是一套完整的家族信息管理系统，帮助你数字化地记录、组织和展示家族谱系。它提供交互式家族树、2D/3D 可视化、字辈规则、世系推演、亲属称谓自动计算、家族相册、人物故事、祭日提醒、家族社区等功能，并内置活人隐私保护、成员编辑历史、审计日志等机制，兼顾易用性与数据安全。

> 前端为 React 19 + Vite 单页应用，后端为 Flask REST API，默认使用 SQLite 开箱即用，支持切换 MySQL / PostgreSQL，并提供 Docker 一键部署。

## ✨ 功能亮点

- 🌳 **家族树可视化** —— 基于 React Flow / Dagre 的交互式族谱树，支持缩放、拖拽、自动布局，并可导出图片。
- 🧬 **世系与字辈** —— 字辈（字派）规则管理、世代自动推算、世系（lineage）展示。
- 👨‍👩‍👧‍👦 **成员管理** —— 成员档案、扩展字段、头像上传、编辑历史与版本回溯。
- 🔗 **亲属称谓计算** —— 基于 `relationship.js` 自动推导任意两位成员之间的中文亲属称谓。
- 🌍 **3D 与地图** —— Three.js 3D 视图与 Leaflet 地图，展示家族地理迁徙。
- 📷 **相册与故事** —— 家族相册、人物故事、富文本编辑（Tiptap）。
- 🕯️ **纪念与祭日提醒** —— 逝者纪念页与祭日自动提醒（APScheduler 后台调度）。
- 🏅 **荣誉与大事记** —— 家族荣誉、历史事件时间线。
- 💬 **家族社区** —— 帖子、评论、@提及、私信聊天、通知。
- 🔀 **家族合并与分支** —— 支持分支管理与多家族数据合并。
- 📥 **GEDCOM 导入导出** —— 兼容通用族谱交换格式，便于数据迁移。
- 🔎 **全局搜索 & OCR** —— 跨模块搜索，支持老族谱图片 OCR 识别录入。
- 🔐 **隐私与安全** —— 活人隐私保护、JWT 鉴权、分享链接、审计日志、权限分级。
- 🤝 **邀请协作** —— 邀请家族成员共同编辑与查看。

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19、TypeScript、Vite、Tailwind CSS、Redux Toolkit、React Router、@xyflow/react、Three.js、Leaflet、Recharts、Tiptap |
| 后端 | Python 3.11+、Flask 3、Flask-SQLAlchemy、Flask-JWT-Extended、Flask-CORS、APScheduler |
| 数据库 | SQLite（默认）/ MySQL / PostgreSQL |
| 部署 | Docker、Docker Compose、Gunicorn |

## 🚀 快速开始

### 方式一：Docker（推荐，开箱即用）

```bash
git clone https://github.com/xiaoxiaomou/clan-genealogy.git
cd zupu

# 生成并写入密钥（示例）
export SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")
export JWT_SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")

docker compose up -d
```

启动后访问 http://localhost:5000 。默认使用 SQLite，数据持久化在 Docker 卷中。

### 方式二：本地开发

**1. 后端**

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # 按需修改配置
python run.py                     # 默认 http://127.0.0.1:5000
```

开发环境默认使用 SQLite（自动生成 `zupu.db`）。设置 `DATABASE_URI` 可切换到 MySQL / PostgreSQL。

**2. 前端**

```bash
cd frontend
npm install
npm run dev                       # 默认 http://localhost:5173
```

前端开发服务器会代理 API 到后端；生产构建 (`npm run build`) 的产物由 Flask 直接托管。

> 更完整的部署说明（生产环境、Gunicorn、数据库、反向代理）见 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)。

## ⚙️ 环境变量

复制 `.env.example` 为 `.env` 后按需修改。关键项：

| 变量 | 说明 | 默认 |
|---|---|---|
| `SECRET_KEY` | Flask 会话密钥，**生产必须修改** | 开发默认值 |
| `JWT_SECRET_KEY` | JWT 签名密钥，**生产必须修改** | 开发默认值 |
| `DATABASE_URI` | 数据库连接串（留空则用 SQLite） | SQLite |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 | 本地 Vite 地址 |
| `LIVING_PROTECTION_YEARS` | 活人隐私保护年限 | `100` |
| `HOST` / `PORT` | 监听地址与端口 | `127.0.0.1` / `5000` |

> ⚠️ 生产环境若仍使用默认 `SECRET_KEY` / `JWT_SECRET_KEY`，应用将**拒绝启动**。

## 📁 目录结构

```
zupu/
├── app/                # Flask 后端
│   ├── models/         # SQLAlchemy 数据模型
│   ├── routes/         # API 蓝图（30+ 模块）
│   ├── services/       # 业务逻辑（世系、字辈、合并、GEDCOM、隐私等）
│   ├── utils/          # 工具函数
│   ├── config.py       # 环境配置
│   └── __init__.py     # 应用工厂
├── frontend/           # React + Vite 前端
│   └── src/
├── migrations/         # SQL 初始化 / 种子数据
├── tests/              # Pytest 测试
├── docs/               # 文档
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── run.py              # 入口
```

## 🧪 测试

```bash
pytest
```

## 🤝 贡献

欢迎提交 Issue 与 Pull Request！请先阅读 [贡献指南](./CONTRIBUTING.md) 与 [行为准则](./CODE_OF_CONDUCT.md)。

## 🔒 安全

如发现安全漏洞，请勿公开提交 Issue，参见 [SECURITY.md](./SECURITY.md) 进行私密披露。

## 📜 许可证

本项目基于 [Apache License 2.0](./LICENSE) 开源。

---

<div align="center">
用 ❤️ 传承家族记忆
</div>
