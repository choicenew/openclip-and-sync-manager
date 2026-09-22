import iconSrc from "data-base64:~assets/icon.png";
import { useAtom, useAtomValue } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import { match } from "ts-pattern";

import { toggleClipboardMonitorIsEnabled } from "~storage/clipboardMonitorIsEnabled";
import {
  deleteFloatingWindowId,
  getFloatingWindowId,
  setFloatingWindowId,
} from "~storage/floatingWindowId";
import { getMasterDeviceState, type MasterDeviceState } from "~storage/masterDevice";
import { Tab } from "~types/tab";
import db from "~utils/db/react";
import { VERSION } from "~utils/version";

import { ShortcutBadge } from "./components/ShortcutBadge";
import { useApp } from "./hooks/useApp";
import { useCloudEntriesQuery } from "./hooks/useCloudEntriesQuery";
import { SEARCH_INPUT_ID } from "./hooks/useEntryListNavigation";
import { AllPage } from "./pages/AllPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { CloudPage } from "./pages/CloudPage";
import { DevicesPage } from "./pages/DevicesPage";
import { ExtensionsPage } from "./pages/ExtensionsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TabGroupsPage } from "./pages/TabGroupsPage";
import {
  clipboardMonitorIsEnabledAtom,
  commandsAtom,
  refreshTokenAtom,
  searchAtom,
  tabAtom,
} from "./states/atoms";

