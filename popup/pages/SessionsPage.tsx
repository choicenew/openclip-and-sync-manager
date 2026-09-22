import React, { useEffect, useState } from "react";
import {
  autoSaveSessionSnapshot,
  getSyncedSessions,
  setSyncedSessions as saveSyncedSessions,
  updateSessionLabel,
} from "~storage/syncedSessions";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { getSettings, setSettings } from "~storage/settings";
import { runFullSync } from "~utils/sync/engine";
import {
  exportCurrentTabs,
  openSessionTabs,
  type SyncSession,
  type SyncTab,
} from "~utils/sync/handlers/sessions";

interface Props {
  searchQuery?: string;
}

export const SessionsPage: React.FC<Props> = ({ searchQuery = "" }) => {
  const [syncedSessions, setSyncedSessionsState] = useState<SyncSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("local_current");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 新建/手动重命名状态
  const [manualTitle, setManualTitle] = useState("");
  const [editingTitle, setEditTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 自动保存规则配置状态
  const [autoSaveIntervalMinutes, setAutoSaveIntervalMinutes] = useState(30);
  const [autoSaveOnStartup, setAutoSaveOnStartup] = useState(true);
  const [autoSaveOnShutdown, setAutoSaveOnShutdown] = useState(true);
  const [lazyLoading, setLazyLoading] = useState(true);

  // 数据模态通道许可：Tab Sessions 允许走哪些云节点
  const [allowedProviders, setAllowedProviders] = useState({
    chrome: true,
    webdav: true,
    onedrive: true,
    googledrive: true,
    gist: true,
    s3: true,
    customRest: true,
  });

  const loadData = async () => {
    setLoading(true);
    const [tabs, syncSet, remoteSessions, appSettings] = await Promise.all([
      exportCurrentTabs(),
      getSyncSettings(),
      getSyncedSessions(),
      getSettings(),
    ]);

    const localSession: SyncSession = {
      id: "local_current",
      deviceId: syncSet.deviceId || "local",
      deviceName: `${syncSet.deviceName || "此电脑"} (本机当前视窗)`,
      savedAt: new Date().toISOString(),
      label: "当前活跃网页标签页",
      tabs,
    };

    const sessionMap = new Map<string, SyncSession>();
    sessionMap.set(localSession.id, localSession);
    for (const s of remoteSessions) {
      if (s && s.id && s.id !== "local_current" && s.tabs?.length > 0) {
        sessionMap.set(s.id, s);
      }
    }

    const sessionsList = Array.from(sessionMap.values());
    setSyncedSessionsState(sessionsList);

    // 载入自动保存设置
    setAutoSaveIntervalMinutes(appSettings.sessionAutoSaveIntervalMinutes ?? 30);
    setAutoSaveOnStartup(appSettings.sessionAutoSaveOnStartup ?? true);
    setAutoSaveOnShutdown(appSettings.sessionAutoSaveOnShutdown ?? true);

    const currentMods = syncSet.providerModalities || {};
    setAllowedProviders({
      chrome: currentMods.chrome?.sessions ?? true,
      webdav: currentMods.webdav?.sessions ?? true,
      onedrive: currentMods.onedrive?.sessions ?? true,
      googledrive: currentMods.googledrive?.sessions ?? true,
      gist: currentMods.gist?.sessions ?? true,
      s3: currentMods.s3?.sessions ?? true,
      customRest: currentMods.customRest?.sessions ?? true,
    });

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSync = async () => {
    setSyncing(true);
    await runFullSync();
    await loadData();
    setSyncing(false);
  };

  const handleManualSaveSession = async () => {
    const title = manualTitle.trim() || "手动保存会话快照";
    await autoSaveSessionSnapshot(title);
    setManualTitle("");
    await loadData();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessionId === "local_current") return;
    const remaining = syncedSessions.filter((s) => s.id !== sessionId);
    setSyncedSessionsState(remaining);
    await saveSyncedSessions(remaining.filter((s) => s.id !== "local_current"));
    if (selectedSessionId === sessionId) {
      setSelectedSessionId("local_current");
    }
  };

  const handleSaveTitleEdit = async (sessionId: string) => {
    if (!editingTitle.trim()) return;
    await updateSessionLabel(sessionId, editingTitle.trim());
    setIsEditingTitle(false);
    await loadData();
  };

  const handleToggleAutoSaveRule = async (key: "interval" | "startup" | "shutdown", value: any) => {
    const current = await getSettings();
    const updated = { ...current };
    if (key === "interval") {
      updated.sessionAutoSaveIntervalMinutes = Number(value);
      setAutoSaveIntervalMinutes(Number(value));
    } else if (key === "startup") {
      updated.sessionAutoSaveOnStartup = Boolean(value);
      setAutoSaveOnStartup(Boolean(value));
    } else if (key === "shutdown") {
      updated.sessionAutoSaveOnShutdown = Boolean(value);
      setAutoSaveOnShutdown(Boolean(value));
    }
    await setSettings(updated);
  };

  const handleToggleProvider = async (providerKey: string, allowed: boolean) => {
    const s = await getSyncSettings();
    const updatedMods = { ...s.providerModalities };
    if (updatedMods[providerKey as keyof typeof updatedMods]) {
      updatedMods[providerKey as keyof typeof updatedMods] = {
        ...updatedMods[providerKey as keyof typeof updatedMods],
        sessions: allowed,
      };
    }
    await setSyncSettings({ providerModalities: updatedMods });
    setAllowedProviders((prev) => ({ ...prev, [providerKey]: allowed }));
  };

  // 还原选中 Section
  const handleRestoreSession = async (tabs: SyncTab[], inNewWindow = true) => {
    await openSessionTabs(tabs, inNewWindow);
  };

  const selectedSession = syncedSessions.find((s) => s.id === selectedSessionId) || syncedSessions[0];

  // 整理选中 Section 中的 Tab Groups 编组结构
  const groupTabsByGroup = (tabs: SyncTab[]) => {
    const groupsMap = new Map<string, { title: string; color: string; collapsed: boolean; tabs: SyncTab[] }>();
    const ungroupedTabs: SyncTab[] = [];

    for (const t of tabs) {
      if (t.groupTitle) {
        const groupKey = `${t.groupTitle}_${t.groupColor || "blue"}`;
        const existing = groupsMap.get(groupKey) || {
          title: t.groupTitle,
          color: t.groupColor || "blue",
          collapsed: !!t.groupCollapsed,
          tabs: [],
        };
        existing.tabs.push(t);
        groupsMap.set(groupKey, existing);
      } else {
        ungroupedTabs.push(t);
      }
    }
    return { groupsMap: Array.from(groupsMap.values()), ungroupedTabs };
  };

  const filterSessions = (sessions: SyncSession[]) => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) =>
      s.deviceName.toLowerCase().includes(q) ||
      (s.label && s.label.toLowerCase().includes(q)) ||
      s.tabs.some((t) => t.title?.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)),
    );
  };

  const visibleSessions = filterSessions(syncedSessions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", height: "100%" }}>
      {/* 控流面板 B: 【数据视角】会话标签组允许同步走哪些云节点 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
          📡 【数据选途径】会话 Section 允许同步到的云端 Backend 节点：
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px" }}>
          {Object.entries(allowedProviders).map(([providerKey, allowed]) => (
            <label key={providerKey} style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={allowed}
                onChange={(e) => handleToggleProvider(providerKey, e.target.checked)}
              />
              <span style={{ textTransform: "capitalize" }}>{providerKey}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 自动保存规则与快捷设置 Bar */}
      <div className="native-card flex-between" style={{ fontSize: "11px", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600 }}>⏰ 自动保存规则：</span>
          <label style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoSaveOnStartup}
              onChange={(e) => handleToggleAutoSaveRule("startup", e.target.checked)}
            />
            <span>启动备份</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoSaveOnShutdown}
              onChange={(e) => handleToggleAutoSaveRule("shutdown", e.target.checked)}
            />
            <span>关闭备份</span>
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <span>定时:</span>
            <select
              className="native-select"
              style={{ padding: "2px 4px", fontSize: "11px" }}
              value={autoSaveIntervalMinutes}
              onChange={(e) => handleToggleAutoSaveRule("interval", e.target.value)}>
              <option value={0}>关</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={60}>60 分钟</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={lazyLoading}
              onChange={(e) => setLazyLoading(e.target.checked)}
            />
            <span>⚡ 标签页惰性挂起 (Tab Lazy Loading)</span>
          </label>
          <button className="native-btn native-btn-sm" disabled={syncing} onClick={handleRunSync}>
            {syncing ? "同步中..." : "🔄 云端同步"}
          </button>
        </div>
      </div>

      {/* TSM 左右双栏工作台布局 (Left: Timeline List, Right: Session Detail) */}
      <div style={{ display: "flex", gap: "12px", flex: 1, minHeight: 0 }}>
        {/* 左侧：时间轴 Section 列表 (Section Sidebar) */}
        <div
          className="native-card"
          style={{ width: "260px", display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" }}>
          <div className="flex-between">
            <span style={{ fontWeight: 600, fontSize: "12px" }}>时间轴区段 ({visibleSessions.length})</span>
            <button className="native-btn native-btn-sm native-btn-subtle" onClick={loadData}>
              刷新
            </button>
          </div>

          {/* 新建/手动快照保存栏 */}
          <div style={{ display: "flex", gap: "4px" }}>
            <input
              type="text"
              className="native-input flex-1"
              style={{ fontSize: "11px", padding: "3px 6px" }}
              placeholder="命名新会话快照..."
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
            />
            <button className="native-btn native-btn-sm" onClick={handleManualSaveSession}>
              💾 保存
            </button>
          </div>

          {/* 可滚动的时间轴卡片列表 */}
          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            {visibleSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const isLocal = session.id === "local_current";
              const groupCount = new Set(session.tabs.map((t) => t.groupTitle).filter(Boolean)).size;

              return (
                <div
                  key={session.id}
                  className="native-card-subtle"
                  style={{
                    cursor: "pointer",
                    borderLeft: isSelected ? "4px solid var(--primary-color)" : "1px solid var(--border-color)",
                    backgroundColor: isSelected ? "rgba(79, 70, 229, 0.08)" : undefined,
                  }}
                  onClick={() => setSelectedSessionId(session.id)}>
                  <div className="flex-between" style={{ marginBottom: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {session.label || session.deviceName}
                    </span>
                    {isLocal && <span className="native-badge native-badge-cyan">本机</span>}
                  </div>
                  <div className="flex-between" style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>
                    <span>
                      1 窗口 - {session.tabs.length} 标签 {groupCount > 0 ? `(${groupCount}组)` : ""}
                    </span>
                    <span>{session.savedAt ? new Date(session.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "刚刚"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：选中会话的树形明细面板 (Selected Session Workbench) */}
        <div className="native-card" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
          {selectedSession ? (
            <>
              {/* 头部：标题与主控操作栏 */}
              <div className="flex-between" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                  {isEditingTitle ? (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <input
                        type="text"
                        className="native-input"
                        value={editingTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <button className="native-btn native-btn-sm" onClick={() => handleSaveTitleEdit(selectedSession.id)}>
                        保存
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 700, fontSize: "14px" }}>
                        {selectedSession.label || selectedSession.deviceName}
                      </span>
                      <button
                        className="native-btn native-btn-sm native-btn-subtle"
                        style={{ padding: "2px 4px" }}
                        onClick={() => {
                          setIsEditingTitle(true);
                          setEditTitle(selectedSession.label || selectedSession.deviceName);
                        }}>
                        ✏️ 重命名
                      </button>
                    </>
                  )}
                  <span className="native-badge native-badge-blue">🏷️ {selectedSession.deviceName}</span>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="native-btn native-btn-sm"
                    onClick={() => handleRestoreSession(selectedSession.tabs, true)}>
                    □ 在新窗口还原 ({selectedSession.tabs.length})
                  </button>
                  <button
                    className="native-btn native-btn-sm native-btn-subtle"
                    onClick={() => handleRestoreSession(selectedSession.tabs, false)}>
                    ➕ 追加当前窗口
                  </button>
                  {selectedSession.id !== "local_current" && (
                    <button
                      className="native-btn native-btn-sm"
                      style={{ backgroundColor: "#ef4444" }}
                      onClick={() => handleDeleteSession(selectedSession.id)}>
                      🗑️ 删除
                    </button>
                  )}
                </div>
              </div>

              {/* 树形编组树与网页列表 */}
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                {(() => {
                  const { groupsMap, ungroupedTabs } = groupTabsByGroup(selectedSession.tabs);

                  return (
                    <>
                      {/* 嵌套编组的 Tab Group 块容器 */}
                      {groupsMap.map((g, gIdx) => (
                        <div
                          key={`group_${gIdx}`}
                          className="tab-group-container"
                          style={{ borderColor: `var(--native-badge-${g.color}, var(--primary-color))` }}>
                          <div className="flex-between" style={{ marginBottom: "6px" }}>
                            <span className={`native-badge native-badge-${g.color}`}>
                              📁 {g.title} ({g.tabs.length} 标签)
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>Tab Group 专属组容器</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "8px" }}>
                            {g.tabs.map((t, tIdx) => (
                              <div key={`g_tab_${tIdx}`} className="native-card-subtle flex-between" style={{ padding: "4px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                                  {t.favIconUrl ? <img src={t.favIconUrl} alt="" style={{ width: "14px", height: "14px" }} /> : <span>🌐</span>}
                                  <span style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {t.title}
                                  </span>
                                </div>
                                <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>
                                  {t.url.slice(0, 35)}...
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* 未编组的普通 Tab 列表 */}
                      {ungroupedTabs.map((t, uIdx) => (
                        <div key={`ungrouped_${uIdx}`} className="native-card-subtle flex-between" style={{ padding: "4px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                            {t.favIconUrl ? <img src={t.favIconUrl} alt="" style={{ width: "14px", height: "14px" }} /> : <span>🌐</span>}
                            <span style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {t.title}
                            </span>
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>
                            {t.url.slice(0, 35)}...
                          </span>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "40px" }}>请在左侧选择要查看的会话 Section</div>
          )}
        </div>
      </div>
    </div>
  );
};
