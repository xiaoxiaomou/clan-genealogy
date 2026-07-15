# API 文档 / API Reference

族谱管理平台后端为 Flask REST API，所有接口以 `/api` 为前缀，数据以 JSON 交互。本文档给出鉴权方式与各模块的基础路径概览；完整字段以源码 `app/routes/` 为准。

## 基础约定

- **Base URL**：`http://<host>:<port>/api`
- **数据格式**：请求与响应均为 `application/json`（文件上传为 `multipart/form-data`）。
- **鉴权**：除少数公开接口外，均需在请求头携带 JWT：
  ```
  Authorization: Bearer <access_token>
  ```
- **令牌有效期**：Access Token 24 小时，Refresh Token 30 天。

## 认证流程

1. `POST /api/auth/register` 注册（可能需管理员审核）。
2. `POST /api/auth/login` 登录，返回 `access_token` 与 `refresh_token`。
3. 携带 `access_token` 访问受保护接口。
4. 过期后用 `POST /api/auth/refresh` 刷新。

### 认证接口 `/api/auth`

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/register` | 用户注册 |
| POST | `/login` | 登录，返回令牌 |
| POST | `/refresh` | 刷新 Access Token |
| GET | `/me` | 获取当前用户信息 |
| PUT | `/me` | 更新当前用户资料 |
| POST | `/change-password` | 修改密码 |
| POST | `/forgot-password` | 发起找回密码 |
| GET | `/reset-password/verify` | 校验重置令牌 |
| POST | `/reset-password` | 重置密码 |
| GET | `/admin/users` | （管理员）用户列表 |
| GET | `/admin/users/pending` | （管理员）待审核用户 |
| PUT | `/admin/users/<id>/approve` | （管理员）通过审核 |
| PUT | `/admin/users/<id>/reject` | （管理员）拒绝 |
| PUT | `/admin/users/<id>/disable` | （管理员）禁用 |
| PUT | `/admin/users/<id>/enable` | （管理员）启用 |

## 家族与成员 `/api/family`

核心业务模块，管理家族、成员、关系与家族树。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/` | 我的家族列表 |
| POST | `/` | 创建家族 |
| GET | `/<family_id>` | 家族详情 |
| PUT | `/<family_id>` | 更新家族 |
| DELETE | `/<family_id>` | 删除家族 |
| GET | `/<family_id>/my-role` | 当前用户在该家族的角色 |
| GET | `/<family_id>/members` | 成员列表 |
| POST | `/<family_id>/members` | 新增成员 |
| GET/PUT/DELETE | `/<family_id>/members/<member_id>` | 成员详情 / 更新 / 删除 |
| POST | `/<family_id>/members/batch-edit` | 批量编辑 |
| POST | `/<family_id>/members/batch-delete` | 批量删除 |
| POST | `/<family_id>/members/batch-sort` | 批量排序 |
| POST | `/<family_id>/members/import-csv` | CSV 导入 |
| POST | `/<family_id>/import/excel` | Excel 导入 |
| GET | `/<family_id>/import/template` | 下载导入模板 |
| GET/POST | `/<family_id>/relationships` | 关系列表 / 新建关系 |
| DELETE | `/<family_id>/relationships/<id>` | 删除关系 |
| GET | `/<family_id>/tree` | 家族树数据 |
| GET | `/<family_id>/stats` | 家族统计 |
| GET/POST/PUT | `/<family_id>/users` | 家族协作成员管理 |

## 其它功能模块（均以 `/api/family` 或 `/api` 为前缀）

| 模块 | 蓝图前缀 | 功能 |
|---|---|---|
| 字辈 Zibei | `/api/family` | 字辈规则、世代推算 |
| 世系 Lineage | `/api/family` | 世系视图与推演 |
| 分支 Branch | `/api/family` | 家族分支管理 |
| 家族合并 Merge | `/api/family` | 多家族数据合并 |
| 亲属称谓 Kinship | `/api/family` | 亲属称谓计算 |
| 相册 Album | `/api/family` | 家族相册 |
| 故事 Story | `/api/family` | 人物故事（富文本） |
| 事件 Events | `/api/family` | 家族大事记 |
| 荣誉 Honor | `/api/family` | 家族荣誉 |
| 纪念 Memorial | `/api/family` | 逝者纪念页 |
| 祭日提醒 | `/api/family` | 祭日提醒 |
| 帖子/社区 Post/Community | `/api/family` | 帖子、评论、社区 |
| 聊天 Chat | `/api/family` | 私信聊天 |
| 历史 History | `/api/family` | 成员编辑历史 |
| 审计 Audit | `/api/family` | 审计日志 |
| OCR | `/api/family` | 老族谱图片识别 |
| AI | `/api/family` | AI 辅助能力 |
| 搜索 Search | `/api/family` | 家族内搜索 |
| 全局搜索 | `/api` | 跨家族搜索 |
| 上传 Upload | `/api/upload` | 图片/文件上传（≤5MB） |
| 导出 Export | `/api/export` | 导出（含 GEDCOM） |
| 邀请 Invitation | `/api/family` | 邀请协作 |
| 分享 Share | `/api/family`, `/api` | 分享链接（含公开访问） |
| 通知 Notification | `/api/notification` | 站内通知 |
| 配置 Config | `/api` | 系统/公开配置，如 `/api/config/public` |

## 错误响应

接口以 HTTP 状态码表达结果，错误时返回：

```json
{ "error": "错误描述信息" }
```

常见状态码：`400` 参数错误、`401` 未认证、`403` 无权限、`404` 不存在、`413` 上传超限、`500` 服务器错误。

> 完整的请求参数与响应结构请参考 `app/routes/` 下对应模块源码。
