import { z } from "zod";

export const Tab = z.enum([
  "Clipboard",
  "Cloud",
  "Sessions",
  "TabGroups",
  "Bookmarks",
  "History",
  "Extensions",
  "Devices",
  "Settings",
]);
export type Tab = z.infer<typeof Tab>;
