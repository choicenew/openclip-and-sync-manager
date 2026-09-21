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

  w.addEventListener(
    "paste",
    async (e) => {
      e.preventDefault();

      if (pushing || !e.clipboardData) {
        return;
      }

      const curr = e.clipboardData.getData("text/plain");

      if (curr === lastContent) {
        return;
      }

      try {
        pushing = true;
        lastContent = curr;
        await cb(curr);
      } catch (e) {
        console.log(e);
      } finally {
        pushing = false;
      }
    },
    { capture: true },
  );

  // 优化轮询间隔为 2000ms，极大降低 CPU 与内存 GC 压力
  w.setInterval(async () => {
    if (fetching) {
      return;
    }

    try {
      fetching = true;
      if (await getClipboardMonitorIsEnabled()) {
        d.execCommand("paste");
      }
    } catch (e) {
      console.log(e);
    } finally {
      fetching = false;
    }
  }, 2000);
};

export const watchCloudEntries = async (
  w: Window,
  getRefreshToken: () => Promise<string | null>,
  cb: (cloudEntries: CloudEntry[]) => Promise<void>,
) => {
  let fetching = false;

  // 优化轮询间隔至 60000ms (60s)，极大降减后台背景常驻与 V8 堆内存开销
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
      console.log(e);
    } finally {
      fetching = false;
    }
  }, 60000);
};
