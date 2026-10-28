import { useDroppable } from "@dnd-kit/core";
import { generateColor } from "@marko19907/string-to-color";
import React from "react";

interface Props {
  tag: string;
}

export const TagBadge: React.FC<Props> = ({ tag }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `tag_${tag}`,
  });

  return (
    <span
      ref={setNodeRef}
      className="native-badge"
      style={{
        backgroundColor: isOver ? "rgba(99, 102, 241, 0.25)" : "rgba(0,0,0,0.05)",
        color: isOver ? "#4f46e5" : "var(--text-main)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        outline: isOver ? "2px dashed #6366f1" : "none",
        transition: "all 0.15s ease",
      }}
      title="将卡片拖拽放置在此处可直接打上该标签">
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: generateColor(tag),
          display: "inline-block",
        }}
      />
      <span>{tag}</span>
    </span>
  );
};
