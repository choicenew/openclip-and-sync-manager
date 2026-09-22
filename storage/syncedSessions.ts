import { Storage } from "@plasmohq/storage";

import { getSyncSettings } from "~storage/syncSettings";
import { exportCurrentTabs, type SyncSession } from "~utils/sync/handlers/sessions";

const storage = new Storage({ area: "local" });
const SYNCED_SESSIONS_KEY = "openclip_synced_sessions";
const SESSION_NAME_TEMPLATE_KEY = "openclip_session_name_template";

export async function getSyncedSessions(): Promise<SyncSession[]> {
  const data = await storage.get<SyncSession[]>(SYNCED_SESSIONS_KEY);
  return data || [];
}

/** 生成 Session 的所有 Tab URL 指纹用于精准去重判断 */
export function getSessionTabsFingerprint(session: SyncSession): string {
  if (!session || !session.tabs) return "";
  return session.tabs
    .map((t) => t.url)
    .filter(Boolean)
    .sort()
    .join("|");
}

export async function setSyncedSessions(sessions: SyncSession[]): Promise<void> {
  if (!sessions) return;
  const existing = await getSyncedSessions();
  const map = new Map<string, SyncSession>();

  // 合并数据
  for (const s of existing) {
    if (s && s.id) map.set(s.id, s);
  }
  for (const s of sessions) {
    if (s && s.id) map.set(s.id, s);
  }

  let allSessions = Array.from(map.values());

  // 核心去重逻辑：如果两个 Section 快照包含完全一模一样的网页列表，自动去重合并，仅保留最新的一个 Section！
  const fingerprintMap = new Map<string, SyncSession>();
  const deduplicatedList: SyncSession[] = [];

  // 按保存时间从新到旧排序
  allSessions.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());

  for (const s of allSessions) {
    const fp = getSessionTabsFingerprint(s);
    if (fp) {
      if (fingerprintMap.has(fp)) {
        // 已存在完全相同的 Section 快照，跳过旧记录，实现自动去重合并！
        continue;
      }
      fingerprintMap.set(fp, s);
    }
    deduplicatedList.push(s);
  }

  // 最多保留最近 50 个去重后的 Section 快照
  const finalSorted = deduplicatedList.slice(0, 50);
  await storage.set(SYNCED_SESSIONS_KEY, finalSorted);
}

export async function getSessionNameTemplate(): Promise<string> {
  const val = await storage.get<string>(SESSION_NAME_TEMPLATE_KEY);
  return val || "{YYYY}-{MM}-{DD} {HH}:{mm} - {deviceName} ({tabCount} 标签)";
}

export async function setSessionNameTemplate(template: string): Promise<void> {
  await storage.set(SESSION_NAME_TEMPLATE_KEY, template);
}

/** 修改/重命名指定会话卡片的名称 */
export async function updateSessionLabel(sessionId: string, newLabel: string): Promise<void> {
  const sessions = await getSyncedSessions();
  const updated = sessions.map((s) => (s.id === sessionId ? { ...s, label: newLabel } : s));
  await storage.set(SYNCED_SESSIONS_KEY, updated);
}

/** 格式化模板生成 Session 名称 */
export function formatSessionNameTemplate(
  template: string,
  deviceName: string,
  tabCount: number,
): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return template
    .replace(/{YYYY}/g, String(d.getFullYear()))
    .replace(/{MM}/g, pad(d.getMonth() + 1))
    .replace(/{DD}/g, pad(d.getDate()))
    .replace(/{HH}/g, pad(d.getHours()))
    .replace(/{mm}/g, pad(d.getMinutes()))
    .replace(/{deviceName}/g, deviceName)
    .replace(/{tabCount}/g, String(tabCount));
}

/** 自动触发保存当前打开的会话时间轴快照 (含自动去重合并) */
export async function autoSaveSessionSnapshot(triggerLabel = "自动备份"): Promise<SyncSession | null> {
  try {
    const [tabs, syncSet, template] = await Promise.all([
      exportCurrentTabs(),
      getSyncSettings(),
      getSessionNameTemplate(),
    ]);

    if (!tabs || tabs.length === 0) return null;

    const deviceName = syncSet.deviceName || "本机";
    const label = `${triggerLabel}: ${formatSessionNameTemplate(template, deviceName, tabs.length)}`;

    const newSession: SyncSession = {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      deviceId: syncSet.deviceId || "local",
      deviceName: `${deviceName} (${triggerLabel})`,
      savedAt: new Date().toISOString(),
      label,
      tabs,
    };

    const existing = await getSyncedSessions();
    await setSyncedSessions([newSession, ...existing]);
    return newSession;
  } catch (err) {
    console.warn("[SyncedSessions] Failed to auto save session snapshot:", err);
    return null;
  }
}
