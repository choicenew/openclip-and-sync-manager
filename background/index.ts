import { debounce } from "ts-debounce";
import { match } from "ts-pattern";
import OFFSCREEN_DOCUMENT_PATH from "url:~offscreen.html";

import { handleCreateEntryRequest } from "~background/messages/createEntry";
import {
  getClipboardMonitorIsEnabled,
  setClipboardMonitorIsEnabled,
} from "~storage/clipboardMonitorIsEnabled";
import { getEntryCommands } from "~storage/entryCommands";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { getSyncSettings } from "~storage/syncSettings";
import { DisplayMode } from "~types/displayMode";
import { setActionIconAndBadgeBackgroundColor } from "~utils/actionBadge";
import { watchClipboard, watchCloudEntries } from "~utils/background";
import db from "~utils/db/core";
import { autoSaveSessionSnapshot } from "~storage/syncedSessions";
import { runFullSync } from "~utils/sync/engine";
import { simplePathBasename } from "~utils/simplePath";
import { getEntries } from "~utils/storage";

import { handleUpdateContextMenusRequest } from "./messages/updateContextMenus";
import { handleUpdateDisplayModeRequest } from "./messages/updateDisplayMode";
import { handleUpdateTotalItemsBadgeRequest } from "./messages/updateTotalItemsBadge";

// Service Worker 后台对 Chrome 原生 Tab Groups 进行全局实时侦测与持久化注册表更新
const syncLiveTabGroupsToStorage = async () => {
  if (typeof chrome === "undefined" || !chrome.tabs) return;
  try {
    const allTabs = await chrome.tabs.query({});
    let activeGroups: chrome.tabGroups.TabGroup[] = [];
    if (chrome.tabGroups) {
      try {
        activeGroups = await chrome.tabGroups.query({});
      } catch {}
    }

    const groupMap = new Map<number, { id: number; title: string; color: string; collapsed: boolean; sourceLabel: string; tabs: any[] }>();

    for (const g of activeGroups) {
      if (g.id !== undefined && g.id !== -1) {
        groupMap.set(g.id, {
          id: g.id,
          title: g.title || `Tab Group #${g.id}`,
          color: g.color || "blue",
          collapsed: !!g.collapsed,
          sourceLabel: "当前活跃",
          tabs: [],
        });
      }
    }

    for (const t of allTabs) {
      if (t.groupId !== undefined && t.groupId !== -1) {
        let existing = groupMap.get(t.groupId);
        if (!existing) {
          existing = {
            id: t.groupId,
            title: `Tab Group #${t.groupId}`,
            color: "blue",
            collapsed: false,
            sourceLabel: "当前活跃",
            tabs: [],
          };
          groupMap.set(t.groupId, existing);

          if (chrome.tabGroups && chrome.tabGroups.get) {
            try {
              const fetched = await chrome.tabGroups.get(t.groupId);
              if (fetched) {
                if (fetched.title) existing.title = fetched.title;
                if (fetched.color) existing.color = fetched.color;
                existing.collapsed = !!fetched.collapsed;
              }
            } catch {}
          }
        }

        if (!existing.tabs.some((item) => item.id === t.id)) {
          existing.tabs.push({
            id: t.id,
            title: t.title || t.url || "无标题页",
            url: t.url || "",
            favIconUrl: t.favIconUrl && t.favIconUrl.startsWith("http") ? t.favIconUrl : undefined,
          });
        }
      }
    }

    await chrome.storage.local.set({
      openclip_live_tab_groups: Array.from(groupMap.values()),
    });
  } catch (e) {
    console.warn("[Background] Sync live tab groups error:", e);
  }
};

const debouncedSyncLiveTabGroups = debounce(syncLiveTabGroupsToStorage, 2000);

// 挂载 Chrome 原生 Tab Groups 变动与 Tab 变动事件句柄
if (typeof chrome !== "undefined") {
  if (chrome.tabGroups) {
    chrome.tabGroups.onCreated?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabGroups.onUpdated?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabGroups.onRemoved?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabGroups.onMoved?.addListener(debouncedSyncLiveTabGroups);
  }
  if (chrome.tabs) {
    chrome.tabs.onUpdated?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabs.onRemoved?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabs.onAttached?.addListener(debouncedSyncLiveTabGroups);
    chrome.tabs.onDetached?.addListener(debouncedSyncLiveTabGroups);
  }
}

// Firefox MV2 creates a persistent background page that we can use to watch the clipboard.
if (process.env.PLASMO_TARGET === "firefox-mv2") {
  watchClipboard(window, document, getClipboardMonitorIsEnabled, (content) =>
    handleCreateEntryRequest({
      content,
      timestamp: Date.now() - 2000,
    }),
  );

  watchCloudEntries(window, getRefreshToken, async () => {
    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();
        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);
  });

  const updateContextMenusAndTotalItemsBadgeRequest = async () => {
    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();
        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);

    await new Promise((r) => setTimeout(r, 800));

    await Promise.all([
      handleUpdateContextMenusRequest(),
      (async () => {
        const entries = await getEntries();
        await handleUpdateTotalItemsBadgeRequest(entries.length);
      })(),
    ]);
  };

  window.addEventListener("online", () => updateContextMenusAndTotalItemsBadgeRequest());
  window.addEventListener("offline", () => updateContextMenusAndTotalItemsBadgeRequest());
}

