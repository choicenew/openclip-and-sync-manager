# 🚀 OpenClip Sync (`dev` 分支) 架构演进与路线图 (Roadmap)

本文档实时记录了 `dev` 分支的架构演进规划、已交付功能与未来解耦模块开发路线。

---

## 📌 一、 `dev` 分支最新已交付功能矩阵 (v2.7.62)

在 `dev` 分支上，我们完成了 6 大核心增强模块的无损解耦开发与 GitHub 自动化独立打包分发：

1. **🔐 端到端零知识加密 (E2EE - AES-256-GCM)**
   - **核心文件**：[e2ee.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/crypto/e2ee.ts), [db/core.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/db/core.ts)
   - **特性**：基于 Web Crypto 原生 PBKDF2 密钥派生与 AES-256-GCM 认证加密。所有数据在离开本端上云前全量转换为 `ENC:v1:...` 密文，云端无法破解。

2. **📋 工作区看板与标签页休眠 (Workspace Kanban & Tab Suspend)**
   - **核心文件**：[TabKanbanBoard.tsx](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/popup/components/TabKanbanBoard.tsx), [tabSuspend.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/tabSuspend.ts)
   - **特性**：基于 `@dnd-kit` 实现多列拖拽式工作区看板，支持调用原生的 `chrome.tabs.discard()` 一键休眠后台闲置网页以极大节省系统内存。

3. **🏷️ 智能分类、脱敏保护与 TTL 定时销毁**
   - **核心文件**：[entryClassifier.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/entryClassifier.ts), [entryMasking.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/entryMasking.ts)
   - **特性**：自动检测特征打上 `#URL`, `#Code`, `#Email`, `#Secret` 智能 Badge；针对身份证号、Token、API Key 智能应用脱敏遮罩与明文解锁；支持自定义设定敏感条目 TTL 销毁分钟数。

4. **⚡ 局域网 WebRTC 毫秒级 P2P 直连通道**
   - **核心文件**：[webrtcSync.ts](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/utils/sync/webrtcSync.ts), [DevicesPage.tsx](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/popup/pages/DevicesPage.tsx)
   - **特性**：同一 Wi-Fi 局域网下通过 `RTCDataChannel` 建立点对点直连通道，实现低于 10ms 的无感剪贴板推拉。

5. **🔎 独立可关闭的极速搜索弹框 (Omnibox Search Modal)**
   - **核心文件**：[OmniboxSearchModal.tsx](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/popup/components/OmniboxSearchModal.tsx)
   - **特性**：支持跨剪贴板、标签页、书签极速模糊搜索，配备独立的 `✕` 关闭按钮与 `Esc` 退出机制，并在【设置】中提供独立停用开关。

6. **🚀 双轨独立分发 CI/CD 工作流**
   - **核心文件**：[.github/workflows/dev-build.yml](file:///C:/Users/Administrator/StudioProjects/openclip-and-sync-manager/.github/workflows/dev-build.yml)
   - **特性**：配置了独立的 `dev` 构建工作流，每次 Push 自动编译并在 GitHub Releases 与 Actions 发布 `dev-preview` Prerelease 独立预览包。

---

## 📊 二、 完整 Roadmap 功能状态一览表

| 模块 / 功能 | 详细说明 | 解耦与设计原则 | 当前状态 |
| :--- | :--- | :--- | :---: |
| **🔐 E2EE 零知识加密** | PBKDF2 派生密钥 + AES-256-GCM 离端加密 | 零服务端依赖 / 密文上云 | ✅ 已完成并分发 |
| **📋 看板与 Tab 休眠** | `@dnd-kit` 看板 + 原生 `chrome.tabs.discard` | 内存极致释放 / 工作区拖拽 | ✅ 已完成并分发 |
| **🏷️ 智能打标与 TTL** | `#URL/#Code/#Secret` 识别，脱敏保护与倒计时销毁 | 隐私保护与动态遮罩 | ✅ 已完成并分发 |
| **⚡ WebRTC P2P 直连** | 同 Wi-Fi 局域网 `<10ms` 极速点对点数据传输 | 无云端中间件直连 | ✅ 已完成并分发 |
| **🔎 极速搜索弹框** | 跨模态模糊检索，独立可关闭、可设置停用 | 100% 纯只读 UI 层 | ✅ 已完成并分发 |
| **🚀 双轨 CI/CD 自动打包** | 自动生成 `dev-preview` Chrome/Firefox 安装包 | 独立 GitHub Workflow | ✅ 已完成并分发 |
| **🎨 多模态图片与 JSON 美化** | 图片 Base64 预览与 JSON/SQL 一键高亮排版 | 渲染展示层增强 | ⏳ 规划中 (Next) |
| **📱 网址一键生成二维码** | 复制 URL 显示二维码，手机扫码即可无缝直接打开 | 跨端极速小工具 | ⏳ 规划中 |
| **🖥️ 系统级 Native 托盘伴侣** | 突破浏览器最小化限制，支持 OS 全局剪贴板捕获 | Native Messaging 进程 | 🔮 远期规划 |

---

## 💡 三、 下一阶段演进方向

如需继续深化 `dev` 分支，最推荐无损实施的项目为 **🎨 多模态图片预览 + JSON 一键格式化美化 + 📱 网址二维码扫码**。
