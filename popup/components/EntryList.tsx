import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAtom } from "jotai";
import React, { useEffect, useMemo, type ReactNode } from "react";

import { useEntryListNavigation } from "~popup/hooks/useEntryListNavigation";
import { useSet } from "~popup/hooks/useSet";
import {
  favoriteEntryIdsAtom,
  pinnedEntryIdsAtom,
  searchAtom,
  settingsAtom,
} from "~popup/states/atoms";
import { handleMutation } from "~popup/utils/mutation";
import { addFavoriteEntryIds, deleteFavoriteEntryIds } from "~storage/favoriteEntryIds";
import { addPinnedEntryIds, deletePinnedEntryIds } from "~storage/pinnedEntryIds";
import { setSettings } from "~storage/settings";
import { addTagToEntry } from "~storage/entryIdToTags";
import type { Entry } from "~types/entry";
import { _setEntries, deleteEntries } from "~utils/storage";

import { EntryRow } from "./EntryRow";
import { KeyboardHint } from "./KeyboardHint";

interface Props {
  entries: Entry[];
  noEntriesOverlay: ReactNode;
}

const SortableEntryRow = ({
  entry,
  selectedEntryIds,
  isKeyboardSelected,
}: {
  entry: Entry;
  selectedEntryIds: Set<string>;
  isKeyboardSelected: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: entry.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 99 : 1,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <EntryRow
        entry={entry}
        selectedEntryIds={selectedEntryIds}
        isKeyboardSelected={isKeyboardSelected}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

export const EntryList: React.FC<Props> = ({ entries = [], noEntriesOverlay }) => {
  const safeEntries = entries || [];
  const [favoriteEntryIds] = useAtom(favoriteEntryIdsAtom);
  const favoriteEntryIdsSet = new Set<string>(favoriteEntryIds || []);
  const [pinnedEntryIds] = useAtom(pinnedEntryIdsAtom);
  const pinnedEntryIdsSet = new Set<string>(pinnedEntryIds || []);
  const [search] = useAtom(searchAtom);
  const [settings, setSettingsState] = useAtom(settingsAtom);
  const { listRef, selectedEntryIndex } = useEntryListNavigation(safeEntries);

  const selectedEntryIds = useSet<string>();
  const entryIdsStringified = useMemo(() => JSON.stringify(safeEntries.map(({ id }) => id)), [safeEntries]);

  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const activeDragEntry = useMemo(
    () => safeEntries.find((e) => e.id === activeDragId),
    [safeEntries, activeDragId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over) {
      const overId = String(over.id);
      // 支持将卡片直接拖拽释放至 Tag 标签上完成打标
      if (overId.startsWith("tag_")) {
        const tagName = overId.replace("tag_", "");
        await addTagToEntry(String(active.id), tagName);
        return;
      }

      if (active.id !== over.id) {
        const oldIndex = safeEntries.findIndex((e) => e.id === active.id);
        const newIndex = safeEntries.findIndex((e) => e.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const nextEntries = arrayMove(safeEntries, oldIndex, newIndex);
          await _setEntries(nextEntries);
        }
      }
    }
  };

  useEffect(() => {
    selectedEntryIds.clear();
  }, [entryIdsStringified]);

  const handleBatchDelete = () => {
    if (selectedEntryIds.size === 0) return;
    if (window.confirm(`确定要彻底删除选中的 ${selectedEntryIds.size} 条记录吗？`)) {
      handleMutation(() =>
        deleteEntries(
          Array.from(selectedEntryIds).filter(
            (selectedEntryId) => !favoriteEntryIdsSet.has(selectedEntryId),
          ),
        ),
      )();
      selectedEntryIds.clear();
    }
  };

  const handleBatchCopy = () => {
    if (selectedEntryIds.size === 0) return;
    const selectedEntries = safeEntries.filter((e) => selectedEntryIds.has(e.id));
    const combinedText = selectedEntries.map((e) => e.content).join("\n\n");
    navigator.clipboard.writeText(combinedText);
  };

  const handleToggleSortOrder = async () => {
    const nextOrder =
      settings.sortOrder === "desc"
        ? "asc"
        : settings.sortOrder === "asc"
        ? "custom"
        : "desc";
    const updated = { ...settings, sortOrder: nextOrder };
    setSettingsState(updated);
    await setSettings(updated);
  };

  return (
    <div
      className="native-card"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}>
      {/* 顶部工具栏 Toolbar */}
      <div
        className="flex-between"
        style={{
          height: "32px",
          padding: "0 10px",
          borderBottom: "1px solid var(--border-color)",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 4px 4px 0",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (selectedEntryIds.size === 0) {
                safeEntries.forEach((entry) => selectedEntryIds.add(entry.id));
              } else {
                selectedEntryIds.clear();
              }
            }}>
            <input
              type="checkbox"
              checked={selectedEntryIds.size > 0 && selectedEntryIds.size === safeEntries.length}
              onChange={() => {}}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer",
                accentColor: "var(--primary-color, #6366f1)",
              }}
            />
          </div>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedEntryIds.size === 0}
            title="一键批量复制所选条目的文本内容"
            onClick={handleBatchCopy}>
            📋 批量复制
          </button>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedEntryIds.size === 0}
            title="固定 / 解除固定"
            onClick={handleMutation(() =>
              Array.from(selectedEntryIds).every((selectedEntryId) =>
                pinnedEntryIdsSet.has(selectedEntryId),
              )
                ? deletePinnedEntryIds(Array.from(selectedEntryIds))
                : addPinnedEntryIds(Array.from(selectedEntryIds)),
            )}>
            📌 固定
          </button>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            disabled={selectedEntryIds.size === 0}
            title="收藏 / 移出收藏"
            onClick={handleMutation(() =>
              Array.from(selectedEntryIds).every((selectedEntryId) =>
                favoriteEntryIdsSet.has(selectedEntryId),
              )
                ? deleteFavoriteEntryIds(Array.from(selectedEntryIds))
                : addFavoriteEntryIds(Array.from(selectedEntryIds)),
            )}>
            ⭐ 收藏
          </button>

          <button
            className="native-btn native-btn-sm"
            style={{ backgroundColor: "#ef4444" }}
            disabled={selectedEntryIds.size === 0}
            title="批量彻底删除"
            onClick={handleBatchDelete}>
            🗑️ 删除
          </button>

          {/* 自由选择正序 / 倒序 / 手动固定序排列按钮 */}
          <button
            className="native-btn native-btn-sm native-btn-subtle"
            title="点击一键切换：最新在前(降序) / 最旧在前(升序) / 手动固定序(拖拽自定义)"
            onClick={handleToggleSortOrder}>
            {settings.sortOrder === "asc"
              ? "⇅ 最旧在前(升序)"
              : settings.sortOrder === "custom"
              ? "🖐️ 手动固定序"
              : "⇅ 最新在前(降序)"}
          </button>
        </div>

        <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>
          已选 {selectedEntryIds.size} / 共 {safeEntries.length} 条
        </div>
      </div>

      {/* 主列表滚动区域 */}
      <div style={{ flex: 1, position: "relative", overflowY: "auto" }}>
        {safeEntries.length === 0 ? (
          noEntriesOverlay
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}>
            <SortableContext items={safeEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {safeEntries.map((entry, index) => (
                  <SortableEntryRow
                    key={entry.id}
                    entry={entry}
                    selectedEntryIds={selectedEntryIds}
                    isKeyboardSelected={index === selectedEntryIndex}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragEntry ? (
                <div
                  style={{
                    backgroundColor: "var(--card-bg, #ffffff)",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                    borderRadius: "6px",
                    border: "1px solid var(--primary-color, #6366f1)",
                  }}>
                  <EntryRow entry={activeDragEntry} selectedEntryIds={selectedEntryIds} isKeyboardSelected={false} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* 底部按键提示面板 */}
      {(safeEntries.length > 0 || search.length > 0) && (
        <div
          className="flex-between"
          style={{
            padding: "4px 10px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            fontSize: "11px",
          }}>
          {safeEntries.length > 0 && (
            <div style={{ display: "flex", gap: "10px" }}>
              <KeyboardHint keys={["↑", "↓"]} label="选择" />
              <KeyboardHint keys={["↵"]} label="复制" />
            </div>
          )}
          {search.length > 0 && <KeyboardHint keys={["Esc"]} label="清空搜索" />}
        </div>
      )}
    </div>
  );
};
