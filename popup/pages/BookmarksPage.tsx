import { ActionIcon, Badge, Button, Card, Group, ScrollArea, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBookmark, IconCloudDownload, IconCloudUpload, IconCopy, IconExternalLink, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { exportBookmarksTree, extractBookmarkUrls, type SyncBookmark } from "~utils/sync/handlers/bookmarks";
import { runFullSync } from "~utils/sync/engine";

export const BookmarksPage = ({ searchQuery }: { searchQuery: string }) => {
  const [bookmarks, setBookmarks] = useState<{ title: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterText, setFilterText] = useState("");

  const loadBookmarks = async () => {
    setLoading(true);
    const tree = await exportBookmarksTree();
    const map = extractBookmarkUrls(tree);
    setBookmarks(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handlePullRemoteBookmarks = async () => {
    setSyncing(true);
    const res = await runFullSync();
    await loadBookmarks();
    setSyncing(false);
    notifications.show({
      title: res.success ? "书签拉取合并成功" : "同步提示",
      message: res.success ? "已成功从云端拉取远程书签并合并写入本机浏览器！" : res.message,
      color: res.success ? "teal" : "red",
    });
  };

  const handlePushLocalBookmarks = async () => {
    setSyncing(true);
    const res = await runFullSync();
    setSyncing(false);
    notifications.show({
      title: res.success ? "书签推送成功" : "推送提示",
      message: res.success ? "已成功将本机最新书签更新打包推送至云端！" : res.message,
      color: res.success ? "teal" : "red",
    });
  };

  const query = (searchQuery || filterText).toLowerCase().trim();
  const filtered = bookmarks.filter(
    (b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query),
  );

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <Stack spacing="xs" p="xs" style={{ flex: 1, minHeight: 0 }}>
      <Group position="apart">
        <TextInput
          placeholder="搜索书签..."
          icon={<IconSearch size={16} />}
          value={filterText}
          onChange={(e) => setFilterText(e.currentTarget.value)}
          size="xs"
          style={{ flex: 1 }}
        />
        <Group spacing={6}>
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftIcon={<IconCloudDownload size={14} />}
            loading={syncing}
            onClick={handlePullRemoteBookmarks}
          >
            📥 拉取云端书签
          </Button>
          <Button
            size="xs"
            variant="outline"
            color="blue"
            leftIcon={<IconCloudUpload size={14} />}
            loading={syncing}
            onClick={handlePushLocalBookmarks}
          >
            📤 推送本机书签
          </Button>
          <Button size="xs" variant="subtle" leftIcon={<IconRefresh size={14} />} loading={loading} onClick={loadBookmarks}>
            刷新
          </Button>
        </Group>
      </Group>

      <ScrollArea style={{ flex: 1 }}>
        <Stack spacing="xs">
          {filtered.length === 0 ? (
            <Text size="sm" color="dimmed" align="center" py="xl">
              {loading ? "正在加载书签..." : "未找到匹配的书签"}
            </Text>
          ) : (
            filtered.map((item, idx) => (
              <Card key={idx} p="xs" withBorder shadow="none" radius="md">
                <Group position="apart" noWrap>
                  <Stack spacing={2} style={{ overflow: "hidden", flex: 1 }}>
                    <Group spacing="xs">
                      <IconBookmark size={14} color="#4C6EF5" />
                      <Text size="sm" weight={500} truncate style={{ flex: 1 }}>
                        {item.title || item.url}
                      </Text>
                    </Group>
                    <Text size="xs" color="dimmed" truncate>
                      {item.url}
                    </Text>
                  </Stack>
                  <Group spacing={4} noWrap>
                    <Tooltip label="复制 URL">
                      <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => handleCopy(item.url)}>
                        <IconCopy size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="在新标签页打开">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        component="a"
                        href={item.url}
                        target="_blank"
                      >
                        <IconExternalLink size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
};
