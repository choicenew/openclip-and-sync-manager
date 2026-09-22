import React from "react";
import { SettingsPage } from "../../pages/SettingsPage";

export const SettingsModalContent: React.FC = () => {
  return (
    <div style={{ maxHeight: "80vh", overflowY: "auto", padding: "8px" }}>
      <SettingsPage />
    </div>
  );
};
