import { modals } from "@mantine/modals";
import React from "react";

interface Props {
  imageUrl: string;
}

export const ImagePreviewModalContent: React.FC<Props> = ({ imageUrl }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>🖼️ 图片预览</h3>
        <button
          className="native-btn native-btn-subtle"
          style={{ fontSize: "12px", padding: "2px 8px" }}
          onClick={() => modals.closeAll()}>
          ✕ 关闭
        </button>
      </div>

      <div
        style={{
          maxHeight: "360px",
          overflow: "auto",
          backgroundColor: "#0f172a",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
        }}>
        <img
          src={imageUrl}
          alt="剪贴板图片预览"
          style={{
            maxWidth: "100%",
            maxHeight: "320px",
            objectFit: "contain",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "10px" }}>
        <button className="native-btn native-btn-primary" onClick={handleCopy}>
          {copied ? "✓ 已复制 URL / Data" : "📋 复制图片链接 / Data"}
        </button>
        <a
          href={imageUrl}
          download="openclip-image.png"
          target="_blank"
          rel="noreferrer"
          className="native-btn"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          💾 下载原图
        </a>
      </div>
    </div>
  );
};
