# 🚀 OpenClip Sync (`dev` 分支) 架构演进与路线图 (Roadmap)

本文档实时记录了 `dev` 分支的架构演进规划、市场调研对比、拖拽交互路线图、已交付功能与未来解耦模块开发路线。

---

## 📌 一、 `dev` 分支最新已交付功能矩阵 (v2.7.62)

在 `dev` 分支上，我们完成了 6 大核心增强模块的无损解耦开发与 GitHub 自动化独立打包分发：

1. **🔐 端到端零知识加密 (E2EE - AES-256-GCM)**
   - **核心文件**：[e2ee.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/crypto/e2ee.ts), [db/core.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/db/core.ts)
   - **特性**：基于 Web Crypto 原生 PBKDF2 密钥派生与 AES-256-GCM 认证加密。所有数据在离开本端上云前全量转换为 `ENC:v1:...` 密文，云端无法破解。

2. **📋 可视化工作区看板与标签页休眠 (Workspace Kanban & Tab Suspend)**
   - **核心文件**：[TabKanbanBoard.tsx](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/popup/components/TabKanbanBoard.tsx), [tabSuspend.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/tabSuspend.ts)
   - **特性**：基于 `@dnd-kit` 实现多列拖拽式工作区看板，支持分配工作区并批量快照，调用原生的 `chrome.tabs.discard()` 一键休眠后台闲置网页以极大节省系统内存。

3. **🏷️ 智能分类、脱敏保护与 TTL 定时销毁**
   - **核心文件**：[entryClassifier.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/entryClassifier.ts), [entryMasking.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/entryMasking.ts)
   - **特性**：自动检测特征打上 `#URL`, `#Code`, `#Email`, `#Secret` 智能 Badge；针对身份证号、Token、API Key 智能应用脱敏遮罩与明文解锁；支持自定义设定敏感条目 TTL 销毁分钟数。

4. **⚡ 局域网 WebRTC 毫秒级 P2P 直连通道**
   - **核心文件**：[webrtcSync.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/sync/webrtcSync.ts), [DevicesPage.tsx](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/popup/pages/DevicesPage.tsx)
   - **特性**：同一 Wi-Fi 局域网下通过 `RTCDataChannel` 建立点对点直连通道，实现低于 10ms 的无感剪贴板推拉。

