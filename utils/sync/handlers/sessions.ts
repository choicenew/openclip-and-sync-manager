/**
 * utils/sync/handlers/sessions.ts
 * 打开的标签页 (Open Sections / Active Tabs) 与跨设备会话同步模块
 * 深度支持原生 chrome.tabGroups 跨端（Chrome <-> Edge）标签组颜色、名字与折叠状态无缝恢复
 * 深度支持 Tab lazy loading 惰性挂起 (discarded: true)，恢复数百标签页内存近乎 0 MB
 */

export interface SyncTab {
  url: string;
  title?: string;
  pinned: boolean;
  favIconUrl?: string;
  groupTitle?: string;
  groupColor?: "grey" | "blue" | "red" | "yellow" | "green" | "pink" | "purple" | "cyan" | "orange";
  groupCollapsed?: boolean;
  windowId?: number; // 记录原始窗口组标记，还原时完美按原窗口拆分恢复
}

export interface SyncWindowInfo {
  windowId: number;
  tabsCount: number;
  groupsCount?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  state?: "normal" | "minimized" | "maximized" | "fullscreen";
}

export interface SyncSession {
  id: string;
  deviceId: string;
  deviceName: string;
  savedAt: string;
  label?: string;
  windowsNumber?: number; // 窗口总数 (例如 2 个独立窗口)
  tabsCount?: number;     // 标签页总数
  windowsInfo?: SyncWindowInfo[]; // 窗口结构元数据列表
  tabs: SyncTab[];
}

/** 导出当前浏览器打开的所有合法网页标签（支持跨多窗口抓取，保留 windowId 并提取 Tab Group 元数据） */
export async function exportCurrentTabs(): Promise<SyncTab[]> {
  if (typeof chrome === "undefined" || !chrome.tabs) return [];
  try {
    const tabs = await chrome.tabs.query({});
    let groupMap = new Map<number, chrome.tabGroups.TabGroup>();

    // 提取原生 Tab Groups 组元数据（标题、颜色、折叠状态）
    if (chrome.tabGroups) {
      try {
        const groups = await chrome.tabGroups.query({});
        for (const g of groups) {
          if (g.id !== undefined && g.id !== -1) {
            groupMap.set(g.id, g);
          }
        }
      } catch (e) {
        console.warn("[SessionsHandler] tabGroups query notice:", e);
      }
    }

    // 建立原生 windowId 到 1-based 窗口索引的映射，保持会话中的多窗口隔离
    const windowIdMap = new Map<number, number>();
    let windowCounter = 1;

    return tabs
      .filter(
        (t) =>
          t.url &&
          (t.url.startsWith("http://") || t.url.startsWith("https://")) &&
          !t.url.includes("login") &&
          !t.url.includes("token"),
      )
      .map((t) => {
        let winIdx = 1;
        if (t.windowId !== undefined) {
          if (!windowIdMap.has(t.windowId)) {
            windowIdMap.set(t.windowId, windowCounter++);
          }
          winIdx = windowIdMap.get(t.windowId)!;
        }

        const group = t.groupId !== undefined && t.groupId !== -1 ? groupMap.get(t.groupId) : undefined;
        return {
          url: t.url!,
          title: t.title || t.url,
          pinned: !!t.pinned,
          favIconUrl: t.favIconUrl && t.favIconUrl.startsWith("http") ? t.favIconUrl : undefined,
          groupTitle: group?.title,
          groupColor: group?.color as any,
          groupCollapsed: group?.collapsed,
          windowId: winIdx,
        };
      });
  } catch (err) {
    console.warn("[SessionsHandler] Failed to export active tabs:", err);
    return [];
  }
}

/** 打包当前设备打开的所有窗口与标签页会话 (记录多窗口元数据及屏幕位置/尺寸信息) */
export async function exportSession(deviceId: string, deviceName: string, label?: string): Promise<SyncSession> {
  const tabs = await exportCurrentTabs();
  const windowSet = new Set(tabs.map((t) => t.windowId || 1));
  const windowsNumber = windowSet.size;

  let windowDetailsMap = new Map<number, chrome.windows.Window>();
  if (typeof chrome !== "undefined" && chrome.windows) {
    try {
      const wins = await chrome.windows.getAll();
      for (const w of wins) {
        if (w.id !== undefined) windowDetailsMap.set(w.id, w);
      }
    } catch (e) {
      console.warn("[SessionsHandler] Failed to query windows metadata:", e);
    }
  }

  const windowsInfo: SyncWindowInfo[] = Array.from(windowSet)
    .sort((a, b) => a - b)
    .map((wId) => {
      const wTabs = tabs.filter((t) => (t.windowId || 1) === wId);
      const rawWin = Array.from(windowDetailsMap.values())[wId - 1];
      return {
        windowId: wId,
        tabsCount: wTabs.length,
        groupsCount: new Set(wTabs.map((t) => t.groupTitle).filter(Boolean)).size,
        width: rawWin?.width,
        height: rawWin?.height,
        left: rawWin?.left,
        top: rawWin?.top,
        state: rawWin?.state as any,
      };
    });

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deviceId,
    deviceName,
    savedAt: new Date().toISOString(),
    label: label || `${deviceName} 会话 (${windowsNumber} 窗口, ${tabs.length} 标签页)`,
    windowsNumber,
    tabsCount: tabs.length,
    windowsInfo,
    tabs,
  };
}

