import { modals } from "@mantine/modals";
import React from "react";

interface Props {
  formattedJson: string;
}

export const JsonFormattedModalContent: React.FC<Props> = ({ formattedJson }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>🎨 JSON 格式化与美化预览</h3>
        <button
          className="native-btn native-btn-subtle"
          style={{ fontSize: "12px", padding: "2px 8px" }}
          onClick={() => modals.closeAll()}>
          ✕ 关闭
        </button>
      </div>

      <pre
        style={{
          margin: 0,
          maxHeight: "360px",
          overflow: "auto",
          backgroundColor: "#0f172a",
          color: "#38bdf8",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "12px",
          padding: "12px",
          borderRadius: "8px",
          lineHeight: "1.5",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
        {formattedJson}
      </pre>

      <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button className="native-btn native-btn-primary" onClick={handleCopy}>
          {copied ? "✓ 已复制美化后的 JSON" : "📋 复制美化后的 JSON"}
        </button>
      </div>
    </div>
  );
};
