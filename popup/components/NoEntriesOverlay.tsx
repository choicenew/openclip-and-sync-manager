import React, { type ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
}

export const NoEntriesOverlay: React.FC<Props> = ({ title, subtitle, description }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px", gap: "4px", textAlign: "center" }}>
      <div style={{ fontSize: "14px", fontWeight: 600 }}>{title}</div>
      {subtitle && <div style={{ fontSize: "12px", color: "var(--text-dimmed)" }}>{subtitle}</div>}
      {description && <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>{description}</div>}
    </div>
  );
};
