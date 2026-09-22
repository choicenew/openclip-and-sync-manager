import React, { useState } from "react";
import { favoriteEntryIdsAtom, settingsAtom } from "~popup/states/atoms";
import { useAtomValue } from "jotai";
import { updateClipboardSnapshot } from "~storage/clipboardSnapshot";
import type { Entry } from "~types/entry";
import { createEntry, deleteEntries } from "~utils/storage";

interface Props {
  initialEntries: Entry[];
  onClose?: () => void;
}

export const MergeModalContent: React.FC<Props> = ({ initialEntries, onClose }) => {
  const favoriteEntryIds = useAtomValue(favoriteEntryIdsAtom) || [];
  const favoriteEntryIdsSet = new Set(favoriteEntryIds);
  const settings = useAtomValue(settingsAtom);

  const [entries, setEntries] = useState(initialEntries);
  const [delimiter, setDelimiter] = useState("\n");
  const [customDelimiter, setCustomDelimiter] = useState("");
  const [deleteSourceItems, setDeleteSourceItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInverse = () => {
    setEntries((prev) => prev.slice().reverse());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedDelimiter = delimiter === "custom" ? customDelimiter : delimiter;
    const content = entries.map(({ content }) => content).join(selectedDelimiter);

    await updateClipboardSnapshot(content);
    navigator.clipboard.writeText(content);
    await createEntry(content, settings.storageLocation);

    if (deleteSourceItems) {
      await deleteEntries(
        entries.flatMap(({ id }) => (favoriteEntryIdsSet.has(id) ? [] : id)),
      );
    }

    setSubmitting(false);
    if (onClose) onClose();
  };

  return (
    <div className="native-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", maxWidth: "500px", margin: "auto" }}>
      <div className="flex-between">
        <span style={{ fontWeight: 700, fontSize: "14px" }}>📋 合并多条剪贴板记录</span>
        {onClose && (
          <button className="native-btn native-btn-sm native-btn-subtle" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div className="flex-between" style={{ fontSize: "12px" }}>
          <span>共选中 <b>{entries.length}</b> 条待合并记录</span>
          <button type="button" className="native-btn native-btn-sm native-btn-subtle" onClick={handleInverse}>
            ⇅ 反转顺序
          </button>
        </div>

        {/* 待合并条目预览 */}
        <div className="native-card-subtle" style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {entries.map((item, idx) => (
            <div key={item.id} style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "3px 6px", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ fontWeight: 600, color: "var(--primary-color)", marginRight: "6px" }}>#{idx + 1}</span>
              {item.content}
            </div>
          ))}
        </div>

        {/* 分隔符选择与删除源选项 */}
        <div className="flex-between flex-wrap" style={{ gap: "8px", fontSize: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={deleteSourceItems}
              onChange={(e) => setDeleteSourceItems(e.target.checked)}
            />
            <span>合并后彻底删除原记录</span>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>分隔符:</span>
            <select
              className="native-select"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}>
              <option value="\n">换行符 (\n)</option>
              <option value=",">逗号 (,)</option>
              <option value=";">分号 (;)</option>
              <option value=" ">空格 ( )</option>
              <option value="\t">制表符 (\t)</option>
              <option value="">无分隔符</option>
              <option value="custom">自定义格式...</option>
            </select>
          </div>
        </div>

        {delimiter === "custom" && (
          <input
            type="text"
            className="native-input"
            placeholder="请输入自定义分隔符内容..."
            value={customDelimiter}
            onChange={(e) => setCustomDelimiter(e.target.value)}
          />
        )}

        <button type="submit" className="native-btn" disabled={submitting}>
          {submitting ? "合并中..." : "🔗 确认合并并写入剪贴板"}
        </button>
      </form>
    </div>
  );
};
