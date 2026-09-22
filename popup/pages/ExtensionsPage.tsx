import React, { useEffect, useState } from "react";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { exportExtensions, type SyncExtension } from "~utils/sync/handlers/extensions";

export const ExtensionsPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [extensions, setExtensions] = useState<SyncExtension[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");

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

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = extensions.filter(
    (ext) => ext.name.toLowerCase().includes(query) || (ext.description && ext.description.toLowerCase().includes(query)),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", height: "100%", overflowY: "auto" }}>
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

      {/* 扩展列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在读取浏览器扩展..." : "未找到匹配的扩展插件"}
          </div>
        ) : (
          filtered.map((ext) => (
            <div key={ext.id} className="native-card-subtle flex-between" style={{ padding: "6px 10px" }}>
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
          ))
        )}
      </div>
    </div>
  );
};
