# OpenClip Sync (v2.7.49)

> **🚀 100% 开源、免费、去中心化的全模态多端数据与剪贴板同步浏览器扩展**  
> **100% Free, Open-Source & Self-Hosted Full-Spectrum Browser Data & Clipboard Sync Extension**

[![Version](https://img.shields.io/badge/version-v2.7.49-indigo.svg?style=flat-square)](https://github.com/choicenew/openclip-and-sync-manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-100%25-brightgreen.svg?style=flat-square)](https://github.com/choicenew/openclip-and-sync-manager)
[![Price](https://img.shields.io/badge/Price-100%25%20Free-orange.svg?style=flat-square)](#)
[![Self Hosted](https://img.shields.io/badge/Storage-Self--Hosted-blue.svg?style=flat-square)](#)

🌐 **官方 Promo 宣传与说明网站 (GitHub Pages)**: [https://choicenew.github.io/openclip-and-sync-manager/](https://choicenew.github.io/openclip-and-sync-manager/)  
📦 **官方 GitHub 开源仓库**: [https://github.com/choicenew/openclip-and-sync-manager](https://github.com/choicenew/openclip-and-sync-manager)  
👤 **维护者 (Maintained by)**: [choicenew](https://github.com/choicenew)

---

## 🌟 核心理念与亮点 (Core Highlights)

### 1. 💰 100% 永久免费与开源 (100% Free & Open Source)
- **零订阅、零付费门槛、无广告**：完全基于 MIT 协议开源，没有任何隐藏收费项目。
- **全民共建**：欢迎任何开发者、使用者下载、编译、修改源码，并向仓库提交 Code 或 Pull Request！

### 2. 🔒 自带云端私有化存储 (Bring Your Own Storage / Privacy-First)
- **数据完全自主掌控**：绝不通过任何第三方中转服务器，数据直接在你自己的私有云与浏览器之间端到端加密传输。
- **支持 7 大主流私有云/对象存储后端**：WebDAV (坚果云/Nextcloud/群晖NAS)、OneDrive、Google Drive、GitHub Gist、AWS S3 / MinIO、Custom REST API 及 Chrome Sync。

### 3. 🌐 全模态浏览器数据同步 (Full-Spectrum Sync)
- **📋 多端剪贴板历史 (Clipboard History)**：实时捕获文本，支持降序/升序自定义调序、正则与关键词黑名单清洗、标签分类与固定置顶。
- **🗂️ Tab Groups 与会话快照管理 (TSM Compatible)**：原生兼容 Tab Session Manager，支持标签组自动定时备份、启动/关闭时自动保存快照及 URL 排除规则。
- **🔖 书签树与浏览历史 (Bookmarks & History)**：次级页面支持跨设备书签树备份与历史记录同步。

### 4. 👑 主辅设备控制流 (Primary / Auxiliary Master-Slave Architecture)
- **主设备 (Master Device)**：掌握云端控制节点与主动拉取策略。
- **辅助设备 (Auxiliary Auto-Demotion)**：自动识别云端主设备标记并安全降级，防止非授权节点篡改规则或拉取未许可数据。

---

## 🛠️ 本地编译、修改与开源贡献 (Build & Contribute)

本项目**完全开源**，我们非常欢迎全世界的开发者参与编译、定制修改与提交代码 (PR)！

### 1. 克隆仓库与安装依赖
```bash
git clone https://github.com/choicenew/openclip-and-sync-manager.git
cd openclip-and-sync-manager
pnpm install
```

### 2. 启动本地开发模式 (Hot Reload)
```bash
pnpm dev
# 或开发 Firefox 版本:
pnpm dev:firefox
```

### 3. 编译生成 Production 生产包
```bash
pnpm build
# 或打包 Firefox 生产包:
pnpm build:firefox
```
编译产物位于 `build/chrome-mv3-prod` 目录。在 Chrome / Edge / Brave 浏览器中打开 `chrome://extensions/`，开启 **"开发者模式" (Developer Mode)**，点击 **"加载已解压的扩展程序" (Load unpacked)** 并选择该目录即可完成安装。

### 4. 提交代码与 Pull Request
如果你修复了 Bug、改进了 UI 或增加了新功能，非常欢迎提交 [Pull Request](https://github.com/choicenew/openclip-and-sync-manager/pulls)！

---

## 📢 应用商店发布与合作特别说明 (App Store Publishing Notice)

> [!IMPORTANT]
> **关于将 OpenClip Sync 发布至应用商店 (Chrome Web Store / Edge Add-ons / Firefox Add-ons / Mac App Store 等) 的沟通事项：**
> 
> 1. **开源二次开发与编译自由**：所有人均可以免费下载、编译、修改本项目代码，并在个人设备或团队内部直接离线安装使用，无需经过我们授权。
> 2. **应用商店发布请提前沟通**：由于团队目前**暂无资金**去支持各大浏览器应用商店的开发者账号注册上架费及后续长期的商店版维护成本，因此：
>    - **如果您计划将修改后或原版的扩展发布至公共应用商店（如 Chrome Web Store、Microsoft Edge 扩展商店等），请务必提前联系我们进行沟通。**
>    - **寻求赞助与联合上架**：如果有个人、企业或赞助商愿意提供资金支持、赞助应用商店开发者账号或协助上架维护，我们非常欢迎沟通合作！

---

## ☁️ 7 大去中心化后端存储引擎 (Multi-Cloud Backends)

| 存储后端 (Backend) | 适用场景 / 特点 |
| :--- | :--- |
| **WebDAV** | 坚果云 (Nutstore)、Nextcloud、群晖 NAS、自建 WebDAV，支持 Gzip 高能文本压缩。 |
| **AWS S3 / MinIO** | 企业级与自建对象存储，支持 Endpoint、Bucket、AccessKey/SecretKey 参数配置。 |
| **GitHub Gist** | 使用 Personal Access Token (PAT) 与 Gist ID，实现私有 Key-Value 极速备份。 |
| **OneDrive** | 微软云盘 Graph API 授权，跨设备无缝直连。 |
| **Google Drive** | 谷歌云盘 OAuth2 极速同步，自带隐私安全隔离。 |
| **Chrome Sync** | 谷歌账号内置轻量级免费同步 (自动控制在单项 8KB 上限内)。 |
| **Custom REST API** | 自定义 HTTP/HTTPS REST API 端点，支持自建后端服务对接。 |

---

## 🔍 多语言 SEO 关键词矩阵 (Global Search Engine Optimization)

为方便全球不同语种的用户精准检索到本插件，特列出多语言搜索关键词：

- **English**: Free open source browser sync extension, multi-device clipboard history manager, WebDAV tab session manager alternative, sync Chrome tabs Edge Brave Firefox, self-hosted browser data backup, AWS S3 MinIO clipboard sync, Google Drive OneDrive Gist tab sync, zero subscription privacy-first clipboard manager.
- **简体中文**: 免费开源浏览器数据同步插件, 多端剪贴板历史管理器, WebDAV 剪贴板同步, 标签页会话组备份 (Tab Session Manager 替代), 自建云端 S3 MinIO 剪贴板, 坚果云 Nextcloud 标签页同步, 跨浏览器剪贴板同步, 零订阅自建云同步扩展.
- **繁體中文**: 免費開源瀏覽器同步擴充套件, 多端剪貼簿歷史管理員, WebDAV 剪貼簿同步, 標籤頁會話組備份, 私有雲端 S3 剪貼簿, 跨瀏覽器雙向同步.
- **日本語**: オープンソース 無料 クリップボード 履歴 管理 拡張機能, WebDAV 端末間 タブ 同期, Tab Session Manager 代替, Google ドライブ OneDrive S3 クリップボード 同期, セルフホスト ゼロサブスクリプション.
- **한국어**: 무료 오픈소스 브라우저 클립보드 동기화 확장프로그램, 다중 기기 클립보드 히스토리 관리자, WebDAV 탭 세션 관리자, 개인 크라우드 S3 MinIO 클립보드 백업, 구독료 없는 완전 무료 확장.
- **Español**: Extensión de sincronización de portapapeles y pestañas de código abierto gratis, gestor de historial de portapapeles multidispositivo, copia de seguridad WebDAV S3 OneDrive Google Drive, sin suscripción, privacidad garantizada.
- **Français**: Extension de synchronisation du presse-papiers et des onglets open source gratuite, gestionnaire d'historique du presse-papiers multi-appareils, sauvegarde cloud WebDAV S3 Gist, zéro abonnement.
- **Deutsch**: Kostenlose Open-Source-Zwischenablage und Tab-Synchronisation Erweiterung, plattformübergreifer Zwischenablage-Manager, WebDAV S3 MinIO OneDrive Google Drive Backup, ohne Abonnement.
- **Русский**: Бесплатное расширение синхронизации буфера обмена и вкладок с открытым исходным кодом, менеджер истории буфера обмена, резервное копирование WebDAV S3 OneDrive Google Drive, без подписки.

---

## 📄 开源许可与协议 (License)

本项目采用 **MIT License** 开源授权。任何人均可免费使用、修改、学习与二次开发。

© 2026 ChoiceNew / OpenClip Sync Team. Maintained by [choicenew](https://github.com/choicenew).
