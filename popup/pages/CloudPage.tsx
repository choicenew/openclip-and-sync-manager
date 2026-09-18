import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import {
  IconBrandGoogleDrive,
  IconBrandOnedrive,
  IconCloudUpload,
  IconDatabase,
  IconGlobe,
  IconRefresh,
  IconServer,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";

import {
  getSyncSettings,
  getSyncStatus,
  setSyncSettings,
  type SyncSettings,
  type SyncStatus,
} from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import { lightOrDark } from "~utils/sx";

import { EntryList } from "../components/EntryList";
import { NoEntriesOverlay } from "../components/NoEntriesOverlay";
import { entriesAtom, entryIdToTagsAtom, searchAtom } from "../states/atoms";

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
  const search = useAtomValue(searchAtom);
  const entries = useAtomValue(entriesAtom) || [];
  const entryIdToTags = useAtomValue(entryIdToTagsAtom) || {};

  const [syncSettings, setSyncSettingsState] = useState<SyncSettings | null>(null);
  const [syncStatus, setSyncStatusState] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const filteredEntries = useMemo(() => {
    const reversed = [...entries].reverse();
    return reversed.filter(
      (entry) =>
        search.length === 0 ||
        entry.content.toLowerCase().includes(search.toLowerCase()) ||
        entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase())),
    );
  }, [entries, search, entryIdToTags]);

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

  const hasAnyEnabled =
    syncSettings?.enableChromeSync ||
    syncSettings?.enableWebdav ||
    syncSettings?.enableOneDrive ||
    syncSettings?.enableGoogleDrive ||
    syncSettings?.enableGist ||
    syncSettings?.enableS3 ||
    syncSettings?.enableCustomRest;

  return (
    <Stack spacing="xs" sx={{ flex: 1, minHeight: 0 }}>
      {/* 1. 顶部：专属于云端 Backend 同步节点与状态看板 */}
      <Card p="xs" radius="md" withBorder bg={lightOrDark(theme, "gray.0", "dark.7")}>
        <Stack spacing={8}>
          <Group position="apart" align="center">
            <Group spacing="xs">
              <IconCloudUpload size="1.1rem" color={theme.colors.indigo[6]} />
              <Text fw={600} fz="xs">
                云端同步 Backend 节点看板（支持多节点并行多选）
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
            {/* 1.1 Chrome Sync */}
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

            {/* 1.2 WebDAV */}
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

            {/* 1.3 OneDrive */}
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

            {/* 1.4 Google Drive */}
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

            {/* 1.5 GitHub Gist */}
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

            {/* 1.6 AWS S3 / MinIO */}
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

      {/* 2. 下部：从云端同步合并的多端剪贴板数据 Feed 列表 */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <EntryList
          noEntriesOverlay={
            !hasAnyEnabled ? (
              <Stack align="center" spacing="sm" p="xl">
                <IconCloudUpload size="2.5rem" color={theme.colors.gray[5]} />
                <Title order={5}>尚未开启云端同步</Title>
                <Text size="sm" color="dimmed" align="center" maw={380}>
                  勾选上方任一云同步节点（或在设置中配置账号），即可实现多端自动双向同步。
                </Text>
              </Stack>
            ) : search.length === 0 ? (
              <NoEntriesOverlay
                title="暂无同步条目"
                subtitle="所有本地复制的内容均已自动纳入多端同步池中"
                description="剪贴板数据会自动在所有开启的云端存储中进行双向合并"
              />
            ) : (
              <NoEntriesOverlay title={`未找到包含 "${search}" 的条目`} />
            )
          }
          entries={filteredEntries}
        />
      </Box>
    </Stack>
  );
};
