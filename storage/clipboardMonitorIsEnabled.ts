import { Storage } from "@plasmohq/storage";

import { setActionIconAndBadgeBackgroundColor } from "~utils/actionBadge";

// Do not change this without a migration.
const CLIPBOARD_MONITOR_IS_ENABLED_STORAGE_KEY = "clipboardMonitorIsEnabled";

const storage = new Storage({
  area: "local",
});

export const watchClipboardMonitorIsEnabled = (
  cb: (clipboardMonitorIsEnabled: boolean) => void,
) => {
  return storage.watch({
    [CLIPBOARD_MONITOR_IS_ENABLED_STORAGE_KEY]: (c) => {
      if (c.newValue === undefined || c.newValue === null) {
        cb(true);
      } else {
        cb(c.newValue === "1" || c.newValue === "true" || c.newValue === true);
      }
    },
  });
};

export const getClipboardMonitorIsEnabled = async (): Promise<boolean> => {
  const val = await storage.get(CLIPBOARD_MONITOR_IS_ENABLED_STORAGE_KEY);
  if (val === undefined || val === null) {
    return true; // 默认启动剪贴板监听
  }
  return val === "1" || val === "true" || val === true;
};

export const setClipboardMonitorIsEnabled = async (enabled: boolean) => {
  await Promise.all([
    storage.set(CLIPBOARD_MONITOR_IS_ENABLED_STORAGE_KEY, enabled ? "1" : "0"),
    setActionIconAndBadgeBackgroundColor(enabled),
  ]);
};

export const toggleClipboardMonitorIsEnabled = async () =>
  await setClipboardMonitorIsEnabled(!(await getClipboardMonitorIsEnabled()));
