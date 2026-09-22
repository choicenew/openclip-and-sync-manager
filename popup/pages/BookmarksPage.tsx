import React, { useEffect, useState } from "react";
import { getSyncSettings, setSyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import { exportBookmarksTree, extractBookmarkUrls } from "~utils/sync/handlers/bookmarks";

export const BookmarksPage: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [bookmarks, setBookmarks] = useState<{ title: string; url: string }[]>([]);
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
    const tree = await exportBookmarksTree();
    const map = extractBookmarkUrls(tree);
    setBookmarks(Array.from(map.values()));
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

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = bookmarks.filter(
    (b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query),
  );

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

      {/* 搜索与同步 Bar */}
      <div className="native-card flex-between" style={{ gap: "8px" }}>
        <input
          type="text"
          className="native-input flex-1"
          placeholder="搜索书签标题或 URL..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <div style={{ display: "flex", gap: "6px" }}>
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

      {/* 书签卡片列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "30px", fontSize: "12px" }}>
            {loading ? "正在读取浏览器书签树..." : "未找到匹配的书签记录"}
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div key={idx} className="native-card-subtle flex-between" style={{ padding: "6px 10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🔖</span>
                  <span style={{ fontWeight: 600, fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title || item.url}
                  </span>
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dimmed)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.url}
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
          ))
        )}
      </div>
    </div>
  );
};
