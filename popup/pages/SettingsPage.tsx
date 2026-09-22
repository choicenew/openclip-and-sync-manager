import React, { useEffect, useState } from "react";
import { getMasterDeviceState, setMasterDeviceState, type MasterDeviceState } from "~storage/masterDevice";
import { getSettings, setSettings, type Settings } from "~storage/settings";
import { getSessionNameTemplate, setSessionNameTemplate } from "~storage/syncedSessions";
import { getSyncSettings, setSyncSettings, type SyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import { authorizeGoogleOAuth, authorizeOneDriveOAuth } from "~utils/sync/provider";
import { VERSION } from "~utils/version";

export const SettingsPage: React.FC = () => {
  const [syncSettings, setSyncSet] = useState<SyncSettings>({
    deviceId: "",
    deviceName: "此电脑",
    enableChromeSync: true,
    enableWebdav: false,
    enableOneDrive: false,
    enableGoogleDrive: false,
    enableGist: false,
    enableS3: false,
    enableCustomRest: false,
    providerModalities: {
      chrome: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      webdav: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      onedrive: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      googledrive: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      gist: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      s3: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
      customRest: { clipboard: true, bookmarks: true, sessions: true, history: true, extensions: true },
    },
    webdavUrl: "",
    webdavUsername: "",
    webdavPassword: "",
    webdavPath: "/OpenClipSync/openclip-sync.json",
    oneDriveFolder: "/OpenClipSync",
    oneDriveClientId: "",
    oneDriveClientSecret: "",
    oneDriveAccessToken: "",
    googleDriveFolder: "/OpenClipSync",
    googleClientId: "",
    googleClientSecret: "",
    googleAccessToken: "",
    gistToken: "",
    gistId: "",
    s3Endpoint: "",
    s3Bucket: "",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Region: "us-east-1",
    customRestUrl: "",
    customRestToken: "",
  });

  const [settings, setSet] = useState<Settings>({
    historyRetentionDays: 30,
    localItemCharacterLimit: 50000,
    syncDeviceFilter: "all",
    clipboardMonitorIsEnabled: true,
    sessionAutoSaveIntervalMinutes: 30,
    sessionAutoSaveOnStartup: true,
    sessionAutoSaveOnShutdown: true,
    sessionIgnoreUrls: "https://example.com/*\nhttps://example.net/*",
    sessionMinTabCount: 1,
    sessionSaveWindowMode: "current",
  } as any);

  const [masterState, setMasterState] = useState<MasterDeviceState>({
    isMasterDevice: false,
    isForcedAuxiliary: false,
    masterDeviceId: null,
    masterDeviceName: null,
    auxiliaryPullPolicy: "all_devices",
    auxiliaryTargetDeviceId: null,
    deviceRules: {},
  });

  const [syncing, setSyncing] = useState(false);
  const [authorizingOneDrive, setAuthorizingOneDrive] = useState(false);
  const [authorizingGoogle, setAuthorizingGoogle] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleKeywords, setNewRuleKeywords] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const [sessionNameTemplate, setSessionTemplateState] = useState(
    "{YYYY}-{MM}-{DD} {HH}:{mm} - {deviceName} ({tabCount} 标签)",
  );

  useEffect(() => {
    Promise.all([getSyncSettings(), getSettings(), getMasterDeviceState(), getSessionNameTemplate()]).then(
      ([sSet, st, mState, tpl]) => {
        setSyncSet(sSet);
        setSet(st);
        setMasterState(mState);
        setSessionTemplateState(tpl);
      },
    );
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAuthorizeOneDrive = async () => {
    if (!syncSettings.oneDriveClientId) {
      showToast("请先填写 Microsoft OneDrive Client ID");
      return;
    }
    setAuthorizingOneDrive(true);
    try {
      const token = await authorizeOneDriveOAuth(syncSettings.oneDriveClientId);
      const updated = { ...syncSettings, oneDriveAccessToken: token };
      setSyncSet(updated);
      await setSyncSettings(updated);
      showToast("OneDrive 授权成功！");
    } catch (e: any) {
      showToast(e?.message || "OneDrive 授权异常");
    } finally {
      setAuthorizingOneDrive(false);
    }
  };

  const handleAuthorizeGoogle = async () => {
    if (!syncSettings.googleClientId) {
      showToast("请先填写 Google Drive Client ID");
      return;
    }
    setAuthorizingGoogle(true);
    try {
      const token = await authorizeGoogleOAuth(syncSettings.googleClientId);
      const updated = { ...syncSettings, googleAccessToken: token };
      setSyncSet(updated);
      await setSyncSettings(updated);
      showToast("Google Drive 授权成功！");
    } catch (e: any) {
      showToast(e?.message || "Google Drive 授权异常");
    } finally {
      setAuthorizingGoogle(false);
    }
  };

  const handleSave = async () => {
    await Promise.all([
      setSyncSettings(syncSettings),
      setSettings(settings),
      setMasterDeviceState(masterState),
      setSessionNameTemplate(sessionNameTemplate),
    ]);
    showToast("全部设置与会话规则已保存！");
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    const res = await runFullSync();
    setSyncing(false);
    const updatedState = await getMasterDeviceState();
    setMasterState(updatedState);
    showToast(res.message);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", height: "100%", overflowY: "auto" }}>
      {toastMsg && (
        <div className="native-card" style={{ backgroundColor: "var(--primary-color)", color: "#fff", padding: "6px 12px", fontSize: "11px" }}>
          🔔 {toastMsg}
        </div>
      )}

      {/* 头部 Bar */}
      <div className="native-card flex-between">
        <div style={{ fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⚙️</span>
          <span>OpenClip Sync 系统与全量同步规则设置</span>
          <span className="native-badge native-badge-blue">v{VERSION}</span>
        </div>
        <button className="native-btn" onClick={handleSave}>
          💾 保存全部设置
        </button>
      </div>

      {/* 1. 会话 (Section) 与 Tab Groups 精细化保存规则 (TSM 完整对齐) */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", color: "var(--primary-color)" }}>
          🌐 会话 Section 与 Tab Groups 规则设置 (对标 TSM 规范)：
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.sessionAutoSaveOnStartup !== false}
              onChange={(e) => setSet((prev: any) => ({ ...prev, sessionAutoSaveOnStartup: e.target.checked }))}
            />
            <span>启动浏览器时自动保存 Section 快照</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.sessionAutoSaveOnShutdown !== false}
              onChange={(e) => setSet((prev: any) => ({ ...prev, sessionAutoSaveOnShutdown: e.target.checked }))}
            />
            <span>关闭浏览器时自动保存 Section 快照</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.deduplicateEntries !== false}
              onChange={(e) => setSet((prev: any) => ({ ...prev, deduplicateEntries: e.target.checked }))}
            />
            <span>自动去重合并完全相同的 Section 快照</span>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>定时自动备份间隔:</span>
            <select
              className="native-select"
              value={settings.sessionAutoSaveIntervalMinutes ?? 30}
              onChange={(e) => setSet((prev: any) => ({ ...prev, sessionAutoSaveIntervalMinutes: Number(e.target.value) }))}>
              <option value={0}>关闭定时备份</option>
              <option value={15}>每 15 分钟</option>
              <option value={30}>每 30 分钟</option>
              <option value={60}>每 60 分钟</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>自动备份最少 Tab 门槛:</span>
            <input
              type="number"
              className="native-input"
              style={{ width: "60px" }}
              value={settings.sessionMinTabCount ?? 1}
              onChange={(e) => setSet((prev: any) => ({ ...prev, sessionMinTabCount: Number(e.target.value) }))}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>保存窗口模式:</span>
            <select
              className="native-select"
              value={settings.sessionSaveWindowMode || "current"}
              onChange={(e) => setSet((prev: any) => ({ ...prev, sessionSaveWindowMode: e.target.value }))}>
              <option value="current">仅保存当前窗口</option>
              <option value="all">保存所有打开的窗口</option>
            </select>
          </div>
        </div>

        {/* URL 忽略黑名单 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-dimmed)" }}>
            🚫 会话保存排除的 URL 黑名单 (支持 * 通配符，每行一条)：
          </div>
          <textarea
            className="native-input"
            rows={3}
            style={{ fontSize: "11px", fontFamily: "monospace" }}
            value={settings.sessionIgnoreUrls || ""}
            onChange={(e) => setSet((prev: any) => ({ ...prev, sessionIgnoreUrls: e.target.value }))}
          />
        </div>

        {/* 名称格式模板 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-dimmed)" }}>
            🏷️ 自动备份会话的名称模板 (占位符: &#123;YYYY&#125;, &#123;MM&#125;, &#123;DD&#125;, &#123;HH&#125;, &#123;mm&#125;, &#123;deviceName&#125;, &#123;tabCount&#125;)：
          </div>
          <input
            type="text"
            className="native-input"
            value={sessionNameTemplate}
            onChange={(e) => setSessionTemplateState(e.target.value)}
          />
        </div>
      </div>

      {/* 2. 云端同步 Backend 平铺设置 */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px" }}>☁️ 云端同步 Backend 选项：</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "11px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableChromeSync}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableChromeSync: e.target.checked }))}
            />
            <span>Chrome Sync</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableWebdav}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableWebdav: e.target.checked }))}
            />
            <span>WebDAV</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableOneDrive}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableOneDrive: e.target.checked }))}
            />
            <span>OneDrive</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableGoogleDrive}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableGoogleDrive: e.target.checked }))}
            />
            <span>Google Drive</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableGist}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableGist: e.target.checked }))}
            />
            <span>GitHub Gist</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={syncSettings.enableS3}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, enableS3: e.target.checked }))}
            />
            <span>AWS S3 / MinIO</span>
          </label>
        </div>

        {/* WebDAV 展开参数 */}
        {syncSettings.enableWebdav && (
          <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "11px", color: "var(--primary-color)" }}>WebDAV 服务器配置：</div>
            <input
              type="text"
              className="native-input"
              placeholder="WebDAV 服务器 URL..."
              value={syncSettings.webdavUrl || ""}
              onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavUrl: e.target.value }))}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="native-input flex-1"
                placeholder="用户名..."
                value={syncSettings.webdavUsername || ""}
                onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavUsername: e.target.value }))}
              />
              <input
                type="password"
                className="native-input flex-1"
                placeholder="密码 / 授权码..."
                value={syncSettings.webdavPassword || ""}
                onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavPassword: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* OneDrive 展开参数 */}
        {syncSettings.enableOneDrive && (
          <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: "11px" }}>OneDrive 微软云盘配置：</span>
              <span className={`native-badge ${syncSettings.oneDriveAccessToken ? "native-badge-green" : "native-badge-yellow"}`}>
                {syncSettings.oneDriveAccessToken ? "已授权" : "未授权"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                className="native-input flex-1"
                placeholder="OneDrive Client ID..."
                value={syncSettings.oneDriveClientId || ""}
                onChange={(e) => setSyncSet((prev) => ({ ...prev, oneDriveClientId: e.target.value }))}
              />
              <button className="native-btn native-btn-sm" disabled={authorizingOneDrive} onClick={handleAuthorizeOneDrive}>
                {authorizingOneDrive ? "授权中..." : "OAuth 登录授权"}
              </button>
            </div>
          </div>
        )}

        {/* Google Drive 展开参数 */}
        {syncSettings.enableGoogleDrive && (
          <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: "11px" }}>Google Drive 谷歌云盘配置：</span>
              <span className={`native-badge ${syncSettings.googleAccessToken ? "native-badge-green" : "native-badge-yellow"}`}>
                {syncSettings.googleAccessToken ? "已授权" : "未授权"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                className="native-input flex-1"
                placeholder="Google OAuth Client ID..."
                value={syncSettings.googleClientId || ""}
                onChange={(e) => setSyncSet((prev) => ({ ...prev, googleClientId: e.target.value }))}
              />
              <button className="native-btn native-btn-sm" disabled={authorizingGoogle} onClick={handleAuthorizeGoogle}>
                {authorizingGoogle ? "授权中..." : "OAuth 登录授权"}
              </button>
            </div>
          </div>
        )}

        <button className="native-btn native-btn-sm" style={{ marginTop: "4px" }} disabled={syncing} onClick={handleTriggerSync}>
          {syncing ? "同步中..." : "🔄 立即测试联机全模态同步"}
        </button>
      </div>

      {/* 3. 剪贴板与通用保留设置 */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px" }}>📋 本机剪贴板与历史保留策略：</div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", width: "130px" }}>本机设备名称:</span>
          <input
            type="text"
            className="native-input flex-1"
            value={syncSettings.deviceName || "此电脑"}
            onChange={(e) => setSyncSet((prev) => ({ ...prev, deviceName: e.target.value }))}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", width: "130px" }}>剪贴板历史保留天数:</span>
          <input
            type="number"
            className="native-input flex-1"
            value={settings.historyRetentionDays || 30}
            onChange={(e) => setSet((prev: any) => ({ ...prev, historyRetentionDays: Number(e.target.value) || 0 }))}
          />
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", width: "130px" }}>单条剪贴板最大字符:</span>
          <input
            type="number"
            className="native-input flex-1"
            value={settings.localItemCharacterLimit || 50000}
            onChange={(e) => setSet((prev: any) => ({ ...prev, localItemCharacterLimit: Number(e.target.value) || 50000 }))}
          />
        </div>
      </div>

      {/* 4. 关键词自动拦截与敏感词过滤 */}
      <div className="native-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="flex-between">
          <span style={{ fontWeight: 600, fontSize: "12px" }}>🛡️ 特定关键词自动拦截与删除 (Keyword Filter)</span>
          <label className="native-switch">
            <input
              type="checkbox"
              checked={!!settings.enableBlacklistFilter}
              onChange={(e) => setSet((prev: any) => ({ ...prev, enableBlacklistFilter: e.target.checked }))}
            />
            <span className="native-slider"></span>
          </label>
        </div>

        {settings.enableBlacklistFilter && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {(settings.blacklistRules || []).map((rule: any) => (
              <div key={rule.id} className="native-card-subtle flex-between" style={{ padding: "4px 8px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "11px" }}>{rule.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>关键词: {(rule.keywords || []).join(", ")}</div>
                </div>
                <button
                  className="native-btn native-btn-sm"
                  style={{ backgroundColor: "#ef4444" }}
                  onClick={() => {
                    const updated = (settings.blacklistRules || []).filter((r: any) => r.id !== rule.id);
                    setSet((prev: any) => ({ ...prev, blacklistRules: updated }));
                  }}>
                  删除
                </button>
              </div>
            ))}

            <div className="native-card-subtle flex-between" style={{ gap: "6px" }}>
              <input
                type="text"
                className="native-input"
                style={{ width: "100px" }}
                placeholder="规则名称..."
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
              />
              <input
                type="text"
                className="native-input flex-1"
                placeholder="关键词 (逗号分隔)..."
                value={newRuleKeywords}
                onChange={(e) => setNewRuleKeywords(e.target.value)}
              />
              <button
                className="native-btn native-btn-sm"
                onClick={() => {
                  if (!newRuleName.trim() || !newRuleKeywords.trim()) return;
                  const newRule = {
                    id: "rule_" + Date.now(),
                    name: newRuleName.trim(),
                    keywords: newRuleKeywords.split(",").map((k) => k.trim()).filter(Boolean),
                    enabled: true,
                  };
                  setSet((prev: any) => ({ ...prev, blacklistRules: [...(prev.blacklistRules || []), newRule] }));
                  setNewRuleName("");
                  setNewRuleKeywords("");
                }}>
                + 添加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
