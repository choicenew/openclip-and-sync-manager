import React, { useEffect, useState } from "react";
import { getDiscoveredDevices } from "~storage/discoveredDevices";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { deleteHistoryUrl, exportHistory, type SyncHistoryItem } from "~utils/sync/handlers/history";
import type { DeviceInfo } from "~utils/sync/provider";

export const HistoryPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [historyItems, setHistoryItems] = useState<(SyncHistoryItem & { deviceId?: string; deviceName?: string })[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>("all");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
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
    const [localItems, syncSet, devices, syncedCloudHistory] = await Promise.all([
      exportHistory(30, 1000),
      getSyncSettings(),
      getDiscoveredDevices(),
      new Promise<any[]>((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get("openclip_synced_history", (res) =>
            resolve(res.openclip_synced_history || []),
          );
        } else {
          resolve([]);
        }
      }),
    ]);

    const localDeviceId = syncSet.deviceId || "local";
    const localDeviceName = syncSet.deviceName || "此设备";

    const localTagged = localItems.map((item) => ({
      ...item,
      deviceId: (item as any).deviceId || localDeviceId,
      deviceName: (item as any).deviceName || localDeviceName,
    }));

    // 合并本地与云端已存的全量历史记录
    const map = new Map<string, SyncHistoryItem & { deviceId?: string; deviceName?: string }>();
    for (const item of syncedCloudHistory) {
      if (item && item.url) map.set(item.url, item);
    }
    for (const item of localTagged) {
      if (item && item.url) {
        const existing = map.get(item.url);
        if (existing) {
          map.set(item.url, {
            ...existing,
            title: item.title || existing.title,
            lastVisitTime: Math.max(existing.lastVisitTime || 0, item.lastVisitTime || 0),
            visitCount: (existing.visitCount || 1) + (item.visitCount || 1),
            deviceId: item.deviceId || existing.deviceId,
            deviceName: item.deviceName || existing.deviceName,
          });
        } else {
          map.set(item.url, item);
        }
      }
    }

    const allItems = Array.from(map.values()).sort(
      (a, b) => (b.lastVisitTime || 0) - (a.lastVisitTime || 0),
    );

    setHistoryItems(allItems);
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
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
    showToast("已从本地历史删除该记录！");
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("链接已复制到剪贴板！");
  };

  const toggleSelectUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filtered.length && filtered.length > 0) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filtered.map((item) => item.url)));
    }
  };

  const handleBatchCopyUrls = () => {
    if (selectedUrls.size === 0) return;
    const text = Array.from(selectedUrls).join("\n");
    navigator.clipboard.writeText(text);
    showToast(`已批量复制 ${selectedUrls.size} 条历史链接！`);
  };

  const handleBatchCopyTitleAndUrls = () => {
    if (selectedUrls.size === 0) return;
    const selectedList = filtered.filter((item) => selectedUrls.has(item.url));
    const text = selectedList.map((item) => `${item.title || item.url}: ${item.url}`).join("\n");
    navigator.clipboard.writeText(text);
    showToast(`已批量复制 ${selectedList.length} 条标题与链接！`);
  };

  const handleBatchOpen = () => {
    if (selectedUrls.size === 0) return;
    let opened = 0;
    selectedUrls.forEach((url) => {
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        chrome.tabs?.create({ url, active: false });
        opened++;
      }
    });
    showToast(`已批量在后台打开 ${opened} 个历史页面！`);
  };

  const handleBatchDelete = async () => {
    if (selectedUrls.size === 0) return;
    if (window.confirm(`确定要从本地历史记录中删除选中的 ${selectedUrls.size} 条页面吗？`)) {
      const urls = Array.from(selectedUrls);
      await Promise.all(urls.map((url) => deleteHistoryUrl(url)));
      setHistoryItems((prev) => prev.filter((item) => !selectedUrls.has(item.url)));
      setSelectedUrls(new Set());
      showToast(`已成功删除选中的 ${urls.length} 条历史记录！`);
    }
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

      {/* 批量操作工具栏 */}
      <div className="native-card flex-between" style={{ padding: "6px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "11px" }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && selectedUrls.size === filtered.length}
              onChange={toggleSelectAll}
              style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary-color)" }}
            />
            <span>全选</span>
          </label>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedUrls.size === 0}
            onClick={handleBatchCopyUrls}>
            📋 批量复制 URL
          </button>
          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedUrls.size === 0}
            onClick={handleBatchCopyTitleAndUrls}>
            📄 复制标题+链接
          </button>
          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedUrls.size === 0}
            onClick={handleBatchOpen}>
            🔗 批量打开 ({selectedUrls.size})
          </button>
          <button
            className="native-btn native-btn-sm"
            style={{ backgroundColor: "#ef4444" }}
            disabled={selectedUrls.size === 0}
            onClick={handleBatchDelete}>
            🗑️ 批量删除
          </button>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
          已选 {selectedUrls.size} / 共 {filtered.length} 条
        </div>
      </div>

      {/* 历史卡片列表 (带设备来源 Tag) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在获取浏览历史记录..." : "无相关浏览历史记录"}
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isSelected = selectedUrls.has(item.url);
            return (
              <div key={idx} className="native-card-subtle flex-between" style={{ padding: "6px 10px", backgroundColor: isSelected ? "rgba(79, 70, 229, 0.08)" : undefined }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, overflow: "hidden" }}>
                  <div
                    style={{ padding: "4px", cursor: "pointer", display: "flex", alignItems: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectUrl(item.url);
                    }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelectUrl(item.url)}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary-color)" }}
                    />
                  </div>
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
            );
          })
        )}
      </div>
    </div>
  );
};
