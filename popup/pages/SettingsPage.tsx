import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconCloudComputing,
  IconCrown,
  IconDevices,
  IconFilter,
  IconPlus,
  IconRefresh,
  IconAdjustmentsHorizontal,
  IconShieldCheck,
  IconShieldLock,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { getDiscoveredDevices } from "~storage/discoveredDevices";
import {
  getMasterDeviceState,
  setMasterDeviceState,
  type MasterDeviceState,
} from "~storage/masterDevice";
import { getSettings, setSettings, type Settings } from "~storage/settings";
import { getSyncSettings, setSyncSettings, type SyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import { authorizeGoogleOAuth, authorizeOneDriveOAuth } from "~utils/sync/provider";
import { lightOrDark } from "~utils/sx";
import { VERSION } from "~utils/version";

export const SettingsPage = () => {
  const theme = useMantineTheme();
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

  useEffect(() => {
    Promise.all([getSyncSettings(), getSettings(), getMasterDeviceState()]).then(
      ([sSet, st, mState]) => {
        setSyncSet(sSet);
        setSet(st);
        setMasterState(mState);
      },
    );
  }, []);

  const handleAuthorizeOneDrive = async () => {
    if (!syncSettings.oneDriveClientId) {
      notifications.show({
        title: "错误",
        message: "请先填写 Microsoft OneDrive Client ID",
        color: "red",
      });
      return;
    }
    setAuthorizingOneDrive(true);
    try {
      const token = await authorizeOneDriveOAuth(syncSettings.oneDriveClientId);
      const updated = { ...syncSettings, oneDriveAccessToken: token };
      setSyncSet(updated);
      await setSyncSettings(updated);
      notifications.show({
        title: "OneDrive 授权成功",
        message: "已成功连接微软云盘账号！",
        color: "teal",
        icon: <IconCheck size={16} />,
      });
    } catch (e: any) {
      notifications.show({
        title: "OneDrive 授权失败",
        message: e?.message || "用户取消或授权异常",
        color: "red",
      });
    } finally {
      setAuthorizingOneDrive(false);
    }
  };

  const handleAuthorizeGoogle = async () => {
    if (!syncSettings.googleClientId) {
      notifications.show({
        title: "错误",
        message: "请先填写 Google Drive Client ID",
        color: "red",
      });
      return;
    }
    setAuthorizingGoogle(true);
    try {
      const token = await authorizeGoogleOAuth(syncSettings.googleClientId);
      const updated = { ...syncSettings, googleAccessToken: token };
      setSyncSet(updated);
      await setSyncSettings(updated);
      notifications.show({
        title: "Google Drive 授权成功",
        message: "已成功连接谷歌云盘账号！",
        color: "teal",
        icon: <IconCheck size={16} />,
      });
    } catch (e: any) {
      notifications.show({
        title: "Google Drive 授权失败",
        message: e?.message || "用户取消或授权异常",
        color: "red",
      });
    } finally {
      setAuthorizingGoogle(false);
    }
  };

  const handleSave = async () => {
    await Promise.all([
      setSyncSettings(syncSettings),
      setSettings(settings),
      setMasterDeviceState(masterState),
    ]);
    notifications.show({
      title: "保存成功",
      message: "同步设置与系统属性已全面更新",
      color: "teal",
      icon: <IconCheck size={16} />,
    });
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    const res = await runFullSync();
    setSyncing(false);

    const updatedState = await getMasterDeviceState();
    setMasterState(updatedState);

    notifications.show({
      title: res.success ? "同步完成" : "同步提示",
      message: res.message,
      color: res.success ? "teal" : "red",
    });
  };

  return (
    <ScrollArea sx={{ flex: 1 }}>
      <Stack spacing="md" p="xs">
        <Group position="apart" align="center">
          <Group spacing="xs">
            <IconAdjustmentsHorizontal size="1.2rem" color={theme.colors.indigo[6]} />
            <Title order={5}>OpenClip Sync 系统与同步设置</Title>
            <Badge size="xs" color="blue">
              v{VERSION}
            </Badge>
          </Group>
          <Button size="xs" color="indigo" onClick={handleSave}>
            保存全部修改
          </Button>
        </Group>

        {/* 1. 多云后端支持：完全平铺展开 (无折叠，可多选) */}
        <Card p="sm" radius="md" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
          <Stack spacing="xs">
            <Group spacing="xs">
              <IconCloudComputing size={18} color={theme.colors.indigo[6]} />
              <Text fw={600} fz="sm">
                云端同步 Backend 选项（平铺展开，可同时勾选任意多个服务）
              </Text>
            </Group>

            <Group spacing="md">
              <Checkbox
                label="Chrome Sync (谷歌内置同步)"
                checked={syncSettings.enableChromeSync}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableChromeSync: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="WebDAV (坚果云/Nextcloud/群晖)"
                checked={syncSettings.enableWebdav}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableWebdav: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="OneDrive (微软云盘)"
                checked={syncSettings.enableOneDrive}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableOneDrive: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="Google Drive (谷歌云盘)"
                checked={syncSettings.enableGoogleDrive}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableGoogleDrive: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="GitHub Gist (代码片段/秘钥云)"
                checked={syncSettings.enableGist}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableGist: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="AWS S3 / MinIO (对象存储)"
                checked={syncSettings.enableS3}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableS3: e.currentTarget.checked }))
                }
              />
              <Checkbox
                label="Custom REST API (自建服务器)"
                checked={syncSettings.enableCustomRest}
                onChange={(e) =>
                  setSyncSet((prev) => ({ ...prev, enableCustomRest: e.currentTarget.checked }))
                }
              />
            </Group>

            {/* WebDAV 展开表单 */}
            {syncSettings.enableWebdav && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Text fz="xs" fw={600} color="indigo">
                    WebDAV 服务器参数配置
                  </Text>
                  <TextInput
                    label="WebDAV 服务器 URL"
                    placeholder="https://dav.nextcloud.com/remote.php/dav/files/user/"
                    value={syncSettings.webdavUrl || ""}
                    onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavUrl: e.target.value }))}
                  />
                  <Group grow>
                    <TextInput
                      label="用户名"
                      value={syncSettings.webdavUsername || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavUsername: e.target.value }))}
                    />
                    <PasswordInput
                      label="密码 / 应用授权码"
                      value={syncSettings.webdavPassword || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, webdavPassword: e.target.value }))}
                    />
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* OneDrive 展开表单 */}
            {syncSettings.enableOneDrive && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Group position="apart">
                    <Text fz="xs" fw={600} color="cyan.7">
                      Microsoft OneDrive 微软云盘配置与授权登录
                    </Text>
                    <Badge size="xs" color={syncSettings.oneDriveAccessToken ? "green" : "yellow"}>
                      {syncSettings.oneDriveAccessToken ? "已授权登录" : "未授权登录"}
                    </Badge>
                  </Group>
                  <Group grow align="flex-end">
                    <TextInput
                      label="Application (Client) ID"
                      placeholder="微软 Azure 注册的应用 Client ID"
                      value={syncSettings.oneDriveClientId || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, oneDriveClientId: e.target.value }))}
                    />
                    <Button
                      size="xs"
                      color="cyan"
                      loading={authorizingOneDrive}
                      onClick={handleAuthorizeOneDrive}
                    >
                      {syncSettings.oneDriveAccessToken ? "重新授权微软账号" : "一键 OAuth 登录授权"}
                    </Button>
                  </Group>
                  <PasswordInput
                    label="OneDrive Access Token (自动获取或手动填入)"
                    placeholder="OAuth 登录后自动填入 Token"
                    value={syncSettings.oneDriveAccessToken || ""}
                    onChange={(e) => setSyncSet((prev) => ({ ...prev, oneDriveAccessToken: e.target.value }))}
                  />
                </Stack>
              </Paper>
            )}

            {/* Google Drive 展开表单 */}
            {syncSettings.enableGoogleDrive && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Group position="apart">
                    <Text fz="xs" fw={600} color="yellow.8">
                      Google Drive 谷歌云端硬盘配置与授权登录
                    </Text>
                    <Badge size="xs" color={syncSettings.googleAccessToken ? "green" : "yellow"}>
                      {syncSettings.googleAccessToken ? "已授权登录" : "未授权登录"}
                    </Badge>
                  </Group>
                  <Group grow align="flex-end">
                    <TextInput
                      label="Google OAuth Client ID"
                      placeholder="谷歌 Cloud Console 申请的 Client ID"
                      value={syncSettings.googleClientId || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, googleClientId: e.target.value }))}
                    />
                    <Button
                      size="xs"
                      color="yellow"
                      loading={authorizingGoogle}
                      onClick={handleAuthorizeGoogle}
                    >
                      {syncSettings.googleAccessToken ? "重新授权谷歌账号" : "一键 OAuth 登录授权"}
                    </Button>
                  </Group>
                  <PasswordInput
                    label="Google Access Token (自动获取或手动填入)"
                    placeholder="OAuth 登录后自动填入 Token"
                    value={syncSettings.googleAccessToken || ""}
                    onChange={(e) => setSyncSet((prev) => ({ ...prev, googleAccessToken: e.target.value }))}
                  />
                </Stack>
              </Paper>
            )}

            {/* GitHub Gist 展开表单 */}
            {syncSettings.enableGist && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Text fz="xs" fw={600} color="indigo">
                    GitHub Gist 参数配置
                  </Text>
                  <Group grow>
                    <PasswordInput
                      label="GitHub Personal Access Token"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={syncSettings.gistToken || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, gistToken: e.target.value }))}
                    />
                    <TextInput
                      label="Gist ID (留空则自动创建)"
                      placeholder="留空将首次推定时自动创建私有 Gist"
                      value={syncSettings.gistId || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, gistId: e.target.value }))}
                    />
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* AWS S3 / MinIO 展开表单 */}
            {syncSettings.enableS3 && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Text fz="xs" fw={600} color="indigo">
                    AWS S3 / MinIO / 兼容对象存储配置
                  </Text>
                  <Group grow>
                    <TextInput
                      label="Endpoint 服务地址"
                      placeholder="https://s3.us-east-1.amazonaws.com 或 http://127.0.0.1:9000"
                      value={syncSettings.s3Endpoint || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, s3Endpoint: e.target.value }))}
                    />
                    <TextInput
                      label="Bucket 桶名称"
                      placeholder="my-clip-bucket"
                      value={syncSettings.s3Bucket || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, s3Bucket: e.target.value }))}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Access Key ID"
                      value={syncSettings.s3AccessKeyId || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, s3AccessKeyId: e.target.value }))}
                    />
                    <PasswordInput
                      label="Secret Access Key"
                      value={syncSettings.s3SecretAccessKey || ""}
                      onChange={(e) => setSyncSet((prev) => ({ ...prev, s3SecretAccessKey: e.target.value }))}
                    />
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Custom REST API 展开表单 */}
            {syncSettings.enableCustomRest && (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")} mt="xs">
                <Stack spacing="xs">
                  <Text fz="xs" fw={600} color="indigo">
                    Custom REST API 自建服务器配置
                  </Text>
                  <TextInput
                    label="API Endpoint URL"
                    placeholder="https://api.my-server.com/v1/sync"
                    value={syncSettings.customRestUrl || ""}
                    onChange={(e) => setSyncSet((prev) => ({ ...prev, customRestUrl: e.target.value }))}
                  />
                  <PasswordInput
                    label="Authorization Token (可选)"
                    placeholder="Bearer token or secret key"
                    value={syncSettings.customRestToken || ""}
                    onChange={(e) => setSyncSet((prev) => ({ ...prev, customRestToken: e.target.value }))}
                  />
                </Stack>
              </Paper>
            )}

            <Button
              mt="xs"
              variant="light"
              color="indigo"
              size="xs"
              leftIcon={<IconRefresh size={14} />}
              loading={syncing}
              onClick={handleTriggerSync}
            >
              测试联机并立即触发全模态同步
            </Button>
          </Stack>
        </Card>

        {/* 2. 主/辅设备属性与自动防抢判定 */}
        <Card p="sm" radius="md" withBorder bg={lightOrDark(theme, "indigo.0", "dark.6")}>
          <Stack spacing="xs">
            <Group spacing="xs">
              <IconCrown size={18} color={theme.colors.indigo[7]} />
              <Text fw={600} fz="sm">
                设备角色与 Master 主设备互斥防抢逻辑
              </Text>
            </Group>

            {masterState.isForcedAuxiliary ? (
              <Alert icon={<IconAlertCircle size={16} />} title="已自动变灰防抢并降级为辅助设备" color="orange">
                云端目录已存在生效的主设备：
                <Text fw={600} component="span">
                  「{masterState.masterDeviceName || masterState.masterDeviceId || "云端主控"}」
                </Text>
                。当主设备存在时，本机【设为主设备】开关**自动变灰并禁止抢夺**，严格受主设备规则下发管控。
              </Alert>
            ) : (
              <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.5")}>
                <Group position="apart">
                  <Stack spacing={2}>
                    <Text size="xs" fw={600}>
                      将本机标记为主设备 (Master Device)
                    </Text>
                    <Text size="11px" color="dimmed">
                      首次标记并同步到云端后，后续其他设备读取该目录时均会自动变灰降级为辅助设备。
                    </Text>
                  </Stack>
                  <Switch
                    size="md"
                    color="indigo"
                    checked={masterState.isMasterDevice}
                    disabled={masterState.isForcedAuxiliary}
                    onChange={(e) =>
                      setMasterState((prev) => ({ ...prev, isMasterDevice: e.currentTarget.checked }))
                    }
                  />
                </Group>
              </Paper>
            )}
          </Stack>
        </Card>

        {/* 3. 本机与存储清理规则 */}
        <Card p="sm" radius="md" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
          <Stack spacing="xs">
            <Group spacing="xs">
              <IconFilter size={18} color={theme.colors.blue[6]} />
              <Text fw={600} fz="sm">
                本机属性与数据保留策略
              </Text>
            </Group>

            <Group grow>
              <TextInput
                label="本机设备名称"
                value={syncSettings.deviceName || "此电脑"}
                onChange={(e) => setSyncSet((prev) => ({ ...prev, deviceName: e.target.value }))}
              />
              <NumberInput
                label="剪贴板历史保留天数 (0 为永久)"
                value={settings.historyRetentionDays || 30}
                onChange={(val) =>
                  setSet((prev: Settings) => ({ ...prev, historyRetentionDays: Number(val) || 0 }))
                }
              />
            </Group>

            <NumberInput
              label="单条剪贴板记录最大字符上限"
              value={settings.localItemCharacterLimit || 50000}
              onChange={(val) =>
                setSet((prev: Settings) => ({
                  ...prev,
                  localItemCharacterLimit: Number(val) || 50000,
                }))
              }
            />
          </Stack>
        </Card>

        {/* 4. 敏感与特定关键词自动拦截/删除规则 */}
        <Card p="sm" radius="md" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
          <Stack spacing="xs">
            <Group position="apart">
              <Group spacing="xs">
                <IconShieldLock size={18} color={theme.colors.red[6]} />
                <Text fw={600} fz="sm">
                  特定关键词自动拦截与彻底删除策略 (Keyword Auto Delete)
                </Text>
              </Group>
              <Switch
                size="xs"
                color="red"
                checked={!!settings.enableBlacklistFilter}
                onChange={(e) =>
                  setSet((prev: any) => ({
                    ...prev,
                    enableBlacklistFilter: e.currentTarget.checked,
                  }))
                }
              />
            </Group>
            <Text size="xs" color="dimmed">
              开启后，当复制内容符合以下包含的特定关键词时，系统将自动拦截并彻底删除，不写入历史与云端同步。
            </Text>

            {settings.enableBlacklistFilter && (
              <Stack spacing="xs" mt="xs">
                {(settings.blacklistRules || []).map((rule: any, idx: number) => (
                  <Paper key={rule.id || idx} p="xs" radius="sm" withBorder bg={lightOrDark(theme, "white", "dark.6")}>
                    <Group position="apart" align="center">
                      <Stack spacing={2}>
                        <Group spacing="xs">
                          <Text fz="xs" fw={600}>
                            {rule.name}
                          </Text>
                          <Switch
                            size="xs"
                            color="red"
                            checked={rule.enabled}
                            onChange={(e) => {
                              const updated = (settings.blacklistRules || []).map((r: any) =>
                                r.id === rule.id ? { ...r, enabled: e.currentTarget.checked } : r
                              );
                              setSet((prev: any) => ({ ...prev, blacklistRules: updated }));
                            }}
                          />
                        </Group>
                        <Text fz="11px" color="dimmed">
                          匹配关键词：{(rule.keywords || []).join(", ")}
                        </Text>
                      </Stack>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        compact
                        onClick={() => {
                          const updated = (settings.blacklistRules || []).filter((r: any) => r.id !== rule.id);
                          setSet((prev: any) => ({ ...prev, blacklistRules: updated }));
                        }}
                      >
                        删除规则
                      </Button>
                    </Group>
                  </Paper>
                ))}

                <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "gray.1", "dark.6")}>
                  <Stack spacing="xs">
                    <Text fz="xs" fw={600} color="indigo">
                      添加新关键词拦截与彻底删除规则
                    </Text>
                    <Group grow align="flex-end">
                      <TextInput
                        placeholder="规则名称 (如: 支付敏感密码)"
                        size="xs"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                      />
                      <TextInput
                        placeholder="关键词(英文逗号分隔，如: password, secret)"
                        size="xs"
                        value={newRuleKeywords}
                        onChange={(e) => setNewRuleKeywords(e.target.value)}
                      />
                      <Button
                        size="xs"
                        color="indigo"
                        onClick={() => {
                          if (!newRuleName.trim() || !newRuleKeywords.trim()) return;
                          const keywords = newRuleKeywords
                            .split(",")
                            .map((k) => k.trim())
                            .filter(Boolean);
                          const newRule = {
                            id: "rule_" + Date.now(),
                            name: newRuleName.trim(),
                            keywords,
                            enabled: true,
                          };
                          const updated = [...(settings.blacklistRules || []), newRule];
                          setSet((prev: any) => ({ ...prev, blacklistRules: updated }));
                          setNewRuleName("");
                          setNewRuleKeywords("");
                        }}
                      >
                        添加规则
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </Stack>
        </Card>

        <Divider />

        <Group position="apart">
          <Text size="xs" color="dimmed">
            OpenClip Sync v2.6.0 — 100% 独立自主分模态 WebDAV 存储架构
          </Text>
          <Button size="sm" color="indigo" onClick={handleSave}>
            保存全部配置
          </Button>
        </Group>
      </Stack>
    </ScrollArea>
  );
};
