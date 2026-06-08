# pure-genealogy 项目分析报告

> 信息来源：https://github.com/yunfengsa/pure-genealogy  
> Stars：377 | 语言：TypeScript | 协议：MIT  
> 技术栈：Next.js 15 + Supabase + React Flow + Tailwind CSS  
> 在线演示：https://pure-genealogy.onehacker.top

---

## 一、项目概况

**pure-genealogy** 是一个基于 Next.js 15 + Supabase 的全栈族谱管理系统，特点是**可视化效果极强**、**交互丰富**、**中文化深度好**。目前 377 Stars，78 Forks，发展迅速。

### 技术栈对比

| 维度 | pure-genealogy | 我们的 zupu 项目 |
|------|---------------|-----------------|
| **框架** | Next.js 15 (App Router) | Flask (后端) + React 18 (前端) |
| **数据库** | Supabase (PostgreSQL + Auth + Realtime) | SQLite (开发) / MySQL (生产) |
| **UI 库** | shadcn/ui (Radix UI) | 自建 UI + Tailwind |
| **状态管理** | Server Actions + useSWR-ish | **Redux Toolkit** ✅ (刚装) |
| **2D 树图** | **@xyflow/react** ✅ | 自建简单树图 |
| **3D 树图** | **react-force-graph-3d** ✅ | 无 |
| **图表** | recharts | 无 |
| **富文本** | Slate.js | 无 |
| **文件格式** | xlsx (Excel 导入导出) | 无 |
| **认证** | Supabase Auth | Flask-JWT |
| **主题** | next-themes + shadcn | 自建 dark/light |
| **部署** | Vercel | 自建 |

---

## 二、功能完整对比

### 2.1 家族树可视化（核心差异）

| 功能 | pure-genealogy | 我们的 zupu | 差距 |
|------|---------------|------------|------|
| **2D 族谱图 (@xyflow/react)** | ✅ 自动 Dagre 布局，世代标尺，松柏绿瀑布渐变色 | ❌ 无 | 🔴 高 |
| **金线溯源高亮** | ✅ 点击节点 → 高亮祖先路径（金线） | ❌ 无 | 🔴 高 |
| **金扇繁衍高亮** | ✅ 点击节点 → 高亮子孙路径（金扇展开） | ❌ 无 | 🔴 高 |
| **配偶直显** | ✅ 节点内直接显示配偶姓名 | ✅ 有 | 🟢 持平 |
| **世代标尺** | ✅ 左侧水墨风"第X世"竖排标尺 | ❌ 无 | 🟡 中 |
| **节点颜色梯度** | ✅ 松柏绿统一色系 + 世代亮度渐变 | ❌ 性别色只有蓝/粉 | 🟡 中 |
| **折叠/展开子树** | ✅ 节点可折叠，有堆叠效果 | ❌ 无 | 🟡 中 |
| **高清图导出** | ✅ html-to-image 导出 PNG | ❌ 无 | 🟡 中 |
| **3D 力导向图** | ✅ react-force-graph-3d，星空漫游 | ❌ 无 | 🔴 高 |
| **自动巡游 (Auto Tour)** | ✅ 3D 中自动计算路径，相机飞行浏览 | ❌ 无 | 🟡 中 |
| **统计仪表盘** | ✅ recharts 多图表（世代趋势/性别比例/年龄分布/字辈统计） | ⚠️ 基础数字卡片 | 🔴 高 |
| **时间轴** | ✅ @xyflow/react 自定义水平时间轴 | ❌ 线性列表 | 🔴 高 |

### 2.2 成员管理

| 功能 | pure-genealogy | 我们的 zupu |
|------|---------------|------------|
| **成员列表** | ✅ 分页列表，可搜索 | ✅ 有 |
| **新增/编辑** | ✅ 对话框表单 | ✅ Modal 表单 |
| **批量导入** | ✅ Excel/CSV 导入 | ❌ 无 |
| **批量导出** | ✅ Excel/CSV 导出 | ❌ 无 |
| **父节点选择** | ✅ Combobox 搜索式下拉 | ✅ 有 |
| **富文本生平** | ✅ Slate.js 富文本编辑器（加粗/斜体/列表） | ❌ 纯文本 |
| **生卒日期** | ✅ date 类型 | ✅ 有 |
| **居住地** | ✅ 字段 | ✅ 有 (源流) |
| **官职/职业** | ✅ 字段 | ❌ 无 |
| **字辈** | ✅ generation + 字段 | ✅ 有 |
| **兄弟排行** | ✅ sibling_order | ❌ 无 |

