import React, { useEffect, useState } from "react";
import {
  getSyncSettings,
  getSyncStatus,
  setSyncSettings,
  type ModalityPermissions,
  type SyncSettings,
  type SyncStatus,
} from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";

function formatLastSync(timestamp: number | null | undefined): string {
  if (!timestamp) return "从未同步";
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return new Date(timestamp).toLocaleDateString();
}

export const CloudPage: React.FC = () => {
  const [syncSettings, setSyncSettingsState] = useState<SyncSettings | null>(null);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadAllState = async () => {
    const [settings, status] = await Promise.all([getSyncSettings(), getSyncStatus()]);
    setSyncSettingsState(settings);
    setSyncStatusState(status);
  };

  useEffect(() => {
    loadAllState();
  }, []);

  const handleRunSync = async () => {
    setSyncing(true);
    await runFullSync();
    await loadAllState();
    setSyncing(false);
  };

  const handleToggleProviderEnable = async (
    providerKey:
      | "enableChromeSync"
      | "enableWebdav"
      | "enableOneDrive"
      | "enableGoogleDrive"
      | "enableGist"
      | "enableS3"
      | "enableCustomRest",
    checked: boolean,
  ) => {
    if (!syncSettings) return;
    const updated = { ...syncSettings, [providerKey]: checked };
    setSyncSettingsState(updated);
    await setSyncSettings(updated);
  };

  // 控制面板 A：云服务卡片内部【云选接受数据】多模态子勾选控制
  const handleToggleModality = async (
    providerKey: "chrome" | "webdav" | "onedrive" | "googledrive" | "gist" | "s3" | "customRest",
    modalityKey: keyof ModalityPermissions,
    checked: boolean,
  ) => {
    if (!syncSettings) return;
    const updatedMods = { ...syncSettings.providerModalities };
    updatedMods[providerKey] = {
      ...updatedMods[providerKey],
      [modalityKey]: checked,
    };
    const updated = { ...syncSettings, providerModalities: updatedMods };
    setSyncSettingsState(updated);
    await setSyncSettings(updated);
  };

  const providersList: {
    id: "chrome" | "webdav" | "onedrive" | "googledrive" | "gist" | "s3" | "customRest";
    enableKey:
      | "enableChromeSync"
      | "enableWebdav"
      | "enableOneDrive"
      | "enableGoogleDrive"
      | "enableGist"
      | "enableS3"
      | "enableCustomRest";
    name: string;
    desc: string;
    statusObj?: { status?: string; lastSyncTime?: number | null };
  }[] = [
    {
      id: "chrome",
      enableKey: "enableChromeSync",
      name: "Chrome Sync",
      desc: "Chrome 账号内置同步",
      statusObj: syncStatus?.chrome,
    },
    {
      id: "webdav",
      enableKey: "enableWebdav",
      name: "WebDAV 网盘",
      desc: "坚果云 / Nextcloud / 群晖",
      statusObj: syncStatus?.webdav,
    },
    {
      id: "onedrive",
      enableKey: "enableOneDrive",
      name: "OneDrive",
      desc: "微软云盘备份",
      statusObj: syncStatus?.onedrive,
    },
    {
      id: "googledrive",
      enableKey: "enableGoogleDrive",
      name: "Google Drive",
      desc: "谷歌云端硬盘",
      statusObj: syncStatus?.googledrive,
    },
    {
      id: "gist",
      enableKey: "enableGist",
      name: "GitHub Gist",
      desc: "Gist 密钥 / 文件",
      statusObj: syncStatus?.gist,
    },
    {
      id: "s3",
      enableKey: "enableS3",
      name: "AWS S3 / MinIO",
      desc: "S3 对象存储",
      statusObj: syncStatus?.s3,
    },
    {
      id: "customRest",
      enableKey: "enableCustomRest",
      name: "Custom REST API",
      desc: "自建 API 端点",
      statusObj: syncStatus?.customRest,
    },
  ];

  const modalityLabels: { key: keyof ModalityPermissions; label: string }[] = [
    { key: "clipboard", label: "剪贴板" },
    { key: "bookmarks", label: "书签" },
    { key: "sessions", label: "会话" },
    { key: "history", label: "历史" },
    { key: "extensions", label: "扩展" },
  ];

  return (
    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }}>
      {/* 顶部：云端 Backend 节点看板 Header */}
      <div className="native-card flex-between">
        <div style={{ fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>☁️</span>
          <span>云端 Backend 同步节点状态看板</span>
        </div>
        <button
          className="native-btn"
          disabled={syncing}
          onClick={handleRunSync}>
          {syncing ? "同步中..." : "🔄 一键全量云端同步"}
        </button>
      </div>

      {/* 7 大 Backend 云服务节点阵列 (内含【云选接受数据】子勾选组) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
        {providersList.map((p) => {
          const isEnabled = !!syncSettings?.[p.enableKey];
          const providerMods = syncSettings?.providerModalities?.[p.id] || {
            clipboard: true,
            bookmarks: true,
            sessions: true,
            history: true,
            extensions: true,
          };

          return (
            <div
              key={p.id}
              className="native-card"
              style={{
                opacity: isEnabled ? 1 : 0.65,
                borderColor: isEnabled ? "var(--primary-color)" : "var(--border-color)",
              }}>
              {/* 卡片头部：使能开关与节点名 */}
              <div className="flex-between" style={{ marginBottom: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: 600, fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggleProviderEnable(p.enableKey, e.target.checked)}
                  />
                  <span>{p.name}</span>
                </label>
                <span
                  className="native-badge"
                  style={{
                    backgroundColor: !isEnabled ? "#f3f4f6" : p.statusObj?.status === "error" ? "#fee2e2" : "#dcfce7",
                    color: !isEnabled ? "#6b7280" : p.statusObj?.status === "error" ? "#b91c1c" : "#15803d",
                  }}>
                  {!isEnabled ? "未开启" : p.statusObj?.status === "error" ? "异常" : "正常"}
                </span>
              </div>

              {/* 同步时间说明 */}
              <div style={{ fontSize: "11px", color: "var(--text-dimmed)", marginBottom: "8px" }}>
                {isEnabled ? `上次同步: ${formatLastSync(p.statusObj?.lastSyncTime)}` : p.desc}
              </div>

              {/* 控制面板 A：在该云服务卡片内部设置【允许接收哪些数据类型】 */}
              {isEnabled && (
                <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--primary-color)", marginBottom: "2px" }}>
                    📥 【云服务控制】允许本云端接收的数据模态：
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11px" }}>
                    {modalityLabels.map((m) => (
                      <label key={m.key} style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!!providerMods[m.key]}
                          onChange={(e) => handleToggleModality(p.id, m.key, e.target.checked)}
                        />
                        <span>{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 说明区域 */}
      <div className="native-card" style={{ marginTop: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>
          🛡️ 去中心化多模态双向双重门控安全说明
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-dimmed)", lineHeight: "1.5" }}>
          OpenClip Sync 采用去中心化分模态独立架构。同步触发时，仅当 <b>“云节点勾选许可” AND “数据模块选此途径” AND “全局数据模态开启”</b> 三者同时满足，数据才会写往该后端网盘，保障隐私与传输精准分流。
        </div>
      </div>
    </div>
  );
};
