import React, { useEffect, useMemo, useState } from "react";
import { getDiscoveredDevices, registerCurrentDevice } from "~storage/discoveredDevices";
import {
  type DevicePermissionRule,
  getMasterDeviceState,
  type MasterDeviceState,
  type ModalitySourceTarget,
  setMasterDeviceState,
} from "~storage/masterDevice";
import { getSettings, setSettings } from "~storage/settings";
import { getSyncSettings, type SyncSettings } from "~storage/syncSettings";
import type { Settings } from "~types/settings";
import { runFullSync } from "~utils/sync/engine";
import type { DeviceInfo } from "~utils/sync/provider";

function formatLastSync(timestamp: number | null | undefined): string {
  if (!timestamp) return "从未同步";
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return new Date(timestamp).toLocaleDateString();
}

export const DevicesPage: React.FC = () => {
  const [syncSettings, setSyncSettingsState] = useState<SyncSettings | null>(null);
  const [sysSettings, setSysSettings] = useState<Settings | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DeviceInfo[]>([]);
  const [masterState, setMasterState] = useState<MasterDeviceState>({
    isMasterDevice: false,
    isForcedAuxiliary: false,
    masterDeviceId: null,
    masterDeviceName: null,
    auxiliaryPullPolicy: "all_devices",
    auxiliaryTargetDeviceId: null,
    deviceRules: {},
  });

  const [selectedTargetDeviceId, setSelectedTargetDeviceId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);

  const loadAllState = async () => {
    const [settings, master, devices, sysSt] = await Promise.all([
      getSyncSettings(),
      getMasterDeviceState(),
      getDiscoveredDevices(),
      getSettings(),
    ]);
    setSyncSettingsState(settings);
    setMasterState(master);
    setSysSettings(sysSt);

    const registered = await registerCurrentDevice(settings);
    setDiscoveredDevices(registered);
  };

  useEffect(() => {
    loadAllState();
  }, []);

  const handleToggleLocalUpload = async (
    modality: "clipboard" | "bookmarks" | "sessions" | "history" | "extensions",
    enabled: boolean,
  ) => {
    if (!sysSettings) return;
    const currentModalities = sysSettings.syncModalities || {
      clipboard: true,
      bookmarks: true,
      sessions: true,
      history: true,
      extensions: true,
    };
    const updatedModalities = { ...currentModalities, [modality]: enabled };
    const updatedSys = { ...sysSettings, syncModalities: updatedModalities };
    setSysSettings(updatedSys);
    await setSettings(updatedSys);
  };

  const handleRunSync = async (targetDeviceId?: string) => {
    setSyncing(true);
    if (targetDeviceId && masterState.isMasterDevice) {
      await setMasterDeviceState({ auxiliaryTargetDeviceId: targetDeviceId });
    }
    await runFullSync();
    await loadAllState();
    setSyncing(false);
  };

  const handleToggleMaster = async (checked: boolean) => {
    const updated = await setMasterDeviceState({
      isMasterDevice: checked,
      isForcedAuxiliary: false,
    });
    setMasterState(updated);
    await runFullSync();
  };

  const updateDeviceModalitySource = async (
    targetDeviceId: string,
    targetDeviceName: string,
    modality: "clipboard" | "bookmarks" | "history" | "sessions" | "tabGroups" | "extensions",
    sourceTarget: ModalitySourceTarget,
  ) => {
    const currentRules = { ...(masterState.deviceRules || {}) };
    const currentRule: DevicePermissionRule = currentRules[targetDeviceId] || {
      deviceId: targetDeviceId,
      deviceName: targetDeviceName,
      enabled: true,
      sources: {
        clipboard: "all",
        bookmarks: "all",
        history: "all",
        sessions: "all",
        tabGroups: "all",
        extensions: "all",
      },
    };

    const updatedRule: DevicePermissionRule = {
      ...currentRule,
      sources: {
        ...currentRule.sources,
        [modality]: sourceTarget,
      },
    };

    const updatedRules = { ...currentRules, [targetDeviceId]: updatedRule };
    const nextMasterState = await setMasterDeviceState({
      isMasterDevice: true,
      isForcedAuxiliary: false,
      deviceRules: updatedRules,
    });
    setMasterState(nextMasterState);
    await runFullSync();
  };

  const updateDeviceEnabled = async (
    targetDeviceId: string,
    targetDeviceName: string,
    enabled: boolean,
  ) => {
    const currentRules = { ...(masterState.deviceRules || {}) };
    const currentRule: DevicePermissionRule = currentRules[targetDeviceId] || {
      deviceId: targetDeviceId,
      deviceName: targetDeviceName,
      enabled: true,
      sources: {
        clipboard: "all",
        bookmarks: "all",
        history: "all",
        sessions: "all",
        tabGroups: "all",
        extensions: "all",
      },
    };

    const updatedRule: DevicePermissionRule = { ...currentRule, enabled };
    const updatedRules = { ...currentRules, [targetDeviceId]: updatedRule };
    const nextMasterState = await setMasterDeviceState({
      isMasterDevice: true,
      isForcedAuxiliary: false,
      deviceRules: updatedRules,
    });
    setMasterState(nextMasterState);
    await runFullSync();
  };

  const updateDeviceCustomAlias = async (
    targetDeviceId: string,
    targetDeviceName: string,
    alias: string,
  ) => {
    const currentRules = { ...(masterState.deviceRules || {}) };
    const currentRule: DevicePermissionRule = currentRules[targetDeviceId] || {
      deviceId: targetDeviceId,
      deviceName: targetDeviceName,
      enabled: true,
      sources: {
        clipboard: "all",
        bookmarks: "all",
        history: "all",
        sessions: "all",
        tabGroups: "all",
        extensions: "all",
      },
    };

    const updatedRule: DevicePermissionRule = { ...currentRule, customAlias: alias };
    const updatedRules = { ...currentRules, [targetDeviceId]: updatedRule };
    const nextMasterState = await setMasterDeviceState({
      isMasterDevice: true,
      isForcedAuxiliary: false,
      deviceRules: updatedRules,
    });
    setMasterState(nextMasterState);
    await runFullSync();
  };

  const allDisplayDevices = useMemo(() => {
    const map = new Map<string, DeviceInfo>();
    for (const d of discoveredDevices) {
      if (d && d.deviceId) map.set(d.deviceId, d);
    }
    for (const [deviceId, rule] of Object.entries(masterState.deviceRules || {})) {
      if (rule && deviceId && !map.has(deviceId)) {
        map.set(deviceId, {
          deviceId,
          deviceName: rule.customAlias || rule.deviceName || "从设备 " + deviceId.slice(0, 6),
          lastActive: Date.now(),
        });
      }
    }
    return Array.from(map.values());
  }, [discoveredDevices, masterState.deviceRules]);

  const isEditable = masterState.isMasterDevice && !masterState.isForcedAuxiliary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", height: "100%", overflowY: "auto" }}>
      {/* 1. 顶部：主辅设备角色控制卡片 */}
      <div className="native-card" style={{ borderColor: "var(--primary-color)" }}>
        <div className="flex-between" style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "13px" }}>
            <span>💻</span>
            <span>跨端设备墙与 Master 规则控制矩阵</span>
            {masterState.isMasterDevice && !masterState.isForcedAuxiliary ? (
              <span className="native-badge native-badge-purple">👑 主设备 (Master)</span>
            ) : (
              <span className="native-badge native-badge-orange">🛡️ 辅助从设备 (Auxiliary)</span>
            )}
          </div>

          <label className="native-switch" title="将本机设为 Master 云端主控设备">
            <input
              type="checkbox"
              checked={masterState.isMasterDevice && !masterState.isForcedAuxiliary}
              disabled={masterState.isForcedAuxiliary}
              onChange={(e) => handleToggleMaster(e.target.checked)}
            />
            <span className="native-slider"></span>
          </label>
        </div>

        {/* 本机自主关停数据模态上传卡片 */}
        <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div className="flex-between">
            <span style={{ fontWeight: 600, fontSize: "11px" }}>🛡️ 本机 (子设备) 自主数据关停控制（独立最高优先级）</span>
            <span className="native-badge native-badge-green">最高自主权</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sysSettings?.syncModalities?.clipboard !== false}
                onChange={(e) => handleToggleLocalUpload("clipboard", e.target.checked)}
              />
              <span>📋 剪贴板</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sysSettings?.syncModalities?.bookmarks !== false}
                onChange={(e) => handleToggleLocalUpload("bookmarks", e.target.checked)}
              />
              <span>🔖 书签树</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sysSettings?.syncModalities?.sessions !== false}
                onChange={(e) => handleToggleLocalUpload("sessions", e.target.checked)}
              />
              <span>🌐 会话标签</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sysSettings?.syncModalities?.history !== false}
                onChange={(e) => handleToggleLocalUpload("history", e.target.checked)}
              />
              <span>📜 浏览历史</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={sysSettings?.syncModalities?.extensions !== false}
                onChange={(e) => handleToggleLocalUpload("extensions", e.target.checked)}
              />
              <span>🧩 扩展列表</span>
            </label>
          </div>
        </div>

        {/* 本机信息与定向同步 */}
        <div className="flex-between" style={{ marginTop: "8px" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "12px" }}>
              当前设备：{syncSettings?.deviceName || "设备 A"} <span className="native-badge">ID: {syncSettings?.deviceId?.slice(0, 8)}...</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {masterState.isMasterDevice && (
              <select
                className="native-select"
                value={selectedTargetDeviceId}
                onChange={(e) => setSelectedTargetDeviceId(e.target.value)}>
                <option value="">-- 选择定向拉取目标设备 --</option>
                {allDisplayDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {masterState.deviceRules?.[d.deviceId]?.customAlias || d.deviceName}
                  </option>
                ))}
              </select>
            )}
            <button className="native-btn native-btn-sm" disabled={syncing} onClick={() => handleRunSync(selectedTargetDeviceId || undefined)}>
              {syncing ? "同步中..." : "🎯 定向/全量拉取刷新"}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 已关联从设备墙卡片列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-dimmed)" }}>
          已登记的设备节点卡片墙 ({allDisplayDevices.length})
        </div>

        {allDisplayDevices.map((dev) => {
          const isCurrent = dev.deviceId === syncSettings?.deviceId;
          const deviceRule: DevicePermissionRule = masterState.deviceRules?.[dev.deviceId] || {
            deviceId: dev.deviceId,
            deviceName: dev.deviceName,
            enabled: true,
            sources: { clipboard: "all", bookmarks: "all", history: "all", sessions: "all", tabGroups: "all", extensions: "all" },
          };

          return (
            <div key={dev.deviceId} className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="flex-between">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>💻</span>
                  <span style={{ fontWeight: 600, fontSize: "12px" }}>{deviceRule.customAlias || dev.deviceName}</span>
                  {isCurrent && <span className="native-badge native-badge-cyan">本机</span>}
                  <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>{formatLastSync(dev.lastActive)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label className="native-switch" title="允许/禁用该设备同步">
                    <input
                      type="checkbox"
                      checked={deviceRule.enabled !== false}
                      disabled={!isEditable}
                      onChange={(e) => updateDeviceEnabled(dev.deviceId, dev.deviceName, e.target.checked)}
                    />
                    <span className="native-slider"></span>
                  </label>
                  {!isCurrent && (
                    <button className="native-btn native-btn-sm native-btn-subtle" onClick={() => handleRunSync(dev.deviceId)}>
                      📥 单独拉取
                    </button>
                  )}
                </div>
              </div>

              {/* 别名与规则控制 */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="text"
                  className="native-input flex-1"
                  placeholder="设置设备自定义备注名称..."
                  value={deviceRule.customAlias || ""}
                  disabled={!isEditable}
                  onChange={(e) => updateDeviceCustomAlias(dev.deviceId, dev.deviceName, e.target.value)}
                />
              </div>

              {/* 6 大模态数据源拉取选择器 (含 Tab Groups) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "6px", fontSize: "11px" }}>
                {(["clipboard", "bookmarks", "history", "sessions", "tabGroups", "extensions"] as const).map((mod) => (
                  <div key={mod} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-dimmed)", textTransform: "capitalize" }}>{mod} 源:</span>
                    <select
                      className="native-select"
                      disabled={!isEditable}
                      style={{ fontSize: "10px", padding: "2px 4px" }}
                      value={deviceRule.sources?.[mod] || "all"}
                      onChange={(e) => updateDeviceModalitySource(dev.deviceId, dev.deviceName, mod, e.target.value as any)}>
                      <option value="all">全量设备</option>
                      <option value="none">禁用</option>
                      {allDisplayDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          仅【{masterState.deviceRules?.[d.deviceId]?.customAlias || d.deviceName}】
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
