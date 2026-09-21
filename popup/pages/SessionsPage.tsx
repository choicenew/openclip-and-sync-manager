import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Image,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconChevronDown,
  IconChevronRight,
  IconCloudDownload,
  IconCloudUpload,
  IconDeviceDesktop,
  IconExternalLink,
  IconGlobe,
  IconPencil,
  IconRefresh,
  IconTrash,
  IconWorldUpload,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  getSyncedSessions,
  setSyncedSessions as saveSyncedSessions,
  updateSessionLabel,
} from "~storage/syncedSessions";
import { getSyncSettings } from "~storage/syncSettings";
import { runFullSync } from "~utils/sync/engine";
import {
  exportCurrentTabs,
  openSessionTabs,
  type SyncSession,
  type SyncTab,
} from "~utils/sync/handlers/sessions";
import { lightOrDark } from "~utils/sx";

interface Props {
  searchQuery?: string;
}

const getGroupMantineColor = (color?: string): string => {
  switch (color) {
    case "blue":
      return "blue";
    case "red":
      return "red";
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "purple":
      return "grape";
    case "cyan":
      return "cyan";
    case "pink":
      return "pink";
    case "orange":
      return "orange";
    default:
      return "gray";
  }
};

export const SessionsPage = ({ searchQuery = "" }: Props) => {
  const theme = useMantineTheme();
  const [localTabs, setLocalTabs] = useState<SyncTab[]>([]);
  const [syncedSessions, setSyncedSessionsState] = useState<SyncSession[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 重命名 Modal 状态
  const [editingSession, setEditingSession] = useState<SyncSession | null>(null);
  const [newSessionLabel, setNewSessionLabel] = useState("");

  // 折叠状态 Map：sessionId -> boolean (true 为展开)
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({
    local_current: true, // 默认展开本机会话
  });

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const loadData = async () => {
    setLoading(true);
    const [tabs, syncSet, remoteSessions] = await Promise.all([
      exportCurrentTabs(),
      getSyncSettings(),
      getSyncedSessions(),
    ]);
    setLocalTabs(tabs);
    setCurrentDeviceId(syncSet.deviceId || "");

    const localSession: SyncSession = {
      id: "local_current",
      deviceId: syncSet.deviceId || "local",
      deviceName: `${syncSet.deviceName || "此电脑"} (本机当前视窗)`,
      savedAt: new Date().toISOString(),
      label: "当前活跃网页标签页",
      tabs,
    };

    const sessionMap = new Map<string, SyncSession>();
    sessionMap.set(localSession.id, localSession);
    for (const s of remoteSessions) {
      if (s && s.id && s.id !== "local_current" && s.tabs?.length > 0) {
        sessionMap.set(s.id, s);
      }
    }

    setSyncedSessionsState(Array.from(sessionMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePullSessions = async () => {
    setSyncing(true);
    const res = await runFullSync();
    await loadData();
    setSyncing(false);
    notifications.show({
      title: res.success ? "会话拉取成功" : "同步提示",
      message: res.success ? "已成功拉取云端多设备会话 Section 卡片！" : res.message,
      color: res.success ? "teal" : "red",
    });
  };

  const handlePushSessions = async () => {
    setSyncing(true);
    const res = await runFullSync();
    setSyncing(false);
    notifications.show({
      title: res.success ? "会话推送成功" : "推送提示",
      message: res.success ? "已成功推送本机会话至云端 Section！" : res.message,
      color: res.success ? "teal" : "red",
    });
  };

  const handleOpenTab = (url: string) => {
    chrome.tabs.create({ url });
  };

  const handleOpenAllTabs = (tabs: SyncTab[], inNewWindow = true) => {
    openSessionTabs(tabs, inNewWindow);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessionId === "local_current") return;
    const remaining = syncedSessions.filter((s) => s.id !== sessionId);
    setSyncedSessionsState(remaining);
    await saveSyncedSessions(remaining.filter((s) => s.id !== "local_current"));
    notifications.show({
      title: "会话已移除",
      message: "该会话区段 Section 已从本地缓存删除",
      color: "gray",
    });
  };

  const handleOpenRenameModal = (session: SyncSession) => {
    setEditingSession(session);
    setNewSessionLabel(session.label || session.deviceName);
  };

  const handleSaveRename = async () => {
    if (!editingSession) return;
    await updateSessionLabel(editingSession.id, newSessionLabel);
    setEditingSession(null);
    await loadData();
    notifications.show({
      title: "重命名成功",
      message: "已更新会话区段卡片的名称标识",
      color: "teal",
    });
  };

  // 过滤处理：匹配搜索词的标签页或会话卡片
  const filterSessions = (sessions: SyncSession[]) => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions
      .map((s) => {
        const matchingTabs = s.tabs.filter(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.url.toLowerCase().includes(q) ||
            t.groupTitle?.toLowerCase().includes(q),
        );
        const nameMatches =
          s.deviceName.toLowerCase().includes(q) || (s.label && s.label.toLowerCase().includes(q));
        if (nameMatches) return s;
        if (matchingTabs.length > 0) return { ...s, tabs: matchingTabs };
        return null;
      })
      .filter((s): s is SyncSession => s !== null);
  };

  const visibleSessions = filterSessions(syncedSessions);

  return (
    <Stack spacing="xs" p="xs" sx={{ flex: 1, minHeight: 0 }}>
      {/* 重命名 Modal 弹窗 */}
      <Modal
        opened={!!editingSession}
        onClose={() => setEditingSession(null)}
        title="重命名会话区段 (Rename Session Section)"
        size="sm"
        centered
      >
        <Stack spacing="md">
          <TextInput
            label="自定义会话卡片名称"
            placeholder="例如: 2026工作标签组 / 研发备忘录"
            value={newSessionLabel}
            onChange={(e) => setNewSessionLabel(e.target.value)}
            autoFocus
          />
          <Group position="right">
            <Button variant="default" size="xs" onClick={() => setEditingSession(null)}>
              取消
            </Button>
            <Button color="cyan" size="xs" onClick={handleSaveRename}>
              保存新名称
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 顶部标题与手动刷新 */}
      <Group position="apart" align="center">
        <Group spacing="xs">
          <IconGlobe size="1.1rem" color={theme.colors.cyan[6]} />
          <Text size="xs" fw={600}>
            多端会话区段 (Synced Session Sections)
          </Text>
        </Group>
        <Group spacing={6}>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftIcon={<IconCloudDownload size={14} />}
            loading={syncing}
            onClick={handlePullSessions}
          >
            📥 拉取云端会话
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="cyan"
            leftIcon={<IconCloudUpload size={14} />}
            loading={syncing}
            onClick={handlePushSessions}
          >
            📤 推送本机会话
          </Button>
          <Button
            size="xs"
            variant="subtle"
            leftIcon={<IconRefresh size={14} />}
            loading={loading}
            onClick={loadData}
          >
            刷新
          </Button>
        </Group>
      </Group>

      {/* 本机打开的标签页汇总指示 */}
      <Card p="xs" radius="md" withBorder bg={lightOrDark(theme, "cyan.0", "dark.6")}>
        <Group position="apart" align="center">
          <Group spacing="xs">
            <IconDeviceDesktop size={18} color={theme.colors.cyan[7]} />
            <Stack spacing={0}>
              <Text size="xs" fw={600}>
                本机正打开 {localTabs.length} 个标签页
              </Text>
              <Text size="11px" color="dimmed">
                支持跨端自动/手动同步 Tab Groups (颜色、名称、折叠状态)
              </Text>
            </Stack>
          </Group>
          <Button
            size="xs"
            variant="filled"
            color="cyan"
            leftIcon={<IconWorldUpload size={14} />}
            onClick={() => handleOpenAllTabs(localTabs, true)}
          >
            新窗口批量还原 ({localTabs.length})
          </Button>
        </Group>
      </Card>

      {/* 跨端 Session 区段 (Section Cards) 滚动卡片列表 */}
      <ScrollArea sx={{ flex: 1 }}>
        <Stack spacing="xs">
          {visibleSessions.length === 0 ? (
            <Text size="xs" color="dimmed" align="center" py="xl">
              {searchQuery ? `未找到匹配 "${searchQuery}" 的会话 Section` : "暂无任何设备会话卡片"}
            </Text>
          ) : (
            visibleSessions.map((session) => {
              const isExpanded = !!expandedSessions[session.id] || !!searchQuery.trim();
              const isLocal = session.id === "local_current";

              // 统计该 Session 中的原生 Tab Groups 标签组
              const groupNames = Array.from(
                new Set(session.tabs.map((t) => t.groupTitle).filter(Boolean)),
              );

              return (
                <Paper
                  key={session.id}
                  p="xs"
                  radius="md"
                  withBorder
                  bg={lightOrDark(
                    theme,
                    isLocal ? "cyan.0" : "gray.0",
                    isLocal ? "dark.6" : "dark.7",
                  )}
                  sx={{
                    borderColor: isLocal ? theme.colors.cyan[5] : undefined,
                  }}
                >
                  <Stack spacing="xs">
                    {/* Section 标头栏 (Header) */}
                    <Group position="apart" align="center" noWrap>
                      <Group
                        spacing="xs"
                        sx={{ cursor: "pointer", flex: 1, overflow: "hidden" }}
                        onClick={() => toggleSessionExpand(session.id)}
                      >
                        <ActionIcon size="xs" variant="subtle" color="cyan">
                          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </ActionIcon>
                        <IconDeviceDesktop
                          size={16}
                          color={isLocal ? theme.colors.cyan[6] : theme.colors.gray[6]}
                        />
                        <Stack spacing={1} sx={{ overflow: "hidden" }}>
                          <Group spacing={6} noWrap>
                            <Text size="xs" fw={600} truncate>
                              {session.deviceName}
                            </Text>
                            {isLocal && (
                              <Badge size="xs" color="cyan" variant="filled">
                                本机
                              </Badge>
                            )}
                            <Tooltip label="手动重命名改名">
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="gray"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRenameModal(session);
                                }}
                              >
                                <IconPencil size={12} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          <Text size="10px" color="dimmed">
                            {session.label || "活跃会话"} ·{" "}
                            {session.savedAt
                              ? new Date(session.savedAt).toLocaleTimeString()
                              : "刚刚"}
                          </Text>
                        </Stack>
                      </Group>

                      {/* 卡片右侧快捷操作按钮 */}
                      <Group spacing={6} noWrap>
                        {groupNames.length > 0 && (
                          <Badge size="xs" variant="outline" color="indigo">
                            📂 {groupNames.length} 标签组
                          </Badge>
                        )}
                        <Badge size="xs" variant="light" color="cyan">
                          {session.tabs.length} 标签
                        </Badge>
                        <Tooltip label="在新窗口全量还原此 Section 会话 (含 Tab Groups)">
                          <Button
                            size="xs"
                            compact
                            variant="light"
                            color="cyan"
                            onClick={() => handleOpenAllTabs(session.tabs, true)}
                          >
                            还原全组
                          </Button>
                        </Tooltip>
                        {!isLocal && (
                          <Tooltip label="删除此云端 Section 记录">
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="subtle"
                              onClick={() => handleDeleteSession(session.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>

                    {/* Section 折叠内容：标签页明细列表 (Tabs List) */}
                    <Collapse in={isExpanded}>
                      <Stack spacing={4} pt={4}>
                        {session.tabs.map((tab, idx) => (
                          <Paper
                            key={`${session.id}_tab_${idx}`}
                            p="xs"
                            radius="xs"
                            withBorder
                            bg={lightOrDark(theme, "white", "dark.5")}
                          >
                            <Group position="apart" align="center" noWrap>
                              <Group spacing="xs" sx={{ overflow: "hidden", flex: 1 }}>
                                {tab.favIconUrl ? (
                                  <Image
                                    src={tab.favIconUrl}
                                    w={14}
                                    h={14}
                                    fit="contain"
                                    withPlaceholder
                                  />
                                ) : (
                                  <IconGlobe size={14} color={theme.colors.gray[5]} />
                                )}
                                <Stack spacing={1} sx={{ overflow: "hidden" }}>
                                  <Group spacing={6} noWrap>
                                    {tab.groupTitle && (
                                      <Badge
                                        size="xs"
                                        variant="filled"
                                        color={getGroupMantineColor(tab.groupColor)}
                                      >
                                        📁 {tab.groupTitle}
                                      </Badge>
                                    )}
                                    <Text size="xs" fw={500} truncate>
                                      {tab.title || tab.url}
                                    </Text>
                                  </Group>
                                  <Text size="10px" color="dimmed" truncate>
                                    {tab.url}
                                  </Text>
                                </Stack>
                              </Group>

                              <Group spacing={4} noWrap>
                                {tab.pinned && (
                                  <Badge size="xs" color="blue" variant="dot">
                                    固定
                                  </Badge>
                                )}
                                <Tooltip label="打开此标签">
                                  <ActionIcon
                                    size="xs"
                                    color="cyan"
                                    onClick={() => handleOpenTab(tab.url)}
                                  >
                                    <IconExternalLink size={12} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    </Collapse>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};
