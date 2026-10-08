/**
 * utils/tabSuspend.ts
 *
 * 标签页休眠与挂起 (Auto Discard / Tab Suspend) 工具库。
 * 调用原生的 chrome.tabs.discard(tabId) 释放背景标签页内存。
 */

export async function suspendTab(tabId: number): Promise<boolean> {
  if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.discard) {
    console.warn("[TabSuspend] chrome.tabs.discard is not supported in current environment.");
    return false;
  }
  try {
    await chrome.tabs.discard(tabId);
    return true;
  } catch (err) {
    console.warn(`[TabSuspend] Failed to discard tab ${tabId}:`, err);
    return false;
  }
}

/**
 * 挂起所有非当前激活状态的离线背景标签页
 */
export async function suspendAllInactiveTabs(): Promise<{ suspendedCount: number }> {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return { suspendedCount: 0 };
  }

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true, active: false });
    let count = 0;

    for (const tab of tabs) {
      if (tab.id && !tab.discarded && !tab.pinned) {
        const success = await suspendTab(tab.id);
        if (success) count++;
      }
    }

    return { suspendedCount: count };
  } catch (err) {
    console.warn("[TabSuspend] Failed to suspend inactive tabs:", err);
    return { suspendedCount: 0 };
  }
}

export async function getTabDiscardStats(): Promise<{ active: number; discarded: number; total: number }> {
  if (typeof chrome === "undefined" || !chrome.tabs) {
    return { active: 0, discarded: 0, total: 0 };
  }

  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    let discarded = 0;
    for (const t of tabs) {
      if (t.discarded) discarded++;
    }
    return {
      active: tabs.length - discarded,
      discarded,
      total: tabs.length,
    };
  } catch {
    return { active: 0, discarded: 0, total: 0 };
  }
}
