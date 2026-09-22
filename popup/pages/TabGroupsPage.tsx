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
  const [activeGroups, setActiveGroups] = useState<ActiveTabGroup[]>([]);
  const [savedGroups, setSavedGroups] = useState<ActiveTabGroup[]>([]);
  const [openTabs, setOpenTabs] = useState<chrome.tabs.Tab[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("blue");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [toastMsg, setToastMsg] = useState("");

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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadAllData = async () => {
    if (typeof chrome === "undefined") return;
    try {
      // 1. 读取当前视窗正打开的所有网页标签
      let allTabs: chrome.tabs.Tab[] = [];
      try {
        allTabs = await chrome.tabs.query({});
        setOpenTabs(allTabs);
      } catch (e) {
        console.warn("[TabGroupsPage] Tabs query notice:", e);
      }

      // 2. 读取当前活跃的 Tab Groups
      const activeMap = new Map<number, ActiveTabGroup>();
      if (chrome.tabGroups && chrome.tabGroups.query) {
        try {
          const liveGroups = await chrome.tabGroups.query({});
          for (const g of liveGroups) {
            if (g.id !== undefined && g.id !== -1) {
              const groupTabs = allTabs
                .filter((t) => t.groupId === g.id)
                .map((t) => ({
                  id: t.id,
                  title: t.title || t.url || "无标题页",
                  url: t.url || "",
                  favIconUrl: t.favIconUrl,
                }));

              activeMap.set(g.id, {
                id: g.id,
                title: g.title || `Tab Group #${g.id}`,
                color: g.color || "blue",
                collapsed: !!g.collapsed,
                isClosed: false,
                sourceLabel: "当前活跃",
                tabs: groupTabs,
              });
            }
          }
        } catch (e) {
          console.warn("[TabGroupsPage] tabGroups.query notice:", e);
        }
      }
      setActiveGroups(Array.from(activeMap.values()));

      // 3. 读取已手动保存固化的永久 Tab Groups 资产库
      const savedMapData: ActiveTabGroup[] = await new Promise((resolve) => {
        chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
          resolve(res.openclip_permanently_saved_groups || []),
        );
      });
      setSavedGroups(savedMapData);
    } catch (e) {
      console.warn("[TabGroupsPage] Failed to load data:", e);
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
    loadAllData();
    loadSettings();

    if (typeof chrome !== "undefined") {
      const handleStorageChange = (changes: any, areaName: string) => {
        if (areaName === "local" && (changes.openclip_live_tab_groups || changes.openclip_permanently_saved_groups)) {
          loadAllData();
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);

      if (chrome.tabGroups) {
        const handleGroupChange = () => loadAllData();
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

  // 核心功能：【💾 手动保存此 Tab Group 到永久资产库】
  const handleSaveTabGroupToAsset = async (group: ActiveTabGroup) => {
    if (typeof chrome === "undefined") return;
    try {
      const existing: ActiveTabGroup[] = await new Promise((resolve) => {
        chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
          resolve(res.openclip_permanently_saved_groups || []),
        );
      });

      const newAsset: ActiveTabGroup = {
        ...group,
        id: `saved_asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        isClosed: true,
        sourceLabel: "已保存资产",
      };

      const updated = [newAsset, ...existing];
      await chrome.storage.local.set({ openclip_permanently_saved_groups: updated });
      showToast(`已成功将「${group.title}」保存至 Tab Group 资产库！`);
      loadAllData();
    } catch (e) {
      console.warn("[TabGroupsPage] Save asset error:", e);
    }
  };

  // 核心功能：【删除已保存的 Tab Group 资产】
  const handleDeleteSavedAsset = async (assetId: string | number) => {
    if (typeof chrome === "undefined") return;
    try {
      const existing: ActiveTabGroup[] = await new Promise((resolve) => {
        chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
          resolve(res.openclip_permanently_saved_groups || []),
        );
      });
      const updated = existing.filter((item) => item.id !== assetId);
      await chrome.storage.local.set({ openclip_permanently_saved_groups: updated });
      showToast("已删除该 Tab Group 资产记录");
      loadAllData();
    } catch (e) {
      console.warn("[TabGroupsPage] Delete asset error:", e);
    }
  };

  // 核心功能：【➕ 勾选当前网页手动保存为新 Tab Group】
  const handleGroupSelectedOpenTabs = async () => {
    if (selectedTabIds.size === 0 || typeof chrome === "undefined" || !chrome.tabs) return;
    try {
      const tabIdsArray = Array.from(selectedTabIds);
      const title = newGroupTitle.trim() || "自定义 Tab Group";

      // 1. 在 Chrome 中创建原生的 Tab Group
      const groupId = await chrome.tabs.group({ tabIds: tabIdsArray as [number, ...number[]] });
      if (chrome.tabGroups) {
        await chrome.tabGroups.update(groupId, { title, color: selectedColor as any });
      }

      // 2. 同时将其保存到资产库
      const memberTabs = openTabs
        .filter((t) => selectedTabIds.has(t.id!))
        .map((t) => ({ title: t.title || t.url || "", url: t.url || "", favIconUrl: t.favIconUrl }));

      const newAsset: ActiveTabGroup = {
        id: `saved_asset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        color: selectedColor,
        collapsed: false,
        isClosed: true,
        sourceLabel: "已保存资产",
        tabs: memberTabs,
      };

      const existing: ActiveTabGroup[] = await new Promise((resolve) => {
        chrome.storage.local.get("openclip_permanently_saved_groups", (res) =>
          resolve(res.openclip_permanently_saved_groups || []),
        );
      });

      await chrome.storage.local.set({ openclip_permanently_saved_groups: [newAsset, ...existing] });

      setNewGroupTitle("");
      setSelectedTabIds(new Set());
      showToast(`已将 ${tabIdsArray.length} 个网页打包创建并保存为「${title}」！`);
      loadAllData();
    } catch (e) {
      console.warn("[TabGroupsPage] Group selected tabs error:", e);
    }
  };

  // 核心功能：【🚀 一键在新窗口恢复整个 Tab Group】
  const handleRestoreGroup = async (group: ActiveTabGroup) => {
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
            title: group.title,
            color: (group.color as any) || "blue",
          });
        }
      }
      showToast(`已在新窗口完美还原 Tab Group：「${group.title}」！`);
      loadAllData();
    } catch (e) {
      console.warn("[TabGroupsPage] Restore group error:", e);
    }
  };

  const handleUpdateGroup = async (groupId: string | number) => {
    if (typeof groupId === "string" || typeof chrome === "undefined" || !chrome.tabGroups) return;
    try {
      await chrome.tabGroups.update(groupId, { title: editTitle, color: editColor as any });
      setEditingGroupId(null);
      loadAllData();
    } catch (e) {
      console.warn("[TabGroupsPage] Update group error:", e);
    }
  };

  const colors = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

  const filteredActive = activeGroups.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.tabs.some((t) => t.title.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredSaved = savedGroups.filter(
    (g) => g.title.toLowerCase().includes(search.toLowerCase()) || g.tabs.some((t) => t.title.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto" }}>
      {toastMsg && (
        <div className="native-card" style={{ backgroundColor: "var(--primary-color)", color: "#fff", padding: "6px 12px", fontSize: "11px" }}>
          🔔 {toastMsg}
        </div>
      )}

      {/* 控流面板 B: 【数据视角】Tab Groups 允许同步到的云节点 */}
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

      {/* 搜索栏 */}
      <div className="native-card flex-between">
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索组名或组内网页..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="native-btn native-btn-sm native-btn-subtle" onClick={loadAllData} style={{ marginLeft: "8px" }}>
          🔄 刷新数据
        </button>
      </div>

      {/* 轨 1：当前视窗正活跃打开的 Tab Groups (配有 [💾 保存此 Tab Group] 按钮) */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="flex-between">
          <span style={{ fontWeight: 700, fontSize: "12px" }}>🟢 当前视窗活跃中的 Tab Groups ({filteredActive.length})</span>
          <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>正在浏览器标签栏排开的组</span>
        </div>

        {filteredActive.length === 0 ? (
          <div style={{ fontSize: "11px", color: "var(--text-dimmed)", padding: "10px", textAlign: "center" }}>
            当前视窗暂无活动 Tab Group (可在下方选择网页手动新建组与保存)
          </div>
        ) : (
          filteredActive.map((g) => (
            <div key={g.id} className="native-card-subtle tab-group-container" style={{ borderLeft: "5px solid var(--primary-color)" }}>
              {editingGroupId === g.id ? (
                <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                  <input type="text" className="native-input flex-1" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <select className="native-select" value={editColor} onChange={(e) => setEditColor(e.target.value)}>
                    {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <button className="native-btn native-btn-sm" onClick={() => handleUpdateGroup(g.id)}>保存</button>
                  <button className="native-btn native-btn-sm native-btn-subtle" onClick={() => setEditingGroupId(null)}>取消</button>
                </div>
              ) : (
                <div className="flex-between" style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className={`native-badge native-badge-${g.color}`}>📁 {g.title}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>({g.tabs.length} 标签)</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="native-btn native-btn-sm" onClick={() => handleSaveTabGroupToAsset(g)}>
                      💾 保存此 Tab Group
                    </button>
                    <button
                      className="native-btn native-btn-sm native-btn-subtle"
                      onClick={() => { setEditingGroupId(g.id); setEditTitle(g.title); setEditColor(g.color); }}>
                      ✏️ 改名/颜色
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "8px" }}>
                {g.tabs.map((tab, idx) => (
                  <div key={tab.id || idx} className="native-card-subtle flex-between" style={{ padding: "3px 6px", fontSize: "11px" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tab.title}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>{tab.url.slice(0, 30)}...</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 轨 2：全量固化与已保存的 Tab Groups 资产库 (网页关闭后永不丢失，可随时恢复) */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="flex-between">
          <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--primary-color)" }}>
            💾 已保存的 Tab Groups 资产库 ({filteredSaved.length})
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>关闭网页后永不丢失，随时恢复</span>
        </div>

        {filteredSaved.length === 0 ? (
          <div style={{ fontSize: "11px", color: "var(--text-dimmed)", padding: "10px", textAlign: "center" }}>
            暂无已保存的 Tab Group 资产 (可在上方对活动组点击「💾 保存此 Tab Group」)
          </div>
        ) : (
          filteredSaved.map((g) => (
            <div key={g.id} className="native-card-subtle tab-group-container" style={{ borderLeft: "5px solid #10b981", backgroundColor: "rgba(16, 185, 129, 0.03)" }}>
              <div className="flex-between" style={{ marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className={`native-badge native-badge-${g.color}`}>📁 {g.title}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>({g.tabs.length} 标签页)</span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button className="native-btn native-btn-sm" onClick={() => handleRestoreGroup(g)}>
                    🚀 在新窗口一键还原 Tab Group
                  </button>
                  <button className="native-btn native-btn-sm" style={{ backgroundColor: "#ef4444" }} onClick={() => handleDeleteSavedAsset(g.id)}>
                    🗑️ 删除
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "8px" }}>
                {g.tabs.map((tab, idx) => (
                  <div key={idx} className="native-card-subtle flex-between" style={{ padding: "3px 6px", fontSize: "11px" }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tab.title}</span>
                    <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>{tab.url.slice(0, 30)}...</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 轨 3：当前打开网页一键手动勾选新建 & 保存为新 Tab Group 工作台 */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="flex-between">
          <span style={{ fontWeight: 700, fontSize: "12px" }}>➕ 勾选当前已打开网页，直接打组并保存</span>
          <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>选择下方任意网页创建新 Tab Group</span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="text"
            className="native-input flex-1"
            placeholder="输入新 Tab Group 名称..."
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
          />
          <select className="native-select" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
            {colors.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <button
            className="native-btn native-btn-sm"
            disabled={selectedTabIds.size === 0}
            onClick={handleGroupSelectedOpenTabs}>
            💾 打包建组并保存 ({selectedTabIds.size})
          </button>
        </div>

        <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {openTabs.map((t) => (
            <label key={t.id} className="native-card-subtle flex-between" style={{ padding: "4px 8px", cursor: "pointer", fontSize: "11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                <input
                  type="checkbox"
                  checked={selectedTabIds.has(t.id!)}
                  onChange={(e) => {
                    const next = new Set(selectedTabIds);
                    if (e.target.checked) next.add(t.id!);
                    else next.delete(t.id!);
                    setSelectedTabIds(next);
                  }}
                />
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-dimmed)", marginLeft: "8px" }}>{t.url.slice(0, 25)}...</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
