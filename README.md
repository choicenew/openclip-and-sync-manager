# 📋 OpenClip Sync (v2.7.49)

> **🚀 全网领先的 100% 免费开源、去中心化全模态多端数据与剪贴板同步浏览器扩展**  
> **100% Free, Open-Source & Self-Hosted Full-Spectrum Browser Data & Clipboard Sync Extension**

---

## 🔗 Index 宣传主页与网页入口 (Promo Index Page)

本项目专门制作了高颜值 Promo Index 宣传网页，可以直接点击下方链接访问：

* 🌐 **GitHub Pages 在线 Index 主页**：[https://choicenew.github.io/openclip-and-sync-manager/](https://choicenew.github.io/openclip-and-sync-manager/)
* 📄 **仓库本地 Index 源文件**：[docs/index.html](./docs/index.html)

[![Official Website](https://img.shields.io/badge/Official%20Site-Live%20Index%20Promo-6366f1.svg?style=for-the-badge&logo=googlechrome)](https://choicenew.github.io/openclip-and-sync-manager/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717.svg?style=for-the-badge&logo=github)](https://github.com/choicenew/openclip-and-sync-manager)
[![Version](https://img.shields.io/badge/Version-v2.7.49-indigo.svg?style=for-the-badge)](https://github.com/choicenew/openclip-and-sync-manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Price](https://img.shields.io/badge/Price-100%25%20Free-orange.svg?style=for-the-badge)](#)
[![Self Hosted](https://img.shields.io/badge/Storage-Self--Hosted-blue.svg?style=for-the-badge)](#)

---

## 🔥 为什么选择 OpenClip Sync？(对比与核心优势)

传统的剪贴板或标签页同步扩展通常存在**付费墙 (Pro Paywall)**、**中心化中间商服务器风险**、**内存泄漏与卡顿**或**功能单一**的问题。OpenClip Sync 采用全新 MV3 + Offscreen + 7 大自建私有云架构，实现“一个扩展，搞定所有浏览器数据”。

| 维度 / 功能 | OpenClip Sync (本插件) | 传统剪贴板扩展 | 传统 Tab Session Manager (TSM) |
| :--- | :---: | :---: | :---: |
| **收费模式** | **100% 免费开源 (MIT)** | 限制条数 / 开启 WebDAV 需 Pro 订阅 | 部分收费或受限 |
| **云端存储** | **直连私有云 (7后端)** | 官方中心化服务器 (有泄露风险) | 仅部分同步或本地文件 |
| **全模态支持** | **剪贴板+标签组+书签+历史+扩展** | 仅剪贴板 | 仅标签页/会话 |
| **多节点控制** | **👑 主辅设备权限隔离 & 云锁** | 无主辅概念，极易覆盖多端数据 | 无主辅概念 |
| **内存开销** | **极低 (V8 Heap 优化 + Base64 过滤)** | 复制大图易导致后台内存暴涨崩溃 | 标签页过多时卡顿 |
| **隐私安全** | **100% 私有传输，零中间商服务器** | 数据经过第三方服务器 | 视具体实现而定 |

---

## 🌟 核心功能模块清单 (Full Feature Matrix)

### 1. 📋 多端剪贴板历史 (Clipboard History)
- **毫秒级静默轮询**：基于 Chrome MV3 Offscreen 文档技术，后台高能且低开销捕获复制文本与数据。
- **正序 / 倒序自由调序**：列表提供 `⇅ 最新在前(降序)` / `⇅ 最旧在前(升序)` 按钮，随心切换展示逻辑。
- **敏感词过滤与黑名单**：支持正则表达式与关键词屏蔽，避免 Password、Token、API Key 误存。
- **快捷键秒级粘贴**：支持全局快捷键 `Alt+Shift+V` 呼出，`Alt+Shift+1/2/3` 直接一键粘贴前三条历史。

### 2. 🗂️ Tab Groups 与会话快照 (TSM Native Equivalent)
- **原生兼容 Tab Session Manager**：实时侦测 Chrome / Edge 标签组 (Tab Groups) 变化。
- **自动定时快照与恢复**：启动/关闭浏览器自动保存会话快照、定时自动备份与 URL 黑名单排除。

### 3. 🔖 跨设备书签树同步 (Bookmarks Tree Sync)
- 双向检索与合并跨设备书签树，智能去重，支持一键打开与全局快速搜索。

### 4. 📜 浏览历史与 30 天云备份 (Browser History)
- 自动备份 30 天浏览历史，支持按时间线与域名快捷检索，跨设备无缝查阅历史足迹。

### 5. 🧩 已安装扩展清单备份 (Installed Extensions Catalog)
- 备份已安装浏览器扩展清单，更换新设备时可一键定位并从 Web Store 快速恢复安装。

### 6. 👑 主辅设备墙控制流 (Master-Slave Primary/Auxiliary Control Flow)
- **主设备 (Master Device)**：拥有最高云端控制权与规则制定能力，在云端标记设备锁。
- **辅助设备自动降级 (Auxiliary Demotion)**：其他设备检测到云端主设备标记时自动降级，禁止篡改规则或越权拉取其他节点数据。

### 7. ☁️ 7 大无损云端 Backend 存储引擎 (Multi-Cloud Storage)
支持同时配置与切换 7 大主流私有云后端：
1. **WebDAV** — 坚果云 (Nutstore)、Nextcloud、群晖 NAS 及自建 WebDAV (含 Gzip 文本高能压缩)
2. **AWS S3 / MinIO** — 企业级与自建对象存储 (支持 Custom Endpoint, Bucket, AccessKey, SecretKey)
3. **GitHub Gist** — 使用 Personal Access Token (PAT) 与 Gist ID，进行私有 Key-Value 极速备份
4. **OneDrive** — 微软云盘 Graph API 无缝备份
5. **Google Drive** — 谷歌云盘 OAuth2 极速同步
6. **Chrome Sync** — 谷歌账号内置轻量同步 (严格控制在 8KB 单项上限内)
7. **Custom REST API** — 自定义 HTTP/HTTPS REST API 端点

---

## 🗺️ 架构演进路线图 Matrix (Roadmap & Dev Channel)

项目采用双轨（`main` 稳定轨 / `dev` 前沿预览轨）并行演进，详细开发计划详见 [DEV_DEVELOPMENT_PLAN.md](./DEV_DEVELOPMENT_PLAN.md)。

| 模块 / 功能 | 详细说明 | 设计原则 | 状态 |
| :--- | :--- | :--- | :---: |
| **🔐 E2EE 零知识加密** | PBKDF2 派生密钥 + AES-256-GCM 离端加密 | 零服务端依赖 / 密文上云 | ✅ 已交付 (`dev`) |
| **📋 看板与 Tab 休眠** | `@dnd-kit` 看板 + 原生 `chrome.tabs.discard` | 内存极致释放 / 工作区拖拽 | ✅ 已交付 (`dev`) |
| **🏷️ 智能打标与 TTL** | `#URL/#Code/#Secret` 识别，脱敏保护与倒计时销毁 | 隐私保护与动态遮罩 | ✅ 已交付 (`dev`) |
| **⚡ WebRTC P2P 直连** | 同 Wi-Fi 局域网 `<10ms` 极速点对点数据传输 | 无云端中间件直连 | ✅ 已交付 (`dev`) |
| **🔎 极速搜索弹框** | 跨模态模糊检索，独立可关闭、可设置停用 | 100% 纯只读 UI 层 | ✅ 已交付 (`dev`) |
| **🚀 双轨 CI/CD 自动打包** | 自动生成 `dev-preview` Chrome/Firefox 安装包 | 独立 GitHub Workflow | ✅ 已交付 (`dev`) |
| **🎨 多模态图片与 JSON 美化** | 图片 Base64 预览与 JSON/SQL 一键高亮排版 | 展层渲染增强 | ⏳ 规划中 (Next) |
| **📱 网址一键生成二维码** | 复制 URL 显示二维码，手机扫码即可无缝直接打开 | 跨端极速小工具 | ⏳ 规划中 |
| **🖥️ 系统级 Native 托盘伴侣** | 突破浏览器最小化限制，支持 OS 全局剪贴板捕获 | Native Messaging 进程 | 🔮 远期规划 |

---

## 🛠️ 本地编译、修改与开源贡献 (Build & Contribute)

本项目**100% 代码开源**，欢迎所有人下载、修改、编译并在本地加载使用，或向仓库提交代码 (PR)！

### 1. 克隆仓库与安装依赖
```bash
git clone https://github.com/choicenew/openclip-and-sync-manager.git
cd openclip-and-sync-manager
pnpm install
```

### 2. 启动开发调试模式 (Hot Reload)
```bash
pnpm dev
# 或开发 Firefox 版本:
pnpm dev:firefox
```

### 3. 打包生成 Production 生产构建产物
```bash
pnpm build
# 或打包 Firefox 生产包:
pnpm build:firefox
```
编译产物位于 `build/chrome-mv3-prod` 目录。在 Chrome / Edge / Brave 浏览器中打开 `chrome://extensions/`，开启 **"开发者模式" (Developer Mode)**，点击 **"加载已解压的扩展程序" (Load unpacked)** 并选择该目录即可。

---

## 📢 应用商店发布与合作特别说明 (App Store Publishing Notice)

> [!IMPORTANT]
> **关于将 OpenClip Sync 发布至应用商店 (Chrome Web Store / Edge Add-ons / Firefox Add-ons / Mac App Store 等) 的沟通事项：**
> 
> 1. **开源修改与本地使用**：所有人均可以免费下载、编译、修改本项目代码，并在个人设备或团队内部直接离线安装使用，无需经过我们授权。
> 2. **应用商店发布请提前沟通**：由于团队目前**暂无资金**去支持各大浏览器应用商店的开发者账号注册上架费及后续长期的商店版维护成本，因此：
>    - **如果您计划将修改后或原版的扩展发布至公共应用商店（如 Chrome Web Store、Microsoft Edge 扩展商店等），请务必提前联系我们进行沟通。**
>    - **寻求赞助与联合上架**：如果有个人、企业或赞助商愿意提供资金支持、赞助应用商店开发者账号或协助上架维护，我们非常欢迎沟通合作！

---

## 🔍 多语言 SEO 关键词矩阵 (Global Search Engine Optimization)

- **English**: Free open source browser sync extension, multi-device clipboard history manager, WebDAV tab session manager alternative, sync Chrome tabs Edge Brave Firefox, self-hosted browser data backup, AWS S3 MinIO clipboard sync, Google Drive OneDrive Gist tab sync, zero subscription privacy-first clipboard manager.
- **简体中文**: 免费开源浏览器数据同步插件, 多端剪贴板历史管理器, WebDAV 剪贴板同步, 标签页会话组备份 (Tab Session Manager 替代), 自建云端 S3 MinIO 剪贴板, 坚果云 Nextcloud 标签页同步, 跨浏览器剪贴板同步, 零订阅自建云同步扩展.
- **繁體中文**: 免費開源瀏覽器同步擴充套件, 多端剪貼簿歷史管理員, WebDAV 剪貼簿同步, 標籤頁會話組備份, 私有雲端 S3 剪貼簿, 跨瀏覽器雙向同步.
- **日本語**: オープンソース 無料 クリップボード 履歴 管理 拡張機能, WebDAV 端末間 タブ 同期, Tab Session Manager 代替, Google ドライブ OneDrive S3 クリップボード 同期, セルフホスト ゼロサブスクリプション.
- **한국어**: 무료 오픈소스 브라우저 클립보드 동기화 확장프로그램, 다중 기기 클립보드 히스토리 관리자, WebDAV 탭 세션 관리자, 개인 크라우드 S3 MinIO 클립보드 백업, 구독료 없는 완전 무료 확장.

---

## 📄 开源许可与协议 (License)

本项目采用 **MIT License** 开源授权。任何人均可免费使用、修改、学习与二次开发。

© 2026 ChoiceNew / OpenClip Sync Team. Maintained by [choicenew](https://github.com/choicenew).
