import React from "react";

interface Props {
  keys: string[];
  label: string;
}

export const KeyboardHint: React.FC<Props> = ({ keys, label }) => {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", userSelect: "none", fontSize: "11px", color: "var(--text-dimmed)" }}>
      {keys.map((key) => (
        <kbd
          key={key}
          style={{
            padding: "1px 4px",
            fontSize: "10px",
            borderRadius: "3px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            fontFamily: "monospace",
          }}>
          {key}
        </kbd>
      ))}
      <span>{label}</span>
    </div>
  );
};