let creating: Promise<void> | null = null;
const setupOffscreenDocument = async () => {
  if (process.env.PLASMO_TARGET === "firefox-mv2") {
    return;
  }

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Read text from clipboard.",
    });
    await creating;
    creating = null;
  }
};

// 确保 Service Worker 启动/被唤醒/被重新加载时立即创建 Offscreen Document 监听剪贴板
setupOffscreenDocument().catch(() => {});

const setupAction = async () => {
  const [entries, clipboardMonitorIsEnabled] = await Promise.all([
    getEntries(),
    getClipboardMonitorIsEnabled(),
  ]);

  await Promise.all([
    handleUpdateDisplayModeRequest(),
    handleUpdateTotalItemsBadgeRequest(entries.length),
    setActionIconAndBadgeBackgroundColor(clipboardMonitorIsEnabled),
    syncLiveTabGroupsToStorage(),
  ]);
};

if (process.env.PLASMO_TARGET !== "firefox-mv2") {
  chrome.action.onClicked.addListener(async (tab) => {
    const settings = await getSettings();

    if (settings.displayMode === DisplayMode.Enum.SidePanel && chrome.sidePanel) {
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      } else {
        await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      }
    } else {
      chrome.action.openPopup();
    }
  });
}

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await Promise.all([
    setupOffscreenDocument(),
    setupAction(),
    handleUpdateContextMenusRequest(),
    syncLiveTabGroupsToStorage(),
    settings.sessionAutoSaveOnStartup && autoSaveSessionSnapshot("启动自动备份").catch(() => {}),
  ]);
  if (chrome.alarms) {
    if (settings.sessionAutoSaveIntervalMinutes > 0) {
      chrome.alarms.create("auto_save_session_alarm", {
        periodInMinutes: settings.sessionAutoSaveIntervalMinutes,
      });
    }
    // 5 分钟后台自动全量云端双向同步
    chrome.alarms.create("auto_cloud_sync_alarm", {
      periodInMinutes: 5,
    });
  }
  // 启动时静默后台自动同步一次
  runFullSync().catch(() => {});
});

if (typeof chrome !== "undefined" && chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "auto_save_session_alarm") {
      const settings = await getSettings();
      if (settings.sessionAutoSaveIntervalMinutes > 0) {
        await autoSaveSessionSnapshot(`定时备份 (${settings.sessionAutoSaveIntervalMinutes}m)`).catch(() => {});
      }
    } else if (alarm.name === "auto_cloud_sync_alarm") {
      runFullSync().catch(() => {});
    }
  });
}

chrome.tabs.onActivated.addListener(async () => {
  await setupOffscreenDocument();
});

chrome.runtime.onSuspend.addListener(async () => {
  const settings = await getSettings();
  if (settings.sessionAutoSaveOnShutdown) {
    await autoSaveSessionSnapshot("关闭自动备份").catch(() => {});
  }

  if (process.env.PLASMO_TARGET === "firefox-mv2") {
    return;
  }

  await chrome.offscreen.closeDocument();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  await Promise.all([
    details.reason === chrome.runtime.OnInstalledReason.INSTALL &&
      setClipboardMonitorIsEnabled(true),
    setupOffscreenDocument(),
    setupAction(),
    handleUpdateContextMenusRequest(),
    syncLiveTabGroupsToStorage(),
  ]);
});

function paste(content: string) {
  document.execCommand("insertText", undefined, content);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.id) {
    const entryId = simplePathBasename(info.menuItemId.toString());

    const entry = await match(entryId.length)
      .with(36, async () => {
        const cloudEntriesQuery = await db.queryOnce({
          entries: {
            $: {
              where: {
                id: entryId,
              },
            },
          },
        });

        return cloudEntriesQuery.data.entries[0];
      })
      .otherwise(async () => {
        const entries = await getEntries();

        return entries.find((entry) => entry.id === entryId);
      });

    if (entry?.content) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        func: paste,
        args: [entry.content],
      });
    }
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (tab?.id) {
    const entryCommands = await getEntryCommands();

    const entryId = entryCommands.find(
      (entryCommand) => entryCommand.commandName === command,
    )?.entryId;

    if (!entryId) {
      return;
    }

    const entry = await match(entryId.length)
      .with(36, async () => {
        const cloudEntriesQuery = await db.queryOnce({
          entries: {
            $: {
              where: {
                id: entryId,
              },
            },
          },
        });

        return cloudEntriesQuery.data.entries[0];
      })
      .otherwise(async () => {
        const entries = await getEntries();

        return entries.find((entry) => entry.id === entryId);
      });

    if (entry?.content) {
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        func: paste,
        args: [entry.content],
      });
    }
  }
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "sync" && changes.cloudData) {
    const s = await getSyncSettings();
    if (!s.enableChromeSync) return;
    db.invalidateCache();
    const entries = await getEntries();
    handleUpdateTotalItemsBadgeRequest(entries.length).catch(() => {});
    handleUpdateContextMenusRequest().catch(() => {});
  }
});
