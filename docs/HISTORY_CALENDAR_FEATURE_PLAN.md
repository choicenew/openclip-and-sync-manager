# 📜 浏览历史去重与独立日历时间线重构方案 (History Sync & Calendar Timeline Plan)

## 📌 一、 需求背景与痛点诊断

在当前多端同步场景中，**“浏览历史 (Browser History)”** 存在以下核心痛点：

1. **Chrome 原生历史被污染 (`chrome://history`)**：
   - 当插件从云端拉取跨设备/历史日期的浏览记录时，通过 `chrome.history.addUrl({ url })` 写入本地 Chrome。
   - 由于 Chrome 官方 API `addUrl` **不支持指定历史时间戳 (`visitTime`)**，导致所有补写入的 URL 被 Chrome 强制标记为 **“当下/当天 (`Date.now()`)”**，原生历史页面被几百条旧链接填满。
2. **缺乏日期维度筛选**：
   - 之前历史记录仅提供单向长列表，难以定位“某年某月某天”具体访问过哪些网页。
3. **重复 URL 冗余展示**：
   - 当同一网页在同一天多次访问时，列表平铺展示，信息密度低、噪音大。

---

## 🎯 二、 终极重构方案设计

为解决上述问题，提出以下三位一体重构设计：

### 1. ⚙️ 新增“写回 Chrome 本地历史”开关 (可自由关闭)
- **配置字段**：`importToBrowserHistory` (Boolean，默认 `false`)。
- **行为控制**：
  - **关闭时 (默认推荐)**：拉取云端历史仅存储在扩展私有数据库 (`openclip_synced_history`) 中，**零污染** Chrome 原生 `chrome://history`。
  - **开启时**：保留原有 `importHistory()` 写回逻辑，满足特殊需求用户。

### 2. 📅 独立日历视图面板 (Calendar Timeline View)
- **前端组件**：在 `HistoryPage.tsx` 中嵌入日期选择/日历网格/时间线切换。
- **精准日期筛选**：点击任意历史日期（如 `2026-03-28`），即时过滤并呈现**该日期下**所有跨设备绑定的网页足迹。

### 3. 🛡️ 日内 URL 归一化去重与频次聚合 (URL Deduplication)
- **去重规则**：在选定日期内，相同 `url` 仅展示 **1 条精简卡片**。
- **频次标记**：卡片右侧显示高亮 Badge 标签（如 `🔥 访问 15 次`），并保留该 URL 当天的最新访问时间 (`lastVisitTime`)。

---

## 🏗️ 三、 代码架构与逻辑修改清单

| 模块 / 文件 | 关键修改点 |
| :--- | :--- |
| `types/settings.ts` | 扩展设置 Schema，添加 `importToBrowserHistory: false` 字段 |
| `storage/syncSettings.ts` | 添加对 `importToBrowserHistory` 的读写与默认值支持 |
| `utils/sync/engine.ts` | 在 `runFullSync` 中判定：`if (syncSet.importToBrowserHistory) await importHistory(mergedHistory);` |
| `popup/pages/HistoryPage.tsx` | 1. 增加日历/日期选择组件 (`DatePicker` / `DateCalendar`)。<br>2. 增加基于 `YYYY-MM-DD` 的日期分组与过滤函数。<br>3. 增加日内 `url` 去重合并与 `visitCount` 频次累加器。<br>4. 增加“写回 Chrome 历史”独立配置开关。 |

---

## 🚀 四、 实施路线与版本计划

1. **第一阶段**：扩展 settings/syncSettings 配置，拦截 `chrome.history.addUrl()`，解除对原生历史记录的“当天”污染。
2. **第二阶段**：重构 `HistoryPage.tsx`，加入日历表格与日内 URL 去重。
3. **第三阶段**：构建与更新打包测试，确保各云端 Backend 同步平稳流转。

---
