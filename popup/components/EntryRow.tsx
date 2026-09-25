import { modals } from "@mantine/modals";
import { useAtomValue } from "jotai";
import React from "react";

import { useCopyEntry } from "~popup/hooks/useCopyEntry";
import { useNow } from "~popup/hooks/useNow";
import {
  clipboardSnapshotAtom,
  commandsAtom,
  entryCommandsAtom,
  entryIdToTagsAtom,
  pinnedEntryIdsAtom,
  settingsAtom,
} from "~popup/states/atoms";
import type { Entry } from "~types/entry";
import { badgeDateFormatter } from "~utils/date";
import { getEntryTimestamp } from "~utils/entries";

import { EntryDeleteAction } from "./EntryDeleteAction";
import { EntryEditAction } from "./EntryEditAction";
import { EntryFavoriteAction } from "./EntryFavoriteAction";
import { EntryPinAction } from "./EntryPinAction";
import { EditEntryModalContent } from "./modals/EditEntryModalContent";
import { TagBadge } from "./TagBadge";
import { TagSelect } from "./TagSelect";

interface Props {
  entry: Entry;
  selectedEntryIds: Set<string>;
  isKeyboardSelected: boolean;
}

export const EntryRow: React.FC<Props> = ({ entry, selectedEntryIds, isKeyboardSelected }) => {
  const now = useNow();
  const settings = useAtomValue(settingsAtom);
  const entryIdToTags = useAtomValue(entryIdToTagsAtom) || {};
  const entryCommands = useAtomValue(entryCommandsAtom);
  const commands = useAtomValue(commandsAtom);
  const clipboardSnapshot = useAtomValue(clipboardSnapshotAtom);
  const copyEntry = useCopyEntry();
  const pinnedEntryIds = useAtomValue(pinnedEntryIdsAtom) || [];
  const isPinned = pinnedEntryIds.includes(entry.id);

  const isSelected = selectedEntryIds.has(entry.id);
  const isCurrentCopied = entry.content === clipboardSnapshot?.content;

  const handleOpenEdit = () => {
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <EditEntryModalContent entry={entry} />,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "32px",
        padding: "0 10px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: isSelected
          ? "rgba(79, 70, 229, 0.15)"
          : isKeyboardSelected
          ? "rgba(0, 0, 0, 0.05)"
          : isPinned
          ? "rgba(99, 102, 241, 0.05)"
          : "transparent",
        borderLeft: isPinned ? "3px solid var(--primary-color)" : isKeyboardSelected ? "3px solid #6366f1" : "none",
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => copyEntry(entry)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleOpenEdit();
      }}
      title="单击复制，双击编辑">
      {/* 选中 Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {
          if (isSelected) {
            selectedEntryIds.delete(entry.id);
          } else {
            selectedEntryIds.add(entry.id);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ marginRight: "8px" }}
      />

      {/* Badge 时间/置顶指示 */}
      <span
        className={`native-badge ${
          isPinned
            ? "native-badge-purple"
            : isCurrentCopied
            ? "native-badge-green"
            : ""
        }`}
        style={{ width: "80px", textAlign: "center", marginRight: "8px", flexShrink: 0 }}>
        {isPinned
          ? "📌 置顶"
          : isCurrentCopied
          ? "已复制"
          : badgeDateFormatter(now, new Date(getEntryTimestamp(entry, settings)))}
      </span>

      {/* 剪贴板文本预览 */}
      <span
        style={{
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "12px",
          minWidth: 0,
        }}>
        {entry.content.slice(0, 500)}
      </span>

      {/* 标签与字符数 */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
        {entryIdToTags[entry.id]?.slice().sort().map((tag) => (
          <TagBadge key={tag} tag={tag} />
        ))}
        <span style={{ fontSize: "10px", color: "var(--text-dimmed)", fontFamily: "monospace" }}>
          {entry.content.length}字
        </span>
      </div>

      {/* 快捷操作区 */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "8px", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}>
        <TagSelect entryId={entry.id} />
        <EntryEditAction entry={entry} />
        <EntryPinAction entryId={entry.id} />
        <EntryFavoriteAction entryId={entry.id} />
        <EntryDeleteAction entryId={entry.id} />
      </div>
    </div>
  );
};
