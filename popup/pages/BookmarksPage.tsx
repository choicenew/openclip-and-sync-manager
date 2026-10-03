import React, { useEffect, useState } from "react";
import { getDiscoveredDevices } from "~storage/discoveredDevices";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import { exportBookmarksTree, extractBookmarkUrls } from "~utils/sync/handlers/bookmarks";
import type { DeviceInfo } from "~utils/sync/provider";

export const BookmarksPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [bookmarks, setBookmarks] = useState<{ title: string; url: string; deviceId?: string; deviceName?: string }[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>("all");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // 数据模态通道许可：Bookmarks 允许走哪些云节点
  const [allowedProviders, setAllowedProviders] = useState({
    chrome: true,
    webdav: true,
    onedrive: true,
    googledrive: true,
    gist: true,
    s3: true,
    customRest: true,
  });

  const loadBookmarks = async () => {
    setLoading(true);
    const [tree, syncSet, devices, syncedCloudBookmarks] = await Promise.all([
      exportBookmarksTree(),
      getSyncSettings(),
      getDiscoveredDevices(),
      new Promise<any[]>((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get("openclip_synced_bookmarks", (res) =>
            resolve(res.openclip_synced_bookmarks || []),
          );
        } else {
          resolve([]);
        }
      }),
    ]);

    const localMap = extractBookmarkUrls(tree);
    const localDeviceId = syncSet.deviceId || "local";
    const localDeviceName = syncSet.deviceName || "此设备";

    const localTagged = Array.from(localMap.values()).map((b) => ({
      ...b,
      deviceId: (b as any).deviceId || localDeviceId,
      deviceName: (b as any).deviceName || localDeviceName,
    }));

    // 合并本地与云端已存的全量书签记录
    const map = new Map<string, { title: string; url: string; deviceId?: string; deviceName?: string }>();
    for (const b of syncedCloudBookmarks) {
      if (b && b.url) map.set(b.url, b);
    }
    for (const b of localTagged) {
      if (b && b.url) {
        const existing = map.get(b.url);
        map.set(b.url, existing ? { ...existing, ...b } : b);
      }
    }

    setBookmarks(Array.from(map.values()));
    setDiscoveredDevices(devices);
    setLoading(false);
  };

  const loadSettings = async () => {
    const s = await getSyncSettings();
    const currentMods = s.providerModalities || {};
    setAllowedProviders({
      chrome: currentMods.chrome?.bookmarks ?? true,
      webdav: currentMods.webdav?.bookmarks ?? true,
      onedrive: currentMods.onedrive?.bookmarks ?? true,
      googledrive: currentMods.googledrive?.bookmarks ?? true,
      gist: currentMods.gist?.bookmarks ?? true,
      s3: currentMods.s3?.bookmarks ?? true,
      customRest: currentMods.customRest?.bookmarks ?? true,
    });
  };

  useEffect(() => {
    loadBookmarks();
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
        bookmarks: allowed,
      };
    }
    await setSyncSettings({ providerModalities: updatedMods });
    setAllowedProviders((prev) => ({ ...prev, [providerKey]: allowed }));
  };

  const handlePullRemoteBookmarks = async () => {
    setSyncing(true);
    const res = await runFullSync();
    await loadBookmarks();
    setSyncing(false);
    showToast(res.success ? "已成功拉取并合并写入本机浏览器书签！" : res.message);
  };

  const handlePushLocalBookmarks = async () => {
    setSyncing(true);
    const res = await runFullSync();
    setSyncing(false);
    showToast(res.success ? "已成功推送本机书签至云端！" : res.message);
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
      setSelectedUrls(new Set(filtered.map((b) => b.url)));
    }
  };

  const handleBatchCopyUrls = () => {
    if (selectedUrls.size === 0) return;
    const text = Array.from(selectedUrls).join("\n");
    navigator.clipboard.writeText(text);
    showToast(`已批量复制 ${selectedUrls.size} 条书签链接！`);
  };

  const handleBatchCopyTitleAndUrls = () => {
    if (selectedUrls.size === 0) return;
    const selectedList = filtered.filter((b) => selectedUrls.has(b.url));
    const text = selectedList.map((b) => `${b.title}: ${b.url}`).join("\n");
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
    showToast(`已批量在后台打开 ${opened} 个书签页！`);
  };

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = bookmarks.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query);
    const matchesDevice = selectedDeviceFilter === "all" || b.deviceId === selectedDeviceFilter;
    return matchesSearch && matchesDevice;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", height: "100%", overflowY: "auto" }}>
      {/* 消息提示 Toast */}
      {toastMsg && (
        <div className="native-card" style={{ backgroundColor: "var(--primary-color)", color: "#fff", padding: "6px 12px", fontSize: "11px" }}>
          🔔 {toastMsg}
        </div>
      )}

      {/* 控流面板 B: 【数据视角】书签允许同步走哪些云节点 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)", backgroundColor: "rgba(79, 70, 229, 0.02)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
          📡 【数据选途径】书签树 (Bookmarks) 允许同步到的云端 Backend 节点：
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

      {/* 搜索、设备切分与同步 Bar */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索书签标题或 URL..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600 }}>设备过滤:</span>
          <select
            className="native-select"
            value={selectedDeviceFilter}
            onChange={(e) => setSelectedDeviceFilter(e.target.value)}>
            <option value="all">🌐 全量设备书签</option>
            {discoveredDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                💻 {d.deviceName} ({d.deviceId.slice(0, 6)}...)
              </option>
            ))}
          </select>

          <button className="native-btn native-btn-sm" disabled={syncing} onClick={handlePullRemoteBookmarks}>
            📥 拉取云书签
          </button>
          <button className="native-btn native-btn-sm native-btn-subtle" disabled={syncing} onClick={handlePushLocalBookmarks}>
            📤 推送书签
          </button>
          <button className="native-btn native-btn-sm native-btn-subtle" disabled={loading} onClick={loadBookmarks}>
            刷新
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
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
          已选 {selectedUrls.size} / 共 {filtered.length} 条
        </div>
      </div>

      {/* 书签卡片列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在读取浏览器书签树..." : "未找到匹配的书签记录"}
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
                      <span>🔖</span>
                      <span style={{ fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.title || item.url}
                      </span>
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
                    title="复制 URL"
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
