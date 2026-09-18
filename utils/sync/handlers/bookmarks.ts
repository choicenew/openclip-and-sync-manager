/**
 * utils/sync/handlers/bookmarks.ts
 * 浏览器书签树读取、双向合并与局部增删同步处理模块
 */

export interface SyncBookmark {
  id: string;
  parentId: string | null;
  title: string;
  url?: string;
  dateAdded: number;
  children?: SyncBookmark[];
  _deleted?: boolean;
}

export interface BookmarkTombstone {
  url: string;
  deletedAt: number;
}

export interface BookmarkPayload {
  tree: SyncBookmark[];
  tombstones: BookmarkTombstone[];
}

type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;

function mapNode(node: BookmarkTreeNode): SyncBookmark {
  return {
    id: node.id,
    parentId: node.parentId ?? null,
    title: node.title,
    url: node.url,
    dateAdded: node.dateAdded ?? 0,
    children: node.children?.map(mapNode),
  };
}

/** 导出本地完整书签树 */
export async function exportBookmarksTree(): Promise<SyncBookmark[]> {
  if (typeof chrome === "undefined" || !chrome.bookmarks) return [];
  try {
    const tree = await chrome.bookmarks.getTree();
    return tree.map(mapNode);
  } catch (err) {
    console.warn("[BookmarksHandler] Failed to export bookmarks:", err);
    return [];
  }
}

/** 获取并提取书签节点中的所有 URL 与标题 map */
export function extractBookmarkUrls(nodes: SyncBookmark[]): Map<string, { title: string; url: string }> {
  const map = new Map<string, { title: string; url: string }>();
  function walk(items: SyncBookmark[]) {
    for (const item of items) {
      if (item.url) {
        map.set(item.url, { title: item.title, url: item.url });
      }
      if (item.children?.length) {
        walk(item.children);
      }
    }
  }
  walk(nodes);
  return map;
}

/** 检查并创建缺少的数据项到本地书签“其他书签”或指定目录下 */
export async function importBookmarkUrls(urls: { title: string; url: string }[]): Promise<number> {
  if (typeof chrome === "undefined" || !chrome.bookmarks) return 0;
  let addedCount = 0;
  try {
    const localTree = await chrome.bookmarks.getTree();
    const localUrls = extractBookmarkUrls(localTree.map(mapNode));

    for (const item of urls) {
      if (!localUrls.has(item.url)) {
        await chrome.bookmarks.create({
          title: item.title || item.url,
          url: item.url,
        });
        addedCount++;
      }
    }
  } catch (err) {
    console.warn("[BookmarksHandler] Error importing bookmark URLs:", err);
  }
  return addedCount;
}

/** 递归将云端整棵书签树及文件夹层级合并写入本地原生浏览器书签树 */
export async function importBookmarksTree(
  remoteNodes: SyncBookmark[],
  targetParentId: string = "2",
): Promise<number> {
  if (typeof chrome === "undefined" || !chrome.bookmarks) return 0;
  let importedCount = 0;

  try {
    const localTree = await chrome.bookmarks.getTree();
    const localUrls = extractBookmarkUrls(localTree.map(mapNode));

    async function walkAndCreate(nodes: SyncBookmark[], currentParentId: string) {
      for (const node of nodes) {
        if (!node) continue;
        // 根目录 0 / 1 / 2 / 3 节点递归处理其子元素
        if (node.id === "0" || node.id === "1" || node.id === "2" || node.id === "3") {
          if (node.children?.length) {
            await walkAndCreate(node.children, node.id === "0" ? currentParentId : node.id);
          }
          continue;
        }

        // 叶子书签节点 (有 URL)
        if (node.url) {
          if (!localUrls.has(node.url)) {
            await chrome.bookmarks.create({
              parentId: currentParentId,
              title: node.title || node.url,
              url: node.url,
            });
            localUrls.set(node.url, { title: node.title, url: node.url });
            importedCount++;
          }
        }
        // 文件夹节点 (无 URL, 有目录名)
        else if (node.title) {
          let folderId = currentParentId;
          try {
            const children = await chrome.bookmarks.getChildren(currentParentId);
            const existingFolder = children.find((c) => !c.url && c.title === node.title);
            if (existingFolder) {
              folderId = existingFolder.id;
            } else {
              const newFolder = await chrome.bookmarks.create({
                parentId: currentParentId,
                title: node.title,
              });
              folderId = newFolder.id;
            }
          } catch (e) {
            // 回退到默认父级
          }

          if (node.children?.length) {
            await walkAndCreate(node.children, folderId);
          }
        }
      }
    }

    await walkAndCreate(remoteNodes, targetParentId);
  } catch (err) {
    console.warn("[BookmarksHandler] Failed to import bookmarks tree:", err);
  }

  return importedCount;
}

/** 自动将云端拉取到的远程书签合并写入本机浏览器书签树 */
export async function syncRemoteBookmarksToLocal(remoteBookmarks: SyncBookmark[]): Promise<number> {
  if (!remoteBookmarks || remoteBookmarks.length === 0) return 0;
  return await importBookmarksTree(remoteBookmarks);
}
