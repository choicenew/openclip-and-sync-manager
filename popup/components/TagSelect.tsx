import { useAtomValue } from "jotai";
import React, { useMemo, useState } from "react";

import { entryIdToTagsAtom } from "~popup/states/atoms";
import { toggleEntryTag } from "~storage/entryIdToTags";

interface Props {
  entryId: string;
}

export const TagSelect: React.FC<Props> = ({ entryId }) => {
  const entryIdToTags = useAtomValue(entryIdToTagsAtom) || {};
  const currentTags = new Set(entryIdToTags[entryId] || []);
  const [opened, setOpened] = useState(false);
  const [newTag, setNewTag] = useState("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const tags of Object.values(entryIdToTags)) {
      if (Array.isArray(tags)) {
        for (const t of tags) set.add(t);
      }
    }
    return Array.from(set);
  }, [entryIdToTags]);

  const handleToggleTag = async (tag: string) => {
    await toggleEntryTag(entryId, tag);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    await toggleEntryTag(entryId, newTag.trim().toLowerCase());
    setNewTag("");
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className="native-btn native-btn-sm native-btn-subtle"
        style={{ padding: "2px 4px" }}
        title="添加/选择标签"
        onClick={() => setOpened(!opened)}>
        🏷️
      </button>

      {opened && (
        <div
          className="native-card"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            zIndex: 999,
            width: "180px",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
          <div style={{ display: "flex", gap: "4px" }}>
            <input
              type="text"
              className="native-input flex-1"
              style={{ padding: "2px 4px", fontSize: "11px" }}
              placeholder="新标签..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <button className="native-btn native-btn-sm" onClick={handleAddTag}>
              +
            </button>
          </div>

          <div style={{ maxHeight: "120px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
            {allTags.map((tag) => {
              const isChecked = currentTags.has(tag);
              return (
                <label key={tag} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleTag(tag)}
                  />
                  <span>{tag}</span>
                </label>
              );
            })}
          </div>

          <button
            className="native-btn native-btn-sm native-btn-subtle"
            style={{ width: "100%", fontSize: "10px" }}
            onClick={() => setOpened(false)}>
            关闭
          </button>
        </div>
      )}
    </div>
  );
};
