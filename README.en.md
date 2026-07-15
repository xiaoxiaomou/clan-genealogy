<div align="center">

# Zupu — Family Genealogy Platform

**A modern, open-source platform for managing and visualizing family genealogy.**

Preserve your family's memory with an interactive family tree, generation lineages, photo albums & stories, memorial reminders, and a family community.

[中文](./README.md) · [Deployment](./docs/DEPLOYMENT.md) · [API](./docs/API.md) · [Contributing](./CONTRIBUTING.md)

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-3776AB.svg?logo=python&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB.svg?logo=react&logoColor=black)
![Flask](https://img.shields.io/badge/flask-3.0-000000.svg?logo=flask&logoColor=white)

</div>

---

## 📖 Overview

Zupu is a full-featured family genealogy management system that helps you digitally record, organize, and present your family lineage. It offers an interactive family tree, 2D/3D visualization, generation (Zibei) rules, lineage inference, automatic Chinese kinship-term calculation, family albums, member stories, memorial reminders, and a family community — with built-in privacy protection for living members, member edit history, and audit logs.

> The frontend is a React 19 + Vite single-page app; the backend is a Flask REST API. It works out of the box with SQLite and can switch to MySQL / PostgreSQL, with one-command Docker deployment.

## ✨ Features

- 🌳 **Family tree visualization** — Interactive tree powered by React Flow / Dagre with zoom, drag, auto-layout, and image export.
- 🧬 **Lineage & generations** — Zibei (generation-name) rules, automatic generation inference, and lineage views.
- 👨‍👩‍👧‍👦 **Member management** — Member profiles, extension fields, avatar upload, and edit-history versioning.
- 🔗 **Kinship calculation** — Auto-derive the Chinese kinship term between any two members via `relationship.js`.
- 🌍 **3D & maps** — Three.js 3D view and Leaflet maps to show family geographic migration.
- 📷 **Albums & stories** — Family albums, member stories, and rich-text editing (Tiptap).
- 🕯️ **Memorials & reminders** — Memorial pages for the deceased and automatic memorial-day reminders (APScheduler).
- 🏅 **Honors & timeline** — Family honors and a historical events timeline.
- 💬 **Family community** — Posts, comments, @mentions, direct chat, and notifications.
- 🔀 **Merge & branches** — Branch management and multi-family data merging.
- 📥 **GEDCOM import/export** — Compatible with the common genealogy interchange format.
- 🔎 **Global search & OCR** — Cross-module search and OCR for digitizing old genealogy scans.
- 🔐 **Privacy & security** — Living-member privacy protection, JWT auth, share links, audit logs, role-based access.
- 🤝 **Collaboration** — Invite family members to co-edit and view.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Router, @xyflow/react, Three.js, Leaflet, Recharts, Tiptap |
| Backend | Python 3.11+, Flask 3, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS, APScheduler |
| Database | SQLite (default) / MySQL / PostgreSQL |
| Deployment | Docker, Docker Compose, Gunicorn |

## 🚀 Quick Start

### Option A: Docker (recommended)

```bash
git clone https://github.com/xiaoxiaomou/clan-genealogy.git
cd zupu

export SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")
export JWT_SECRET_KEY=$(python -c "import secrets;print(secrets.token_hex(32))")

docker compose up -d
```

Then open http://localhost:5000 . SQLite is used by default; data is persisted in Docker volumes.

### Option B: Local development

**1. Backend**

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
python run.py                     # http://127.0.0.1:5000
```

Development uses SQLite by default (auto-creates `zupu.db`). Set `DATABASE_URI` to switch to MySQL / PostgreSQL.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

The dev server proxies API calls to the backend; the production build (`npm run build`) is served directly by Flask.

> See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for full production deployment (Gunicorn, database, reverse proxy).

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and adjust. Key entries:

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Flask session key — **must change in production** | dev default |
| `JWT_SECRET_KEY` | JWT signing key — **must change in production** | dev default |
| `DATABASE_URI` | DB connection string (empty = SQLite) | SQLite |
| `CORS_ORIGINS` | Allowed origins, comma-separated | local Vite URLs |
| `LIVING_PROTECTION_YEARS` | Living-member privacy window | `100` |
| `HOST` / `PORT` | Bind address and port | `127.0.0.1` / `5000` |

> ⚠️ In production the app **refuses to start** if the default `SECRET_KEY` / `JWT_SECRET_KEY` are still in use.

## 📁 Project Structure

```
zupu/
├── app/                # Flask backend
│   ├── models/         # SQLAlchemy models
│   ├── routes/         # API blueprints (30+ modules)
│   ├── services/       # Business logic (lineage, zibei, merge, GEDCOM, privacy...)
│   ├── utils/          # Utilities
│   ├── config.py       # Configuration
│   └── __init__.py     # App factory
├── frontend/           # React + Vite frontend
│   └── src/
├── migrations/         # SQL init / seed data
├── tests/              # Pytest tests
├── docs/               # Documentation
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── run.py              # Entry point
```

## 🧪 Tests

```bash
pytest
```

## 🤝 Contributing

Issues and PRs are welcome! Please read the [Contributing Guide](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## 🔒 Security

Please do not report security vulnerabilities via public issues. See [SECURITY.md](./SECURITY.md) for private disclosure.

## 📜 License

Licensed under the [Apache License 2.0](./LICENSE).

---

<div align="center">
Made with ❤️ to preserve family memory
</div>
