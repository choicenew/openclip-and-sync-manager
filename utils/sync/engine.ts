/**
 * utils/sync/engine.ts — v2.7.0 分模态独立文件 Sync Engine
 * 包含: 剪贴板 (clipboard.json)、书签 (bookmarks.json)、历史 (history.json)、
 *       会话 (sessions.json)、扩展 (extensions.json)、主控规则 (master_config.json)
 */

import { getSettings } from "~storage/settings";
import { getSyncSettings, setSyncStatus } from "~storage/syncSettings";
import { getSyncedSessions, setSyncedSessions } from "~storage/syncedSessions";
import { getLocalAsCloudData, saveCloudDataToLocal } from "~utils/db/core";
import { exportBookmarksTree, syncRemoteBookmarksToLocal, type SyncBookmark } from "./handlers/bookmarks";
import { exportExtensions, type SyncExtension } from "./handlers/extensions";
import { exportHistory, importHistory, type SyncHistoryItem } from "./handlers/history";
import { exportSession, type SyncSession } from "./handlers/sessions";
import { attachMasterLockToPushData, processMasterSlaveRulesOnPull } from "./masterSlave";
import { getActiveProvider, type CloudData } from "./provider";

export interface MultiModalSyncPayload extends CloudData {
  bookmarks?: SyncBookmark[];
  history?: SyncHistoryItem[];
  sessions?: SyncSession[];
  extensions?: SyncExtension[];
  masterLock?: any;
}

/** 多设备会话 Section 去重合并 */
export function mergeSessions(localSessions: SyncSession[] = [], remoteSessions: SyncSession[] = []): SyncSession[] {
  const map = new Map<string, SyncSession>();
  for (const s of remoteSessions) {
    if (s && s.id && s.tabs?.length > 0) map.set(s.id, s);
  }
  for (const s of localSessions) {
    if (s && s.id && s.tabs?.length > 0) map.set(s.id, s);
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.savedAt || 0).getTime() - new Date(a.savedAt || 0).getTime());
  return merged.slice(0, 100);
}

/** 多设备书签树去重合并 */
export function mergeBookmarks(localBookmarks: any[] = [], remoteBookmarks: any[] = []): any[] {
  const map = new Map<string, any>();
  for (const b of remoteBookmarks) {
    if (b && b.url) map.set(b.url, b);
  }
  for (const b of localBookmarks) {
    if (b && b.url) {
      const existing = map.get(b.url);
      map.set(b.url, existing ? { ...existing, ...b } : b);
    }
  }
  return Array.from(map.values());
}

/** 多设备浏览历史合并 */
export function mergeHistory(localHistory: SyncHistoryItem[] = [], remoteHistory: SyncHistoryItem[] = []): SyncHistoryItem[] {
  const map = new Map<string, SyncHistoryItem>();
  for (const h of remoteHistory) {
    if (h && h.url) map.set(h.url, h);
  }
  for (const h of localHistory) {
    if (h && h.url) {
      const existing = map.get(h.url);
      if (existing) {
        map.set(h.url, {
          ...existing,
          title: h.title || existing.title,
          lastVisitTime: Math.max(existing.lastVisitTime || 0, h.lastVisitTime || 0),
          visitCount: (existing.visitCount || 1) + (h.visitCount || 1),
          deviceId: h.deviceId || existing.deviceId,
          deviceName: h.deviceName || existing.deviceName,
        });
      } else {
        map.set(h.url, h);
      }
    }
  }
  const merged = Array.from(map.values());
  merged.sort((a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0));
  return merged;
}

/** 多设备扩展列表合并 */
export function mergeExtensions(localExts: SyncExtension[] = [], remoteExts: SyncExtension[] = []): SyncExtension[] {
  const map = new Map<string, SyncExtension>();
  for (const e of remoteExts) {
    if (e && e.id) map.set(e.id, e);
  }
  for (const e of localExts) {
    if (e && e.id) map.set(e.id, e);
  }
  return Array.from(map.values());
}

/** 打包本地全模态同步数据 */
export async function getLocalMultiModalPayload(): Promise<MultiModalSyncPayload> {
  const [baseCloudData, syncSet, sysSettings, savedSessions] = await Promise.all([
    getLocalAsCloudData(),
    getSyncSettings(),
    getSettings(),
    getSyncedSessions(),
  ]);

  const deviceId = syncSet.deviceId || "local_device";
  const deviceName = syncSet.deviceName || "此设备";
  const modalities = sysSettings.syncModalities || {
    clipboard: true,
    bookmarks: true,
    sessions: true,
    history: true,
    extensions: true,
  };

  const [bookmarks, history, currentSession, extensions] = await Promise.all([
    modalities.bookmarks ? exportBookmarksTree() : Promise.resolve([]),
    modalities.history ? exportHistory(7, 300) : Promise.resolve([]),
    modalities.sessions
      ? exportSession(deviceId, deviceName)
      : Promise.resolve({ id: "", deviceId, deviceName, savedAt: "", tabs: [] }),
    modalities.extensions ? exportExtensions() : Promise.resolve([]),
  ]);

  const allLocalSessions = currentSession.tabs?.length > 0
    ? [currentSession, ...savedSessions.filter((s) => s.id !== "local_current")]
    : savedSessions.filter((s) => s.id !== "local_current");

  return {
    ...baseCloudData,
    entries: modalities.clipboard ? baseCloudData.entries : [],
    bookmarks,
    history,
    sessions: allLocalSessions,
    extensions,
  };
}

