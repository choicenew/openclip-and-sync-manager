import React, { useEffect, useState } from "react";
import { getDiscoveredDevices } from "~storage/discoveredDevices";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { deleteHistoryUrl, exportHistory, type SyncHistoryItem } from "~utils/sync/handlers/history";
import type { DeviceInfo } from "~utils/sync/provider";

export const HistoryPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [historyItems, setHistoryItems] = useState<(SyncHistoryItem & { deviceId?: string; deviceName?: string })[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // 数据模态通道许可：History 允许走哪些云节点
  const [allowedProviders, setAllowedProviders] = useState({
    chrome: true,
    webdav: true,
    onedrive: true,
    googledrive: true,
    gist: true,
    s3: true,
    customRest: true,
  });

  const loadHistory = async () => {
    setLoading(true);
    const [items, syncSet, devices] = await Promise.all([
      exportHistory(7, 300),
      getSyncSettings(),
      getDiscoveredDevices(),
    ]);

    const deviceId = syncSet.deviceId || "local";
    const deviceName = syncSet.deviceName || "此设备";

    // 标注设备归属 Tag
    const taggedItems = items.map((item) => ({
      ...item,
      deviceId,
      deviceName,
    }));

    setHistoryItems(taggedItems);
    setDiscoveredDevices(devices);
    setLoading(false);
  };

  const loadSettings = async () => {
    const s = await getSyncSettings();
    const currentMods = s.providerModalities || {};
    setAllowedProviders({
      chrome: currentMods.chrome?.history ?? true,
      webdav: currentMods.webdav?.history ?? true,
      onedrive: currentMods.onedrive?.history ?? true,
      googledrive: currentMods.googledrive?.history ?? true,
      gist: currentMods.gist?.history ?? true,
      s3: currentMods.s3?.history ?? true,
      customRest: currentMods.customRest?.history ?? true,
    });
  };

  useEffect(() => {
    loadHistory();
    loadSettings();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleToggleProvider = async (providerKey: string, allowed: boolean) => {
    const s = await getSyncSettings();
    const updatedMods = { ...s.providerModalities };
    if (updatedMods[providerKey as keyof typeof updatedMods]) {
      updatedMods[providerKey as keyof typeof updatedMods] = {
        ...updatedMods[providerKey as keyof typeof updatedMods],
        history: allowed,
      };
    }
    await setSyncSettings({ providerModalities: updatedMods });
    setAllowedProviders((prev) => ({ ...prev, [providerKey]: allowed }));
  };

  const handleDelete = async (url: string) => {
    await deleteHistoryUrl(url);
    setHistoryItems((prev) => prev.filter((item) => item.url !== url));
    showToast("已从本地历史删除该记录！");
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("链接已复制到剪贴板！");
  };

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = historyItems.filter((item) => {
    const matchesSearch = item.url.toLowerCase().includes(query) || (item.title && item.title.toLowerCase().includes(query));
    const matchesDevice = selectedDeviceFilter === "all" || item.deviceId === selectedDeviceFilter;
    return matchesSearch && matchesDevice;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", height: "100%", overflowY: "auto" }}>
      {toastMsg && (
        <div className="native-card" style={{ backgroundColor: "var(--primary-color)", color: "#fff", padding: "6px 12px", fontSize: "11px" }}>
          🔔 {toastMsg}
        </div>
      )}

      {/* 控流面板 B: 【数据视角】浏览历史 (History) 允许同步走哪些云节点 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
          📡 【数据选途径】浏览历史 (History) 允许同步到的云端 Backend 节点：
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

      {/* 按设备维度切分与过滤 Bar */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索历史记录标题或 URL..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600 }}>设备过滤:</span>
          <select
            className="native-select"
            value={selectedDeviceFilter}
            onChange={(e) => setSelectedDeviceFilter(e.target.value)}>
            <option value="all">🌐 全量设备历史</option>
            {discoveredDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                💻 {d.deviceName} ({d.deviceId.slice(0, 6)}...)
              </option>
            ))}
          </select>
          <button className="native-btn native-btn-sm" disabled={loading} onClick={loadHistory}>
            刷新历史
          </button>
        </div>
      </div>

      {/* 历史卡片列表 (带设备来源 Tag) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在获取浏览历史记录..." : "无相关浏览历史记录"}
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div key={idx} className="native-card-subtle flex-between" style={{ padding: "6px 10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📜</span>
                  <span style={{ fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title || item.url}
                  </span>
                  <span className="native-badge native-badge-orange">{item.visitCount} 次访问</span>
                  {item.deviceName && <span className="native-badge native-badge-blue">🏷️ {item.deviceName}</span>}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dimmed)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.url}
                </div>
              </div>

              <div style={{ display: "flex", gap: "4px", marginLeft: "8px" }}>
                <button
                  className="native-btn native-btn-sm native-btn-subtle"
                  onClick={() => handleCopy(item.url)}>
                  📋 复制
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="native-btn native-btn-sm"
                  style={{ textDecoration: "none" }}>
                  🔗 打开
                </a>
                <button
                  className="native-btn native-btn-sm"
                  style={{ backgroundColor: "#ef4444" }}
                  onClick={() => handleDelete(item.url)}>
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
