# 族谱树形图重构设计方案

## 概述

将现有 7 种独立视图（TreeVisualization、FanChart、HangingChart、FamilyTreeGraph、HourglassTree、TimelineView、Tree3DView）**合并为一个统一 React Flow 引擎**，彻底翻新视觉风格，解决"不好看/不直观"的核心痛点。

## 架构

```
FamilyTreePage → FamilyTreeEngine (统一入口)
                     │
           ┌─────────┼─────────┐
           │         │         │
       tree mode  fan mode  hanging mode
           │         │         │
           └─────────┼─────────┘
                     │
              dagre 布局器
                     │
             React Flow 渲染
```

### 文件结构

| 文件 | 职责 |
|------|------|
| `FamilyTreeEngine.tsx` | 引擎主体：状态管理 + 布局调度 + 渲染 |
| `FamilyTreeEngine.css` | 样式（@keyframes pulse 等） |
| `nodes/PersonNode.tsx` | 单人节点组件 |
| `nodes/CoupleNode.tsx` | 夫妻复合节点组件 |
| `edges/FamilyEdge.tsx` | 父子关系边线组件 |
| `hooks/useTreeLayout.ts` | 布局引擎（dagre + 模式切换） |
| `hooks/useTreeNodeState.ts` | 折叠/选中/高亮状态管理 |

### 布局模式

| 模式 | dagre 参数 | 说明 |
|------|-----------|------|
| tree | `rankdir=TB`, nodesep=60, ranksep=120 | 默认层级树 |
| fan | dagre 布局 → 径向坐标变换 | 以选中人为中心向外辐射 |
| hanging | `rankdir=TB` + 水平对齐 + 折线边 | 按代分行吊线 |

## 节点视觉

### 单人节点 (PersonNode)

```
┌──────────────┐
│  ▌           │  左侧性别色条 2px（男 #2563eb / 女 #ec4899）
│  [头像]      │  32px 圆形
│  张 三       │  大字姓名，已故加 †
│  字耀之      │  字/号显示
│  仁字辈      │  辈分
│  1968~2020   │  生卒年
│  ──────────  │  底部分隔线
└──────────────┘
```

- 背景：松柏绿渐变（世系颜色瀑布），饱和度降 20%
- 尺寸：动态宽度（`getNodeWidth` 预计算），固定高度 90px
- 折叠按钮：右上角 `+/-` 圆点
- 徽标：折叠时右下角紫色 `+N`

### 夫妻节点 (CoupleNode)

```
┌──────────────────────────┐
│  ┌────────┐   ───  ┌───┐│
│  │ 张三    │  ┼─── │李  ││  夫蓝底 / 妻粉底
│  │ 字耀之  │  │    │氏  ││  暖金边框 #927d5b
│  │ 仁字辈  │       │   ││  中间金色 ─ 连接符
│  └────────┘       └───┘│
└──────────────────────────┘
```

- 边框：暖金色 `#927d5b` 2px（区别于单人）
- 夫/妻半区：半透明蓝/粉底
- 底部统一 source handle

### 高亮状态

| 状态 | 边框颜色 | 效果 |
|------|---------|------|
| 金线溯源 (A1) | `#b08d57` 琥珀 | 淡金色光晕 |
| 金扇繁衍 (A2) | `#7ba17b` 墨绿 | 淡绿色光晕 |
| 关系路径 | `#c08494` 粉紫 | 淡紫色光晕 |
| 选中节点 | `#8b5cf6` 紫色 | 紫色边框 2px |
| 默认 | 性别色（男蓝/女粉） | 1px 细边 |

## 边线

- **父子边**：2px 银灰 `#94a3b8` 实线 + `▼` 箭头标记
- **高亮边**：3px 对应彩色 + 放大彩色箭头
- **选中边**：3px 蓝色 +「父子关系」标签
- **配偶关系**：不在 dagre 边中渲染，通过 CoupleNode 内部 `─` 体现
- **类型**：贝塞尔曲线，从父节点底部中心到子节点顶部中心
- **折叠控制**：折叠源节点的边连带 `hidden`

## 交互

| 操作 | 触发 |
|------|------|
| 平移 | 空白区拖拽 / 触屏单指 |
| 缩放 | 滚轮 / 双指捏合 / 按钮 |
| 折叠/展开 | 节点右上角 `+/-` |
| 悬停详情 | 鼠标悬停 → 弹出卡片（含姓名/字/号/生卒/年龄/简介） |
| 编辑 | 点击节点 → `onMemberClick` |
| 框选批量 | Shift + 拖拽 |
| 搜索定位 | 搜索浮层 → 平滑居中 |
| 高亮 | 工具栏切换金线溯源/繁衍 |
| fitView | 双击空白区 |
| 永久链接 | 右键 → 复制链接 |
| 布局切换 | 左上角下拉菜单（tree/fan/hanging） |

## 响应式

- `fitView` padding 0.15 自适应
- 缩放范围 0.05x ~ 2.5x
- 容器 `h-64 md:h-[600px]`
- 触摸优化：`touch-manipulation`

## 工具栏

```
左上：[布局 ▼] [金线 ▼] [搜索🔍] [关系🔗]
右上：[＋] [－] [⊞ fitView]
左侧：世代表尺
底部：批量操作栏（框选后出现）
```

## 数据流

```
GET /api/family/{id}/tree
  → { nodes, edges, root_ids, couples }
  → FamilyTreeEngine
    → useTreeLayout (dagre 布局)
      → 夫妻合并为复合节点
      → dagre 一次性布局
      → 布局后拆分为 React Flow 节点
    → React Flow 渲染
```

## 实施步骤

1. **创建新文件结构**：PersonNode.tsx、CoupleNode.tsx、FamilyEdge.tsx、useTreeLayout.ts、useTreeNodeState.ts、FamilyTreeEngine.tsx、FamilyTreeEngine.css
2. **实现 useTreeLayout**：dagre 布局器 + 夫妻处理 + 模式切换
3. **实现 PersonNode / CoupleNode**：新视觉风格 + 交互
4. **实现 FamilyEdge**：箭头 + 高亮
5. **实现 FamilyTreeEngine**：状态管理 + 工具栏 + 渲染
6. **替换 FamilyTreePage 中的视图切换**：去掉 6 个旧视图的 import，只保留 FamilyTreeEngine
7. **清理旧视图文件**（可选）
8. **测试与调优**
