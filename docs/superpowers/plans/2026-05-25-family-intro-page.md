# 家族简介/故事页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 在登录和族谱树之间添加一个家族简介/故事展示页面，支持后台维护

**Architecture:** 新建 `FamilyArticle` 模型存储多篇文章，扩展 `Family` 模型增加简介字段；后端新增 CRUD API；前端新建 `FamilyIntroPage` + 页面内编辑模式 + 管理后台维护入口

**Tech Stack:** Flask + SQLAlchemy + SQLite, React 19 + TypeScript + Tailwind CSS v4

---

### Task 1: 后端模型 - FamilyArticle

**Files:**
- Create: `app/models/article.py`
- Modify: `app/models/__init__.py`

- [ ] **Step 1: Create article model**

```python
from app import db
from datetime import datetime


class FamilyArticle(db.Model):
    __tablename__ = 'family_articles'

    id = db.Column(db.Integer, primary_key=True)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    summary = db.Column(db.String(500), nullable=True)
    type = db.Column(db.String(20), nullable=False, default='story')  # intro/story/motto/rule
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_published = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    family = db.relationship('Family', backref=db.backref('articles', lazy='dynamic', cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'family_id': self.family_id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'type': self.type,
            'sort_order': self.sort_order,
            'is_published': self.is_published,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
```

- [ ] **Step 2: Export in models `__init__.py`**

```python
from app.models.article import FamilyArticle
```

- [ ] **Step 3: Extend Family model with intro field**

Add to `app/models/family.py`'s Family class:
```python
intro = db.Column(db.Text, nullable=True)
motto = db.Column(db.String(300), nullable=True)
```

Update `to_dict` to include `intro` and `motto`.

- [ ] **Step 4: Create migration / recreate tables**

Run `python -c "from app import create_app; app = create_app(); app.app_context().push(); from app import db; db.create_all()"` or drop and recreate.

---

### Task 2: 后端路由 - FamilyArticle CRUD

**Files:**
- Create: `app/routes/story.py`

- [ ] **Step 1: Create story blueprint with CRUD routes**

```python
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.article import FamilyArticle
from app.models.family import Family
from app.models.member import Member
from app import db
from app.utils.decorators import family_permission_required

story_bp = Blueprint('story', __name__)

@story_bp.route('/<int:family_id>/articles', methods=['GET'])
@jwt_required()
@family_permission_required('viewer')
def list_articles(family_id):
    articles = FamilyArticle.query.filter_by(family_id=family_id, is_published=True).order_by(FamilyArticle.sort_order, FamilyArticle.created_at).all()
    return jsonify({'articles': [a.to_dict() for a in articles]})

@story_bp.route('/<int:family_id>/articles/all', methods=['GET'])
@jwt_required()
@family_permission_required('editor')
def list_all_articles(family_id):
    articles = FamilyArticle.query.filter_by(family_id=family_id).order_by(FamilyArticle.sort_order, FamilyArticle.created_at).all()
    return jsonify({'articles': [a.to_dict() for a in articles]})

@story_bp.route('/<int:family_id>/articles', methods=['POST'])
@jwt_required()
@family_permission_required('editor')
def create_article(family_id):
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'error': '标题不能为空'}), 400
    max_order = db.session.query(db.func.max(FamilyArticle.sort_order)).filter_by(family_id=family_id).scalar() or 0
    article = FamilyArticle(
        family_id=family_id,
        title=data['title'],
        content=data.get('content', ''),
        summary=data.get('summary', ''),
        type=data.get('type', 'story'),
        sort_order=data.get('sort_order', max_order + 1),
        is_published=data.get('is_published', True),
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({'article': article.to_dict()}), 201

@story_bp.route('/<int:family_id>/articles/<int:article_id>', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_article(family_id, article_id):
    article = FamilyArticle.query.filter_by(id=article_id, family_id=family_id).first()
    if not article:
        return jsonify({'error': '文章不存在'}), 404
    data = request.get_json()
    if 'title' in data: article.title = data['title']
    if 'content' in data: article.content = data['content']
    if 'summary' in data: article.summary = data['summary']
    if 'type' in data: article.type = data['type']
    if 'sort_order' in data: article.sort_order = data['sort_order']
    if 'is_published' in data: article.is_published = data['is_published']
    db.session.commit()
    return jsonify({'article': article.to_dict()})

@story_bp.route('/<int:family_id>/articles/<int:article_id>', methods=['DELETE'])
@jwt_required()
@family_permission_required('editor')
def delete_article(family_id, article_id):
    article = FamilyArticle.query.filter_by(id=article_id, family_id=family_id).first()
    if not article:
        return jsonify({'error': '文章不存在'}), 404
    db.session.delete(article)
    db.session.commit()
    return jsonify({'message': '删除成功'})

@story_bp.route('/<int:family_id>/intro', methods=['PUT'])
@jwt_required()
@family_permission_required('editor')
def update_family_intro(family_id):
    family = Family.query.get(family_id)
    if not family:
        return jsonify({'error': '族谱不存在'}), 404
    data = request.get_json()
    if 'intro' in data: family.intro = data['intro']
    if 'motto' in data: family.motto = data['motto']
    db.session.commit()
    return jsonify({'family': family.to_dict()})
```

