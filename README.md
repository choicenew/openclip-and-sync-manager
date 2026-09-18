# OpenClip Sync (v2.7.6)

> **跨端主从设备管控 & 多模态多云无损同步浏览器扩展**  
> 官方 GitHub 仓库：[https://github.com/choicenew/openclip](https://github.com/choicenew/openclip)  
> 赞助与支持：[Ko-fi Support](https://ko-fi.com/cue322631)

---

## 🌟 核心功能特性

OpenClip Sync 是一款全功能、高性能的跨端剪贴板与数据同步浏览器扩展。全新架构消除了旧版的冗余与界面混淆，实现了独立的**设备管理墙**与**多云同步 Backend**解耦管控。

### 1. 5 大模态按设备独立数据源管控矩阵 (5-Modality Master Routing)
Master 主设备可对任意从属设备（如 Device B、Device C、Device D）进行独立的模态数据源路由配置：
- 📋 **剪贴板 (Clipboard)**
- 🌐 **会话标签 (Sessions)**
- 🔖 **书签 (Bookmarks)**
- 📜 **浏览历史 (History)**
- 🧩 **扩展列表 (Extensions)**

支持配置【🌐 全量设备数据源】、【🎯 仅指定目标设备】或【⛔ 禁用拉取】。

### 2. 主从设备防抢占机制 (Master Device Protection)
- **主设备控制 (Master)**：掌握跨端设备控制矩阵下发与主动拉取同步策略。
- **从设备降级 (Auxiliary)**：当云端已被标记主设备时，其余从设备界面开关**自动变灰并禁止抢夺**，确保配置一致性。
- **设备别名与独立管理**：支持为不同设备自定义别名（如 `MacBook-Pro-Office`、`Home-PC`）。

### 3. 7 大无损云端 Backend 存储节点 (Multi-Cloud Engine)
完全平铺直观配置，支持同时启用多种云端存储节点：
1. **Chrome Sync** — 谷歌账号内置轻量同步
2. **WebDAV** — 支持坚果云、Nextcloud、群晖 NAS 及自建 WebDAV
3. **OneDrive** — 微软云盘无缝结合
4. **Google Drive** — 谷歌云盘 OAuth 极速同步
5. **GitHub Gist** — 私有代码片段与秘钥存储
6. **AWS S3 / MinIO** — 企业级与私有云对象存储
7. **Custom REST API** — 自定义第三方 HTTP API 同步节点

### 4. 自动化构建与精美 UI
- **精美现代 UI**：基于 Plasmo 框架与 Mantine 5 打造，全面更新图标交互。
- **每周自动编译 Action**：支持 GitHub Action 定时自动编译打包打包发布 (`.github/workflows/weekly-build.yml`)。

---

## 🛠️ 本地开发与编译

### 1. 安装依赖
```bash
pnpm install
```

### 2. 启动开发模式
```bash
pnpm dev
```

### 3. 打包生成 Production 扩展包
```bash
pnpm build
pnpm package
```
打包生成产物将位于 `build/chrome-mv3-prod.zip`。

---

## ⚙️ CI/CD 自动化构建

项目配置有 `.github/workflows/weekly-build.yml`：
- **每周定时任务**：每周日 00:00 (UTC) 自动触发构建。
- **手动触发 (workflow_dispatch)**：可在 GitHub Actions 界面随时手动一键触发编译与打包。
- **版本号**：自动读取 `package.json` 中的 `version` 保持构建版本一致。

---

## 📄 开源许可与协议 (Open Source License & Terms)

本项目采用 **OpenClip Sync Public License** 协议开源。任何人均可免费使用与阅读源码，但必须遵守以下强制条款：

1. **保留原始名称 (Original Name Preservation)**  
   所有基于本项目的二次开发、修改版、分叉仓库 (Fork) 或衍生作品，在所有界面、文档及元数据中**必须保留原始项目名称 "OpenClip Sync"**。

2. **强制代码提交回主库 (Mandatory Pull Request Back)**  
   任何对本项目进行的修改、功能增强、Bug 修复或衍生代码，**必须通过 Pull Request (PR) 提交回官方主仓库** ([https://github.com/choicenew/openclip](https://github.com/choicenew/openclip)) 以便主库合并与维护。

3. **禁止修改原仓库链接 (Repository Link Integrity)**  
   不得删除、修改、隐藏或替换界面与文档中指向官方主仓库的链接 ([https://github.com/choicenew/openclip](https://github.com/choicenew/openclip))。

---

© 2026 ChoiceNew / OpenClip Sync Team. All Rights Reserved.
