# OpenClip Sync (v2.7.40)

> **高效、去中心化全模态多端数据同步浏览器扩展**  
> 🌐 官方 Promo 静态网页：[https://choicenew.github.io/openclip-and-sync-manager/](https://choicenew.github.io/openclip-and-sync-manager/)  
> 官方 GitHub 仓库：[https://github.com/choicenew/openclip-and-sync-manager](https://github.com/choicenew/openclip-and-sync-manager)  
> 维护者：[choicenew](https://github.com/choicenew)

---

## 🌟 核心功能特性 (Features)

OpenClip Sync 是一款全功能、高性能、去中心化的跨端剪贴板与数据同步浏览器扩展。全新架构消除了传统扩展的重度内存开销与多端冲突，实现极低内存占用与多云无缝备份。

### 1. 📋 多端剪贴板历史与自由调序 (Clipboard History & Custom Sorting)
- **毫秒级离线捕获**：基于 Chrome MV3 Offscreen 文档高效静默轮询，不漏抓任何复制记录。
- **正序 / 倒序一键自由调序**：列表工具栏提供 `⇅ 最新在前(降序)` / `⇅ 最旧在前(升序)` 按钮，随心切换展示顺序。
- **敏感词过滤与黑名单拦截**：支持正则与关键词屏蔽，避免 Token 或密码误存入历史。

### 2. 🌐 Tab Groups 与会话快照管理 (TSM Compatible Session Manager)
- **原生对标 Tab Session Manager (TSM)**：支持全局实时侦测标签组变动。
- **自动定时快照与去重**：支持启动/关闭浏览器自动保存会话快照、定时自动备份与 URL 黑名单排除。

### 3. 👑 主辅设备控制流 (Primary / Auxiliary Device Control Flow)
- **主设备控制 (Master Device)**：掌握跨端设备控制矩阵与主动拉取同步策略。
- **辅助设备自动降级 (Auxiliary Auto-Demotion)**：检测到云端主设备标记时，辅助设备自动变形并禁止抢夺权限。

### 4. ☁️ 7 大无损云端 Backend 存储节点 (Multi-Cloud Storage Engine)
支持同时开启多个后端，数据直连私有云：
1. **Chrome Sync** — 谷歌账号内置轻量同步 (自动控制在 8KB 单项上限以内)
2. **WebDAV** — 支持坚果云、Nextcloud、群晖 NAS 及自建 WebDAV，支持 Gzip 高能文本压缩
3. **OneDrive** — 微软云盘 Graph API 无缝备份
4. **Google Drive** — 谷歌云盘 OAuth2 极速同步
5. **GitHub Gist** — 私有 GitHub Code Snippet 与 Key-Value 存储 (含专属 PAT 与 Gist ID 参数展开卡片)
6. **AWS S3 / MinIO** — 企业级与私有云对象存储 (含 Endpoint, Bucket, AccessKey, SecretKey 参数展开卡片)
7. **Custom REST API** — 自建 HTTP/HTTPS REST API 端点同步

### 5. ⚡ 极低内存开销 (Low Memory Architecture)
- 过滤 Base64 Data URI 图片，彻底压低 V8 堆内存消耗。
- 动态 5s Data Cache TTL，闲置时自动回收垃圾。

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
```
编译产物将位于 `build/chrome-mv3-prod`，可直接在 Chrome `chrome://extensions/` 开发者模式下加载测试。

---

## 🚀 GitHub Actions 自动化 CI/CD

- **GitHub Pages 部署** (`.github/workflows/deploy-pages.yml`)：自动构建并发布静态 Promo 宣传网页。
- **版本自动化递增**：每次编译自动递增版本号（当前版本：`v2.7.40`）。

---

## 📄 开源许可与协议 (License)

本项目采用 **MIT License** 开源。授权任何人免费使用、学习与二次开发。

© 2026 ChoiceNew / OpenClip Sync Team. Maintained by [choicenew](https://github.com/choicenew).