/** 根据具体 Provider 节点的许可开关与全局模态开关，进行严格的双向双重门控过滤 */
export function filterPayloadForProvider(
  payload: MultiModalSyncPayload,
  providerKey: "chrome" | "webdav" | "onedrive" | "googledrive" | "gist" | "s3" | "customRest",
  syncSettingsVal: any,
  globalModalities: { clipboard: boolean; bookmarks: boolean; sessions: boolean; history: boolean; extensions: boolean },
): MultiModalSyncPayload {
  const pMods = syncSettingsVal?.providerModalities?.[providerKey] || {
    clipboard: true,
    bookmarks: true,
    sessions: true,
    history: true,
    extensions: true,
  };

  const allowClipboard = globalModalities.clipboard && pMods.clipboard;
  const allowBookmarks = globalModalities.bookmarks && pMods.bookmarks;
  const allowSessions = globalModalities.sessions && pMods.sessions;
  const allowHistory = globalModalities.history && pMods.history;
  const allowExtensions = globalModalities.extensions && pMods.extensions;

  return {
    ...payload,
    entries: allowClipboard ? payload.entries : [],
    bookmarks: allowBookmarks ? payload.bookmarks : [],
    sessions: allowSessions ? payload.sessions : [],
    history: allowHistory ? payload.history : [],
    extensions: allowExtensions ? payload.extensions : [],
  };
}

/** 执行 v2.7.0 分模态双向精细交错门控同步任务 */
export async function runFullSync(): Promise<{ success: boolean; message: string }> {
  const provider = await getActiveProvider();
  if (!provider || !(await provider.isAvailable())) {
    await setSyncStatus({ status: "idle", message: "未配置或未启用同步后端" });
    return { success: false, message: "未配置或未启用同步后端" };
  }

  await setSyncStatus({ status: "syncing", message: "全模态分文件双向门控同步中..." });

  try {
    const localPayload = await getLocalMultiModalPayload();
    const [sysSettings, syncSet] = await Promise.all([getSettings(), getSyncSettings()]);
    const modalities = sysSettings.syncModalities || {
      clipboard: true,
      bookmarks: true,
      sessions: true,
      history: true,
      extensions: true,
    };

    // 1. 拉取远程数据并应用主辅设备规则
    let remoteRaw: any = { entries: [], settings: [], devices: [] };
    try {
      remoteRaw = await provider.pull();
    } catch (e: any) {
      console.warn("[SyncEngine] Pull remote warning:", e);
    }

    const { processedEntries, masterState } = await processMasterSlaveRulesOnPull(remoteRaw);

    // 2. 多模态全局分类合并 (保留主从端各自的会话、历史、书签与扩展)
    const mergedSessions = mergeSessions(localPayload.sessions, remoteRaw.sessions);
    const mergedBookmarks = mergeBookmarks(localPayload.bookmarks, remoteRaw.bookmarks);
    const mergedHistory = mergeHistory(localPayload.history, remoteRaw.history);
    const mergedExtensions = mergeExtensions(localPayload.extensions, remoteRaw.extensions);

    const mergedBase = {
      entries: [...processedEntries, ...(localPayload.entries || [])],
      settings: localPayload.settings || [],
      devices: localPayload.devices || [],
    };

    // 3. 构建全量多模态推送 payload，如果当前为主设备则附加主设备控制锁数据
    const rawPushPayload = await attachMasterLockToPushData({
      ...mergedBase,
      bookmarks: mergedBookmarks,
      history: mergedHistory,
      sessions: mergedSessions,
      extensions: mergedExtensions,
    });

    // 严格经过双向过滤网格：每个 Provider 独立的模态许可规则
    const pName = provider.name.toLowerCase();
    const providerKey = (pName.includes("chrome")
      ? "chrome"
      : pName.includes("webdav")
      ? "webdav"
      : pName.includes("onedrive")
      ? "onedrive"
      : pName.includes("google")
      ? "googledrive"
      : pName.includes("s3")
      ? "s3"
      : pName.includes("gist")
      ? "gist"
      : "customRest") as any;

    const pushPayload = filterPayloadForProvider(rawPushPayload, providerKey, syncSet, modalities);

    await provider.push(pushPayload);
    await saveCloudDataToLocal(mergedBase);

    // 4. 后台同步写回书签、会话、历史记录到本机持久化存储区
    if (mergedSessions.length > 0 && modalities.sessions !== false) {
      await setSyncedSessions(mergedSessions);
    }
    if (mergedBookmarks.length > 0 && modalities.bookmarks !== false) {
      await syncRemoteBookmarksToLocal(mergedBookmarks);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ openclip_synced_bookmarks: mergedBookmarks });
      }
    }
    if (mergedHistory.length > 0 && modalities.history !== false) {
      await importHistory(mergedHistory);
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ openclip_synced_history: mergedHistory });
      }
    }
    if (mergedExtensions.length > 0 && modalities.extensions !== false) {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({ openclip_synced_extensions: mergedExtensions });
      }
    }

    const statusMsg = masterState.isForcedAuxiliary
      ? "分模态同步完成 (受云端主设备规则约束)"
      : "v2.7.0 分模态 WebDAV 独立文件同步完成";

    await setSyncStatus({
      status: "success",
      lastSyncTime: Date.now(),
      message: statusMsg,
      itemCount: mergedBase.entries.length,
    });

    return { success: true, message: statusMsg };
  } catch (err: any) {
    const errorMsg = err?.message || "同步出现异常";
    await setSyncStatus({ status: "error", message: errorMsg });
    return { success: false, message: errorMsg };
  }
}