export const App: React.FC = () => {
  useApp();

  const inputRef = useRef<HTMLInputElement>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const [isFloatingPopup] = useState(urlParams.get("ref") === "popup");
  const [isSidePanel] = useState(urlParams.get("ref") === "sidepanel");

  const [search, setSearch] = useAtom(searchAtom);
  const [tab, setTab] = useAtom(tabAtom);

  const [masterState, setMasterState] = useState<MasterDeviceState>({
    isMasterDevice: false,
    isForcedAuxiliary: false,
    masterDeviceId: null,
    masterDeviceName: null,
    auxiliaryPullPolicy: "all_devices",
    auxiliaryTargetDeviceId: null,
    deviceRules: {},
  });

  const clipboardMonitorIsEnabled = useAtomValue(clipboardMonitorIsEnabledAtom);
  const refreshToken = useAtomValue(refreshTokenAtom);
  const commands = useAtomValue(commandsAtom);

  useEffect(() => {
    getMasterDeviceState().then(setMasterState);
  }, []);

  const extensionActivationShortcut = commands.find(
    (command) =>
      command.name ===
      (process.env.PLASMO_TARGET === "firefox-mv2" ? "_execute_browser_action" : "_execute_action"),
  )?.shortcut;

  // Preload queries
  db.useConnectionStatus();
  useCloudEntriesQuery();

  if (clipboardMonitorIsEnabled === undefined || refreshToken === undefined) {
    return null;
  }

  const tabsList = [
    { value: Tab.Enum.Clipboard, label: "剪贴板", icon: "📋" },
    { value: Tab.Enum.Cloud, label: "云同步", icon: "☁️" },
    { value: Tab.Enum.Sessions, label: "会话标签", icon: "🌐" },
    { value: Tab.Enum.TabGroups, label: "标签组", icon: "📂" },
    { value: Tab.Enum.Bookmarks, label: "书签", icon: "🔖" },
    { value: Tab.Enum.History, label: "历史", icon: "📜" },
    { value: Tab.Enum.Extensions, label: "扩展", icon: "🧩" },
    { value: Tab.Enum.Devices, label: "设备墙", icon: "💻" },
    { value: Tab.Enum.Settings, label: "设置", icon: "⚙️" },
  ];

  return (
    <div
      style={{
        height: isFloatingPopup || isSidePanel ? "100%" : "620px",
        width: isFloatingPopup || isSidePanel ? "100%" : "720px",
        minWidth: isSidePanel ? "320px" : "520px",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backgroundColor: "var(--bg-main)",
        color: "var(--text-main)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
      {/* 顶部页眉 Header Bar */}
      <div className="flex-between">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={iconSrc} alt="" style={{ width: "24px", height: "24px" }} />
          <span style={{ fontWeight: 700, fontSize: "14px" }}>OpenClip Sync</span>
          <span className="native-badge native-badge-blue">v{VERSION}</span>

          {/* 主/辅设备身份指示 */}
          {masterState.isMasterDevice && !masterState.isForcedAuxiliary ? (
            <span className="native-badge native-badge-purple">👑 主设备</span>
          ) : masterState.isForcedAuxiliary ? (
            <span className="native-badge native-badge-orange">🛡️ 辅助设备</span>
          ) : null}
        </div>

        {/* 顶部快捷操作入口 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            title="赞助支持项目 (Ko-fi)"
            className="native-btn native-btn-sm native-btn-subtle"
            onClick={() => window.open("https://ko-fi.com/cue322631", "_blank")}>
            ❤️ 赞助
          </button>

          <button
            title="GitHub 官方开源仓库"
            className="native-btn native-btn-sm native-btn-subtle"
            onClick={() => window.open("https://github.com/choicenew/openclip", "_blank")}>
            ⭐ GitHub
          </button>

          {!isFloatingPopup && !isSidePanel && (
            <button
              title="独立悬浮窗模式"
              className="native-btn native-btn-sm native-btn-subtle"
              onClick={async () => {
                const floatingWindowId = await getFloatingWindowId();
                if (floatingWindowId !== null) {
                  try {
                    await chrome.windows.update(floatingWindowId, { focused: true });
                    window.close();
                    return;
                  } catch {
                    await deleteFloatingWindowId();
                  }
                }
                const newWindow = await chrome.windows.create({
                  url: chrome.runtime.getURL("popup.html?ref=popup"),
                  type: "popup",
                  height: 620,
                  width: 720,
                });
                if (newWindow.id !== undefined) {
                  await setFloatingWindowId(newWindow.id);
                }
                window.close();
              }}>
              🔲 悬浮窗
            </button>
          )}

          {/* 剪贴板监听 Native Switch 开关 */}
          <label className="native-switch" title="剪贴板后台自动监听开关">
            <input
              type="checkbox"
              checked={!!clipboardMonitorIsEnabled}
              onChange={() => toggleClipboardMonitorIsEnabled()}
            />
            <span className="native-slider"></span>
          </label>
        </div>
      </div>

      {/* 全局搜索框与原生导航 Tabs */}
      <div className="flex-between" style={{ gap: "10px" }}>
        <div style={{ position: "relative", width: "200px" }}>
          <input
            ref={inputRef}
            id={SEARCH_INPUT_ID}
            type="text"
            className="native-input"
            style={{ width: "100%", paddingLeft: "26px" }}
            placeholder="搜索剪贴板、书签、历史..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "var(--text-dimmed)" }}>
            🔍
          </span>
          {search.length === 0 && extensionActivationShortcut && (
            <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }}>
              <ShortcutBadge shortcut={extensionActivationShortcut} />
            </div>
          )}
        </div>

        {/* 原生导航 SegmentedControl */}
        <nav
          style={{
            display: "flex",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            padding: "2px",
            gap: "2px",
            overflowX: "auto",
          }}>
          {tabsList.map((item) => {
            const isActive = tab === item.value;
            return (
              <button
                key={item.value}
                className="native-btn native-btn-sm"
                style={{
                  backgroundColor: isActive ? "var(--primary-color)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--text-main)",
                  border: "none",
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
                onClick={() => setTab(Tab.parse(item.value))}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 选项卡主内容视图 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {match(tab)
          .with(Tab.Enum.Clipboard, () => <AllPage />)
          .with(Tab.Enum.Cloud, () => <CloudPage />)
          .with(Tab.Enum.Sessions, () => <SessionsPage searchQuery={search} />)
          .with(Tab.Enum.TabGroups, () => <TabGroupsPage />)
          .with(Tab.Enum.Bookmarks, () => <BookmarksPage searchQuery={search} />)
          .with(Tab.Enum.History, () => <HistoryPage searchQuery={search} />)
          .with(Tab.Enum.Extensions, () => <ExtensionsPage searchQuery={search} />)
          .with(Tab.Enum.Devices, () => <DevicesPage />)
          .with(Tab.Enum.Settings, () => <SettingsPage />)
          .exhaustive()}
      </div>
    </div>
  );
};
