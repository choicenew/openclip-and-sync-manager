import { generateColor } from "@marko19907/string-to-color";
import React from "react";

interface Props {
  tag: string;
}

export const TagBadge: React.FC<Props> = ({ tag }) => {
  return (
    <span
      className="native-badge"
      style={{
        backgroundColor: "rgba(0,0,0,0.05)",
        color: "var(--text-main)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}>
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
