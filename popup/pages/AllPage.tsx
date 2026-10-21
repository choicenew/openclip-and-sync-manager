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

  // 支持最新在前 (降序) / 最旧在前 (升序) / 手动拖拽固定序 (custom)
  const sortedEntries = React.useMemo(() => {
    if (settings.sortOrder === "custom") {
      return [...entries].sort((a, b) => {
        const aPinned = pinnedSet.has(a.id);
        const bPinned = pinnedSet.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0; // 保持自定义拖拽顺序
      });
    }

    return [...entries].sort((a, b) => {
      const aPinned = pinnedSet.has(a.id);
      const bPinned = pinnedSet.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const timeDiff = getEntryTimestamp(b, settings) - getEntryTimestamp(a, settings);
      return settings.sortOrder === "asc" ? -timeDiff : timeDiff;
    });
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
      entries={sortedEntries.filter(
        (entry) =>
          search.length === 0 ||
          entry.content.toLowerCase().includes(search.toLowerCase()) ||
          entryIdToTags[entry.id]?.some((tag) => tag.includes(search.toLowerCase())),
      )}
    />
  );
};
