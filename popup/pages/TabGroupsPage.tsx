import React, { useEffect, useState } from "react";
import { getSyncedSessions } from "~storage/syncedSessions";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";

export interface ActiveTabGroup {
  id: string | number;
  title: string;
  color: string;
  collapsed: boolean;
  isClosed?: boolean;
  sourceLabel?: string;
  tabs: { id?: number; title: string; url: string; favIconUrl?: string }[];
}

export const TabGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<ActiveTabGroup[]>([]);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("blue");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("blue");

  // 数据模态通道许可：Tab Groups 允许走哪些云节点
  const [allowedProviders, setAllowedProviders] = useState({
    chrome: true,
    webdav: true,
    onedrive: true,
    googledrive: true,
    gist: true,
    s3: true,
    customRest: true,
  });

  const loadAllTabGroups = async () => {
    if (typeof chrome === "undefined") return;
    try {
      const groupMap = new Map<string | number, ActiveTabGroup>();

      // 1. 从 openclip_permanently_saved_groups 增量持久化快照库读取 (即使网页关闭也永不丢失)
      try {
        const savedMapData = await new Promise<any>((resolve) => {
          chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
            resolve(res.openclip_permanently_saved_groups),
          );
        });
        if (Array.isArray(savedMapData)) {
          for (const g of savedMapData) {
            if (g && g.id !== undefined) {
              groupMap.set(g.id, { ...g, isClosed: true, sourceLabel: "永久保存资产" });
            }
          }
        }
      } catch (e) {
        console.warn("[TabGroupsPage] Read openclip_permanently_saved_groups notice:", e);
      }

      // 2. 扫捕当前视窗所有活着的 Tabs，彻底使用 Promise.all 消除异步竞态！
      let allTabs: chrome.tabs.Tab[] = [];
      try {
        allTabs = await chrome.tabs.query({});
      } catch (e) {
        console.warn("[TabGroupsPage] Tabs query notice:", e);
      }

      const groupFetchPromises: Promise<void>[] = [];

      for (const t of allTabs) {
        if (t.groupId !== undefined && t.groupId !== -1) {
          let existing = groupMap.get(t.groupId);
          if (!existing) {
            existing = {
              id: t.groupId,
              title: `Tab Group #${t.groupId}`,
              color: "blue",
              collapsed: false,
              isClosed: false,
              sourceLabel: "当前活跃",
              tabs: [],
            };
            groupMap.set(t.groupId, existing);

            if (chrome.tabGroups && chrome.tabGroups.get) {
              const fetchP = chrome.tabGroups
                .get(t.groupId)
                .then((g) => {
                  if (g) {
                    if (g.title) existing!.title = g.title;
                    if (g.color) existing!.color = g.color;
                    existing!.collapsed = !!g.collapsed;
                  }
                })
                .catch(() => {});
              groupFetchPromises.push(fetchP);
            }
          }

          if (!existing.tabs.some((item) => item.id === t.id || (item.url === t.url && item.title === t.title))) {
            existing.tabs.push({
              id: t.id,
              title: t.title || t.url || "无标题页",
              url: t.url || "",
              favIconUrl: t.favIconUrl,
            });
          }
        }
      }

      // 关键修正 A：必须等所有异步 chrome.tabGroups.get 捞完，再继续，彻底消灭渲染竞态与空白卡死！
      if (groupFetchPromises.length > 0) {
        await Promise.all(groupFetchPromises);
      }

      // 3. 调取 chrome.sessions.getRecentlyClosed 读取最近关闭的组
      if (chrome.sessions && chrome.sessions.getRecentlyClosed) {
        try {
          const recentlyClosed = await chrome.sessions.getRecentlyClosed({});
          for (const item of recentlyClosed) {
            if (item.group) {
              const closedG = item.group;
              const closedGroupId = `closed_group_${item.lastModified}_${closedG.title || "group"}`;
              if (!groupMap.has(closedGroupId)) {
                const closedTabs = (closedG.tabs || []).map((t) => ({
                  title: t.title || t.url || "已关闭标签页",
                  url: t.url || "",
                  favIconUrl: t.favIconUrl,
                }));
                groupMap.set(closedGroupId, {
                  id: closedGroupId,
                  title: closedG.title || "已关闭 Tab Group",
                  color: closedG.color || "grey",
                  collapsed: true,
                  isClosed: true,
                  sourceLabel: "最近关闭",
                  tabs: closedTabs,
                });
              }
            }
          }
        } catch (e) {
          console.warn("[TabGroupsPage] sessions getRecentlyClosed notice:", e);
        }
      }

      // 4. 聚合提取 Synced Sessions / 历史 Section 快照里的 Tab Groups
      try {
        const syncedSessions = await getSyncedSessions();
        for (const session of syncedSessions) {
          if (!session || !session.tabs) continue;
          for (const tab of session.tabs) {
            if (tab.groupTitle) {
              const sessionGroupId = `saved_group_${session.id}_${tab.groupTitle}`;
              if (!groupMap.has(sessionGroupId)) {
                const groupTabs = session.tabs
                  .filter((t) => t.groupTitle === tab.groupTitle)
                  .map((t) => ({
                    title: t.title || t.url || "已保存标签页",
                    url: t.url || "",
                    favIconUrl: t.favIconUrl,
                  }));
                groupMap.set(sessionGroupId, {
                  id: sessionGroupId,
                  title: tab.groupTitle,
                  color: tab.groupColor || "blue",
                  collapsed: true,
                  isClosed: true,
                  sourceLabel: `来自会话: ${session.label || session.deviceName}`,
                  tabs: groupTabs,
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("[TabGroupsPage] Synced sessions tabGroups extraction notice:", e);
      }

      setGroups(Array.from(groupMap.values()));
    } catch (e) {
      console.warn("[TabGroupsPage] Failed to fetch all tab groups:", e);
    }
  };

  const loadSettings = async () => {
    const s = await getSyncSettings();
    const currentMods = s.providerModalities || {};
    setAllowedProviders({
      chrome: currentMods.chrome?.sessions ?? true,
      webdav: currentMods.webdav?.sessions ?? true,
      onedrive: currentMods.onedrive?.sessions ?? true,
      googledrive: currentMods.googledrive?.sessions ?? true,
      gist: currentMods.gist?.sessions ?? true,
      s3: currentMods.s3?.sessions ?? true,
      customRest: currentMods.customRest?.sessions ?? true,
    });
  };

  useEffect(() => {
    loadAllTabGroups();
    loadSettings();

    // 监听 storage 变动与原生 Tab Groups 事件
    if (typeof chrome !== "undefined") {
      const handleStorageChange = (changes: any, areaName: string) => {
        if (areaName === "local" && (changes.openclip_live_tab_groups || changes.openclip_permanently_saved_groups)) {
          loadAllTabGroups();
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);

      if (chrome.tabGroups) {
        const handleGroupChange = () => loadAllTabGroups();
        chrome.tabGroups.onCreated?.addListener(handleGroupChange);
        chrome.tabGroups.onUpdated?.addListener(handleGroupChange);
        chrome.tabGroups.onRemoved?.addListener(handleGroupChange);

        return () => {
          chrome.storage.onChanged.removeListener(handleStorageChange);
          chrome.tabGroups.onCreated?.removeListener(handleGroupChange);
          chrome.tabGroups.onUpdated?.removeListener(handleGroupChange);
          chrome.tabGroups.onRemoved?.removeListener(handleGroupChange);
        };
      }

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

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

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim() || typeof chrome === "undefined" || !chrome.tabs) return;
    try {
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length > 0 && activeTabs[0].id) {
        const groupId = await chrome.tabs.group({ tabIds: [activeTabs[0].id] });
        await chrome.tabGroups.update(groupId, { title: newGroupTitle.trim(), color: selectedColor as any });
        setNewGroupTitle("");
        loadAllTabGroups();
      }
    } catch (e) {
      console.warn("[TabGroupsPage] Create group error:", e);
    }
  };

  const handleSaveToPermanentAssets = async (group: ActiveTabGroup) => {
    if (typeof chrome === "undefined") return;
    try {
      const existing: ActiveTabGroup[] = await new Promise((resolve) => {
        chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
          resolve(res.openclip_permanently_saved_groups || []),
        );
      });
      const updated = [group, ...existing.filter((item) => item.id !== group.id)];
      await chrome.storage.local.set({ openclip_permanently_saved_groups: updated });
      loadAllTabGroups();
    } catch (e) {
      console.warn("[TabGroupsPage] Save to permanent assets error:", e);
    }
  };

  const handleUpdateGroup = async (groupId: string | number) => {
    if (typeof groupId === "string" || typeof chrome === "undefined" || !chrome.tabGroups) return;
    try {
      await chrome.tabGroups.update(groupId, { title: editTitle, color: editColor as any });
      setEditingGroupId(null);
      loadAllTabGroups();
    } catch (e) {
      console.warn("[TabGroupsPage] Update group error:", e);
    }
  };

  const handleRestoreClosedGroup = async (group: ActiveTabGroup) => {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    try {
      const validTabs = group.tabs.filter((t) => t.url && t.url.startsWith("http"));
      if (validTabs.length === 0) return;
      const win = await chrome.windows.create({ url: validTabs[0].url, focused: true });
      if (win && win.id) {
        const tabIds: number[] = [];
        if (win.tabs?.[0]?.id) tabIds.push(win.tabs[0].id);
        for (let i = 1; i < validTabs.length; i++) {
          const created = await chrome.tabs.create({ windowId: win.id, url: validTabs[i].url, active: false });
          if (created.id) tabIds.push(created.id);
        }
        if (chrome.tabGroups && tabIds.length > 0) {
          const newGroupId = await chrome.tabs.group({ tabIds: tabIds as [number, ...number[]] });
          await chrome.tabGroups.update(newGroupId, {
            title: group.title.replace(/\s*\[最近关闭\]$/, ""),
            color: (group.color as any) || "blue",
          });
        }
      }
      loadAllTabGroups();
    } catch (e) {
      console.warn("[TabGroupsPage] Restore closed group error:", e);
    }
  };

  const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

  const filteredGroups = groups.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.tabs.some((t) => t.title.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto" }}>
      {/* 控流面板 B: 【数据视角】Tab Groups 标签组允许同步走哪些云节点 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
          📡 【数据选途径】Tab Groups 标签组允许同步到的云端 Backend 节点：
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

      {/* 新建标签组与搜索 Bar */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索 Tab Group 组名或组内网页..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="text"
            className="native-input"
            style={{ width: "120px" }}
            placeholder="新建组名..."
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
          />
          <select
            className="native-select"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="native-btn native-btn-sm" onClick={handleCreateGroup}>
            + 编组当前页
          </button>
        </div>
      </div>

      {/* 标签组卡片阵列 (双轨制：活跃组 + 永久固化备份资产库) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            未检测到任何活跃、已关闭或永久保存的 Tab Groups
          </div>
        ) : (
          filteredGroups.map((g) => (
            <div
              key={g.id}
              className="native-card tab-group-container"
              style={{
                borderLeft: `5px solid var(--primary-color)`,
                backgroundColor: g.isClosed ? "rgba(239, 68, 68, 0.03)" : "rgba(79, 70, 229, 0.03)",
              }}>
              {editingGroupId === g.id ? (
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    className="native-input flex-1"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <select
                    className="native-select"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}>
                    {colors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button className="native-btn native-btn-sm" onClick={() => handleUpdateGroup(g.id)}>
                    保存
                  </button>
                  <button className="native-btn native-btn-sm native-btn-subtle" onClick={() => setEditingGroupId(null)}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex-between" style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`native-badge native-badge-${g.color}`}>📁 {g.title}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
                      ({g.tabs.length} 标签页) [{g.sourceLabel || "活跃"}]
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {!g.isClosed && (
                      <button className="native-btn native-btn-sm native-btn-subtle" onClick={() => handleSaveToPermanentAssets(g)}>
                        💾 固化为资产
                      </button>
                    )}
                    {g.isClosed ? (
                      <button className="native-btn native-btn-sm" onClick={() => handleRestoreClosedGroup(g)}>
                        □ 一键恢复整个 Tab Group
                      </button>
                    ) : (
                      <button
                        className="native-btn native-btn-sm native-btn-subtle"
                        onClick={() => {
                          setEditingGroupId(g.id);
                          setEditTitle(g.title);
                          setEditColor(g.color);
                        }}>
                        ✏️ 改名/颜色
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 组内网页列表容器 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "8px" }}>
                {g.tabs.map((tab, idx) => (
                  <div key={tab.id || idx} className="native-card-subtle flex-between" style={{ padding: "4px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                      {tab.favIconUrl ? (
                        <img src={tab.favIconUrl} alt="" style={{ width: "14px", height: "14px" }} />
                      ) : (
                        <span>🌐</span>
                      )}
                      <span style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {tab.title}
                      </span>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>
                      {tab.url.slice(0, 35)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
