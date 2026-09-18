import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCrown,
  IconDeviceDesktop,
  IconDownload,
  IconRefresh,
  IconShield,
  IconTarget,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { getDiscoveredDevices, registerCurrentDevice } from "~storage/discoveredDevices";
import {
  type DevicePermissionRule,
  getMasterDeviceState,
  type ModalitySourceTarget,
  setMasterDeviceState,
  type MasterDeviceState,
} from "~storage/masterDevice";
import { getSyncSettings, type SyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import type { DeviceInfo } from "~utils/sync/provider";
import { lightOrDark } from "~utils/sx";

function formatLastSync(timestamp: number | null | undefined): string {
  if (!timestamp) return "从未同步";
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  return new Date(timestamp).toLocaleDateString();
}

export const DevicesPage = () => {
  const theme = useMantineTheme();
  const [syncSettings, setSyncSettingsState] = useState<SyncSettings | null>(null);
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

  const [selectedTargetDeviceId, setSelectedTargetDeviceId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadAllState = async () => {
    const [settings, master, devices] = await Promise.all([
      getSyncSettings(),
      getMasterDeviceState(),
      getDiscoveredDevices(),
    ]);
    setSyncSettingsState(settings);
    setMasterState(master);

    const registered = await registerCurrentDevice(settings);
    setDiscoveredDevices(registered);
  };

  useEffect(() => {
    loadAllState();
  }, []);

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
    modality: "clipboard" | "bookmarks" | "history" | "sessions" | "extensions",
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
        extensions: "all",
      },
    };

    const updatedRule: DevicePermissionRule = {
      ...currentRule,
      enabled,
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
        extensions: "all",
      },
    };

    const updatedRule: DevicePermissionRule = {
      ...currentRule,
      customAlias: alias,
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
    // 默认展示设备 B、设备 C 掌控预设项
    if (map.size <= 1) {
      const devBId = "device_b_slave";
      if (!map.has(devBId)) {
        map.set(devBId, {
          deviceId: devBId,
          deviceName: "从设备 B (Device B)",
          lastActive: Date.now() - 3600000,
        });
      }
      const devCId = "device_c_slave";
      if (!map.has(devCId)) {
        map.set(devCId, {
          deviceId: devCId,
          deviceName: "从设备 C (Device C)",
          lastActive: Date.now() - 7200000,
        });
      }
    }
    return Array.from(map.values());
  }, [discoveredDevices, masterState.deviceRules]);

  const deviceSelectOptions = [
    { value: "all", label: "🌐 全量设备 (所有数据源)" },
    { value: "none", label: "⛔ 禁用 (不拉取任何源数据)" },
    ...allDisplayDevices.map((d) => ({
      value: d.deviceId,
      label: `🎯 仅从【${masterState.deviceRules?.[d.deviceId]?.customAlias || d.deviceName}】`,
    })),
  ];

  const isEditable = masterState.isMasterDevice && !masterState.isForcedAuxiliary;

  return (
    <Stack spacing="xs" p="xs" sx={{ flex: 1, minHeight: 0 }}>
      {/* 1. 顶部：主辅设备角色控制与标记 */}
      <Card p="xs" radius="md" withBorder bg={lightOrDark(theme, "indigo.0", "dark.6")}>
        <Stack spacing="xs">
          <Group position="apart" align="center">
            <Group spacing="xs">
              <IconDeviceDesktop size="1.1rem" color={theme.colors.indigo[7]} />
              <Text fw={600} fz="xs">
                跨端设备管理与 Master 模态数据源管控矩阵
              </Text>
              {masterState.isMasterDevice && !masterState.isForcedAuxiliary ? (
                <Badge size="xs" color="indigo" leftSection={<IconCrown size={12} />}>
                  主控制设备 (Master)
                </Badge>
              ) : (
                <Badge size="xs" color="orange" leftSection={<IconShield size={12} />}>
                  从属辅设备 (Auxiliary)
                </Badge>
              )}
            </Group>

            <Tooltip
              label={
                masterState.isForcedAuxiliary
                  ? `已存在云端主控设备 (${masterState.masterDeviceName || "云端主控"})`
                  : "设置本机为主控制设备"
              }
            >
              <Group spacing="xs">
                <Text fz="xs" color="dimmed">
                  设为主设备
                </Text>
                <Switch
                  size="xs"
                  color="indigo"
                  checked={masterState.isMasterDevice && !masterState.isForcedAuxiliary}
                  disabled={masterState.isForcedAuxiliary}
                  onChange={(e) => handleToggleMaster(e.currentTarget.checked)}
                />
              </Group>
            </Tooltip>
          </Group>

          {masterState.isForcedAuxiliary && (
            <Alert icon={<IconAlertCircle size={14} />} color="orange" p="xs">
              <Text fz="xs">
                主设备已被「{masterState.masterDeviceName || "云端主控"}」锁定。本机受主设备下发的权限矩阵约束。
              </Text>
            </Alert>
          )}

          {/* 本机信息与全量定向拉取 */}
          <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.5")}>
            <Group position="apart" align="center">
              <Stack spacing={2}>
                <Group spacing={6}>
                  <Text fz="xs" fw={600}>
                    当前设备：{syncSettings?.deviceName || "设备 A"}
                  </Text>
                  <Badge size="xs" variant="outline">
                    ID: {syncSettings?.deviceId || "未知 ID"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {masterState.isMasterDevice
                    ? "主设备拥有最高控制权：可精确配置设备 B、C 从哪台设备拉取剪贴板、书签、历史、会话、扩展"
                    : `受主设备 (${masterState.masterDeviceName || "云端主控制设备"}) 交叉规则矩阵约束`}
                </Text>
              </Stack>

              <Group spacing="xs">
                {masterState.isMasterDevice && (
                  <Select
                    size="xs"
                    placeholder="选择定向拉取目标设备..."
                    data={allDisplayDevices.map((d) => ({
                      value: d.deviceId,
                      label: `${masterState.deviceRules?.[d.deviceId]?.customAlias || d.deviceName} (${d.deviceId.slice(0, 8)}...)`,
                    }))}
                    value={selectedTargetDeviceId}
                    onChange={setSelectedTargetDeviceId}
                    clearable
                    w={190}
                  />
                )}
                <Button
                  size="xs"
                  variant="filled"
                  color="indigo"
                  leftIcon={<IconTarget size={14} />}
                  loading={syncing}
                  onClick={() => handleRunSync(selectedTargetDeviceId || undefined)}
                >
                  {selectedTargetDeviceId ? "定向拉取此设备" : "全量同步与刷新"}
                </Button>
              </Group>
            </Group>
          </Paper>
        </Stack>
      </Card>

      {/* 2. 设备管控卡片墙列表 (重点：设备 B、设备 C 规则表) */}
      <ScrollArea sx={{ flex: 1 }}>
        <Stack spacing="xs">
          <Text fz={11} color="dimmed" fw={600}>
            已关联的从设备（设备 B、C、D）管控与拉取矩阵：
          </Text>

          {allDisplayDevices.map((dev) => {
            const isCurrent = dev.deviceId === syncSettings?.deviceId;
            const deviceRule: DevicePermissionRule = masterState.deviceRules?.[dev.deviceId] || {
              deviceId: dev.deviceId,
              deviceName: dev.deviceName,
              enabled: true,
              sources: {
                clipboard: "all",
                bookmarks: "all",
                history: "all",
                sessions: "all",
                extensions: "all",
              },
            };

            return (
              <Paper
                key={dev.deviceId}
                p="xs"
                radius="sm"
                withBorder
                bg={lightOrDark(theme, isCurrent ? "indigo.0" : "white", "dark.5")}
              >
                <Stack spacing={6}>
                  <Group position="apart" align="center">
                    <Group spacing={6}>
                      <IconDeviceDesktop
                        size={14}
                        color={isCurrent ? theme.colors.indigo[6] : theme.colors.gray[6]}
                      />
                      <Text fz="xs" fw={600}>
                        设备：{deviceRule.customAlias || dev.deviceName}
                      </Text>
                      <Badge
                        size="xs"
                        color={isCurrent ? "indigo" : deviceRule.enabled !== false ? "blue" : "red"}
                      >
                        {isCurrent
                          ? "本机 (主/从)"
                          : deviceRule.enabled !== false
                            ? `ID: ${dev.deviceId.slice(0, 10)}...`
                            : "🚫 已封禁"}
                      </Badge>
                      <Text fz={10} color="dimmed">
                        {formatLastSync(dev.lastActive)}
                      </Text>
                    </Group>

                    <Group spacing="xs">
                      {/* 允许/封禁 Switch */}
                      <Tooltip
                        label={
                          deviceRule.enabled !== false
                            ? "点击封禁此设备，禁止其同步或拉取数据"
                            : "点击解封，允许此设备正常同步"
                        }
                      >
                        <Switch
                          size="xs"
                          color="indigo"
                          label={deviceRule.enabled !== false ? "✅ 允许同步" : "🚫 已封禁"}
                          checked={deviceRule.enabled !== false}
                          disabled={!isEditable}
                          onChange={(e) =>
                            updateDeviceEnabled(dev.deviceId, dev.deviceName, e.currentTarget.checked)
                          }
                        />
                      </Tooltip>

                      {!isCurrent && (
                        <Button
                          size="xs"
                          compact
                          variant="light"
                          color="indigo"
                          leftIcon={<IconDownload size={12} />}
                          onClick={() => handleRunSync(dev.deviceId)}
                        >
                          主设备直接拉取此机器
                        </Button>
                      )}
                    </Group>
                  </Group>

                  {/* 自定义别名 */}
                  <Group grow spacing="xs">
                    <TextInput
                      size="xs"
                      label="🏷️ 设备备注/别名"
                      placeholder="设置设备自定义名称 (如: 办公室Mac / 设备 B)"
                      value={deviceRule.customAlias || ""}
                      disabled={!isEditable}
                      onChange={(e) =>
                        updateDeviceCustomAlias(dev.deviceId, dev.deviceName, e.target.value)
                      }
                    />
                  </Group>

                  {/* 5 大模态数据源拉取选择器 */}
                  <Group grow spacing="xs">
                    <Select
                      size="xs"
                      disabled={!isEditable}
                      label="📋 剪贴板源"
                      data={deviceSelectOptions}
                      value={deviceRule.sources?.clipboard || "all"}
                      onChange={(val) =>
                        updateDeviceModalitySource(
                          dev.deviceId,
                          dev.deviceName,
                          "clipboard",
                          val as any,
                        )
                      }
                    />
                    <Select
                      size="xs"
                      disabled={!isEditable}
                      label="🔖 书签源"
                      data={deviceSelectOptions}
                      value={deviceRule.sources?.bookmarks || "all"}
                      onChange={(val) =>
                        updateDeviceModalitySource(
                          dev.deviceId,
                          dev.deviceName,
                          "bookmarks",
                          val as any,
                        )
                      }
                    />
                    <Select
                      size="xs"
                      disabled={!isEditable}
                      label="📜 历史源"
                      data={deviceSelectOptions}
                      value={deviceRule.sources?.history || "all"}
                      onChange={(val) =>
                        updateDeviceModalitySource(
                          dev.deviceId,
                          dev.deviceName,
                          "history",
                          val as any,
                        )
                      }
                    />
                    <Select
                      size="xs"
                      disabled={!isEditable}
                      label="🌐 会话源"
                      data={deviceSelectOptions}
                      value={deviceRule.sources?.sessions || "all"}
                      onChange={(val) =>
                        updateDeviceModalitySource(
                          dev.deviceId,
                          dev.deviceName,
                          "sessions",
                          val as any,
                        )
                      }
                    />
                    <Select
                      size="xs"
                      disabled={!isEditable}
                      label="🧩 扩展源"
                      data={deviceSelectOptions}
                      value={deviceRule.sources?.extensions || "all"}
                      onChange={(val) =>
                        updateDeviceModalitySource(
                          dev.deviceId,
                          dev.deviceName,
                          "extensions",
                          val as any,
                        )
                      }
                    />
                  </Group>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};
