import { Storage } from "@plasmohq/storage";

export interface ModalityPermissions {
  clipboard: boolean;
  bookmarks: boolean;
  sessions: boolean;
  history: boolean;
  extensions: boolean;
}

export const DEFAULT_MODALITY_PERMISSIONS: ModalityPermissions = {
  clipboard: true,
  bookmarks: true,
  sessions: true,
  history: true,
  extensions: true,
};

export interface SyncSettings {
  deviceId: string;
  deviceName: string;
  enableChromeSync: boolean;
  enableWebdav: boolean;
  enableOneDrive: boolean;
  enableGoogleDrive: boolean;
  enableGist: boolean;
  enableS3: boolean;
  enableCustomRest: boolean;
  // 各节点双向许可网格控制表：指定具体每个云端节点允许同步哪些数据模态
  providerModalities: {
    chrome: ModalityPermissions;
    webdav: ModalityPermissions;
    onedrive: ModalityPermissions;
    googledrive: ModalityPermissions;
    gist: ModalityPermissions;
    s3: ModalityPermissions;
    customRest: ModalityPermissions;
  };
  webdavUrl: string;
  webdavUsername: string;
  webdavPassword: string;
  webdavPath: string;
  oneDriveFolder: string;
  oneDriveClientId: string;
  oneDriveClientSecret: string;
  oneDriveAccessToken: string;
  googleDriveFolder: string;
  googleClientId: string;
  googleClientSecret: string;
  googleAccessToken: string;
  gistToken: string;
  gistId: string;
  s3Endpoint: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3Region: string;
  customRestUrl: string;
  customRestToken: string;
  // Legacy compat
  provider?: SyncProviderType;
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  deviceId: "",
  deviceName: "设备 A",
  enableChromeSync: false,
  enableWebdav: false,
  enableOneDrive: false,
  enableGoogleDrive: false,
  enableGist: false,
  enableS3: false,
  enableCustomRest: false,
  providerModalities: {
    chrome: { ...DEFAULT_MODALITY_PERMISSIONS },
    webdav: { ...DEFAULT_MODALITY_PERMISSIONS },
    onedrive: { ...DEFAULT_MODALITY_PERMISSIONS },
    googledrive: { ...DEFAULT_MODALITY_PERMISSIONS },
    gist: { ...DEFAULT_MODALITY_PERMISSIONS },
    s3: { ...DEFAULT_MODALITY_PERMISSIONS },
    customRest: { ...DEFAULT_MODALITY_PERMISSIONS },
  },
  webdavUrl: "",
  webdavUsername: "",
  webdavPassword: "",
  webdavPath: "/OpenClipSync/openclip-sync.json",
  oneDriveFolder: "/OpenClipSync",
  oneDriveClientId: "",
  oneDriveClientSecret: "",
  oneDriveAccessToken: "",
  googleDriveFolder: "/OpenClipSync",
  googleClientId: "",
  googleClientSecret: "",
  googleAccessToken: "",
  gistToken: "",
  gistId: "",
  s3Endpoint: "",
  s3Bucket: "",
  s3AccessKeyId: "",
  s3SecretAccessKey: "",
  s3Region: "us-east-1",
  customRestUrl: "",
  customRestToken: "",
};

const storage = new Storage({ area: "local" });
const KEY = "syncSettings";

