import { z } from "zod";

import { DisplayMode } from "./displayMode";
import { ItemSortOption } from "./itemSortOption";
import { StorageLocation } from "./storageLocation";
import { Tab } from "./tab";

export interface BlacklistRule {
  id: string;
  name: string;
  keywords: string[];
  enabled: boolean;
}

export const defaultBlacklistRules: BlacklistRule[] = [
  {
    id: "rule_1",
    name: "异常错误日志 (Error Log)",
    keywords: ["error", "exception", "failed"],
    enabled: true,
  },
  {
    id: "rule_2",
    name: "敏感密钥与 Token (Secret Token)",
    keywords: ["token=", "access_token", "secret"],
    enabled: true,
  },
];

// DO NOT REUSE DEPRECATED FIELDS.
export const defaultSettings = {
  sortItemsBy: ItemSortOption.Enum.DateLastCopied,
  sortOrder: "desc" as "desc" | "asc", // "desc": 最新在前 (倒序), "asc": 最旧在前 (正序)
  storageLocation: StorageLocation.Enum.Local,
  totalItemsBadge: true,
  pasteFromContextMenu: true,
  changelogIndicator: true,
  allowBlankItems: true,
  defaultTab: Tab.Enum.Clipboard,
  // theme: "light",
  themeV2: "system",
  localItemLimit: null,
  localItemCharacterLimit: null,
  historyRetentionDays: null,
  enableCompression: true,
  enableBlacklistFilter: false,
  blacklistRules: defaultBlacklistRules,
  deduplicateEntries: true,
  syncModalities: {
    clipboard: true,
    bookmarks: true,
    sessions: true,
    history: true,
    extensions: true,
  },
  syncDeviceFilter: "all",
  displayMode: DisplayMode.Enum.Popup,
  language: "auto",
  sessionAutoSaveIntervalMinutes: 30, // 默认每 30 分钟定时自动快照，0 为关闭
  sessionAutoSaveOnStartup: true,
  sessionAutoSaveOnShutdown: true,
  sessionIgnoreUrls: "https://example.com/*\nhttps://example.net/*",
  sessionMinTabCount: 1,
  sessionSaveWindowMode: "current", // "current" | "all"
  // E2EE 端到端零知识加密
  e2eeEnabled: false,
  e2eePassphrase: "",
  // P2P 局域网直连同步
  p2pEnabled: false,
  p2pRoomKey: "",
  // 智能分类、脱敏与 TTL 清除
  autoClassifyEntries: true,
  autoMaskSensitiveData: true,
  sensitiveDataTTLMinutes: 0, // 0 表示不自动销毁，>0 表示分钟数
  // 标签页挂起与休眠
  autoTabSuspendMinutes: 0, // 0 表示不自动挂起，>0 表示闲置分钟数
};

export const BlacklistRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  keywords: z.array(z.string()),
  enabled: z.boolean(),
});

export const SyncModalitiesSchema = z.object({
  clipboard: z.boolean().default(true),
  bookmarks: z.boolean().default(true),
  sessions: z.boolean().default(true),
  history: z.boolean().default(true),
  extensions: z.boolean().default(true),
});

export const Settings = z
  .object({
    sortItemsBy: ItemSortOption.default(defaultSettings.sortItemsBy),
    sortOrder: z.enum(["desc", "asc"]).default(defaultSettings.sortOrder),
    storageLocation: StorageLocation.default(defaultSettings.storageLocation),
    totalItemsBadge: z.boolean().default(defaultSettings.totalItemsBadge),
    pasteFromContextMenu: z.boolean().default(defaultSettings.pasteFromContextMenu),
    changelogIndicator: z.boolean().default(defaultSettings.changelogIndicator),
    allowBlankItems: z.boolean().default(defaultSettings.allowBlankItems),
    defaultTab: Tab.default(defaultSettings.defaultTab),
    // theme: z.string().default(defaultSettings.theme),
    themeV2: z.string().default(defaultSettings.themeV2),
    localItemLimit: z.number().nullable().default(defaultSettings.localItemLimit),
    localItemCharacterLimit: z.number().nullable().default(defaultSettings.localItemCharacterLimit),
    historyRetentionDays: z.number().nullable().default(defaultSettings.historyRetentionDays),
    enableCompression: z.boolean().default(defaultSettings.enableCompression),
    enableBlacklistFilter: z.boolean().default(defaultSettings.enableBlacklistFilter),
    blacklistRules: z.array(BlacklistRuleSchema).default(defaultSettings.blacklistRules),
    deduplicateEntries: z.boolean().default(defaultSettings.deduplicateEntries),
    syncModalities: SyncModalitiesSchema.default(defaultSettings.syncModalities),
    syncDeviceFilter: z.string().default(defaultSettings.syncDeviceFilter),
    displayMode: DisplayMode.default(defaultSettings.displayMode),
    language: z.string().default(defaultSettings.language),
    sessionAutoSaveIntervalMinutes: z.number().default(defaultSettings.sessionAutoSaveIntervalMinutes),
    sessionAutoSaveOnStartup: z.boolean().default(defaultSettings.sessionAutoSaveOnStartup),
    sessionAutoSaveOnShutdown: z.boolean().default(defaultSettings.sessionAutoSaveOnShutdown),
    sessionIgnoreUrls: z.string().default(defaultSettings.sessionIgnoreUrls),
    sessionMinTabCount: z.number().default(defaultSettings.sessionMinTabCount),
    sessionSaveWindowMode: z.string().default(defaultSettings.sessionSaveWindowMode),
    e2eeEnabled: z.boolean().default(defaultSettings.e2eeEnabled),
    e2eePassphrase: z.string().default(defaultSettings.e2eePassphrase),
    p2pEnabled: z.boolean().default(defaultSettings.p2pEnabled),
    p2pRoomKey: z.string().default(defaultSettings.p2pRoomKey),
    autoClassifyEntries: z.boolean().default(defaultSettings.autoClassifyEntries),
    autoMaskSensitiveData: z.boolean().default(defaultSettings.autoMaskSensitiveData),
    sensitiveDataTTLMinutes: z.number().default(defaultSettings.sensitiveDataTTLMinutes),
    autoTabSuspendMinutes: z.number().default(defaultSettings.autoTabSuspendMinutes),
  })
  .default(defaultSettings);
export type Settings = z.infer<typeof Settings>;
