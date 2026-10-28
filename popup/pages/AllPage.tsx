import { useAtomValue } from "jotai";
import React from "react";

import { EntryList } from "~popup/components/EntryList";
import { NoEntriesOverlay } from "~popup/components/NoEntriesOverlay";
import {
  entriesAtom,
  entryIdToTagsAtom,
  pinnedEntryIdsAtom,
  searchAtom,
  settingsAtom,
} from "~popup/states/atoms";
import { getEntryTimestamp } from "~utils/entries";

export const AllPage: React.FC = () => {
  const entries = useAtomValue(entriesAtom) || [];
  const search = useAtomValue(searchAtom);
  const settings = useAtomValue(settingsAtom);
  const entryIdToTags = useAtomValue(entryIdToTagsAtom) || {};
  const pinnedEntryIds = useAtomValue(pinnedEntryIdsAtom) || [];
  const pinnedSet = new Set(pinnedEntryIds);

  // 自然顺序：新复制内容自然置顶；随时按住 ⠿ 拖拽手动调整位置，调整结果直接保存并保留
  const displayEntries = React.useMemo(() => {
    let list = [...entries];

    if (settings.sortOrder === "asc") {
      list.sort((a, b) => {
        const timeDiff = getEntryTimestamp(b, settings) - getEntryTimestamp(a, settings);
        return -timeDiff;
      });
    }

    // 置顶 (Pinned) 项目保持在最上方，其余按自然/拖拽顺序排列
    const pinned = list.filter((e) => pinnedSet.has(e.id));
    const unpinned = list.filter((e) => !pinnedSet.has(e.id));
    return [...pinned, ...unpinned];
  }, [entries, pinnedSet, settings]);

  return (
    <EntryList
      noEntriesOverlay={
        search.length === 0 ? (
          <NoEntriesOverlay
            title="剪贴板历史为空"
            subtitle="在任何地方复制文本即可同步至此"
          />
        ) : (
          <NoEntriesOverlay title={`未找到包含 "${search}" 的记录`} />
        )
      }
      entries={displayEntries.filter(
        (entry) =>
          search.length === 0 ||
          entry.content.toLowerCase().includes(search.toLowerCase()) ||
          entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase())),
      )}
    />
  );
};