### 2.3 "Living Book" 传记书（独家亮点）

pure-genealogy 独创的传记书模式：

| 特性 | 描述 |
|------|------|
| **3D 翻书交互** | PC 端模拟书卷/画卷翻页效果，移动端全屏卡片 |
| **正面** | 档案信息（名字、性别、世代、生卒年、配偶、官职等） |
| **背面** | 富文本生平（Slate.js 编辑的传记内容） |
| **逐字书写动效** | 阅读模式支持毛笔扫过/逐字书写动画 `animate-brush-reveal` |
| **搜索导航** | 可搜索成员名，快速翻到对应页面 |
| **全屏模式** | 展开全屏沉浸阅读 |
| **左右翻页** | 模拟真实书籍左右翻页 |

### 2.4 认证与 UI

| 特性 | pure-genealogy | 我们的 zupu |
|------|---------------|------------|
| **登录页** | 水墨山水背景图 | 纯色背景 |
| **暗色模式** | next-themes (3模式: light/dark/system) | 自建两模式 |
| **导航** | 顶部导航 + 移动端 DropdownMenu | 顶部导航 + 侧滑菜单 |
| **字体** | 系统字体 + 书法字体验 | system-ui |
| **中文数字** | `toChineseNum()` 第X世 中文数字转换 | ❌ 无 |
| **姓氏配置** | `FAMILY_SURNAME` 环境变量配置 | ❌ 硬编码 |

---

## 三、适合我们直接采用的方案（按优先级）

### 🔥 P0：快速跟进

| # | 方案 | 技术路线 | 预估工时 | 价值 |
|---|------|---------|---------|------|
| 1 | **2D 族谱图** | 安装 `@xyflow/react` + `@dagrejs/dagre` | 3-5天 | 🔥🔥🔥🔥🔥 |
| 2 | **统计仪表盘** | 安装 `recharts`，按后端数据渲染图表 | 2-3天 | 🔥🔥🔥🔥 |
| 3 | **高清图导出** | 安装 `html-to-image` | 0.5天 | 🔥🔥🔥 |

### 🔥 P1：中期跟进

| # | 方案 | 技术路线 | 预估工时 | 价值 |
|---|------|---------|---------|------|
| 4 | **时间轴视图** | 自建或用 React Flow 自定义 | 2-3天 | 🔥🔥🔥 |
| 5 | **Excel 导入导出** | 安装 `xlsx` | 1-2天 | 🔥🔥🔥 |
| 6 | **世代标尺** | 自定义 React Flow 节点组件 | 1天 | 🔥🔥 |
| 7 | **富文本生平** | 安装 `slate` + `slate-react` + `slate-history` + `is-hotkey` | 2天 | 🔥🔥 |

### 🔥 P2：长期规划

| # | 方案 | 技术路线 | 预估工时 | 价值 |
|---|------|---------|---------|------|
| 8 | **3D 力导向图** | 安装 `react-force-graph-3d` + `three` | 3-5天 | 🔥🔥🔥 |
| 9 | **传记书模式** | 自建翻书交互组件 | 5-7天 | 🔥🔥 |
| 10 | **金线溯源/金扇繁衍** | 自定义 React Flow 边和节点高亮逻辑 | 2天 | 🔥🔥🔥 |
| 11 | **成员照片人脸关联** | 配合相册功能 | 3天 | 🔥🔥 |

---

## 四、pure-genealogy 的核心代码架构参考

### 4.1 2D 族谱图架构

```
app/family-tree/graph/
├── page.tsx                  # 路由入口，服务端获取数据
├── family-tree-graph.tsx     # 核心组件：ReactFlow + dagre 布局 + 交互逻辑
├── family-node.tsx           # 自定义人物节点组件（含高亮/渐变色/折叠）
├── generation-node.tsx       # 左侧世代标尺节点组件（竖排中文数字）
├── flowing-edge.tsx          # 动态流动连线（金色流体动画）
├── actions.ts                # 服务端数据获取、CRUD
└── utils/
    ├── chinese-num.ts        # 阿拉伯数字→中文数字（第1世→第一世）
    └── colors.ts             # 松柏绿 HSL 色系 + 世代亮度梯度算法
```