5. **🔎 独立可关闭的极速搜索弹框 (Omnibox Search Modal)**
   - **核心文件**：[OmniboxSearchModal.tsx](file:///D:/360Downloads/extension/popup/components/OmniboxSearchModal.tsx)
   - **特性**：支持跨剪贴板、标签页、书签极速模糊搜索，配备独立的 `✕` 关闭按钮与 `Esc` 退出机制，并在【设置】中提供独立停用开关。

6. **🎨 多模态图片预览、JSON 美化与 📱 网址离端二维码**
   - **核心文件**：[contentPreview.ts](file:///D:/360Downloads/extension/utils/contentPreview.ts), [qrcode.ts](file:///D:/360Downloads/extension/utils/qrcode.ts), [EntryRow.tsx](file:///D:/360Downloads/extension/popup/components/EntryRow.tsx)
   - **特性**：自动检测 Base64/URL 图片并提供全屏高质预览，对 JSON 内容一键美化缩进排版，对 URL 网址生成 100% 离线安全的 SVG 二维码供手机无感扫码。

7. **🚀 双轨独立分发 CI/CD 工作流**
   - **核心文件**：[.github/workflows/dev-build.yml](file:///D:/360Downloads/extension/.github/workflows/dev-build.yml)
   - **特性**：配置了独立的 `dev` 构建工作流，每次 Push 自动编译并在 GitHub Releases 与 Actions 发布 `dev-preview` Prerelease 独立预览包。

---

## 🖱️ 二、 拖拽交互与工作区重构路线图 (Drag & Drop Roadmap)

拖拽交互是 OpenClip Sync 的核心卖点之一，目前已完成看板拖拽，后续将持续拓展至剪贴板与导出层：

| 拖拽交互场景 | 详细说明 | 关键技术实现 | 交付状态 |
| :--- | :--- | :--- | :---: |
| **📋 工作区看板跨列拖拽** | 在标签页看板中跨列自由拖拽重排卡片、分配工作区并批量快照 | `@dnd-kit/core` + `@dnd-kit/sortable` | ✅ **已交付 (`dev`)** |
| **📌 剪贴板条目拖拽手动重排** | 剪贴板列表支持按住 ⠿ 手动拖拽调整条目顺序并同步存储 | `@dnd-kit/sortable` + `_setEntries` | ✅ **已交付 (`dev`)** |
| **🏷️ 拖拽剪贴板条目打标** | 将剪贴板卡片直接拖拽至标签 (Tag Badge) 上快速分配分类 | `@dnd-kit/core` Droppable | ✅ **已交付 (`dev`)** |
| **📁 拖拽剪贴板直接导出文件** | 将剪贴板卡片拖拽至桌面或网页输入框，自动生成 `.md` / `.txt` 文件 | HTML5 Drag & Drop File API | ✅ **已交付 (`dev`)** |

---

## 📊 三、 完整 Roadmap 功能与市场对比状态一览表

| 模块 / 功能 | 详细说明 | 架构与设计原则 | 交付状态 |
| :--- | :--- | :--- | :---: |
| **🔐 E2EE 零知识加密** | PBKDF2 派生密钥 + AES-256-GCM 离端加密 | 零服务端依赖 / 密文上云 | ✅ **已交付 (`dev`)** |
| **📋 可视化看板与 Tab 休眠** | `@dnd-kit` 拖拽看板 + 原生 `chrome.tabs.discard` | 内存极致释放 / 工作区拖拽 | ✅ **已交付 (`dev`)** |
| **🏷️ 智能打标与脱敏 TTL** | `#URL/#Code/#Secret` 识别，脱敏保护与倒计时销毁 | 隐私保护与动态遮罩 | ✅ **已交付 (`dev`)** |
| **⚡ WebRTC P2P 直连** | 同 Wi-Fi 局域网 `<10ms` 极速点对点数据传输 | 无云端中间件直连 | ✅ **已交付 (`dev`)** |
| **🔎 独立极速搜索弹框** | 跨模态模糊检索，独立可关闭、可设置停用 | 100% 纯只读 UI 层 | ✅ **已交付 (`dev`)** |
| **🚀 双轨 CI/CD 自动打包** | 自动生成 `dev-preview` Chrome/Firefox 安装包 | 独立 GitHub Workflow | ✅ **已交付 (`dev`)** |
| **🎨 多模态图片与 JSON 美化** | 图片 Base64 预览与 JSON/SQL 一键高亮排版 | 渲染展示层增强 | ✅ **已交付 (`dev`)** |
| **📱 网址二维码与 PWA 连接** | 网址一键生成二维码，手机扫码与 PWA/快捷指令 | 跨端极速小工具 (100% 离端) | ✅ **已交付 (`dev`)** |
| **⚡ 剪贴板自动化与 Webhook** | 自定义正则拦截与 HTTP Webhook 管道触发 | 事件自动化处理 | ✅ **已交付 (`dev`)** |
| **🖥️ 系统级 Rust 独立守护进程** | 100% 独立常驻桌面后台，无需依赖 Native Messaging，通过本地 WebSocket (`ws://127.0.0.1:18900`) 双向实时共享，内存占用仅 2-3MB | Rust + `arboard` + `tokio-tungstenite` | 🛠️ **已完成架构设计与参考工程 ([ref/openclip-standalone-daemon](file:///D:/123pan/222/ref/openclip-standalone-daemon))** |
| **📥 Chrome 原生数据无损拦截镜像** | 监听 `chrome.bookmarks`, `chrome.history`, `chrome.storage.sync` 等事件，在 100% 不打扰 Chrome 官方原生云同步的前提下，无损拦截一份副本归档到本地 Rust 数据库 | 扩展只读观察者 API + WebSocket 管道 | 🛠️ **已完成设计与集成规划** |
| **📜 浏览历史去重与独立日历时间线** | 关闭写回 Chrome 原生 history 彻底防污染 + 独立日历视图 + 日内 URL 归一化去重 | 规划方案详见 [docs/HISTORY_CALENDAR_FEATURE_PLAN.md](docs/HISTORY_CALENDAR_FEATURE_PLAN.md) | 🛠️ **已完成架构设计与规划** |

---

## 💡 四、 下一阶段演进方向

如需继续深化 `dev` 分支，最推荐无损实施的项目为 **🎨 多模态图片预览 + JSON 一键格式化美化 + 📱 网址二维码扫码**。

---

## 🛠️ 五、 桌面端 Rust 独立守护进程与 Chrome 数据无损拦截架构

### 1. 🖥️ 双边独立 + WebSocket 双向共享 (Rust Desktop Companion)
- **独立运行**：Rust 进程独立常驻操作系统后台（内存仅 2-3MB），在浏览器关闭时依然独立抓取并保存系统剪贴板。
- **本地 IPC 通道**：内嵌轻量 WebSocket 端口 (`ws://127.0.0.1:18900`)，当浏览器开启时双边即时无缝推拉共享。
- **参考工程**：已落地至 [ref/openclip-standalone-daemon/](file:///D:/123pan/222/ref/openclip-standalone-daemon)。

### 2. 📥 Chrome 原生数据无损拦截镜像 (Passive Interception)
- **只读观察者机制**：监听 `chrome.bookmarks.onCreated`, `chrome.history.onVisited`, `chrome.storage.sync.onChanged` 等事件。
- **零影响原生同步**：100% 不干扰 Chrome 官方的谷歌账号云端同步。
- **本地沉淀**：无损复制一份书签、浏览历史与同步存储快照，通过 WebSocket 管道实时流转并落盘至本地 Rust 数据库。

