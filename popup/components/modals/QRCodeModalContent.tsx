import { modals } from "@mantine/modals";
import React from "react";

import { generateQRCodeSVG } from "~utils/qrcode";

interface Props {
  url: string;
}

export const QRCodeModalContent: React.FC<Props> = ({ url }) => {
  const qrSvg = React.useMemo(() => generateQRCodeSVG(url, 220), [url]);

  return (
    <div style={{ padding: "16px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>📱 手机扫码与网址一键同步</h3>
        <button
          className="native-btn native-btn-subtle"
          style={{ fontSize: "12px", padding: "2px 8px" }}
          onClick={() => modals.closeAll()}>
          ✕ 关闭
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "var(--text-dimmed)", margin: "0 0 12px 0" }}>
        使用手机摄像头或扫码软件扫描下方二维码直接打开链接：
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "12px 0",
        }}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <div
        style={{
          fontSize: "11px",
          color: "#64748b",
          wordBreak: "break-all",
          padding: "6px 10px",
          backgroundColor: "rgba(0,0,0,0.04)",
          borderRadius: "6px",
          marginTop: "12px",
          fontFamily: "monospace",
        }}>
        {url}
      </div>
    </div>
  );
};
