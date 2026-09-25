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
}

export interface SyncSession {
  id: string;
  deviceId: string;
  deviceName: string;
  savedAt: string;
  label?: string;
  tabs: SyncTab[];
}

/** 导出当前浏览器打开的所有合法网页标签（同时抓取 Tab Group 元数据） */
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

    return tabs
      .filter(
        (t) =>
          t.url &&
          (t.url.startsWith("http://") || t.url.startsWith("https://")) &&
          !t.url.includes("login") &&
          !t.url.includes("token"),
      )
      .map((t) => {
        const group = t.groupId !== undefined && t.groupId !== -1 ? groupMap.get(t.groupId) : undefined;
        return {
          url: t.url!,
          title: t.title || t.url,
          pinned: !!t.pinned,
          favIconUrl: t.favIconUrl && t.favIconUrl.startsWith("http") ? t.favIconUrl : undefined,
          groupTitle: group?.title,
          groupColor: group?.color as any,
          groupCollapsed: group?.collapsed,
        };
      });
  } catch (err) {
    console.warn("[SessionsHandler] Failed to export active tabs:", err);
    return [];
  }
}

/** 打包当前设备打开的标签页会话 */
export async function exportSession(deviceId: string, deviceName: string, label?: string): Promise<SyncSession> {
  const tabs = await exportCurrentTabs();
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    deviceId,
    deviceName,
    savedAt: new Date().toISOString(),
    label: label || `${deviceName} 会话 (${tabs.length} 标签页)`,
    tabs,
  };
}

/** 在新窗口或当前窗口批量还原打开会话中的标签页，并重新建组 (Tab Groups)，支持 lazyLoad 惰性挂起压低内存 */
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
    const createdTabMap: { tabId: number; syncTab: SyncTab }[] = [];

    if (inNewWindow && chrome.windows) {
      const win = await chrome.windows.create({ url: validTabs[0]!.url, focused: true });
      if (win && win.id && win.tabs?.[0]?.id) {
        createdTabMap.push({ tabId: win.tabs[0].id, syncTab: validTabs[0]! });
        for (let i = 1; i < validTabs.length; i++) {
          const t = validTabs[i]!;
          const createdTab = await chrome.tabs.create({
            windowId: win.id,
            url: t.url,
            active: false,
          });
          if (createdTab.id) {
            createdTabMap.push({ tabId: createdTab.id, syncTab: t });
            // 如果启用 Tab lazy loading，对非激活的后组标签页进行 chrome.tabs.discard 挂起以省内存
            if (lazyLoad && chrome.tabs.discard) {
              try {
                await chrome.tabs.discard(createdTab.id);
              } catch (e) {
                // Ignore discard warning if tab is active
              }
            }
          }
        }
      }
    } else {
      for (const t of validTabs) {
        const createdTab = await chrome.tabs.create({ url: t.url, active: false });
        if (createdTab.id) {
          createdTabMap.push({ tabId: createdTab.id, syncTab: t });
          if (lazyLoad && chrome.tabs.discard) {
            try {
              await chrome.tabs.discard(createdTab.id);
            } catch (e) {
              // Ignore
            }
          }
        }
      }
    }

    // 跨端自动按组还原 Tab Groups (颜色、名称、折叠状态)
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
            const groupId = await chrome.tabs.group({ tabIds: groupInfo.tabIds as [number, ...number[]] });
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
  } catch (err) {
    console.warn("[SessionsHandler] Error opening session tabs:", err);
  }
}
