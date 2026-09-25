import type { CloudEntry } from "~utils/sync/provider";

import db from "./db/core";

export const watchClipboard = (
  w: Window,
  d: Document,
  getClipboardMonitorIsEnabled: () => Promise<boolean>,
  cb: (content: string) => Promise<void>,
) => {
  let pushing = false;
  let fetching = false;
  let lastContent: string | null = null;

  const getTextarea = (): HTMLTextAreaElement => {
    let textarea = d.getElementById("offscreen-clipboard-textarea") as HTMLTextAreaElement;
    if (!textarea) {
      textarea = d.createElement("textarea");
      textarea.id = "offscreen-clipboard-textarea";
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      d.body.appendChild(textarea);
    }
    return textarea;
  };

  w.addEventListener(
    "paste",
    async (e) => {
      e.preventDefault();

      if (pushing || !e.clipboardData) {
        return;
      }

      const curr = e.clipboardData.getData("text/plain");

      if (!curr || curr === lastContent) {
        return;
      }

      try {
        pushing = true;
        lastContent = curr;
        await cb(curr);
      } catch (e) {
        console.error("[PasteEvent] Error:", e);
      } finally {
        pushing = false;
      }
    },
    { capture: true },
  );

  // 高效低损耗轮询 (800ms)
  w.setInterval(async () => {
    if (fetching) {
      return;
    }

    try {
      fetching = true;
      const isEnabled = await getClipboardMonitorIsEnabled();
      if (!isEnabled) {
        return;
      }

      let curr = "";

      // 1. 尝试聚焦隐藏 textarea 并执行 execCommand("paste")
      const textarea = getTextarea();
      textarea.value = "";
      textarea.focus();
      textarea.select();

      try {
        const success = d.execCommand("paste");
        if (success || textarea.value) {
          curr = textarea.value;
        }
      } catch {
        // Fallback
      }

      // 2. 若仍无内容，尝试 navigator.clipboard.readText()
      if (!curr && navigator.clipboard && typeof navigator.clipboard.readText === "function") {
        try {
          curr = await navigator.clipboard.readText();
        } catch {
          // Fallback
        }
      }

      if (curr && curr !== lastContent) {
        lastContent = curr;
        await cb(curr);
      }
    } catch (e) {
      console.error("[WatchClipboard] Polling error:", e);
    } finally {
      fetching = false;
    }
  }, 800);
};

export const watchCloudEntries = async (
  w: Window,
  getRefreshToken: () => Promise<string | null>,
  cb: (cloudEntries: CloudEntry[]) => Promise<void>,
) => {
  let fetching = false;

  w.setInterval(async () => {
    if (fetching) {
      return;
    }

    try {
      fetching = true;
      const refreshToken = await getRefreshToken();
      if (refreshToken !== null) {
        const result = await db.queryOnce({ entries: {} });
        await cb((result.data.entries as CloudEntry[]) || []);
      }
    } catch (e) {
      console.error("[WatchCloudEntries] Polling error:", e);
    } finally {
      fetching = false;
    }
  }, 60000);
};