- [ ] **Step 2: Register blueprint in `app/__init__.py`**

```python
from app.routes.story import story_bp
app.register_blueprint(story_bp, url_prefix='/api/family')
```

---

### Task 3: 前端 API 方法

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Add article API methods**

```typescript
// Family Articles
getFamilyArticles: (familyId: number) =>
  request<any>(`/family/${familyId}/articles`),

getAllFamilyArticles: (familyId: number) =>
  request<any>(`/family/${familyId}/articles/all`),

createFamilyArticle: (familyId: number, data: any) =>
  request<any>(`/family/${familyId}/articles`, { method: 'POST', body: data }),

updateFamilyArticle: (familyId: number, articleId: number, data: any) =>
  request<any>(`/family/${familyId}/articles/${articleId}`, { method: 'PUT', body: data }),

deleteFamilyArticle: (familyId: number, articleId: number) =>
  request<any>(`/family/${familyId}/articles/${articleId}`, { method: 'DELETE' }),

updateFamilyIntro: (familyId: number, data: any) =>
  request<any>(`/family/${familyId}/intro`, { method: 'PUT', body: data }),
```

---

### Task 4: FamilyIntroPage 前端页面

**Files:**
- Create: `frontend/src/components/pages/FamilyIntroPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Create FamilyIntroPage.tsx** - 展示家族简介 + 故事列表 + 编辑模式

The page has two modes:
- **View mode**: Shows family intro, motto, story cards, "进入族谱" button
- **Edit mode**: Inline editing for intro/motto + article CRUD

- [ ] **Add route in App.tsx**

```tsx
<Route path="/family/:id/intro" element={<ProtectedRoute><FamilyIntroPage /></ProtectedRoute>} />
```

---

### Task 5: Dashboard 跳转调整

**Files:**
- Modify: `frontend/src/components/pages/DashboardPage.tsx`

- [ ] **Change family card click to navigate to `/family/${id}/intro` instead of `/family/${id}`**

---

### Task 6: 族谱页面导航链接

**Files:**
- Modify: `frontend/src/components/pages/FamilyHeader.tsx` (or wherever the tab navigation lives)

- [ ] **Add "家族简介" tab linking to `/family/:id/intro`**

---

### Task 7: 验证和后端测试

**Files:**
- Run `npx tsc --noEmit`
- Run `python -m pytest tests/ -v`

- [ ] **TypeScript 检查通过**
- [ ] **后端测试通过**
- [ ] **启动前后端验证新页面可用**
