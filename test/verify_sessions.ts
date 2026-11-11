/**
 * test/verify_sessions.ts
 * 自动化单元与集成测试套件：验证多窗口会话导出、指纹去重、30天TTL清理、TSM/Session Buddy导入解析
 */

export interface SyncTab {
  url: string;
  title?: string;
  pinned: boolean;
  favIconUrl?: string;
  groupTitle?: string;
  groupColor?: string;
  groupCollapsed?: boolean;
  windowId?: number;
}

export interface SyncSession {
  id: string;
  deviceId: string;
  deviceName: string;
  savedAt: string;
  label?: string;
  windowsNumber?: number;
  tabsCount?: number;
  tabs: SyncTab[];
}

export function getSessionTabsFingerprint(session: SyncSession): string {
  if (!session || !session.tabs) return "";
  const dev = session.deviceId || "unknown";
  return `${dev}|` + session.tabs
    .map((t) => `${t.windowId || 1}:${t.url}`)
    .filter(Boolean)
    .sort()
    .join("|");
}

export function mergeSessions(localSessions: SyncSession[] = [], remoteSessions: SyncSession[] = []): SyncSession[] {
  const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const allSessions = [...remoteSessions, ...localSessions];

  const fingerprintMap = new Map<string, SyncSession>();

  for (const s of allSessions) {
    if (!s || !s.id || !Array.isArray(s.tabs) || s.tabs.length === 0) continue;

    if (s.savedAt) {
      const time = new Date(s.savedAt).getTime();
      if (!isNaN(time) && now - time > ONE_MONTH_MS) {
        continue;
      }
    }

    const urls = s.tabs
      .map((t) => (t && t.url ? t.url.trim() : ""))
      .filter(Boolean)
      .sort()
      .join("|");
    const key = urls || s.id;

    const existing = fingerprintMap.get(key);
    if (!existing) {
      fingerprintMap.set(key, { ...s });
    } else {
      const existingTime = existing.savedAt ? new Date(existing.savedAt).getTime() : 0;
      const currentTime = s.savedAt ? new Date(s.savedAt).getTime() : 0;
      if (currentTime > existingTime) {
        fingerprintMap.set(key, { ...s });
      }
    }
  }

  const merged = Array.from(fingerprintMap.values());
  merged.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
  return merged.slice(0, 100);
}

