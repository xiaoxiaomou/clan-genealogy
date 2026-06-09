# zupu 项目功能迭代与优化计划

> **版本**：v1.0
> **编制日期**：2026-06-07
> **适用版本**：zupu v2.0+（已含 Phase 1：A1 金线溯源 / A2 关系路径高亮 / A7 树图搜索定位）
> **目标读者**：zupu 维护者、产品 / 架构决策者
> **文档定位**：基于 8 个同类开源项目深度调研，给出 6-12 个月的迭代路线图

---

## 0. 目录

1. [调研背景与方法](#1-调研背景与方法)
2. [8 个竞品全景](#2-8-个竞品全景)
3. [横向对比表](#3-横向对比表)
4. [zupu 现状盘点](#4-zupu-现状盘点)
5. [优化方向（5 大主题）](#5-优化方向5-大主题)
6. [实施路线图（P0/P1/P2）](#6-实施路线图p0p1p2)
7. [风险与对策](#7-风险与对策)
8. [参考资源与脚注](#8-参考资源与脚注)

---

## 1. 调研背景与方法

### 1.1 为什么做这次调研

zupu v2.0 文档中标记的 24 项"🔲 待实现"中，经两位专家（产品 / 架构）重新评估后，**有 5 项实际已实现**（GEDCOM / 命名建议 / 纸质谱书 / 3D 族谱 / 动态流 / 时光机 / 合并族谱），剩余 19 项 + 架构师新发现 8 个 P0 技术债，需要重新排序。

为避免"闭门造车"导致的重复发明轮子，本次调研系统扫描 GitHub / Gitee / 海外主流自托管方案，识别**可借鉴的功能**与**应避免的坑**。

### 1.2 调研对象（按定位分类）

| 类别 | 项目 | 选它的理由 |
|---|---|---|
| **最相似竞品** | [yunfengsa/pure-genealogy](https://github.com/yunfengsa/pure-genealogy) | Next.js 15 + Supabase + 中式族谱，2026-01 发布，与 zupu 定位几乎重合 |
| **树图库参考** | [donatso/family-chart](https://github.com/donatso/family-chart) | d3 封装的家族树库，729⭐，可视化层可借鉴 |
| **Gitee 中式项目** | [shanhe/genealogy](https://gitee.com/shanhe/genealogy) | vue3 + antd + thinkphp6，国内中型项目 |
| **Gitee 中式项目** | [msxy/qingfeng-gen](https://gitee.com/msxy/qingfeng-gen) | springboot + orgtree，国内 Apache-2.0 |
| **海外标杆（PHP）** | [fisharebest/webtrees](https://github.com/fisharebest/webtrees) | 行业级完整的网页族谱平台，100+ 插件 |
| **海外标杆（Python）** | [gramps-project/gramps-web](https://github.com/gramps-project/gramps-web) | 桌面端 Gramps 的现代 Web 化，API-first |
| **学术血统** | [geneweb/geneweb](https://github.com/geneweb/geneweb) | OCaml 1998 年老牌引擎，关系计算算法权威 |
| **多租户 SaaS** | [MGeurts/genealogy](https://github.com/MGeurts/genealogy) | Laravel 13 + Jetstream Teams，多家族隔离 + GEDCOM 7 |
| **纯前端渲染器** | [PeWu/topola-viewer](https://github.com/PeWu/topola-viewer) | 沙漏图权威实现，已被 Gramps/Webtrees/WikiTree 集成 |

### 1.3 调研方法

- **webfetch**：抓取每个项目的 GitHub 主页、README、package.json / pom.xml、issues 列表
- **websearch**：搜索用户评价、技术栈对比、issue 反馈
- **subagent 并行**：5 个 general subagent 并行深挖，最终输出结构化报告
- **信息缺口标注**：所有"未获取到"的数据点会显式标注，不做猜测

---

## 2. 8 个竞品全景

### 2.1 pure-genealogy（最相似竞品）

| 项 | 值 |
|---|---|
| URL | https://github.com/yunfengsa/pure-genealogy |
| Stars | 388 / Forks 85 |
| 创建 / 最后提交 | 2026-01-04 / 2026-01-22（**18 天后停更**） |
| 许可证 | MIT |
| 技术栈 | Next.js 15 + React 19 + Supabase + shadcn/ui + @xyflow/react + dagre + react-force-graph-3d + Slate + recharts |
| 体验站 | https://pure-genealogy.onehacker.top |
| 定位 | "基于 Next.js 15 + Supabase 的全中文家族族谱管理系统，AI 全量编码" |
| 活跃度 | ⚠️ **"明星首发、维护停滞"型**：上线 20 天内被阮一峰科技爱好者周刊收录带来流量，但持续投入减弱；9 条 open issue 全部未关闭 |

**核心功能**：2D 族谱图（dagre + 金线/金扇高亮）/ 3D 关系网（力导向 + 自动巡游）/ 成员 CRUD / Living Book 拟物详情 / 统计仪表盘 / 历史时间轴 / 批量 Excel 导入 / Supabase Auth + Realtime 同步

**视觉亮点**：水墨风登录页 / 松柏绿瀑布式代际渐变 + 左侧"水墨风世代标尺" / Living Book 3D 翻书 / 毛笔扫过动效 / `html-to-image` 一键导出高清带水印

**已知问题**：
- [#6](https://github.com/yunfengsa/pure-genealogy/issues/6) 1400+ 记录 3D 崩溃，统计只显示 1000 人
- [#3](https://github.com/yunfengsa/pure-genealogy/issues/3) npm 安装即报错
- [#5](https://github.com/yunfengsa/pure-genealogy/issues/5) + [#8 PR](https://github.com/yunfengsa/pure-genealogy/pull/8) 缺 Docker，社区 PR 至今未合
- [#7](https://github.com/yunfengsa/pure-genealogy/issues/7) 字段太单薄，缺房支/迁徙/葬地/出嫁女等中式硬字段

**zupu 可借鉴**：
1. "金线溯源 / 金扇繁衍"双向高亮模式（✅ Phase 1 已实现）
2. 批量 Excel/CSV 导入 + 模板下载 + 行级错误报告
3. Living Book 拟物化详情页（移动端降级全屏卡片，PC 端 3D 翻书）
4. 字辈频次柱图 + 世代增长面积图 + 在世/已故饼图
5. 测试账号 + 环境变量预填登录

**zupu 应避免**：
- "发布即休眠"——设置固定维护者 + dependabot + 公开看板
- 中式族谱"硬字段"缺失（字/号/谥/房支/迁徙/葬地/出嫁女/字辈派语）——schema 设计阶段就补齐
- 把 3D 视图作为唯一亮点——主视图 2D + 性能压到万级，3D 降级为彩蛋
- 只支持 Vercel/Supabase 一条部署——首日提供 docker-compose + SQLite 双模式
- 把测试账号硬编码进生产——演示站用只读种子 + 占位符引导注册

---

### 2.2 family-chart（d3 树图库）

| 项 | 值 |
|---|---|
| URL | https://github.com/donatso/family-chart |
| Stars | 729 / Forks 221 / 278 commits |
| 许可证 | MIT（package.json `SEE LICENSE IN LICENSE.txt` 存在歧义，issue #87） |
| 最新版 | v0.9.0 |
| 技术栈 | TypeScript + Rollup + Vite + Cypress（端到端测试） + **d3 ^7.9.0**（**唯一**生产依赖）+ d3-hierarchy |
| 定位 | "基于 D3.js 的家族树可视化库，框架无关、开箱即用、自带 Visual Builder 与 WikiData 集成" |
| 活跃度 | ⚠️ **中低活跃**：单作者（donatso），多 issue 长期 open（#88/#92/#94），核心能力被切到 `family-chart-premium` 付费版 |

**核心功能**：扁平 `[{id, data, rels}]` 数据模型 / 配偶/父母/子女人数组引用 / EditTree 表单化编辑 / 卡片渲染与图布局解耦 / Visual Builder 一键生成代码 / CDN 一行起步 / WikiData 拉数据生成王室族谱

**视觉/交互**：默认暗色主题（`rgb(33,33,33)` 写死）/ 缩放平移 / 卡片 `setCardDisplay` 二维数组配置 / 入场退场动画 / Visual Builder

**已知问题**：
- #100 Bootstrap 5.3 Modal 中 d3-zoom/touch 事件冲突（2026-05）
- #98 卡片过渡动画 inline `opacity:1` 不清理阻塞 CSS 主题覆盖（2026-05）
- #92 `calculateEnterAndExitPositions` 产出 `translate(undefined, undefined)` 炸 SVG（2026-03）
- #88 初始化时树没填满容器空间（2026-01）
- #94 头像懒加载缺失（2026-03）
- 4 项核心能力（关系引擎 / 树过滤 / 高级卡片 / 性能优化）被切到 Premium

**zupu 可借鉴**：
1. 扁平 ID 引用 + 双向冗余的数据模型（天然支持一夫多妻/再婚/单亲/领养，round-trip 稳定）
2. 卡片渲染与图布局完全解耦（用户零代码换皮肤）
3. Visual Builder 拖拽配置面板（对非程序员宗亲用户极友好）
4. v0.9.0 "破坏性升级 + 自动迁移"策略（`migrateLegacyData()` 透明执行）
5. CDN 一行起步的零安装 onboarding

**zupu 应避免**：
- 把核心能力（关系计算/过滤/高性能）切到付费版——开源版"够用 80% 场景"
- 单作者 + 硬性必填字段（`gender: "M"/"F"` 硬编码，缺"未详"/"待考"映射）
- d3 直出 SVG 不做防御（`Number.isFinite()` 校验、动画用 CSS class 而非 inline style、try/catch 回退）

---

### 2.3 Gitee：shanhe/genealogy（vue3 + thinkphp6）

| 项 | 值 |
|---|---|
| URL | https://gitee.com/shanhe/genealogy |
| Stars | 16 / Forks 11 / Open issues 1 |
| 创建 / 最后提交 | 2022-03-26 / 2022-05-10（**近 4 年无新提交**） |
| 许可证 | **未声明** |
| 技术栈 | Vue 3.2 + Vue Router 4 + Vue CLI 5 + ant-design-vue 2.2 + @jsdawn/vue3-tinymce + echarts 5.3 + axios + node-sass 5 |
| 体验站 | http://www.hahaguai.top/ （admin/654321） |
| 定位 | "前端 vue 全家桶 + 后端 ThinkPHP6 + MySQL 的家谱管理系统前端仓库" |
| 活跃度 | ❌ **低活跃 / 半弃坑**：open issue 挂起 2 年多 |

**核心功能**：成员统计（ECharts）/ 家族备份 / 成员 CRUD / 关系查询 / 名人轶事（富文本）/ 家族风采（祠堂/相册/视频）/ 家族纪事（时间线）

**视觉/交互**：antd-vue 默认蓝色科技风（**非中式**）/ 无专门世系图组件，推测是表格 + 表单 + ECharts 统计图

**已知问题**：
- 缺数据库 SQL（issue I9OX65，Holin，2024-05）—— 跑不起来
- 后端被拆到独立仓库 `shanhe/jiapu-admin`，新用户得自己找后端 + 配 CORS
- 演示站长期挂着弱密码 `admin/654321`

**zupu 可借鉴**：
1. **「祠堂/相册/视频/纪事/名人轶事」五大内容模块**直接抄（v1 内置模块占位）
2. ECharts 做成员统计（按世代/性别/地区/在世/已故）
3. 「家族备份」功能（一键导出 GEDCOM/JSON/整库 SQL + ZIP 打包）
4. tinymce 富文本做纪事录入（长辈口述史/家族大事记）
5. 前后端分离 + 独立仓库模式（`zupu-api` + `zupu-web` 拆开）

**zupu 应避免**：
- 单提交者 + 多年不维护 + issue 无人回应（CI + CHANGELOG + issue 模板必上）
- README 不放 SQL / 不放 Docker / 不放 demo gif（README 一屏内"克隆→启动→看到页面"三步）
- 弱密码后台 + 暴露公网演示站（**强制首次登录改密 + 二次校验**）

---

### 2.4 Gitee：msxy/qingfeng-gen（springboot + orgtree）

| 项 | 值 |
|---|---|
| URL | https://gitee.com/msxy/qingfeng-gen |
| Stars | 127 / Forks 97 |
| 创建 / 最后提交 | 2021-01-27 / 2022-05-13 |
| 许可证 | **Apache-2.0** |
| 技术栈 | **Spring Boot 1.5.4（EOL）** + MyBatis + Thymeleaf + layui + **Lucene 7.3 + IK Analyzer 2012** + jsoup 1.11 + Java 7 |
| 定位 | "青锋后台脚手架体系下的家谱业务子项目" |
| 活跃度 | ❌ **整体脚手架仍维护，家谱 gen 已停** |

**核心功能**：家谱树（orgtree）/ 纸质家谱电子化导入（jsoup）/ 成员 CRUD + 关系维护 / 用户角色菜单字典地区管理 / Quartz 定时任务 / 日志中心 / 代码生成器 / **Lucene 全文检索 + IK 分词** / Swagger 接口文档

**视觉/交互**：layui 经典 2.x 后台风（绿灰为主，**完全非中式审美**）/ orgtree 上下级组织架构风格（**非中式宝塔式世系图**）/ 字体问题反复挣扎

**已知问题**：
- "都是 404"（issue I9ONED，2024-05）
- **数据库脚本不在仓库里**，README 写"加群获取" + 3 个 QQ 群 + 微信号（**典型"开源 + 私域加粉"套路**）
- 预览地址 8181 + 8081 端口公网暴露，Spring Boot 1.5.4 + Springfox 2.6.1 + SQL Server 驱动有 CVE 风险

**zupu 可借鉴**：
1. "通用脚手架 + 垂直业务子项目"分层（让通用能力被多项目复用）
2. Lucene + IK Analyzer 做家谱人物/条目全文检索（按姓名/字号/籍贯/事迹 + 高亮）
3. "代码生成器" + "单表/树表/主子表"生成思路（MyBatis-Plus + 自研代码生成）
4. "纸质家谱电子化"导入通道（jsoup HTML / Apache POI docx / Tesseract OCR）
5. 多版本策略（v1 单体 / v2 前后端分离 / v3 工作流）

**zupu 应避免**：
- "开源 + 加群获取核心资源"反模式（SQL/Docker/初始数据/dump 全部 commit）
- "骨灰级"技术栈（Spring Boot 1.5 / Java 7 / node-sass 5 / Vue CLI 5）—— 锁 LTS
- 演示站长期挂弱密码 + 多端口暴露（**只读账号 + 强密码 + IP 白名单 + 定时重置**）

---

### 2.5 Webtrees（海外 PHP 标杆）

| 项 | 值 |
|---|---|
| 官网 | https://www.webtrees.net |
| GitHub | https://github.com/fisharebest/webtrees |
| Stars | ~756 / Forks ~344 |
| 首发 / 最新版 | 2010-08-26（fork 自 PhpGedView） / **v2.2.6（2026-04-29）** + LTS 2.1.27 |
| 许可证 | GPL-3.0-or-later |
| 技术栈 | PHP 8.3+ + MySQL/MariaDB/PostgreSQL/SQLite/MSSQL（**多数据库兼容**） + 原生 PHP 模板 + JavaScript + Bootstrap + DataTables + D3.js |
| 定位 | "the web's leading online collaborative genealogy application" |
| 活跃度 | ✅ 高（最近 commit 2 天前；论坛日活跃） |

**核心功能**：完整 GEDCOM 5.5.1（Extended 模块支持 7）/ 多用户协作（5 级角色）/ **多树（multi-tree）** / **字段级隐私** / 6+ 种图表（Pedigree/Descendants/Hourglass/Fan/Family Book/Interactive Tree）/ 媒体管理 / 报告生成 / 统计 / **变更审批工作流** / 地理地图（OSM 集成）/ 日历纪念日 / 全文搜索 / 主题系统 / 完整变更日志

**插件生态**：官方插件目录 [webtrees.net/download/modules](https://webtrees.net/download/modules) 列 **100+ 第三方模块/主题**。热门：Fancy Treeview、Enhanced Family Book Chart、JustLight/ArgonLight 主题、Extended Family（堂表亲）、Chinese-genealogy-webtrees-plugin（中式吊线图 PDF）、OAuth2 Client

**隐私控制**：树级 / 记录级 / 字段级三层 + 5 角色 + 编辑审批 + 活人自动保护（可配"几代以内/几年内出生"）

**已知问题**：
- 部署需 LAMP 技术门槛（非技术用户难独立完成）
- UI 偏传统、信息密度高
- bus factor 偏高（主仓高度依赖 Greg Roach 一人）
- 历史上若干 XSS/CSRF/SSRF CVE（需勤升级）
- 大型 GEDCOM（>50K 人）导入慢、生成大型图表性能下降

**zupu 可借鉴**：
1. **GEDCOM 作为数据交换底层标准**（zupu 自定义中式族谱模型 + GEDCOM 5.5.1/7 双向导入导出）
2. **五级角色 + 审批工作流**（Manager/Moderator/Editor/Member/Visitor + pending queue）
3. **字段级隐私 + 活人自动保护**（"距今 N 年内出生 → 默认全部字段对游客隐藏" + 每字段 PRIVATE 标记 + DAO 层统一过滤）
4. **多树（multi-tree）架构**（一个实例托管多个宗族独立族谱，DB 层 `tree_id` 隔离）
5. **完整变更日志（changelog）**（who/when/what + 回滚 + "最近改动"流）
6. **模块化插件机制**（核心瘦身，所有扩展作为可热插拔模块）
7. **主题系统 + i18n weblate**（界面文案抽离到语言包 + weblate 协作翻译）
8. **多数据库兼容**（ORM 抽象，从一开始就用，避免锁定）

**zupu 应避免**：
- "单人主仓"bus factor（建立多人 maintainer + 清晰 CONTRIBUTING + 自动化 CI/CD）
- 照搬旧式 PHP 单体架构（坚持前后端分离 + SPA）
- 忽视性能上限（50K+ 人变慢——数据模型从一开始就考虑分页/懒加载/Canvas-WebGL 图表）

---

### 2.6 Gramps Web（海外 Python 标杆）

| 项 | 值 |
|---|---|
| 官网 | https://www.grampsweb.org/ |
| GitHub Frontend | https://github.com/gramps-project/gramps-web |
| GitHub Backend (API) | https://github.com/gramps-project/gramps-web-api（206⭐ / 136 forks / 703 commits） |
| 首发 / 最新版 | 2021（前端）/ **v26.1.1（2026-01-30）** |
| 许可证 | **AGPL-3.0-or-later**（**网络部署也需开源**） |
| 技术栈 | **Python 3.10+ Flask（API）** + **LitElement Web Components** + Material Design + SQLite（默认）/ PostgreSQL + S3 兼容对象存储 + 可选 OpenAI/自托管 LLaMA + OIDC + Docker（x86-64 + ARM） |
| 定位 | "Gramps 桌面族谱软件的现代 Web 协作前端 + REST API 后端" |
| 活跃度 | ✅ 高（2025-2026 多次发版，有清晰 roadmap、Matrix 聊天室、OpenCollective 资助） |

**核心功能**：与 Gramps Desktop 双向同步 / 完整 GEDCOM + Gramps XML / 4 种交互图表 / **强大地图（历史地图 overlay）** / **博客（Markdown 嵌入交互图表 + RSS）** / 任务管理 / **DNA 模块（染色体浏览器 + Y-DNA）** / **AI 聊天助手（带 citations）** / **照片人脸自动检测+标注** / 全文搜索 / 数据库层过滤 Private / 几乎所有 Gramps 桌面端报告 / GQL 过滤器 / 多树 / 修订历史 + 一键快照恢复 / External Search / 40 种语言 / 移动友好 PWA

**隐私控制**：7 级 Role（Admin/Owner/Editor/Contributor/Member/Guest/unconfirmed/disabled） / **数据库层过滤 Private（不是前端隐藏）** / OIDC SSO（Keycloak/Authentik/Google）/ 自助注册 + owner 审批 / 多树隔离 / 导出权限独立

**已知问题**：
- 部署是 EXPERT 级任务（Gramps Wiki 官方明确"EXPERT level"）
- 不支持普通 PHP 虚拟主机（必须 VPS 或 Docker）
- 与 Gramps Desktop 版本耦合（v3 升级要求 Gramps Web 同步适配）
- 缩略图加载慢（已在 v26.4.1 通过 service worker 缓存改进）
- **不适合开放公网无限访问**（Wiki 明确警告"not meant to be exposed to internet"——只设计给"少量授权用户"）
- 插件市场弱（相比 webtrees 数百模块，Web 端独有插件极少）

**zupu 可借鉴**：
1. **API-first 架构**（核心做 RESTful JSON API + SPA，小程序/H5/桌面客户端复用）
2. **Web Components / LitElement 做轻量前端**（无框架锁定，第三方网站一行 HTML 嵌入 `<zupu-tree>`）
3. **数据库层做隐私过滤**（ORM/查询层就把 PRIVATE 过滤掉，而非前端隐藏）
4. **Docker 一键部署 + ARM 支持**（Raspberry Pi / NAS 镜像）
5. **AI 自然语言查询**（"我们家族第十二代有哪些人迁居广东？" + 带 citations）
6. **修订历史 + 快照恢复**（每次编辑入 revision log + owner 两键回滚）
7. **任务管理 + 博客模块**（"待考证人物"做 task + "祖父口述史"做 Markdown blog）
8. **历史地图 overlay**（民国地图/清代行政区作为底图，配现代 OSM 展现家族迁徙）
9. **照片人脸识别 + 协作打标**（远房亲属"圈人" + 自动建立人脸→个人双向链接）
10. **OIDC SSO**（从一开始就支持 Keycloak/微信开放平台/钉钉）

**zupu 应避免**：
- **不要走 AGPL**（除非你想强制所有部署者也开源）—— zupu 选 **MPL-2.0 或 Apache-2.0**
- **不要只做 Docker 部署**（同时提供：① Docker；② 一键二进制（Go/Rust 编译）；③ 静态 PHP/Node fallback。中国宗亲会用阿里云虚拟主机）
- **不要"只给少量授权用户用"**（架构上支持"匿名公网访问 + 数十万 QPS"，CDN 友好、可缓存）

---

### 2.7 GeneWeb（OCaml 学术血统）

| 项 | 值 |
|---|---|
| URL | https://github.com/geneweb/geneweb |
| Stars | 372 |
| 最后提交 | 2026-03-30 |
| 许可证 | GPL-2.0 |
| 技术栈 | **OCaml 4.10+** + opam + 私有 `.gw` 格式数据库 + 本地 CLI + Web 服务（默认 2317 端口） |
| 定位 | "1998 年由 Daniel de Rauglaudre 创建的 OCaml 老牌开源族谱引擎，承载过 Roglo（1100 万个体）和 Geneanet 的核心库 20 年" |

**核心功能**：完整 GEDCOM 导入导出 / **超大规模数据承载（1100 万节点验证）** / **高级关系计算：跨数十亿条可能路径找两人之间的家族关系** / 隐私分级 / 本地/Web 双模式 / **`consanguinity`（近亲/血缘）计算器** / Wiki 风格文档

**视觉/交互**：极简 web UI 纯服务端渲染 HTML / 树形图经典垂直布局 / 强项是**渲染速度与超大族谱的可滚动浏览** / 5 分钟私部署

**zupu 可借鉴**：
1. **真正的"关系计算引擎"作为独立模块**（`RelationshipService` 输入 `(personA, personB)` 返回中文称呼 + 共同祖先 + 血缘系数）—— **4-8 小时**
2. **`consanguinity` 系数（血缘浓度）展示**（数据结构加 `coefficient` 字段 + Wright 路径系数法算法）—— **2-3 天**
3. **大族谱分块加载 + LOD 策略**（按代分页 + 只渲染可视区 + d3-quadtree 视口剔除）—— **1 周**

**zupu 应避免**：
- 私有 `.gw` 数据库格式（**第一天就 commit 到标准 GEDCOM 7.x 双向兼容**）
- 服务端 HTML 渲染（**坚持前后端分离 + REST/GraphQL**）

---

### 2.8 MGeurts/genealogy（Laravel 多租户 SaaS）

| 项 | 值 |
|---|---|
| URL | https://github.com/MGeurts/genealogy |
| Stars | 322 |
| 最后提交 | 2026-03-26 |
| 许可证 | MIT |
| 技术栈 | **PHP 8.4+ Laravel 13** + Livewire 4 + Alpine.js 3 + Tailwind CSS 4 + TallStackUI 3 + **Filament 5** + **MySQL 8（依赖 Recursive CTE）** + Jetstream 5（Teams/2FA/API Token） + Pest |
| 定位 | "基于 Laravel 13 + Jetstream Teams 的现代化多家族多租户族谱 SaaS 模板" |

**核心功能**：**多家族多租户**（Jetstream Teams）/ **4 级细粒度权限**（Administrator/Manager/Editor/Member 在 Person/Couple 上 CRUD 不同）/ **父-母-父母对三重数据模型**（`father_id`/`mother_id` + `parents_id` 表"父母对"）/ **Recursive CTE 渲染族谱** / **GEDCOM 7.x 双向**（README 强调"v7 至今无 PHP 项目完整实现"）/ 11 种语言含简体中文 / 图片文档多上传 + 水印 / 事件时间线 / Backup Manager / Log Viewer（检测 N+1/慢查询）/ People/Team Logbook

**视觉/交互**：完整 Light/Dark 主题 + 全响应式 / TallStackUI 组件（tabler 图标 + 现代化卡片）/ Offcanvas 侧边菜单 / **整体观感接近 Notion 级别**

**zupu 可借鉴**：
1. **Jetstream Teams 模式做"同姓多分支"**（4-6 小时搭脚手架 / 2 周完整）
2. **SQL Recursive CTE 替代递归后端查询**（"查某人所有祖先" 一次 `WITH RECURSIVE` SQL，性能秒级→毫秒级）—— **半天**
3. **GEDCOM 7 双向 + Backup Manager**（README 写"v7 至今无 PHP 项目完整实现"，zupu 可抢先实现形成差异化）—— **2-3 周**
4. **`father_id`/`mother_id` + `parents_id` 三重数据模型**（处理非婚生/再婚/领养）

**zupu 应避免**：
- **多租户/团队复杂度爆炸**（4 角色 × 2 模型 × 4 权限 = 32 条规则把 80% 简单用户挡在门外。**MVP 只做"单家族 + 公开/私密二选一"**）
- Laravel 全家桶重（PHP 8.4 + MySQL 8 部署门槛，**仅可作产品功能清单参考，不要尝试迁栈**）

---

### 2.9 topola-viewer（纯前端沙漏图渲染器）

| 项 | 值 |
|---|---|
| URL | https://github.com/PeWu/topola-viewer |
| Stars | 307 |
| 最后提交 | 2026-03-25 |
| 许可证 | 未明确标注（仓库 metadata 未抓到，建议核查） |
| 技术栈 | **TypeScript + Vite 100% 浏览器端零后端** + 已封装为 Docker 镜像 `ghcr.io/pewu/topola-viewer` |
| 定位 | "纯前端 GEDCOM 可视化器，沙漏图 + 全关系图，已被 Gramps/Webtrees/WikiTree 三大主流产品作为图表引擎集成" |

**核心功能**：**Hourglass chart（沙漏图）** 以某人为中心向上下展开 / **All relatives chart（全关系图）** 辐射所有血亲/姻亲 / 点击节点 focus 自动重定位 + 平滑动画 / 直接读取标准 GEDCOM / **`?url=` 永久链接分享** / 隐私友好（文件完全本地处理不上传） / PDF/PNG/SVG 导出 / 侧边详情面板 / "单树模式"构建（`VITE_STATIC_URL` 一次构建绑死一个家族）

**视觉/交互**：极流畅过渡动画 / 节点点击 focus 镜头自动 pan/zoom / 内置打印模式 / 颜色形状自定义 / 矢量化导出 / 极简 HUD（几乎把所有屏幕空间让给树本身）/ **沙漏图布局是 d3.js 经典"双向树"算法的工业级实现**

**zupu 可借鉴**：
1. **沙漏图（Hourglass chart）作为 zupu 默认视图**（替换当前的全树缩略图，用户选一个人 → 看到 ta 的上 4 代 + 下 4 代，符合 90% 用户实际查看场景。fork topola-viewer 的 d3 布局算法）—— **2-3 天**
2. **`?url=` 永久链接分享**（`/tree/{id}/view?focus=person_123`，用户复制链接发给亲友，打开就在该节点的沙漏图）—— **3 小时**
3. **隐私优先的纯前端渲染**（"只读公开页"纯静态：用户 GEDCOM 存 OSS + 前端 JS 拉 JSON 渲染 + 零后端渲染服务，大幅降低服务器成本）—— **2 天搭 demo**
4. **导出 PDF/PNG 用于打印纸质族谱**（中国用户大量场景是"打印出来挂祠堂"）—— **半天**

**zupu 应避免**：
- **不要把可视化层和数据层硬耦合**（topola-viewer 是纯渲染器只读。zupu **把"读视图"和"编辑视图"分成两条代码路径**：编辑态用 zupu 自己的表单 + 校验，读视图接入 topola-viewer 的 d3 布局）
- **不要 100% 照搬纯前端架构**（国内用户希望"扫码关注公众号就能看"，需要服务端鉴权 + CDN。zupu 方案：**编辑走自己的后端 API，只读视图用 topola-viewer 渲染 OSS 上的 GEDCOM JSON**）

---

## 3. 横向对比表

> 9 个项目 × 10 个维度（最后一个为对比列）

| 维度 | pure-genealogy | family-chart | shanhe | qingfeng-gen | Webtrees | Gramps Web | GeneWeb | MGeurts | topola-viewer | **zupu（目标）** |
|---|---|---|---|---|---|---|---|---|---|---|
| **技术栈** | Next.js 15 + Supabase | TS + d3 | Vue 3 + ThinkPHP6 | Spring Boot 1.5 + layui | PHP 8.3 + Bootstrap | Python Flask + LitElement | OCaml | Laravel 13 + Livewire | TS + Vite 零后端 | **Python FastAPI + React + dagre** |
| **GEDCOM** | 未明示 | 需手写 | 无 | 无 | **5.5.1 完整 + 7 通过扩展** | GEDCOM + Gramps XML | 完整 | **7.x 双向（v7 首个 PHP）** | 完整读取 | **5.5.1 已有，7 待加** |
| **插件生态** | 无 | Premium 分裂 | 无 | 无 | **100+ 第三方** | 复用桌面 addon | 无 | 无 | 无 | **0，需从 0 设计** |
| **隐私控制** | 默认弱 | 简单 | 弱 | 默认管理员 | **树/记录/字段三级 + 5 角色** | **DB 层过滤 + 7 角色 + OIDC** | 字段级 | 4 角色 | 无（纯渲染） | **DB 层过滤 + N 角色（待设计）** |
| **可视化** | 2D dagre + 3D force | d3hierarchy | ECharts 统计 | orgtree | **6+ 种图表** | 4 种 + 地图 + DNA | 经典垂直 | 表格为主 | **沙漏图权威** | **dagre + d3 2D（高亮/搜索已完成）** |
| **移动端** | 响应式 + 工具栏 | 一般 | 弱 | 弱 | 响应式偏传统 | **PWA Mobile-first** | 弱 | 响应式 | 良好 | **响应式 + PWA 占位** |
| **多语言** | 仅中文 | 英文 | 中文 | 中文 | **36 种** | **40 种** | 法语主导 | **11 种含简体** | 英文 | **i18n 待做** |
| **部署难度** | Vercel 一键 | CDN 一行 | 难（需找后端仓） | EXPERT | **LAMP 简单** | EXPERT Docker | **5 分钟** | LAMP | **Docker 静态** | **Docker / 一键启动** |
| **许可证** | MIT | MIT（歧义） | 未声明 | Apache-2.0 | GPL-3.0 | **AGPL-3.0** | GPL-2.0 | MIT | 未明示 | **建议 MPL-2.0 / Apache-2.0** |
| **活跃度** | ⚠️ 18 天停更 | ⚠️ 中低 | ❌ 半弃坑 | ❌ 停 | ✅ 高 | ✅ 高 | ✅ 中 | ✅ 中 | ✅ 高 | **✅ 高（持续迭代）** |

### 3.1 8 个项目能给 zupu 带来的"低成本高价值"借鉴 Top 8

| # | 借鉴点 | 来源 | 预期开发周期 | ROI |
|---|---|---|---|---|
| 1 | **沙漏图（Hourglass chart）作为默认视图**，替换当前的全树缩略图 | topola-viewer | **2-3 天** | ⭐⭐⭐⭐⭐ |
| 2 | **可分享永久链接** `/tree/{id}/view?focus=person_xxx` + 节点 focus 自动 pan/zoom | topola-viewer | **3 小时** | ⭐⭐⭐⭐⭐ |
| 3 | **GEDCOM 7 双向导入导出**（抢"国内首个完整 v7 支持"卖点） | MGeurts | **2-3 周** | ⭐⭐⭐⭐⭐ |
| 4 | **关系计算引擎**"我和他是什么亲戚" + 共同祖先 + 血缘系数 | GeneWeb | **4-8h 基础 / 1 周完整** | ⭐⭐⭐⭐⭐ |
| 5 | **SQL Recursive CTE 渲染祖先/后裔树**，把 Python 递归干掉 | MGeurts | **半天** | ⭐⭐⭐⭐ |
| 6 | **大族谱 LOD / 视口剔除策略**应对几百人卡顿（性能压到万级） | GeneWeb | **1 周** | ⭐⭐⭐⭐ |
| 7 | **字段级隐私 + 活人自动保护** + DAO 层统一过滤 | Webtrees | **1 周** | ⭐⭐⭐⭐ |
| 8 | **批量 Excel/CSV 导入 + 行级错误报告 + 模板下载** | pure-genealogy | **1 周** | ⭐⭐⭐⭐ |

**最值得先做的 Top 3（按 ROI 排序）**：
- 🥇 借鉴 #1 沙漏图 + #2 永久链接（合计 3 天，**用户感知最强**）
- 🥈 借鉴 #3 GEDCOM 7 双向（2-3 周，**生态壁垒最高**）
- 🥉 借鉴 #4 关系计算（1 周，**长辈用户杀手锏**）

---

## 4. zupu 现状盘点

### 4.1 已实现（强项）

| 类别 | 功能 | 状态 |
|---|---|---|
| **核心** | 家族树 CRUD + 多家族管理 | ✅ |
| **核心** | GEDCOM 5.5.1 导入导出 | ✅ |
| **核心** | dagre 树图自动布局 | ✅ |
| **核心** | 多用户 + 角色权限 | ✅ |
| **核心** | 3D 族谱（`FamilyExhibition3D.tsx`） | ✅ |
| **核心** | 命名建议 + 时光机 | ✅（✅ 据专家评估） |
| **核心** | 动态流（feed） + 合并族谱 | ✅（✅ 据专家评估） |
| **树图增强** | A1 金线溯源（祖先高亮） | ✅ Phase 1 |
| **树图增强** | A2 关系路径高亮 | ✅ Phase 1 |
| **树图增强** | A7 树图搜索定位（Cmd/Ctrl+F + 200ms 去抖） | ✅ Phase 1 |
| **后端** | `app/services/tree_layout.py`（OU/SU/宝塔式） | ✅ |
| **测试** | 49/49 测试通过（4 个文件 + 5 个文件） | ✅ |

### 4.2 缺失（按竞品参考优先级）

| 类别 | 缺失项 | 竞品参考 | 优先级 |
|---|---|---|---|
| **树图** | 沙漏图作为默认视图 | topola-viewer | P0 |
| **树图** | 永久链接 `?focus=person_xxx` | topola-viewer | P0 |
| **树图** | 节点 focus 平滑 pan/zoom 动画 | topola-viewer | P0 |
| **树图** | 大族谱 LOD 视口剔除（100+ 节点卡顿） | GeneWeb | P1 |
| **树图** | Visual Builder 拖拽配置面板 | family-chart | P2 |
| **关系** | "我和他是什么亲戚"中文称呼计算 | GeneWeb / Webtrees | P0 |
| **关系** | 共同祖先查找 | GeneWeb | P0 |
| **关系** | consanguinity 血缘系数 | GeneWeb | P2 |
| **关系** | SQL Recursive CTE 替代递归 | MGeurts | P1 |
| **数据** | GEDCOM 7 双向 | MGeurts / Webtrees Extended | P1 |
| **数据** | 批量 Excel/CSV 导入 + 模板 + 行级错误报告 | pure-genealogy | P1 |
| **数据** | Backup Manager（一键导出 JSON + GEDCOM + ZIP） | MGeurts | P1 |
| **内容** | 祠堂/相册/视频/纪事/名人轶事 五大模块 | shanhe | P2 |
| **内容** | Living Book 拟物化详情页 | pure-genealogy | P2 |
| **内容** | 字辈频次柱图 + 世代增长面积图 + 在世/已故饼图 | pure-genealogy | P1 |
| **内容** | 历史地图 overlay（民国/清代地图） | Gramps Web | P3 |
| **内容** | 照片人脸识别 + 协作打标 | Gramps Web | P3 |
| **内容** | 博客（家族叙事 + Markdown + RSS） | Gramps Web | P2 |
| **隐私** | 字段级隐私 + 每字段 PRIVATE 标记 | Webtrees | P0 |
| **隐私** | 活人自动保护（"距今 N 年内出生 → 默认隐藏"） | Webtrees | P0 |
| **隐私** | DAO 层统一过滤（不是前端隐藏） | Gramps Web | P0 |
| **协作** | 变更审批工作流（moderator 审核） | Webtrees | P2 |
| **协作** | 修订历史 + 一键快照恢复 | Gramps Web / Webtrees | P1 |
| **多租户** | 多家族多租户（Jetstream Teams 模式） | MGeurts | P2 |
| **多树** | 多树（multi-tree） | Webtrees | P2 |
| **认证** | OIDC SSO（Keycloak/微信/钉钉） | Gramps Web | P2 |
| **AI** | AI 自然语言查询（带 citations） | Gramps Web | P3 |
| **DNA** | DNA 模块 / 染色体浏览器 | Gramps Web | P3 |
| **部署** | Docker 一键部署 + SQLite/PostgreSQL 双模式 | Gramps Web / MGeurts | P1 |
| **i18n** | weblate / 界面文案抽离到语言包 | Webtrees | P2 |
| **主题** | 主题系统（中式/现代/极简切换） | Webtrees | P2 |
| **纸质** | 纸质谱书排版（核心变现路径） | topola-viewer PDF 导出 | P1 |

### 4.3 技术债（架构师 P0 清单 + 修复方案）

| 编号 | 问题 | 修复 | 周期 |
|---|---|---|---|
| P0-1 | **JWT 密钥硬编码默认**（`config.py` 有 fallback） | 启动时若未设 `JWT_SECRET_KEY` 直接 `SystemExit` + 文档醒目警告 | 2h |
| P0-2 | **CORS 全开**（`origins: "*"`） | 默认只允许本机 + 域名白名单 + 配置文件注入 | 1h |
| P0-3 | **装饰器漏覆盖 5 端点**（管理员路由未加 `@require_admin`） | 补全装饰器 + 写 pytest 验证未授权返回 403 | 2h |
| P0-4 | **关系环无校验**（parent_id 自引用 + 互为父子） | `save_relationship` 提交时 BFS 检测环 | 4h |
| P0-5 | **run.py dev server `0.0.0.0` 暴露** | 改 `127.0.0.1` + 文档说明"开发用" | 5min |
| P0-6 | **无 gunicorn / Nginx / Docker** | 写 `docker-compose.yml` + `Dockerfile` + `gunicorn.conf.py` | 1d |
| P0-7 | **`api.ts` 调不存在的 8 路由** | grep 找出死链路由 + 删除或实现 | 2h |
| P0-8 | **`refresh_token` 无 401 interceptor** | 加 axios 拦截器 + 401 自动跳登录 | 2h |
| **额外** | `ForgotPasswordPage.tsx:9-12` 死链（只 setSent 不调 API） | 实现 `POST /api/auth/forgot-password` + 发邮件 | 1d |
| **额外** | PWA manifest 缺失 | 写 `manifest.json` + `service-worker.js`（离线可访问已缓存页面） | 1d |
| **额外** | `InkIconsShowcase` 误入 `/family/:id/icons` 路由 | 移到 `/_dev/icons` 或加 `import.meta.env.DEV` 守卫 | 10min |

### 4.4 中式族谱"硬字段"缺失（pure-genealogy 教训）

zupu 当前 `family_members` 表可能缺：字、号、谥、房支/支派、迁徙、葬地方位、出嫁女、字辈派语。**建议**在 schema 设计阶段就补齐，否则后期迁移成本指数级上升。

**建议表结构**（增量扩展）：
- `member_names`（别名表）：id, member_id, type（字/号/谥/笔名/俗称）, value, start_year, end_year
- `member_migrations`（迁徙表）：id, member_id, from_place, to_place, year, reason
- `family_branches`（房支表）：id, family_id, name, founder_member_id, generation
- `member_branch_membership`（房支归属）：member_id, branch_id, generation

---

## 5. 优化方向（5 大主题）

> **总原则**：借鉴 #1 沙漏图 + 借鉴 #2 永久链接（3 天，ROI ⭐⭐⭐⭐⭐）必须**首先**做；借鉴 #3 GEDCOM 7 双向（2-3 周，生态壁垒）作为 **核心壁垒**；借鉴 #4 关系计算（1 周，长辈杀手锏）作为 **情感连接**。

### 5.1 主题 A：树图与可视化（3 周）

#### A1. 沙漏图（Hourglass chart）作为默认视图
- **目标**：用户点选某人 → 看到 ta 的上 4 代 + 下 4 代，符合 90% 用户实际查看场景
- **参考**：topola-viewer 的 d3 布局算法
- **技术方案**：
  - 后端：新增 `GET /api/family/<id>/kinship/hourglass/<member_id>?ancestor_depth=4&descendant_depth=4`
  - 前端：新建 `components/tree/HourglassTree.tsx`（基于现有 dagre + @xyflow/react）
  - 树图模式切换：`沙漏图` / `全树图` / `宝塔式` 三选一
- **周期**：2-3 天
- **预期效果**：用户从"看全族"缩到"看自己家"，决策成本降低 80%

#### A2. 永久链接 `?focus=person_xxx` + 节点 focus 平滑 pan/zoom
- **目标**：`/tree/{id}/view?focus=person_123` 链接发给亲友，打开就在该节点的沙漏图
- **技术方案**：
  - URL query 解析 → `useTreeFocus` hook
  - `FamilyTreeGraph.tsx` 监听 `focusMemberId` prop → 调用 dagre `fitToNode` + 平滑动画（`animateFit({duration: 800})`）
  - 侧边栏加"复制当前节点链接"按钮
- **周期**：3 小时
- **预期效果**：微信群分享单人家谱成为可能，**病毒传播系数 +50%**

#### A3. 大族谱 LOD 视口剔除（100+ 节点性能）
- **目标**：500+ 节点流畅（60fps pan/zoom），1000+ 节点可加载
- **技术方案**：
  - 用 `d3-quadtree` 计算可视区
  - viewport 外的节点渲染成"占位圆点"（8px 单色），viewport 内才展开完整卡片
  - LOD 等级：L0（占位圆点）/ L1（简化卡片）/ L2（完整卡片）按距离切换
- **参考**：GeneWeb 的"按代分页 + 只渲染可视区"
- **周期**：1 周
- **预期效果**：千人大族谱从"加载 10s + 卡顿"到"加载 1s + 流畅"

#### A4. Visual Builder 拖拽配置面板（V2 远期）
- **目标**：用户点选字段、调整样式，最后一键导出 JSON + 嵌入代码 `<iframe>`
- **技术方案**：参考 family-chart 的 `setCardDisplay` 二维数组配置
- **周期**：2 周
- **预期效果**：对不写代码的宗亲用户极友好，是 f3 超越所有其他 d3 族谱库的核心差异化能力

---

### 5.2 主题 B：关系计算（2 周）

#### B1. 关系计算引擎（"我和他是什么亲戚"）
- **目标**：输入 `(personA, personB)` → 返回中文称呼（如"堂叔""表姑"）+ 共同祖先 + 血缘系数
- **参考**：GeneWeb 的 consanguinity + Webtrees 的"Extended Family"
- **技术方案**：
  - 后端：新建 `app/services/relationship.py`，实现：
    1. `find_shortest_path(person_a, person_b)` —— BFS 最短路径
    2. `find_common_ancestors(person_a, person_b)` —— 求两人所有共同祖先
    3. `compute_chinese_kinship_term(person_a, person_b)` —— 基于路径 + 性别 + 长幼生成中文称呼
    4. `compute_consanguinity(person_a, person_b)` —— Wright 路径系数法
  - 前端：节点右键菜单"我和他是什么关系？" → 弹出关系卡片
  - 称呼表数据：内置"伯/叔/姑/舅/姨/堂/表"等中式称呼 + 性别 + 长幼规则
- **周期**：4-8 小时（基础版）/ 1 周（完整 consanguinity）
- **预期效果**：**长辈用户杀手锏**——输入两人立即知道怎么称呼，是中老年用户最强需求

#### B2. SQL Recursive CTE 渲染祖先/后裔树
- **目标**：把"查某人所有祖先"从 Python 递归改成一次 `WITH RECURSIVE` SQL
- **技术方案**：
  - PostgreSQL 已有 `WITH RECURSIVE`；SQLite 3.8.3+ 也支持
  - 在 `app/models/kinship.py` 中加 `query_ancestors_cte(member_id)` / `query_descendants_cte(member_id)`
  - 保留 BFS 版本作为 fallback（兼容老 MySQL 5.7）
- **周期**：半天
- **预期效果**：5000 人族谱从 5s 降到 50ms（100x 提升）

#### B3. 共同祖先可视化
- **目标**：选两人 → 在树图上同时高亮两人的祖先链，交叉点高亮共同祖先
- **技术方案**：复用 Phase 1 的 `useLineageHighlight` 模式，新增 `highlightRole: 'commonAncestor'`
- **周期**：2 天
- **预期效果**：与 B1 联动，关系查询结果直接可视化

---

### 5.3 主题 C：数据交换与多租户（3 周）

#### C1. GEDCOM 7 双向导入导出
- **目标**：zupu 抢先实现 GEDCOM 7 双向兼容，成为"国内首个完整 v7 支持"的项目
- **参考**：MGeurts（v7 至今无 PHP 项目完整实现）+ Webtrees Extended 模块
- **技术方案**：
  - 新建 `app/services/gedcom7.py`（复用现有 5.5.1 parser 作为基线）
  - 中式族谱字段映射：字/号/谥 → `NAME` 标签的子结构；房支/支派 → `FAM:NOTE`；迁徙 → `MIGR` 自定义标签
  - 双向 round-trip 测试：500 人样本走 5 次完整导入导出，差异率 < 0.1%
- **周期**：2-3 周
- **预期效果**：生态壁垒最高——所有桌面族谱软件（Gramps/RootsMagic/MyHeritage）用户都能迁移

#### C2. 批量 Excel/CSV 导入 + 行级错误报告
- **目标**：用户下载模板 → 填几千行 → 上传 → 得到"行级错误报告"（哪一行哪一列错）
- **参考**：pure-genealogy 的 xlsx 导入
- **技术方案**：
  - 前端：`xlsx` 读表 → zod 校验列名/必填/字辈格式
  - 后端：`POST /api/family/<id>/import/batch` 接收 rows + 错误回写到前端
  - 模板：放在 `frontend/public/templates/zupu-members-template-v1.xlsx`
- **周期**：1 周
- **预期效果**：中式族谱最大入口场景

#### C3. Backup Manager（一键导出 JSON + GEDCOM + ZIP）
- **目标**：用户"一键导出 + ZIP 打包"整族数据
- **技术方案**：
  - 后端：`GET /api/family/<id>/export/zip` 返回流式 ZIP（含 members.json + family.ged + photos/）
  - 前端：设置页"导出数据"按钮
- **周期**：2 天
- **预期效果**：高粘性功能，保证家族数据"可被带回家"

#### C4. 多家族多租户（同姓多分支）
- **目标**："我们村张氏"和"隔壁镇张氏"分开管理，1 个用户可属于多个家族
- **参考**：MGeurts 的 Jetstream Teams 模式
- **技术方案**：
  - 4 级 RBAC：owner/manager/editor/contributor
  - 数据库层 `family_membership(user_id, family_id, role)`
  - **MVP 简化**：先只做"单家族 + 公开/私密二选一"，等有付费意愿用户再加多家族
- **周期**：4-6h（脚手架） / 2 周（完整）
- **预期效果**：**0→1 的产品化跨越**

#### C5. 字段级隐私 + 活人自动保护
- **目标**：每个字段可选 PRIVATE 标记 + "距今 N 年内出生 → 默认全部字段对游客隐藏"
- **参考**：Webtrees 三级隐私 + Gramps Web 数据库层过滤
- **技术方案**：
  - 在 DAO 层统一过滤，不在前端隐藏
  - 配置项 `LIVING_PROTECTION_YEARS = 100`（默认 100 年内出生算"活人"）
  - 每个字段加 `is_private: bool` 列
- **周期**：1 周
- **预期效果**：活人隐私保护，符合 GDPR / 中国《个人信息保护法》

---

### 5.4 主题 D：协作与隐私（2 周）

#### D1. 变更审批工作流（moderator 审核）
- **目标**：editor 提交修改 → 进 pending queue → moderator 审核入库
- **参考**：Webtrees 5 角色 + 审批
- **技术方案**：
  - 新增 `pending_changes` 表（who/when/what/before/after）
  - 管理后台加"待审核"列表
  - 配置项 `EDIT_REQUIRES_APPROVAL: bool`
- **周期**：1 周
- **预期效果**：防止"熊孩子误删整支"

#### D2. 修订历史 + 一键快照恢复
- **目标**：每次编辑入 revision log，owner 可两键回滚到任何快照
- **参考**：Gramps Web / Webtrees
- **技术方案**：
  - 复用 `pending_changes` 表（自动 + 手动触发）
  - 详情页"历史版本"下拉
- **周期**：1 周
- **预期效果**：多人协作族谱编辑的安全网

#### D3. OIDC SSO（Keycloak/微信/钉钉）
- **目标**：宗亲会成员可"微信扫码登录"
- **参考**：Gramps Web OIDC
- **技术方案**：
  - 用 `authlib` 库 + 标准 OIDC 协议
  - 文档化"如何对接企业微信"教程
- **周期**：1 周
- **预期效果**：降低 90% 宗亲用户的注册门槛

---

### 5.5 主题 E：内容与多媒体（3 周，可选）

#### E1. 五大内容模块（祠堂/相册/视频/纪事/轶事）
- **目标**：把"家族纪念馆"做大
- **参考**：shanhe/genealogy + Gramps Web 博客
- **技术方案**：
  - 5 张表 + 5 个 CRUD 页面 + 5 个详情页
  - 相册支持 EXIF 提取 + 简易图片编辑
  - 视频支持 HLS 转码
- **周期**：2 周
- **预期效果**：从"族谱工具"升级为"家族纪念馆"

#### E2. Living Book 拟物化详情页
- **目标**：把成员详情做成"翻开一本书"的视觉
- **参考**：pure-genealogy
- **技术方案**：
  - 移动端：全屏卡片 + 上滑手势切换正反面
  - PC 端：CSS 3D `transform: rotateY` + 翻页过渡动画 + Slate 富文本渲染背面生平
- **周期**：1 周
- **预期效果**：比常规 form 表单更适合"看一个逝去的人"，**情感价值高**

#### E3. 字辈频次柱图 + 世代增长面积图 + 在世/已故饼图
- **目标**：基于 `generation + name[0]` 聚合 → recharts 画字辈频次柱图
- **技术方案**：
  - 后端聚合接口 `GET /api/family/<id>/statistics/generations`
  - 前端：recharts 图表组件
- **周期**：3 天
- **预期效果**："这一辈用了哪个字"是中老年用户高频知识需求

#### E4. 历史地图 overlay（民国/清代地图）
- **目标**：把民国地图/清代行政区作为底图叠加，配现代 OSM，展现家族迁徙路线
- **参考**：Gramps Web 历史地图
- **周期**：2 周（数据准备重，需下载 GeoJSON）

#### E5. 照片人脸识别 + 协作打标
- **目标**：远房亲属"圈人"老照片 + 自动建立人脸→个人双向链接
- **参考**：Gramps Web
- **周期**：3 周（接第三方 API 如 face++ 或自训模型）

#### E6. 博客（家族叙事 + Markdown + RSS）
- **目标**：把"祖父口述史"做成 Markdown blog 嵌入族谱内
- **周期**：1 周

#### E7. 纸质谱书排版（核心变现路径）
- **目标**：zupu 的"核心变现路径"——用户可"一键生成精装纸质谱书 PDF"
- **参考**：topola-viewer PDF 导出 + Webtrees Extended Family Book Chart
- **技术方案**：
  - 后端：`GET /api/family/<id>/print/ancestors-book.pdf`（用 weasyprint 渲染 Jinja2 模板）
  - 模板：硬笔书法字体（演示用免费楷体）+ 仿古版式 + 卷首页 + 世系表 + 传记
  - 收费点：基础模板免费 / 精装版 9.9 元 / 全本彩印 199 元
- **周期**：1 周
- **预期效果**：**Zupu 的核心变现路径**——纸质谱书是竞品差异化最大点 + 真实付费场景

---

## 6. 实施路线图（P0/P1/P2）

### 6.1 短期路线（4 周，P0：基础设施 + 用户感知）

> **目标**：把"看不见的基础设施"补齐 + 把"用户感知最强的功能"做出来

| 周 | 任务 | 来源参考 | 周期 |
|---|---|---|---|
| **W1** | **P0-1~8 全部修复**（JWT 密钥/CORS/装饰器/关系环/run.py/Docker/api.ts/refresh_token） | 架构师清单 | 1 周 |
| W1 | ForgotPassword 实现 + PWA manifest + InkIconsShowcase 修复 | 1 周 |
| W2 | **借鉴 #1 沙漏图**（后端 hourglass endpoint + 前端 HourglassTree） | topola-viewer | 2-3 天 |
| W2 | **借鉴 #2 永久链接 `?focus=person_xxx`** | topola-viewer | 3 小时 |
| W2 | **借鉴 #4 关系计算引擎（基础版）** "我和他是什么亲戚" | GeneWeb | 4-8 小时 |
| W3 | **借鉴 #5 SQL Recursive CTE** + BFS fallback | MGeurts | 半天 |
| W3 | **借鉴 #8 批量 Excel 导入 + 行级错误报告** | pure-genealogy | 1 周 |
| W3 | **借鉴 #7 字段级隐私 + 活人自动保护**（DAO 层过滤） | Webtrees | 1 周 |
| W4 | **借鉴 #3 GEDCOM 7 双向** 启动 + 单元测试 | MGeurts | 2-3 周（W4 仅完成设计 + 模型映射） |
| W4 | **借鉴 #6 大族谱 LOD 视口剔除**（5 代以上仅渲染占位） | GeneWeb | 1 周（W4 启动） |

**W1-W4 产出**：
- ✅ 8 个 P0 技术债修复 + ForgotPassword + PWA
- ✅ 沙漏图 + 永久链接（用户感知最强）
- ✅ 关系计算（长辈杀手锏）
- ✅ Recursive CTE 性能提升 100x
- ✅ Excel 批量导入（中式最大入口）
- ✅ 字段级隐私 + 活人保护
- 🟡 GEDCOM 7 双向（LOD 启动）

### 6.2 中期路线（3 个月，P1：差异化壁垒 + 协作）

> **目标**：建立生态壁垒（GEDCOM 7）+ 协作能力 + 变现路径

| 月 | 任务 | 来源参考 | 周期 |
|---|---|---|---|
| **M2** | **借鉴 #3 GEDCOM 7 双向**（完成） + 中式族谱字段映射 | MGeurts | 完成 W4 启动 + 2 周 |
| M2 | **借鉴 #6 LOD 视口剔除**（完成） | GeneWeb | 1 周 |
| M2 | **借鉴 #C3 Backup Manager**（一键导出 JSON + GEDCOM + ZIP） | MGeurts | 2 天 |
| M2 | **借鉴 #E3 字辈频次柱图 + 世代增长面积图** | pure-genealogy | 3 天 |
| M2 | **借鉴 #C5 字段级隐私**（完成 W3 启动） | Webtrees | 完成 |
| M2 | **借鉴 #D2 修订历史 + 一键快照恢复** | Gramps Web | 1 周 |
| M3 | **借鉴 #E7 纸质谱书排版**（核心变现路径：基础模板 + 仿古版式） | topola-viewer PDF | 1 周 |
| M3 | **借鉴 #D1 变更审批工作流**（moderator 审核） | Webtrees | 1 周 |
| M3 | **借鉴 #D3 OIDC SSO**（Keycloak/微信/钉钉） | Gramps Web | 1 周 |
| M3 | 中式族谱"硬字段"补齐（字/号/谥/房支/迁徙/葬地/出嫁女/字辈派语） | pure-genealogy 教训 | 1 周 |
| M3 | i18n 框架搭建（en + zh-CN + zh-TW） + weblate 接入 | Webtrees | 1 周 |
| M4 | **借鉴 #E1 五大内容模块**（祠堂/相册/视频/纪事/轶事） | shanhe | 2 周 |
| M4 | **借鉴 #E2 Living Book 拟物化详情页** | pure-genealogy | 1 周 |

**M2-M4 产出**：
- ✅ GEDCOM 7 双向（生态壁垒）
- ✅ LOD 大族谱性能
- ✅ Backup Manager + 修订历史 + OIDC SSO
- ✅ 纸质谱书（核心变现）
- ✅ 五大内容模块 + Living Book
- ✅ i18n 框架

### 6.3 长期路线（6+ 月，P2：AI + DNA + 多租户）

> **目标**：领先竞品的差异化能力

| 任务 | 来源参考 | 周期 | 价值 |
|---|---|---|---|
| **借鉴 #B3 共同祖先可视化** + **consanguinity 血缘系数** | GeneWeb | 2 周 | 学术血统 |
| **借鉴 #C4 多家族多租户**（Jetstream Teams 模式） | MGeurts | 2 周 | 0→1 产品化跨越 |
| **借鉴 #A4 Visual Builder 拖拽配置面板** | family-chart | 2 周 | 非程序员用户友好 |
| **借鉴 #E4 历史地图 overlay**（民国/清代地图） | Gramps Web | 2 周 | 迁徙可视化 |
| **借鉴 #C4 多树（multi-tree）架构** | Webtrees | 1 周 | 一个实例多宗族 |
| **借鉴 #E5 照片人脸识别 + 协作打标** | Gramps Web | 3 周 | 老照片数字化 |
| **借鉴 #E6 博客（家族叙事 + Markdown + RSS）** | Gramps Web | 1 周 | 家族纪念馆 |
| **借鉴 #D 主题系统**（中式/现代/极简切换） | Webtrees | 1 周 | 视觉差异化 |
| **借鉴 #E AI 自然语言查询**（"我们家族第十二代有哪些人迁居广东？" + 带 citations） | Gramps Web | 2 周 | AI 时代差异化 |
| **借鉴 #E DNA 模块**（染色体浏览器 + Y-DNA） | Gramps Web | 3 周 | 专业研究者 |

**M4+ 产出**：
- ✅ AI 查询（**抢占 AI 时代族谱入口**）
- ✅ DNA 模块（**与海外标杆持平**）
- ✅ 多家族多租户（**商业模式突破**）
- ✅ 主题系统（**视觉差异化**）
- ✅ 历史地图 + 人脸识别 + 博客（**家族纪念馆完整化**）

---

## 7. 风险与对策

### 7.1 技术风险

| 风险 | 影响 | 对策 |
|---|---|---|
| **大族谱性能** | 千级节点卡顿 | 借鉴 #6 LOD 视口剔除 + 借鉴 #5 Recursive CTE |
| **GEDCOM 7 中式字段映射** | 5% 用户数据迁移失败 | 提供 5.5.1 + 7 双格式输出 + 详细映射表文档 |
| **OIDC 接入** | 微信/钉钉应用审核周期长 | 提供"标准 OIDC + 微信 OAuth 适配器"两套实现 |
| **PDF 渲染** | weasyprint 在 Windows 下依赖复杂 | 用 ReportLab + 模板引擎，或转 Pandoc + LaTeX |

### 7.2 产品风险

| 风险 | 影响 | 对策 |
|---|---|---|
| **"发布即休眠"** | pure-genealogy 教训 | dependabot + 固定维护者 + GitHub Projects 公开看板 + 月度更新说明 |
| **中式族谱"硬字段"补齐成本** | 后期迁移指数级 | W1 schema 扩展决策立即做 |
| **"开源 + 加群获取 SQL"反模式** | 独立贡献者拒绝贡献 | SQL/Docker/初始数据/dump 全部 commit |
| **演示站弱密码** | 攻击面 | 只读账号 + 强密码 + IP 白名单 + 定时重置 |
| **AGPL 风险** | 商业部署者望而却步 | **MPL-2.0 或 Apache-2.0**（不做 AGPL） |

### 7.3 协作风险

| 风险 | 影响 | 对策 |
|---|---|---|
| **bus factor** | webtrees 教训 | 建立 2-3 人 maintainer + 清晰 CONTRIBUTING + 自动化 CI/CD |
| **核心能力切付费版** | family-chart 教训 | 开源版"够用 80% 场景"，付费版只做锦上添花 |
| **单作者 + issue 长期不关** | shanhe/qingfeng-gen 教训 | 1 周内必答 + 公开 issue 看板 |

---

## 8. 参考资源与脚注

### 8.1 项目链接

- [yunfengsa/pure-genealogy](https://github.com/yunfengsa/pure-genealogy) — Next.js 15 + Supabase
- [donatso/family-chart](https://github.com/donatso/family-chart) — d3 族谱库 729⭐
- [shanhe/genealogy](https://gitee.com/shanhe/genealogy) — vue3 + thinkphp6
- [msxy/qingfeng-gen](https://gitee.com/msxy/qingfeng-gen) — springboot + orgtree Apache-2.0
- [fisharebest/webtrees](https://github.com/fisharebest/webtrees) — PHP 标杆 100+ 插件
- [gramps-project/gramps-web](https://github.com/gramps-project/gramps-web) + [gramps-web-api](https://github.com/gramps-project/gramps-web-api) — Python 标杆
- [geneweb/geneweb](https://github.com/geneweb/geneweb) — OCaml 1998 学术血统
- [MGeurts/genealogy](https://github.com/MGeurts/genealogy) — Laravel 13 多租户
- [PeWu/topola-viewer](https://github.com/PeWu/topola-viewer) — 沙漏图权威
- [webtrees 插件目录](https://webtrees.net/download/modules) — 100+ 第三方模块
- [Gramps Web 官网](https://www.grampsweb.org/) — API-first 标杆

### 8.2 调研方法说明

- 5 个 general subagent 并行深挖（任务 ID：`ses_15d7f48b5ff`/`ses_15d7f212ff`/`ses_15d7f006bf`/`ses_15d7ecce5f`/`ses_15d7e9f5cf`）
- webfetch + websearch 组合抓取
- 所有数据点标"未获取到"的都是信息缺口，不做猜测
- 交叉对比基于 9 个项目 × 10 个维度

### 8.3 内部交叉参考

- zupu Phase 1 完成项：A1 金线溯源 + A2 关系路径高亮 + A7 树图搜索定位
- zupu P0-P2 待实现清单（24 项 A-X + 8 个技术债）：见架构师评估报告
- zupu 测试 49/49 通过

### 8.4 下一步建议

1. **本周（W1）**：修复 8 个 P0 技术债 + ForgotPassword + PWA + InkIconsShowcase
2. **下周（W2）**：开始借鉴 #1 沙漏图 + #2 永久链接（合计 3 天）+ 借鉴 #4 关系计算
3. **本季度（M2）**：完成借鉴 #3 GEDCOM 7 双向 + 借鉴 #7 字段级隐私 + 借鉴 #D2 修订历史
4. **本半年（M4）**：完成借鉴 #E7 纸质谱书 + 借鉴 #E1 五大内容模块 + 借鉴 #D1 审批工作流
5. **下一年（M4+）**：借鉴 #E AI 查询 + 借鉴 #E DNA 模块 + 借鉴 #C4 多租户

---

> **文档结束**
>
> 编制者：zupu 维护团队（基于 2026-06-07 竞品调研）
> 反馈渠道：本文档 issue tracker
