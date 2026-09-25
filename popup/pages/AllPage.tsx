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

  // 按照用户设置的正序 / 倒序进行自由调序 (最新在前 vs 最旧在前)
  const sortedEntries = [...entries].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id);
    const bPinned = pinnedSet.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const timeDiff = getEntryTimestamp(b, settings) - getEntryTimestamp(a, settings);
    return settings.sortOrder === "asc" ? -timeDiff : timeDiff;
  });

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