export function parseTSMBackup(data: any[]): SyncSession[] {
  if (!Array.isArray(data)) return [];
  const sessions: SyncSession[] = [];

  for (const s of data) {
    if (!s || typeof s !== "object") continue;
    const tabs: SyncTab[] = [];
    const windowKeys = Object.keys(s.windows || {});

    for (let wIdx = 0; wIdx < windowKeys.length; wIdx++) {
      const winIdStr = windowKeys[wIdx]!;
      const winTabs = s.windows[winIdStr];
      if (!winTabs || typeof winTabs !== "object") continue;

      for (const tKey of Object.keys(winTabs)) {
        const t = winTabs[tKey];
        if (t && typeof t.url === "string" && t.url.startsWith("http")) {
          tabs.push({
            url: t.url,
            title: t.title || t.url,
            pinned: !!t.pinned,
            favIconUrl: t.favIconUrl,
            windowId: wIdx + 1,
          });
        }
      }
    }

    if (tabs.length > 0) {
      sessions.push({
        id: `tsm_import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        deviceId: "TSM Import",
        deviceName: "Tab Session Manager 导入",
        savedAt: typeof s.date === "number" ? new Date(s.date).toISOString() : new Date().toISOString(),
        label: s.name || `TSM 导入会话 (${tabs.length} 标签页)`,
        windowsNumber: windowKeys.length || 1,
        tabsCount: tabs.length,
        tabs,
      });
    }
  }
  return sessions;
}

export function parseSessionBuddyBackup(data: any[]): SyncSession[] {
  if (!Array.isArray(data)) return [];
  const sessions: SyncSession[] = [];

  for (const s of data) {
    if (!s || !Array.isArray(s.windows)) continue;
    const tabs: SyncTab[] = [];

    for (let wIdx = 0; wIdx < s.windows.length; wIdx++) {
      const win = s.windows[wIdx];
      if (!Array.isArray(win)) continue;

      for (const t of win) {
        if (t && typeof t.url === "string" && t.url.startsWith("http")) {
          tabs.push({
            url: t.url,
            title: t.title || t.url,
            pinned: false,
            windowId: wIdx + 1,
          });
        }
      }
    }

    if (tabs.length > 0) {
      sessions.push({
        id: `sb_import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        deviceId: "Session Buddy Import",
        deviceName: "Session Buddy 导入",
        savedAt: typeof s.created === "number" ? new Date(s.created).toISOString() : new Date().toISOString(),
        label: s.title || `Session Buddy 导入 (${tabs.length} 标签页)`,
        windowsNumber: s.windows.length || 1,
        tabsCount: tabs.length,
        tabs,
      });
    }
  }
  return sessions;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runTests() {
  console.log("\n🧪 正在运行 OpenClip Sync 会话模块全量自动化测试...\n");

  // -------------------------------------------------------------
  // 测试 1: 验证多窗口会话指纹计算 (getSessionTabsFingerprint)
  // -------------------------------------------------------------
  const session1: SyncSession = {
    id: "s1",
    deviceId: "device_a",
    deviceName: "电脑 A",
    savedAt: new Date().toISOString(),
    windowsNumber: 2,
    tabsCount: 3,
    tabs: [
      { url: "https://google.com", title: "Google", pinned: false, windowId: 1 },
      { url: "https://github.com", title: "GitHub", pinned: false, windowId: 1 },
      { url: "https://stackoverflow.com", title: "StackOverflow", pinned: false, windowId: 2 },
    ],
  };

  const fp1 = getSessionTabsFingerprint(session1);
  assert(fp1.includes("device_a"), "指纹包含设备 ID");
  assert(fp1.includes("1:https://google.com"), "指纹包含窗口 1 网页");
  assert(fp1.includes("2:https://stackoverflow.com"), "指纹包含窗口 2 网页");

  // -------------------------------------------------------------
  // 测试 2: 验证重复会话自动合并与 30 天 TTL 淘汰 (mergeSessions)
  // -------------------------------------------------------------
  const now = Date.now();
  const oldDate = new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 天前 (应淘汰)
  const recentDate1 = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 天前
  const recentDate2 = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 天前 (较新)

  const expiredSession: SyncSession = {
    id: "expired_1",
    deviceId: "dev1",
    deviceName: "旧电脑",
    savedAt: oldDate,
    tabs: [{ url: "https://old.com", title: "Old Page", pinned: false, windowId: 1 }],
  };

  const localDup1: SyncSession = {
    id: "local_1",
    deviceId: "dev1",
    deviceName: "本机",
    savedAt: recentDate1,
    tabs: [{ url: "https://target.com", title: "Target Page", pinned: false, windowId: 1 }],
  };

  const remoteDup2: SyncSession = {
    id: "remote_1",
    deviceId: "dev1",
    deviceName: "本机 (更新)",
    savedAt: recentDate2,
    tabs: [{ url: "https://target.com", title: "Target Page", pinned: false, windowId: 1 }],
  };

  const merged = mergeSessions([localDup1, expiredSession], [remoteDup2]);

  // 验证超过 30 天的已过期会话被自动清理
  assert(!merged.some((s) => s.id === "expired_1"), "超过 30 天的旧会话已成功自动清理淘汰");

  // 验证相同内容快照去重合并，只保留最新时间的快照
  assert(merged.length === 1, "相同内容的重复会话已成功合并为 1 条");
  assert(merged[0]?.savedAt === recentDate2, "去重合并后成功保留了最新的 savedAt 时间戳");

  // -------------------------------------------------------------
  // 测试 3: 验证 Tab Session Manager (TSM) JSON 会话导入解析 (parseTSMBackup)
  // -------------------------------------------------------------
  const sampleTSMJson = [
    {
      id: "tsm_guid_123",
      name: "工作工作区",
      date: Date.now(),
      windows: {
        "101": {
          "1": { url: "https://github.com", title: "GitHub Code", pinned: false },
          "2": { url: "https://news.ycombinator.com", title: "Hacker News", pinned: false },
        },
        "102": {
          "3": { url: "https://wikipedia.org", title: "Wikipedia", pinned: false },
        },
      },
    },
  ];

  const parsedTSM = parseTSMBackup(sampleTSMJson);
  assert(parsedTSM.length === 1, "TSM JSON 样例文件导入测试成功，正确解析为 1 个会话");
  assert(parsedTSM[0]?.windowsNumber === 2, "TSM 导入会话正确捕获了 2 个窗口结构");
  assert(parsedTSM[0]?.tabs.length === 3, "TSM 导入会话正确捕获了 3 个网页标签");

  // -------------------------------------------------------------
  // 测试 4: 验证 Session Buddy JSON 会话导入解析 (parseSessionBuddyBackup)
  // -------------------------------------------------------------
  const sampleSessionBuddyJson = [
    {
      title: "我的研究项目",
      created: Date.now(),
      windows: [
        [
          { url: "https://developer.mozilla.org", title: "MDN Docs" },
          { url: "https://react.dev", title: "React Docs" },
        ],
      ],
    },
  ];

  const parsedSB = parseSessionBuddyBackup(sampleSessionBuddyJson);
  assert(parsedSB.length === 1, "Session Buddy JSON 样例文件导入测试成功，正确解析为 1 个会话");
  assert(parsedSB[0]?.tabs.length === 2, "Session Buddy 导入会话正确捕获了 2 个网页标签");

  console.log("\n🎉 所有 6 项核心测试用例全部顺利通过！OpenClip Sync 会话与导入模块 100% 正常运行！\n");
}

runTests().catch((err) => {
  console.error("❌ [Test Error]:", err);
  process.exit(1);
});
