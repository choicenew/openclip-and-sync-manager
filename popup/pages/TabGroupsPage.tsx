import React, { useEffect, useState } from "react";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { openSessionTabs, SyncTab } from "~utils/sync/handlers/sessions";

export interface ActiveTabGroup {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  tabs: { id?: number; title: string; url: string; favIconUrl?: string }[];
}

export const TabGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<ActiveTabGroup[]>([]);
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("blue");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("blue");

  // 数据模态视角：允许通过哪些云节点同步此 Tab Groups 数据
  const [allowedProviders, setAllowedProviders] = useState({
    chrome: true,
    webdav: true,
    onedrive: true,
    googledrive: true,
    gist: true,
    s3: true,
    customRest: true,
  });

  const loadTabGroups = async () => {
    if (typeof chrome === "undefined" || !chrome.tabGroups) return;
    try {
      const activeGroups = await chrome.tabGroups.query({});
      const activeTabs = await chrome.tabs.query({});
      const result: ActiveTabGroup[] = activeGroups.map((g) => {
        const groupTabs = activeTabs
          .filter((t) => t.groupId === g.id)
          .map((t) => ({
            id: t.id,
            title: t.title || t.url || "无标题页",
            url: t.url || "",
            favIconUrl: t.favIconUrl,
          }));
        return {
          id: g.id,
          title: g.title || "未命名标签组",
          color: g.color || "grey",
          collapsed: g.collapsed,
          tabs: groupTabs,
        };
      });
      setGroups(result);
    } catch (e) {
      console.warn("[TabGroupsPage] Failed to fetch tab groups:", e);
    }
  };

  const loadSettings = async () => {
    const s = await getSyncSettings();
    // 假设在 syncSettings 结构中读取 tabGroups 的网络通道许可
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
    loadTabGroups();
    loadSettings();
  }, []);

  const handleToggleProvider = async (providerKey: string, allowed: boolean) => {
    const s = await getSyncSettings();
    const updatedMods = { ...s.providerModalities };
    if (updatedMods[providerKey as keyof typeof updatedMods]) {
      updatedMods[providerKey as keyof typeof updatedMods] = {
        ...updatedMods[providerKey as keyof typeof updatedMods],
        sessions: allowed, // Tab Groups 属于 sessions 大分类
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
        loadTabGroups();
      }
    } catch (e) {
      console.warn("[TabGroupsPage] Create group error:", e);
    }
  };

  const handleUpdateGroup = async (groupId: number) => {
    if (typeof chrome === "undefined" || !chrome.tabGroups) return;
    try {
      await chrome.tabGroups.update(groupId, { title: editTitle, color: editColor as any });
      setEditingGroupId(null);
      loadTabGroups();
    } catch (e) {
      console.warn("[TabGroupsPage] Update group error:", e);
    }
  };

  const handleUngroup = async (groupId: number, tabIds: number[]) => {
    if (typeof chrome === "undefined" || !chrome.tabs.ungroup) return;
    try {
      await chrome.tabs.ungroup(tabIds);
      loadTabGroups();
    } catch (e) {
      console.warn("[TabGroupsPage] Ungroup error:", e);
    }
  };

  const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

  const filteredGroups = groups.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.tabs.some((t) => t.title.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 控流面板 B: 【数据类型视角】设置此 Tab Groups 数据允许走哪些云节点传输 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>
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

      {/* 新建标签组与搜索栏 */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索标签组或组内网页..."
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

      {/* 标签组列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "20px" }}>
            当前浏览器视窗中未检测到活跃的 Tab Groups 标签组
          </div>
        ) : (
          filteredGroups.map((g) => (
            <div key={g.id} className="native-card tab-group-container" style={{ borderColor: `var(--native-badge-${g.color}, var(--primary-color))` }}>
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
                    <span className={`native-badge native-badge-${g.color}`}>{g.title}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
                      ({g.tabs.length} 标签页) {g.collapsed ? "[已折叠]" : "[展开]"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="native-btn native-btn-sm native-btn-subtle"
                      onClick={() => {
                        setEditingGroupId(g.id);
                        setEditTitle(g.title);
                        setEditColor(g.color);
                      }}>
                      ✏️ 重命名/颜色
                    </button>
                    <button
                      className="native-btn native-btn-sm native-btn-subtle"
                      onClick={() => handleUngroup(g.id, g.tabs.map((t) => t.id!).filter(Boolean))}>
                      🔓 解散组
                    </button>
                  </div>
                </div>
              )}

              {/* 组内网页列表 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "10px" }}>
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
