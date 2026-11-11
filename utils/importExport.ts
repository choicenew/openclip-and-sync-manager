import { createHash } from "crypto";
import { z } from "zod";

import { _setEntryIdToTags, getEntryIdToTags } from "~storage/entryIdToTags";
import { _setFavoriteEntryIds, addFavoriteEntryIds, getFavoriteEntryIds } from "~storage/favoriteEntryIds";
import { _setPinnedEntryIds, getPinnedEntryIds } from "~storage/pinnedEntryIds";
import { getSettings, setSettings } from "~storage/settings";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import type { Entry } from "~types/entry";
import { ClipboardHistoryIOExport, ClipboardHistoryProExport } from "~types/importExport";

import { _setEntries, getEntries } from "./storage";

export const FullBackupSchema = z.object({
  type: z.literal("openclip-sync-full-backup"),
  version: z.number(),
  timestamp: z.number(),
  entries: z.array(
    z.object({
      id: z.string(),
      createdAt: z.number(),
      copiedAt: z.number().nullable().optional(),
      content: z.string(),
    }),
  ),
  tags: z.record(z.array(z.string())),
  favoriteEntryIds: z.array(z.string()),
  pinnedEntryIds: z.array(z.string()).optional().default([]),
  settings: z.record(z.any()).optional(),
  syncSettings: z.record(z.any()).optional(),
});

export type FullBackup = z.infer<typeof FullBackupSchema>;

/** 导出全部配置与完整剪贴板历史（包含 WebDAV 密码、网盘配置及所有个性化设置） */
export const getFullBackupExport = async (): Promise<FullBackup> => {
  const [entries, tags, favoriteEntryIds, pinnedEntryIds, settings, syncSettings] =
    await Promise.all([
      getEntries(),
      getEntryIdToTags(),
      getFavoriteEntryIds(),
      getPinnedEntryIds(),
      getSettings(),
      getSyncSettings(),
    ]);

  return {
    type: "openclip-sync-full-backup",
    version: 2,
    timestamp: Date.now(),
    entries,
    tags,
    favoriteEntryIds,
    pinnedEntryIds,
    settings,
    syncSettings,
  };
};

/** 兼容旧版剪贴板导出 */
export const getClipboardHistoryIOExport = async (): Promise<ClipboardHistoryIOExport> => {
  const [entries, entryIdToTags, favoriteEntryIds] = await Promise.all([
    getEntries(),
    getEntryIdToTags(),
    getFavoriteEntryIds(),
  ]);

  const favoriteEntryIdSet = new Set(favoriteEntryIds);

  return entries.map((entry) => ({
    createdAt: entry.createdAt,
    copiedAt: entry.copiedAt,
    content: entry.content,
    tags: entryIdToTags[entry.id],
    isFavorite: favoriteEntryIdSet.has(entry.id) || undefined,
  }));
};

import { getSyncedSessions, setSyncedSessions as saveSyncedSessions } from "~storage/syncedSessions";
import type { SyncSession, SyncTab } from "~utils/sync/handlers/sessions";

export const importFile = async (file: File) => {
  const text = await file.text();
  const json = JSON.parse(text);

  // 1. 全量备份导入 (包含配置与密码)
  const fullBackupParsed = FullBackupSchema.safeParse(json);
  if (fullBackupParsed.success) {
    return await importFullBackup(fullBackupParsed.data);
  }

  // 2. Tab Session Manager (TSM) JSON 会话导入
  if (Array.isArray(json) && json.length > 0 && json[0]?.windows && json[0]?.id) {
    const count = await importTSMBackup(json);
    return { count, type: "tsm-sessions" };
  }

  // 3. Session Buddy JSON 会话导入
  if (Array.isArray(json) && json.length > 0 && Array.isArray(json[0]?.windows)) {
    const count = await importSessionBuddyBackup(json);
    return { count, type: "session-buddy" };
  }

  // 4. 兼容导入
  const clipboardHistoryIOParsed = ClipboardHistoryIOExport.safeParse(json);
  if (clipboardHistoryIOParsed.success) {
    return await importClipboardHistoryIO(clipboardHistoryIOParsed.data);
  }

  const clipboardHistoryProParsed = ClipboardHistoryProExport.safeParse(json);
  if (clipboardHistoryProParsed.success) {
    return await importClipboardHistoryPro(clipboardHistoryProParsed.data);
  }

  throw [fullBackupParsed.error, clipboardHistoryIOParsed.error, clipboardHistoryProParsed.error];
};

