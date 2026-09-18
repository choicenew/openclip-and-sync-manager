import { Box } from "@mantine/core";
import { SettingsPage } from "../../pages/SettingsPage";

export const SettingsModalContent = () => {
  return (
    <Box p="xs" sx={{ maxHeight: "80vh", overflowY: "auto" }}>
      <SettingsPage />
    </Box>
  );
};
