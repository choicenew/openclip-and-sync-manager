import React, { useEffect, useState } from "react";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { exportExtensions, type SyncExtension } from "~utils/sync/handlers/extensions";

export const ExtensionsPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [extensions, setExtensions] = useState<SyncExtension[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // 数据模态通道许可：Extensions 允许走哪些云节点
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

  const loadExtensions = async () => {
    setLoading(true);
    const list = await exportExtensions();
    setExtensions(list);
    setLoading(false);
  };

  const loadSettings = async () => {
    const s = await getSyncSettings();
    const currentMods = s.providerModalities || {};
    setAllowedProviders({
      chrome: currentMods.chrome?.extensions ?? true,
      webdav: currentMods.webdav?.extensions ?? true,
      onedrive: currentMods.onedrive?.extensions ?? true,
      googledrive: currentMods.googledrive?.extensions ?? true,
      gist: currentMods.gist?.extensions ?? true,
      s3: currentMods.s3?.extensions ?? true,
      customRest: currentMods.customRest?.extensions ?? true,
    });
  };

  useEffect(() => {
    loadExtensions();
    loadSettings();
  }, []);

  const handleToggleProvider = async (providerKey: string, allowed: boolean) => {
    const s = await getSyncSettings();
    const updatedMods = { ...s.providerModalities };
    if (updatedMods[providerKey as keyof typeof updatedMods]) {
      updatedMods[providerKey as keyof typeof updatedMods] = {
        ...updatedMods[providerKey as keyof typeof updatedMods],
        extensions: allowed,
      };
    }
    await setSyncSettings({ providerModalities: updatedMods });
    setAllowedProviders((prev) => ({ ...prev, [providerKey]: allowed }));
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((ext) => ext.id)));
    }
  };

  const handleBatchCopyStoreUrls = () => {
    if (selectedIds.size === 0) return;
    const selectedList = filtered.filter((ext) => selectedIds.has(ext.id));
    const urls = selectedList.map((ext) => ext.storeUrl).filter(Boolean).join("\n");
    navigator.clipboard.writeText(urls);
    showToast(`已批量复制 ${selectedList.length} 个扩展的商店链接！`);
  };

  const handleBatchCopyInfo = () => {
    if (selectedIds.size === 0) return;
    const selectedList = filtered.filter((ext) => selectedIds.has(ext.id));
    const text = selectedList.map((ext) => `${ext.name} (v${ext.version}): ${ext.storeUrl || ""}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast(`已批量复制 ${selectedList.length} 个扩展的信息！`);
  };

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = extensions.filter(
    (ext) => ext.name.toLowerCase().includes(query) || (ext.description && ext.description.toLowerCase().includes(query)),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", height: "100%", overflowY: "auto" }}>
      {toastMsg && (
        <div className="native-card" style={{ backgroundColor: "var(--primary-color)", color: "#fff", padding: "6px 12px", fontSize: "11px" }}>
          🔔 {toastMsg}
        </div>
      )}

      {/* 控流面板 B: 【数据视角】扩展列表 (Extensions) 允许同步走哪些云节点 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
          📡 【数据选途径】扩展列表 (Extensions) 允许同步到的云端 Backend 节点：
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

      {/* 搜索 Bar */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索已安装的扩展插件..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <button className="native-btn native-btn-sm" disabled={loading} onClick={loadExtensions}>
          刷新扩展
        </button>
      </div>

      {/* 批量操作工具栏 */}
      <div className="native-card flex-between" style={{ padding: "6px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "11px" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedIds.size === filtered.length}
              onChange={toggleSelectAll}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary-color)" }}
            />
            <span>全选</span>
          </label>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedIds.size === 0}
            onClick={handleBatchCopyStoreUrls}>
            📋 复制商店链接
          </button>
          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedIds.size === 0}
            onClick={handleBatchCopyInfo}>
            📄 复制扩展名称与版本
          </button>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
          已选 {selectedIds.size} / 共 {filtered.length} 个
        </div>
      </div>

      {/* 扩展列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在读取浏览器扩展..." : "未找到匹配的扩展插件"}
          </div>
        ) : (
          filtered.map((ext) => {
            const isSelected = selectedIds.has(ext.id);
            return (
              <div key={ext.id} className="native-card-subtle flex-between" style={{ padding: "6px 10px", backgroundColor: isSelected ? "rgba(79, 70, 229, 0.08)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, overflow: "hidden" }}>
                  <div
                    style={{ padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectId(ext.id);
                    }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelectId(ext.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary-color)" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🧩</span>
                      <span style={{ fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ext.name}
                      </span>
                      <span className={`native-badge ${ext.enabled ? "native-badge-green" : ""}`}>
                        v{ext.version} {ext.enabled ? "已启用" : "未启用"}
                      </span>
                    </div>
                    {ext.description && (
                      <div style={{ fontSize: "10px", color: "var(--text-dimmed)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ext.description}
                      </div>
                    )}
                  </div>
                </div>

                {ext.storeUrl && (
                  <a
                    href={ext.storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="native-btn native-btn-sm native-btn-subtle"
                    style={{ textDecoration: "none", marginLeft: "8px" }}>
                    商店 🔗
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