/** 导入 Tab Session Manager (TSM) 备份 JSON */
export const importTSMBackup = async (data: any[]): Promise<number> => {
  if (!Array.isArray(data)) return 0;
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

  if (sessions.length > 0) {
    const existing = await getSyncedSessions();
    await saveSyncedSessions([...sessions, ...existing]);
  }
  return sessions.length;
};

/** 导入 Session Buddy 备份 JSON */
export const importSessionBuddyBackup = async (data: any[]): Promise<number> => {
  if (!Array.isArray(data)) return 0;
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

  if (sessions.length > 0) {
    const existing = await getSyncedSessions();
    await saveSyncedSessions([...sessions, ...existing]);
  }
  return sessions.length;
};

const importFullBackup = async (backup: FullBackup) => {
  const [currentEntries, currentTags, currentFavs, currentPins] = await Promise.all([
    getEntries(),
    getEntryIdToTags(),
    getFavoriteEntryIds(),
    getPinnedEntryIds(),
  ]);

  const entryMap = new Map<string, Entry>();
  for (const e of currentEntries) entryMap.set(e.content, e);
  for (const e of backup.entries) {
    const existing = entryMap.get(e.content);
    if (!existing) {
      entryMap.set(e.content, e);
    } else {
      existing.createdAt = Math.min(existing.createdAt, e.createdAt);
      existing.copiedAt = Math.max(existing.copiedAt || 0, e.copiedAt || 0);
    }
  }

  const mergedTags = { ...currentTags, ...backup.tags };
  const mergedFavs = Array.from(new Set([...currentFavs, ...backup.favoriteEntryIds]));
  const mergedPins = Array.from(new Set([...currentPins, ...(backup.pinnedEntryIds || [])]));

  await Promise.all([
    _setEntries(Array.from(entryMap.values())),
    _setEntryIdToTags(mergedTags),
    _setFavoriteEntryIds(mergedFavs),
    _setPinnedEntryIds(mergedPins),
  ]);

  if (backup.settings) {
    await setSettings(backup.settings as any);
  }
  if (backup.syncSettings) {
    await setSyncSettings(backup.syncSettings as any);
  }
};

const importClipboardHistoryIO = async (clipboardHistoryIOEntries: ClipboardHistoryIOExport) => {
  const [entries, entryIdToTags] = await Promise.all([getEntries(), getEntryIdToTags()]);
  const favoriteEntryIdsToBeAdded: string[] = [];

  for (const clipboardHistoryIOEntry of clipboardHistoryIOEntries) {
    const entryId = createHash("sha256").update(clipboardHistoryIOEntry.content).digest("hex");

    entries.push({
      id: entryId,
      createdAt: clipboardHistoryIOEntry.createdAt,
      copiedAt: clipboardHistoryIOEntry.copiedAt,
      content: clipboardHistoryIOEntry.content,
    });

    if (clipboardHistoryIOEntry.isFavorite) {
      favoriteEntryIdsToBeAdded.push(entryId);
    }

    if (clipboardHistoryIOEntry.tags) {
      entryIdToTags[entryId] = Array.from(
        new Set([
          ...(entryIdToTags[entryId] || []),
          ...clipboardHistoryIOEntry.tags.map((tag) => tag.toLowerCase()),
        ]),
      );
    }
  }

  await Promise.all([
    _setEntries(
      Object.values(
        entries.reduce<Record<string, Entry>>((acc, curr) => {
          const entry = acc[curr.id];
          if (entry === undefined) {
            acc[curr.id] = curr;
          } else {
            entry.createdAt = Math.min(entry.createdAt, curr.createdAt);
            entry.copiedAt = Math.max(entry.copiedAt || 0, curr.copiedAt || 0) || undefined;
          }
          return acc;
        }, {}),
      ),
    ),
    _setEntryIdToTags(entryIdToTags),
    addFavoriteEntryIds(favoriteEntryIdsToBeAdded),
  ]);
};

const importClipboardHistoryPro = async (clipboardHistoryProEntries: ClipboardHistoryProExport) => {
  await importClipboardHistoryIO(
    clipboardHistoryProEntries.flatMap((clipboardHistoryProEntry) => {
      if (
        clipboardHistoryProEntry.text === undefined ||
        clipboardHistoryProEntry.dateAdded === undefined
      ) {
        return [];
      }

      return {
        createdAt: clipboardHistoryProEntry.dateAdded,
        copiedAt: clipboardHistoryProEntry.dateLastCopied,
        content: clipboardHistoryProEntry.text,
        tags: clipboardHistoryProEntry.tags,
        isFavorite: clipboardHistoryProEntry.isFavorite,
      };
    }),
  );
};
