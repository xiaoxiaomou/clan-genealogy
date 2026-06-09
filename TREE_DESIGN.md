# 族谱树形图改良设计方案（v2，根据专家评审修正）

> 基于 React Flow + Dagre 的族谱可视化升级方案
> 评审后修正了 4 个阻断级问题，调整了策略

---

## 一、架构核心决策

### 1.1 布局策略（修正方案）

**原则：dagre 只跑一次，折叠/展开不触发布局重排**

```
首次加载:
  treeData 变化
    → dagre.layout 全量计算 (nodes + parent-child edges only)
    → React Flow setNodes (所有节点，含位置)
    → React Flow setEdges

折叠/展开:
  collapsedIds 变化
    → 只改 node.hidden = true/false  (React Flow v12 原生支持)
    → 不改 node.position
    → 不调 dagre
    → 不调 setNodes (可调 updateNode)

高亮/选中:
  highlightedMemberId / lineage 变化
    → 只改 node.data (配色/光环)
    → 不调 dagre
    → 不调 setNodes
```

关键优势：
- 折叠展开 **0ms 布局计算**（之前 200-800ms）
- 折叠展开 **无节点位置跳变**（之前 dagre 重排会打乱已有布局）
- 支持 **CSS 过渡动画**（opacity/scale 隐藏）

### 1.2 配偶复合节点（修正方案）

**不采用"两个独立 node 后处理对齐"方案，而是夫妻包装为单个 React Flow 节点**

```
dagre 中只有一个复合节点:
  node.id = "couple:{husband_id},{wife_id}"
  node.type = "couple"

React Flow 渲染:
  ┌──────────────────────────────────┐
  │  ┌──────────┐  ───  ┌──────────┐ │
  │  │  张三    │       │  李氏    │ │
  │  └──────────┘       └──────────┘ │
  └──────────────────────────────────┘
```

数据模型:
```typescript
interface CoupleNodeData {
  type: 'couple'
  husband: TreeNode
  wife: TreeNode | null
  children: number[]  // 子女 id 列表
  marriageOrder?: number
}
interface PersonNodeData {
  type: 'person'
  member: TreeNode
  coupleId?: string  // 属于哪个夫妻复合节点
}
```

边处理：
- dagre 图中不包含配偶边
- 复合节点内部渲染夫妻并排和短横线
- 复合节点到子节点 = 1 条竖直线（从夫妻底部中间向下）
- 未配对的成员使用 PersonNode 单节点

### 1.3 动态节点宽度

```typescript
const MIN_NODE_WIDTH = 140
const getNodeWidth = (member: TreeNode): number => {
  const texts = [
    member.name,
    member.courtesy_name,
    member.art_name,
    member.posthumous_name,
  ].filter(Boolean)
  const maxWidth = Math.max(...texts.map(t => measureTextWidth(t, '13px sans-serif')))
  return Math.max(MIN_NODE_WIDTH, maxWidth + 48) // 48 = padding + avatar
}
```

dagre 布局前预计算所有节点尺寸。

---

## 二、现有功能清单（已实现，不计入新工时）

| 功能 | 文件位置 | 状态 |
|------|---------|------|
| 折叠/展开子树 | `FamilyTreeGraph.tsx:424-433` + `treeCollapse.ts` | ✅ 已实现 |
| 金线溯源/金扇繁衍双向高亮 | `useLineageHighlight` hook | ✅ 已实现 |
| 世代标尺 | `GenerationRuler.tsx` | ✅ 已实现 |
| 树图搜索定位 | `useTreeSearch` + `TreeSearchPalette` | ✅ 已实现 |
| 悬停预览卡片 | `FamilyTreeGraph.tsx:1095-1136` | ✅ 已实现 |
| 框选批量操作 | `FamilyTreeGraph.tsx:1044-1093` | ✅ 已实现 |
| 关系计算查询 | `FamilyTreeGraph.tsx:607-631` | ✅ 已实现 |
| 永久链接 focus | `useTreeFocus` | ✅ 已实现 |
| 沙漏图 | `HourglassTree.tsx` | ✅ 已实现 |
| 右键菜单 | `FamilyTreeGraph.tsx:1139-1157` | ✅ 已实现（可扩展） |