**核心流程：**
1. 服务器端 `actions.ts` 查询 Supabase → 返回 `FamilyMemberNode[]`
2. `family-tree-graph.tsx` 接收数据 → dagre 自动布局计算 → 生成 `nodes` 和 `edges`
3. 自定义节点类型 `familyMember`（`family-node.tsx`）和 `generationLabel`（`generation-node.tsx`）
4. 自定义边类型 `flowing`（`flowing-edge.tsx`）带金色动画小球
5. 交互：点击节点 → `highlightAncestors`/`highlightDescendants` → 设置 `isPathHighlighted`/`isDimmed` 状态

### 4.2 颜色系统（可直接复用）

```typescript
// app/family-tree/graph/utils/colors.ts
// 松柏绿统一色系，避免性别的红蓝冲突
const UNIFIED_BASE_COLOR = { h: 145, s: 45, l: 30 };  // 松柏绿

// 每代 +6% 亮度，产生代际层次感
function generateBranchColor(base: HSLColor, generationOffset: number): string {
  const step = 6;
  const maxLightness = 85;
  const currentLightness = Math.min(base.l + (generationOffset * step), maxLightness);
  return `hsl(${base.h}, ${base.s}%, ${currentLightness}%)`;
}
```

### 4.3 高亮逻辑（可直接复用）

```typescript
// 金线溯源 - 高亮祖先路径
function highlightAncestors(memberId: number, memberMap, parentMap) {
  const highlighted = new Set<number>();
  let currentId = memberId;
  // 沿父链向上追溯
  while (currentId) {
    highlighted.add(currentId);
    currentId = parentMap.get(currentId);
  }
  return highlighted;
}

// 金扇繁衍 - 高亮子孙路径
function highlightDescendants(memberId: number, childrenMap) {
  const highlighted = new Set<number>();
  const queue = [memberId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    highlighted.add(id);
    const children = childrenMap.get(id) || [];
    queue.push(...children);
  }
  return highlighted;
}
```

---

## 五、建议采用的技术依赖

直接安装即可复现 pure-genealogy 的可视化能力：

```bash
# 2D 族谱图 - 核心
npm install @xyflow/react @dagrejs/dagre @types/dagre

# 统计图表
npm install recharts

# 图片导出
npm install html-to-image

# 富文本编辑（可选）
npm install slate slate-react slate-history is-hotkey

# Excel 导入导出（可选）
npm install xlsx

# 3D 力导向图（可选）
npm install react-force-graph-3d three @types/three three-spritetext
```

### 与现有项目的兼容性

| 包 | 兼容性 | 说明 |
|---|--------|------|
| `@xyflow/react` (v12) | ✅ 兼容 | 与 React 18 完全兼容 |
| `@dagrejs/dagre` | ✅ 兼容 | 纯 JS 布局引擎，无框架依赖 |
| `recharts` | ✅ 兼容 | React 组件化图表库 |
| `html-to-image` | ✅ 兼容 | 纯浏览器 API |
| `slate` (v0.120) | ⚠️ React 18 兼容 | 需注意版本匹配 |
| `xlsx` | ✅ 兼容 | 纯 JS 实现 |
| `react-force-graph-3d` (v1.29) | ⚠️ 需 React 18+ | 已满足 |

---

## 六、总结：pure-genealogy 最值得借鉴的 5 个点

1. **React Flow 族谱图** — 自动布局 + 世代标尺 + 颜色梯度 + 高亮交互，这是可视化基础
2. **松柏绿统一色系** — 避免性别红蓝的视觉隔离，用统一色系 + 亮度梯度表示代际
3. **金线溯源/金扇繁衍** — 点击节点的双向高亮交互，识别度高且易实现
4. **统计仪表盘 (recharts)** — 多图表展示家族数据的全面性
5. **时间轴视图** — 基于 React Flow 自定义，复用已有依赖

> 📌 **建议实施顺序：**  
> 2D 族谱图 (React Flow) → 统计仪表盘 (recharts) → 高清图导出 (html-to-image)  
> → 时间轴 (React Flow) → Excel 导入导出 (xlsx) → 金线高亮交互 → 3D 图
