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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { classifyEntryContent } from "~utils/entryClassifier";
import { isSensitiveContent, maskSensitiveContent } from "~utils/entryMasking";
import { analyzeContent } from "~utils/contentPreview";
import { ImagePreviewModalContent } from "./modals/ImagePreviewModalContent";
import { JsonFormattedModalContent } from "./modals/JsonFormattedModalContent";
import { QRCodeModalContent } from "./modals/QRCodeModalContent";

interface Props {
  entry: Entry;
  index: number;
  selectedEntryIds: Set<string>;
  isKeyboardSelected: boolean;
  isDragging?: boolean;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
}

export const EntryRow: React.FC<Props> = ({
  entry,
  index,
  selectedEntryIds,
  isKeyboardSelected,
  isDragging = false,
  onHandlePointerDown,
}) => {
  const now = useNow();
  const settings = useAtomValue(settingsAtom);
  const entryIdToTags = useAtomValue(entryIdToTagsAtom) || {};
  const entryCommands = useAtomValue(entryCommandsAtom);
  const commands = useAtomValue(commandsAtom);
  const clipboardSnapshot = useAtomValue(clipboardSnapshotAtom);
  const copyEntry = useCopyEntry();
  const pinnedEntryIds = useAtomValue(pinnedEntryIdsAtom) || [];
  const isPinned = pinnedEntryIds.includes(entry.id);

  const [isUnmasked, setIsUnmasked] = React.useState(false);

  const isSelected = selectedEntryIds.has(entry.id);
  const isCurrentCopied = entry.content === clipboardSnapshot?.content;

  const isSensitive = isSensitiveContent(entry.content);
  const displayContent = React.useMemo(() => {
    if (settings.autoMaskSensitiveData && isSensitive && !isUnmasked) {
      return maskSensitiveContent(entry.content);
    }
    return entry.content;
  }, [entry.content, settings.autoMaskSensitiveData, isSensitive, isUnmasked]);

  const autoTags = React.useMemo(() => {
    if (!settings.autoClassifyEntries) return [];
    return classifyEntryContent(entry.content);
  }, [entry.content, settings.autoClassifyEntries]);

  const contentAnalysis = React.useMemo(() => analyzeContent(entry.content), [entry.content]);

  const handleOpenEdit = () => {
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <EditEntryModalContent entry={entry} />,
    });
  };

  const handleOpenImagePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentAnalysis.imageUrl) return;
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <ImagePreviewModalContent imageUrl={contentAnalysis.imageUrl} />,
    });
  };

  const handleOpenJsonFormatted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!contentAnalysis.formattedJson) return;
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <JsonFormattedModalContent formattedJson={contentAnalysis.formattedJson} />,
    });
  };

  const handleOpenQRCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    modals.open({
      withCloseButton: false,
      padding: 0,
      children: <QRCodeModalContent url={entry.content.trim()} />,
    });
  };

  const handleHTML5DragStart = (e: React.DragEvent) => {
    if (entry.content) {
      e.dataTransfer.setData("text/plain", entry.content);
      const encoded = encodeURIComponent(entry.content);
      const mime = "text/markdown";
      const filename = `openclip-${entry.id.slice(0, 8)}.md`;
      e.dataTransfer.setData("DownloadURL", `${mime}:${filename}:data:${mime};charset=utf-8,${encoded}`);
    }
  };

  return (
    <div
      data-entry-index={index}
      style={{
        display: "flex",
        alignItems: "center",
        height: "32px",
        padding: "0 10px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: isDragging
          ? "rgba(99, 102, 241, 0.25)"
          : isSelected
          ? "rgba(79, 70, 229, 0.15)"
          : isKeyboardSelected
          ? "rgba(0, 0, 0, 0.05)"
          : isPinned
          ? "rgba(99, 102, 241, 0.05)"
          : "transparent",
        borderLeft: isPinned ? "3px solid var(--primary-color)" : isKeyboardSelected ? "3px solid #6366f1" : "none",
        cursor: isDragging ? "grabbing" : "pointer",
        userSelect: "none",
        transition: "background-color 0.15s ease",
      }}
      onClick={() => copyEntry(entry)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleOpenEdit();
      }}
      title="单击复制，双击编辑，按住左侧 ⠿ 图标上下拖拽重排">
      {/* 拖拽手柄 Drag Handle (原生 Pointer Capture 极致响应) */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onHandlePointerDown?.(e);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1px 6px 1px 0",
          cursor: "grab",
          color: isDragging ? "#4f46e5" : "var(--text-dimmed, #64748b)",
          fontSize: "14px",
          fontWeight: 700,
          userSelect: "none",
          touchAction: "none",
          borderRadius: "4px",
        }}
        title="按住此手柄直接上下拖拽重排">
        ⠿
      </div>

      {/* 选中 Checkbox */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 8px 4px 0",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isSelected) {
            selectedEntryIds.delete(entry.id);
          } else {
            selectedEntryIds.add(entry.id);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
        }}>
        <input
          type="checkbox"
          checked={isSelected}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            if (isSelected) {
              selectedEntryIds.delete(entry.id);
            } else {
              selectedEntryIds.add(entry.id);
            }
          }}
          style={{
            width: "16px",
            height: "16px",
            cursor: "pointer",
            accentColor: "var(--primary-color, #6366f1)",
          }}
        />
      </div>

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
          color: isSensitive && !isUnmasked ? "#e11d48" : "inherit",
          fontFamily: isSensitive && !isUnmasked ? "monospace" : "inherit",
        }}>
        {displayContent.slice(0, 500)}
      </span>

      {/* 脱敏眼睛切换锁 */}
      {isSensitive && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setIsUnmasked(!isUnmasked);
          }}
          style={{
            fontSize: "11px",
            cursor: "pointer",
            marginLeft: "4px",
            opacity: 0.8,
            padding: "1px 4px",
            borderRadius: "4px",
            backgroundColor: "rgba(225, 29, 72, 0.1)",
          }}
          title={isUnmasked ? "点此加密遮罩" : "点此显示明文"}>
          {isUnmasked ? "👁️ 显" : "🔒 隐"}
        </span>
      )}

      {/* 标签与字符数 */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
        {autoTags.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: "10px",
              padding: "1px 4px",
              borderRadius: "4px",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              color: "#6366f1",
              fontWeight: 600,
            }}>
            {tag}
          </span>
        ))}
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
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}>
        {/* HTML5 拖拽导出本地文件按钮 */}
        <span
          draggable={true}
          onDragStart={handleHTML5DragStart}
          style={{ cursor: "grab", fontSize: "11px", padding: "1px 4px", borderRadius: "4px", backgroundColor: "rgba(0,0,0,0.05)" }}
          title="按住此 📄 图标拖拽至桌面或外部软件，自动生成导出 Markdown/文本文件">
          📄
        </span>
        {/* 多模态功能：图片预览 */}
        {contentAnalysis.isImage && settings.enableImagePreview !== false && (
          <button
            className="native-btn native-btn-sm"
            style={{ fontSize: "11px", padding: "1px 5px", backgroundColor: "#3b82f6", color: "#ffffff" }}
            title="点击预览图片"
            onClick={handleOpenImagePreview}>
            🖼️ 图片
          </button>
        )}

        {/* 多模态功能：JSON 格式化美化 */}
        {contentAnalysis.isJson && settings.enableJsonFormatting !== false && (
          <button
            className="native-btn native-btn-sm"
            style={{ fontSize: "11px", padding: "1px 5px", backgroundColor: "#0284c7", color: "#ffffff" }}
            title="点击预览 JSON 美化排版"
            onClick={handleOpenJsonFormatted}>
            JSON
          </button>
        )}

        {/* 多模态功能：网址手机二维码 */}
        {contentAnalysis.isUrl && settings.enableQRCode !== false && (
          <button
            className="native-btn native-btn-sm"
            style={{ fontSize: "11px", padding: "1px 5px", backgroundColor: "#10b981", color: "#ffffff" }}
            title="生成手机扫码二维码"
            onClick={handleOpenQRCode}>
            📱 扫码
          </button>
        )}

        <TagSelect entryId={entry.id} />
        <EntryEditAction entry={entry} />
        <EntryPinAction entryId={entry.id} />
        <EntryFavoriteAction entryId={entry.id} />
        <EntryDeleteAction entryId={entry.id} />
      </div>
    </div>
  );
};
