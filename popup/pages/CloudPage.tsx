import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconBrandGoogleDrive,
  IconBrandOnedrive,
  IconCheck,
  IconCloudCheck,
  IconCloudUpload,
  IconDatabase,
  IconGlobe,
  IconInfoCircle,
  IconRefresh,
  IconServer,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  getSyncSettings,
  getSyncStatus,
  setSyncSettings,
  type SyncSettings,
  type SyncStatus,
} from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
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

export const CloudPage = () => {
  const theme = useMantineTheme();
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

  const handleToggleProvider = async (
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

  const activeProviderCount = [
    syncSettings?.enableChromeSync,
    syncSettings?.enableWebdav,
    syncSettings?.enableOneDrive,
    syncSettings?.enableGoogleDrive,
    syncSettings?.enableGist,
    syncSettings?.enableS3,
    syncSettings?.enableCustomRest,
  ].filter(Boolean).length;

  return (
    <Stack spacing="xs" p="xs" sx={{ flex: 1, minHeight: 0 }}>
      {/* 1. 顶部：云端 Backend 7 大节点看板 */}
      <Card p="xs" radius="md" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
        <Stack spacing={8}>
          <Group position="apart" align="center">
            <Group spacing="xs">
              <IconCloudUpload size="1.1rem" color={theme.colors.indigo[6]} />
              <Text fw={600} fz="xs">
                云端 Backend 同步节点状态看板 ({activeProviderCount} 个已启用)
              </Text>
            </Group>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              leftIcon={<IconRefresh size={14} />}
              loading={syncing}
              onClick={() => handleRunSync()}
            >
              一键全量云端同步
            </Button>
          </Group>

          <Group grow spacing="xs">
            {/* Chrome Sync */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableChromeSync ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableChromeSync}
                      onChange={(e) =>
                        handleToggleProvider("enableChromeSync", e.currentTarget.checked)
                      }
                    />
                    <IconDatabase size="0.95rem" color={theme.colors.blue[6]} />
                    <Text fz="xs" fw={600}>
                      Chrome Sync
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableChromeSync
                        ? "gray"
                        : syncStatus?.chrome?.status === "error"
                          ? "red"
                          : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableChromeSync
                      ? "未开启"
                      : syncStatus?.chrome?.status === "error"
                        ? "异常"
                        : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableChromeSync
                    ? `同步: ${formatLastSync(syncStatus?.chrome?.lastSyncTime)}`
                    : "Chrome 账号内置同步"}
                </Text>
              </Stack>
            </Paper>

            {/* WebDAV */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableWebdav ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableWebdav}
                      onChange={(e) =>
                        handleToggleProvider("enableWebdav", e.currentTarget.checked)
                      }
                    />
                    <IconServer size="0.95rem" color={theme.colors.teal[6]} />
                    <Text fz="xs" fw={600}>
                      WebDAV 网盘
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableWebdav
                        ? "gray"
                        : syncStatus?.webdav?.status === "error"
                          ? "red"
                          : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableWebdav
                      ? "未开启"
                      : syncStatus?.webdav?.status === "error"
                        ? "异常"
                        : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableWebdav
                    ? `同步: ${formatLastSync(syncStatus?.webdav?.lastSyncTime)}`
                    : "坚果云/Nextcloud/群晖"}
                </Text>
              </Stack>
            </Paper>

            {/* OneDrive */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableOneDrive ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableOneDrive}
                      onChange={(e) =>
                        handleToggleProvider("enableOneDrive", e.currentTarget.checked)
                      }
                    />
                    <IconBrandOnedrive size="0.95rem" color={theme.colors.cyan[6]} />
                    <Text fz="xs" fw={600}>
                      OneDrive
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableOneDrive
                        ? "gray"
                        : !syncSettings.oneDriveAccessToken
                          ? "yellow"
                          : syncStatus?.onedrive?.status === "error"
                            ? "red"
                            : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableOneDrive
                      ? "未开启"
                      : !syncSettings.oneDriveAccessToken
                        ? "待授权"
                        : syncStatus?.onedrive?.status === "error"
                          ? "异常"
                          : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableOneDrive
                    ? syncSettings.oneDriveAccessToken
                      ? `同步: ${formatLastSync(syncStatus?.onedrive?.lastSyncTime)}`
                      : "需在设置中授权"
                    : "微软云盘备份"}
                </Text>
              </Stack>
            </Paper>

            {/* Google Drive */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableGoogleDrive ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableGoogleDrive}
                      onChange={(e) =>
                        handleToggleProvider("enableGoogleDrive", e.currentTarget.checked)
                      }
                    />
                    <IconBrandGoogleDrive size="0.95rem" color={theme.colors.yellow[7]} />
                    <Text fz="xs" fw={600}>
                      Google Drive
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableGoogleDrive
                        ? "gray"
                        : !syncSettings.googleAccessToken
                          ? "yellow"
                          : syncStatus?.googledrive?.status === "error"
                            ? "red"
                            : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableGoogleDrive
                      ? "未开启"
                      : !syncSettings.googleAccessToken
                        ? "待授权"
                        : syncStatus?.googledrive?.status === "error"
                          ? "异常"
                          : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableGoogleDrive
                    ? syncSettings.googleAccessToken
                      ? `同步: ${formatLastSync(syncStatus?.googledrive?.lastSyncTime)}`
                      : "需在设置中授权"
                    : "谷歌云端硬盘"}
                </Text>
              </Stack>
            </Paper>

            {/* GitHub Gist */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableGist ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableGist}
                      onChange={(e) =>
                        handleToggleProvider("enableGist", e.currentTarget.checked)
                      }
                    />
                    <IconGlobe size="0.95rem" color={theme.colors.gray[7]} />
                    <Text fz="xs" fw={600}>
                      GitHub Gist
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableGist
                        ? "gray"
                        : syncStatus?.gist?.status === "error"
                          ? "red"
                          : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableGist
                      ? "未开启"
                      : syncStatus?.gist?.status === "error"
                        ? "异常"
                        : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableGist
                    ? `同步: ${formatLastSync(syncStatus?.gist?.lastSyncTime)}`
                    : "Gist 密钥/文件"}
                </Text>
              </Stack>
            </Paper>

            {/* AWS S3 / MinIO */}
            <Paper
              withBorder
              p="xs"
              radius="sm"
              bg={lightOrDark(theme, "white", "dark.6")}
              sx={{ opacity: syncSettings?.enableS3 ? 1 : 0.6 }}
            >
              <Stack spacing={4}>
                <Group position="apart" align="center" noWrap>
                  <Group spacing={6} noWrap>
                    <Checkbox
                      size="xs"
                      checked={!!syncSettings?.enableS3}
                      onChange={(e) =>
                        handleToggleProvider("enableS3", e.currentTarget.checked)
                      }
                    />
                    <IconServer size="0.95rem" color={theme.colors.orange[6]} />
                    <Text fz="xs" fw={600}>
                      AWS S3 / MinIO
                    </Text>
                  </Group>
                  <Badge
                    size="xs"
                    color={
                      !syncSettings?.enableS3
                        ? "gray"
                        : syncStatus?.s3?.status === "error"
                          ? "red"
                          : "green"
                    }
                    variant="dot"
                  >
                    {!syncSettings?.enableS3
                      ? "未开启"
                      : syncStatus?.s3?.status === "error"
                        ? "异常"
                        : "正常"}
                  </Badge>
                </Group>
                <Text fz={11} color="dimmed">
                  {syncSettings?.enableS3
                    ? `同步: ${formatLastSync(syncStatus?.s3?.lastSyncTime)}`
                    : "S3 对象存储"}
                </Text>
              </Stack>
            </Paper>
          </Group>
        </Stack>
      </Card>

      {/* 2. 下部：纯粹的云同步巡检状态与数据管道健康日志 */}
      <ScrollArea sx={{ flex: 1 }}>
        <Stack spacing="xs">
          <Paper p="sm" radius="md" withBorder bg={lightOrDark(theme, "white", "dark.6")}>
            <Stack spacing="xs">
              <Group spacing="xs">
                <IconCloudCheck size={18} color={theme.colors.indigo[6]} />
                <Text fw={600} fz="sm">
                  云端多模态分文件同步机制说明
                </Text>
              </Group>

              <Text fz="xs" color="dimmed">
                OpenClip Sync 采用去中心化分模态独立架构，您的数据完全属于您自己。每次同步触发时，数据将以独立的加密规范写入您的后端网盘：
              </Text>

              <Group grow spacing="xs">
                <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
                  <Stack spacing={2}>
                    <Text fz="xs" fw={600}>
                      📋 剪贴板文件 (clipboard.json)
                    </Text>
                    <Text fz={11} color="dimmed">
                      多设备剪贴板历史记录、标签、固定与置顶状态
                    </Text>
                  </Stack>
                </Paper>
                <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
                  <Stack spacing={2}>
                    <Text fz="xs" fw={600}>
                      🔖 书签树文件 (bookmarks.json)
                    </Text>
                    <Text fz={11} color="dimmed">
                      跨浏览器书签结构树同步与备份
                    </Text>
                  </Stack>
                </Paper>
              </Group>

              <Group grow spacing="xs">
                <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
                  <Stack spacing={2}>
                    <Text fz="xs" fw={600}>
                      📜 历史与会话 (history.json / sessions.json)
                    </Text>
                    <Text fz={11} color="dimmed">
                      30天浏览历史记录与多设备打开的标签页会话组
                    </Text>
                  </Stack>
                </Paper>
                <Paper p="xs" radius="sm" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
                  <Stack spacing={2}>
                    <Text fz="xs" fw={600}>
                      👑 主控锁规则 (master_config.json)
                    </Text>
                    <Text fz={11} color="dimmed">
                      主控设备声明与从设备授权防护规则矩阵
                    </Text>
                  </Stack>
                </Paper>
              </Group>
            </Stack>
          </Paper>

          <Paper p="sm" radius="md" withBorder bg={lightOrDark(theme, "indigo.0", "dark.6")}>
            <Group position="apart">
              <Group spacing="xs">
                <IconShieldCheck size={18} color={theme.colors.indigo[7]} />
                <Text fw={600} fz="sm">
                  数据安全与零商业服务器保证
                </Text>
              </Group>
              <Badge size="xs" color="indigo">
                100% 去中心化
              </Badge>
            </Group>
            <Text fz="xs" color="dimmed" mt={4}>
              本插件绝不收集或上传任何数据至第三方商业服务器。所有数据直接通过您自己配置的 WebDAV / 云盘进行直连加密传输。
            </Text>
          </Paper>
        </Stack>
      </ScrollArea>
    </Stack>
  );
};