---

## 三、待实施改良（按优先级）

### P0 — 架构重构（必须做）

| 项 | 内容 | 预估 |
|----|------|------|
| **P0.1 配偶复合节点** | 重构节点体系：新增 CoupleNode 类型，后端 `/api/family/<id>/tree` 接口扩展 `couples` 字段，前端 dagre 前合并夫妻，布局后拆分给 React Flow 渲染 | 3-4 天 |
| **P0.2 折叠改用 hidden** | dagre 一次性布局，折叠/展开只改 React Flow `node.hidden` 属性，不触发布局重排 | 0.5 天 |
| **P0.3 动态节点宽度** | 预计算每个节点的宽度，传给 dagre 的 `width` 参数，解决中文姓名 + 字/号/谥截断 | 1 天 |
| **P0.4 框选交互修复** | 用 `selectionKeyCode="Shift"` 替代全局 toggle，按 Shift 框选、不按平移 | 0.5 天 |

**P0 小计：5-6 天**

### P1 — 交互增强

| 项 | 内容 | 预估 |
|----|------|------|
| **P1.1 后处理紧凑化** | dagre 布局后：配偶 y 对齐 → 父节点水平居中于子的中位 → 跨代冗余间距压缩 → 边交叉最小化 | 2 天 |
| **P1.2 节点卡片视觉升级** | 性别色条（顶部）+ 生卒年行 + 世代/字辈行 + 在世/已故徽标 + 选中金色边框动画 | 2 天 |
| **P1.3 连线样式差异化** | 父子：实线棕 `#8b7355`，配偶：水平短横线 `#c0a060`（复合节点内），养父母：虚线 | 1 天 |
| **P1.4 右键菜单扩展** | 添加：编辑成员 / 删除 / 查看详情 / 复制链接 / 设为根节点 | 0.5 天 |

**P1 小计：5.5 天**

### P2 — 视觉与性能

| 项 | 内容 | 预估 |
|----|------|------|
| **P2.1 世代表尺视觉优化** | 代际渐变（松柏绿瀑布效果）+ 水墨风格字辈标签 + 世代数 | 1 天 |
| **P2.2 背景升级** | 宣纸纹理背景 / 水墨渐变 / 主题切换（明暗） | 1 天 |
| **P2.3 框选批量操作 UI** | 选中后浮出工具栏：批量删除 / 移分支 / 改世代 / 导出选中 | 1.5 天 |
| **P2.4 500+ 节点性能** | dagre 走 Web Worker + 分帧渲染 + LOD（远距离简化节点） | 2 天 |
| **P2.5 多妻支持** | spouseIds 数组化 + CoupleNode 多实例支持（分解为多个夫妻复合节点） | 1 天 |

**P2 小计：6.5 天**

**总计：约 17 天**（含缓冲）

---

## 四、后端接口变更

### 4.1 扩展 `/api/family/<id>/tree`

返回数据增加 `couples` 字段：

```typescript
interface FamilyTree {
  nodes: TreeNode[]
  edges: TreeEdge[]
  root_ids: number[]
  couples: Array<{
    husband_id: number
    wife_id: number
    children: number[]    // 子女 id 列表
    sort_order: number
    marriage_label?: string  // "原配" / "继室" / "侧室"
  }>
}
```

后端可在 `family_service.py:get_family_tree()` 中根据 `relationships` 推导夫妻对。

### 4.2 后端无需为新功能增加额外接口

---

## 五、实施建议

### 阶段一（P0 优先）

1. P0.2（折叠改 hidden，0.5 天）→ 直接影响性能感知，改动最小
2. P0.3（动态节点宽度，1 天）→ 解决中文截断
3. P0.1（配偶复合节点，3-4 天）→ 最大架构变更，需要前端+后端联调
4. P0.4（框选修复，0.5 天）→ 顺手修复

### 阶段二（P1 + P2 可视情况组合）

P1.2（卡片视觉）+ P2.1（世代标尺）+ P2.2（背景）三项视觉改进可打包并行，用户体验提升最直观。
