import React, { useEffect, useState } from "react";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";

export interface ActiveTabGroup {
  id: string | number;
  title: string;
  color: string;
  collapsed: boolean;
  isClosed?: boolean;
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

      // 1. 查询当前打开的所有活跃网页与标签组 (包含跨窗口与全量组)
      const allTabs = await chrome.tabs.query({});
      let activeGroups: chrome.tabGroups.TabGroup[] = [];

      if (chrome.tabGroups) {
        try {
          activeGroups = await chrome.tabGroups.query({});
        } catch (e) {
          console.warn("[TabGroupsPage] tabGroups query notice:", e);
        }
      }

      // 按 groupId 构建组基础结构
      for (const g of activeGroups) {
        if (g.id !== undefined && g.id !== -1) {
          groupMap.set(g.id, {
            id: g.id,
            title: g.title || "未命名 Tab Group",
            color: g.color || "grey",
            collapsed: !!g.collapsed,
            isClosed: false,
            tabs: [],
          });
        }
      }

      // 将各标签页挂载到对应的 Tab Group 中
      for (const t of allTabs) {
        if (t.groupId !== undefined && t.groupId !== -1) {
          let existing = groupMap.get(t.groupId);
          if (!existing && chrome.tabGroups) {
            // 保底防护：直接通过 t.groupId 调用 chrome.tabGroups.get 单独获取
            try {
              const fetchedGroup = await chrome.tabGroups.get(t.groupId);
              if (fetchedGroup) {
                existing = {
                  id: fetchedGroup.id,
                  title: fetchedGroup.title || "未命名 Tab Group",
                  color: fetchedGroup.color || "grey",
                  collapsed: !!fetchedGroup.collapsed,
                  isClosed: false,
                  tabs: [],
                };
                groupMap.set(fetchedGroup.id, existing);
              }
            } catch (e) {
              // Ignore single fetch fail
            }
          }

          if (existing) {
            existing.tabs.push({
              id: t.id,
              title: t.title || t.url || "无标题页",
              url: t.url || "",
              favIconUrl: t.favIconUrl,
            });
          }
        }
      }

      // 2. 调用 chrome.sessions.getRecentlyClosed 读取被关闭/归档的 Tab Groups
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
                  title: `${closedG.title || "已关闭标签组"} [最近关闭]`,
                  color: closedG.color || "grey",
                  collapsed: true,
                  isClosed: true,
                  tabs: closedTabs,
                });
              }
            }
          }
        } catch (e) {
          console.warn("[TabGroupsPage] sessions getRecentlyClosed notice:", e);
        }
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

    // 实时监听 Chrome Tab Groups 变动事件 (Created, Updated, Removed, Moved)
    if (typeof chrome !== "undefined" && chrome.tabGroups) {
      const handleGroupChange = () => {
        loadAllTabGroups();
      };
      chrome.tabGroups.onCreated?.addListener(handleGroupChange);
      chrome.tabGroups.onUpdated?.addListener(handleGroupChange);
      chrome.tabGroups.onRemoved?.addListener(handleGroupChange);

      return () => {
        chrome.tabGroups.onCreated?.removeListener(handleGroupChange);
        chrome.tabGroups.onUpdated?.removeListener(handleGroupChange);
        chrome.tabGroups.onRemoved?.removeListener(handleGroupChange);
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

      {/* 标签组卡片阵列 (含激活与最近关闭的 Tab Groups) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            未检测到任何活跃或最近关闭的 Tab Groups
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
                      ({g.tabs.length} 标签页) {g.isClosed ? "[已关闭记录]" : g.collapsed ? "[已折叠]" : "[活跃]"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
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

              {/* 组内网页列表 */}
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
