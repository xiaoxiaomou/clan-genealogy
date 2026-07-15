# 贡献指南 / Contributing

感谢你愿意为**族谱管理平台**贡献力量！本指南帮助你快速上手。

## 🧭 参与方式

- 🐛 **报告 Bug**：通过 [Issues](../../issues) 提交，附复现步骤、期望结果、环境信息。
- 💡 **功能建议**：先开一个 Issue 讨论，避免重复工作。
- 📝 **改进文档**：文档同样重要，欢迎修正错别字、补充说明。
- 🔧 **提交代码**：修复 Bug 或实现新功能，请遵循下面的流程。

## 🔄 开发流程

1. **Fork** 本仓库并克隆到本地。
2. 基于 `master` 创建分支：
   ```bash
   git checkout -b feat/your-feature      # 新功能
   git checkout -b fix/the-bug            # 修复
   ```
3. 搭建开发环境（见 [README](./README.md) 快速开始）。
4. 编写代码，并**补充或更新测试**。
5. 本地自检通过后提交。
6. 推送分支并发起 **Pull Request**，说明改动内容与动机。

## 🌿 分支与提交规范

- 分支命名：`feat/*`、`fix/*`、`docs/*`、`refactor/*`、`test/*`、`chore/*`。
- 提交信息推荐 [Conventional Commits](https://www.conventionalcommits.org/)：
  ```
  feat(tree): 支持家族树导出为 PNG
  fix(auth): 修复刷新令牌过期判断
  docs: 补充 Docker 部署说明
  ```

## 🎨 代码规范

### 后端（Python）

- 遵循 **PEP 8**，项目使用 [Ruff](https://docs.astral.sh/ruff/) 做 lint。
  ```bash
  ruff check .
  ruff format .
  ```
- 路由放入 `app/routes/`，业务逻辑放入 `app/services/`，数据模型放入 `app/models/`。
- 新增/修改逻辑请在 `tests/` 下补充 Pytest 用例：
  ```bash
  pytest
  ```

### 前端（TypeScript / React）

- 使用 TypeScript，遵循组件化与 Redux Toolkit 数据流。
- 提交前确保通过类型检查与构建：
  ```bash
  cd frontend
  npm run build
  ```

## ✅ Pull Request 检查清单

- [ ] 代码通过 `ruff check` / 前端 `npm run build`
- [ ] 新增或更新了相关测试，`pytest` 通过
- [ ] 更新了相关文档（README / docs）
- [ ] 未提交密钥、`.env`、本地数据库或构建产物
- [ ] PR 描述清晰，关联对应 Issue（如有）

## 📄 许可证

提交贡献即表示你同意你的贡献以 [Apache License 2.0](./LICENSE) 授权发布。