export const getSyncSettings = async (): Promise<SyncSettings> => {
  const val = (await storage.get<any>(KEY)) || {};
  let deviceId = val.deviceId;
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
    await storage.set(KEY, { ...val, deviceId });
  }
  const deviceName = val.deviceName || "设备 A";
  const pMods = val.providerModalities || {};
  return {
    ...DEFAULT_SYNC_SETTINGS,
    ...val,
    deviceId,
    deviceName,
    providerModalities: {
      chrome: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.chrome },
      webdav: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.webdav },
      onedrive: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.onedrive },
      googledrive: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.googledrive },
      gist: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.gist },
      s3: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.s3 },
      customRest: { ...DEFAULT_MODALITY_PERMISSIONS, ...pMods.customRest },
    },
    enableChromeSync: typeof val.enableChromeSync === "boolean" ? val.enableChromeSync : false,
    enableWebdav: typeof val.enableWebdav === "boolean" ? val.enableWebdav : false,
    enableOneDrive: typeof val.enableOneDrive === "boolean" ? val.enableOneDrive : false,
    enableGoogleDrive: typeof val.enableGoogleDrive === "boolean" ? val.enableGoogleDrive : false,
    enableGist: typeof val.enableGist === "boolean" ? val.enableGist : false,
    enableS3: typeof val.enableS3 === "boolean" ? val.enableS3 : false,
    enableCustomRest: typeof val.enableCustomRest === "boolean" ? val.enableCustomRest : false,
  };
};

export const setSyncSettings = async (settings: Partial<SyncSettings>): Promise<void> => {
  const current = await getSyncSettings();
  const next = { ...current, ...settings };
  delete (next as any).provider;
  await storage.set(KEY, next);
};

export interface ProviderDetailStatus {
  lastSyncTime: number | null;
  status: "idle" | "syncing" | "success" | "error";
  message: string;
  itemCount: number;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  status: "idle" | "syncing" | "success" | "error";
  message: string;
  itemCount: number;
  chrome?: ProviderDetailStatus;
  webdav?: ProviderDetailStatus;
  onedrive?: ProviderDetailStatus;
  googledrive?: ProviderDetailStatus;
  gist?: ProviderDetailStatus;
  s3?: ProviderDetailStatus;
  customRest?: ProviderDetailStatus;
}

const DEFAULT_PROVIDER_STATUS: ProviderDetailStatus = {
  lastSyncTime: null,
  status: "idle",
  message: "",
  itemCount: 0,
};

const DEFAULT_SYNC_STATUS: SyncStatus = {
  lastSyncTime: null,
  status: "idle",
  message: "",
  itemCount: 0,
  chrome: { ...DEFAULT_PROVIDER_STATUS },
  webdav: { ...DEFAULT_PROVIDER_STATUS },
  onedrive: { ...DEFAULT_PROVIDER_STATUS },
  googledrive: { ...DEFAULT_PROVIDER_STATUS },
  gist: { ...DEFAULT_PROVIDER_STATUS },
  s3: { ...DEFAULT_PROVIDER_STATUS },
  customRest: { ...DEFAULT_PROVIDER_STATUS },
};

const STATUS_KEY = "syncStatus";

export const getSyncStatus = async (): Promise<SyncStatus> => {
  const val = await storage.get<SyncStatus>(STATUS_KEY);
  return {
    ...DEFAULT_SYNC_STATUS,
    ...val,
    chrome: { ...DEFAULT_PROVIDER_STATUS, ...val?.chrome },
    webdav: { ...DEFAULT_PROVIDER_STATUS, ...val?.webdav },
    onedrive: { ...DEFAULT_PROVIDER_STATUS, ...val?.onedrive },
    googledrive: { ...DEFAULT_PROVIDER_STATUS, ...val?.googledrive },
    gist: { ...DEFAULT_PROVIDER_STATUS, ...val?.gist },
    s3: { ...DEFAULT_PROVIDER_STATUS, ...val?.s3 },
    customRest: { ...DEFAULT_PROVIDER_STATUS, ...val?.customRest },
  };
};

export const setSyncStatus = async (status: Partial<SyncStatus>): Promise<void> => {
  const current = await getSyncStatus();
  await storage.set(STATUS_KEY, { ...current, ...status });
};

export const updateProviderStatus = async (
  providerKey: "chrome" | "webdav" | "onedrive" | "googledrive" | "gist" | "s3" | "customRest",
  status: Partial<ProviderDetailStatus>,
): Promise<void> => {
  const current = await getSyncStatus();
  const updatedProvider = { ...current[providerKey], ...status };
  await storage.set(STATUS_KEY, {
    ...current,
    [providerKey]: updatedProvider,
    lastSyncTime: status.lastSyncTime || current.lastSyncTime,
  });
};
