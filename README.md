# OpenClip Sync (v2.7.5)

> 🚀 **全能型去中心化多端浏览器数据同步与剪贴板管理扩展（Chrome / Edge / Firefox）**  
> 官方开源仓库：[choicenew/openclip](https://github.com/choicenew/openclip)  

---

## 🌟 核心特性 (Features)

- 🔒 **隐私安全 & 0 商业服务器**：数据完全属于您自己。直连用户自建网盘或云存储，无第三方中间商风险。
- 👑 **主辅设备权限控制矩阵 (Primary / Auxiliary Device Master-Slave Model)**：
  - **主设备 (Master Device)**：拥有最高控制权，能在云端写入控制锁与设备规则卡片。
  - **辅助设备 (Auxiliary Auto-Demotion)**：登录同一云盘的辅设备自动被主设备控卡约束，无法抢夺主控权。
  - **模态数据源交叉绑定**：可精确控制设备 B 仅从设备 C 拉取历史记录、仅从设备 D 拉取扩展插件等。
- 🌐 **全套主流网盘 Backend 支持 (Multi-Provider Sync)**：
  - **Chrome Sync**：谷歌内置账号自动静默同步。
  - **WebDAV**：坚果云、Nextcloud、群晖 Synology NAS、Alist、Seafile。
  - **Microsoft OneDrive / Google Drive**：微软/谷歌云盘一键 OAuth 登录与全量备份。
  - **GitHub Gist**：个人秘钥与代码片段云备份。
  - **AWS S3 / MinIO / OSS**：标准对象存储直连。
  - **Custom REST API**：自建 Webhook / HTTP 服务器端点。
- 📦 **浏览器全模态数据大一统备份**：
  - 📋 **剪贴板历史** (Clipboard History)
  - 🔖 **浏览器书签树** (Bookmarks Tree)
  - 📜 **浏览历史记录** (Browser History)
  - 🌐 **多设备会话标签页组** (Browser Sessions)
  - 🧩 **已安装扩展插件列表** (Installed Extensions)
- 🎨 **三态交互 UX**：原生支持快捷 Popup 弹窗、独立 Picture-in-Picture 悬浮窗与 Side Panel 侧边栏模式。

---

## 🛠️ 快捷开始 (Quick Start)

### 1. 赞助与支持
支持开源开发：[Ko-fi 赞助渠道](https://ko-fi.com/cue322631)

### 2. 本地构建与打包

```bash
# 1. 安装项目依赖
npm install

# 2. 启动开发模式
npm run dev

# 3. 生产打包
npm run build
```

打包生成的扩展目录保存在 `build/chrome-mv3-prod`。

---

## 📜 开源协议 (License)

本项目遵循 MIT / GPL 协议开源。