/** 在新窗口（严格保留多窗口结构）或当前窗口批量还原会话中的标签页，并按窗口自动还原 Tab Groups */
export async function openSessionTabs(
  tabs: SyncTab[],
  inNewWindow = true,
  lazyLoad = true,
): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.tabs) return;
  const validTabs = tabs.filter(
    (t) => t.url && (t.url.startsWith("http://") || t.url.startsWith("https://")),
  );
  if (validTabs.length === 0) return;

  try {
    if (inNewWindow && chrome.windows) {
      // 1. 按 windowId 将标签页分窗口分组，恢复时为每个原始窗口独立新建 Window
      const windowGroupMap = new Map<number, SyncTab[]>();
      for (const t of validTabs) {
        const wId = t.windowId || 1;
        const list = windowGroupMap.get(wId) || [];
        list.push(t);
        windowGroupMap.set(wId, list);
      }

      let isFirstWindow = true;

      for (const [, winTabs] of windowGroupMap.entries()) {
        if (winTabs.length === 0) continue;

        const win = await chrome.windows.create({
          url: winTabs[0]!.url,
          focused: isFirstWindow,
        });
        isFirstWindow = false;

        if (win && win.id && win.tabs?.[0]?.id) {
          const createdTabMap: { tabId: number; syncTab: SyncTab }[] = [
            { tabId: win.tabs[0].id, syncTab: winTabs[0]! },
          ];

          for (let i = 1; i < winTabs.length; i++) {
            const t = winTabs[i]!;
            const createdTab = await chrome.tabs.create({
              windowId: win.id,
              url: t.url,
              active: false,
            });
            if (createdTab.id) {
              createdTabMap.push({ tabId: createdTab.id, syncTab: t });
              if (lazyLoad && chrome.tabs.discard) {
                try {
                  await chrome.tabs.discard(createdTab.id);
                } catch (e) {
                  // Ignore discard warning for active tab
                }
              }
            }
          }

          // 2. 在该新窗口内重建原生 Tab Groups
          if (chrome.tabGroups && chrome.tabs.group) {
            const groupTabIdsMap = new Map<
              string,
              { tabIds: number[]; title?: string; color?: string; collapsed?: boolean }
            >();

            for (const item of createdTabMap) {
              if (item.syncTab.groupTitle) {
                const groupKey = `${item.syncTab.groupTitle}_${item.syncTab.groupColor || "blue"}`;
                const existing = groupTabIdsMap.get(groupKey) || {
                  tabIds: [],
                  title: item.syncTab.groupTitle,
                  color: item.syncTab.groupColor,
                  collapsed: item.syncTab.groupCollapsed,
                };
                existing.tabIds.push(item.tabId);
                groupTabIdsMap.set(groupKey, existing);
              }
            }

            for (const groupInfo of groupTabIdsMap.values()) {
              try {
                if (groupInfo.tabIds.length > 0) {
                  const groupId = await chrome.tabs.group({
                    tabIds: groupInfo.tabIds as [number, ...number[]],
                  });
                  await chrome.tabGroups.update(groupId, {
                    title: groupInfo.title,
                    color: (groupInfo.color as any) || "cyan",
                    collapsed: !!groupInfo.collapsed,
                  });
                }
              } catch (e) {
                console.warn("[SessionsHandler] Failed to recreate tab group:", e);
              }
            }
          }
        }
      }
    } else {
      // 还原至当前已打开视窗中
      const createdTabMap: { tabId: number; syncTab: SyncTab }[] = [];
      for (const t of validTabs) {
        const createdTab = await chrome.tabs.create({ url: t.url, active: false });
        if (createdTab.id) {
          createdTabMap.push({ tabId: createdTab.id, syncTab: t });
          if (lazyLoad && chrome.tabs.discard) {
            try {
              await chrome.tabs.discard(createdTab.id);
            } catch (e) {}
          }
        }
      }

      if (chrome.tabGroups && chrome.tabs.group) {
        const groupTabIdsMap = new Map<
          string,
          { tabIds: number[]; title?: string; color?: string; collapsed?: boolean }
        >();

        for (const item of createdTabMap) {
          if (item.syncTab.groupTitle) {
            const groupKey = `${item.syncTab.groupTitle}_${item.syncTab.groupColor || "blue"}`;
            const existing = groupTabIdsMap.get(groupKey) || {
              tabIds: [],
              title: item.syncTab.groupTitle,
              color: item.syncTab.groupColor,
              collapsed: item.syncTab.groupCollapsed,
            };
            existing.tabIds.push(item.tabId);
            groupTabIdsMap.set(groupKey, existing);
          }
        }

        for (const groupInfo of groupTabIdsMap.values()) {
          try {
            if (groupInfo.tabIds.length > 0) {
              const groupId = await chrome.tabs.group({
                tabIds: groupInfo.tabIds as [number, ...number[]],
              });
              await chrome.tabGroups.update(groupId, {
                title: groupInfo.title,
                color: (groupInfo.color as any) || "cyan",
                collapsed: !!groupInfo.collapsed,
              });
            }
          } catch (e) {
            console.warn("[SessionsHandler] Failed to recreate tab group:", e);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[SessionsHandler] Error opening session tabs:", err);
  }
}
