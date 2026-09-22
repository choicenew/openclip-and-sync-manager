import React from "react";

interface Props {
  shortcut: string;
}

export const ShortcutBadge: React.FC<Props> = ({ shortcut }) => {
  return (
    <span className="native-badge native-badge-blue" style={{ userSelect: "none", flexShrink: 0 }}>
      {shortcut}
    </span>
  );
};
