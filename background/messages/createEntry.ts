import type { PlasmoMessaging } from "@plasmohq/messaging";
import { debounce } from "ts-debounce";

import { getClipboardSnapshot, updateClipboardSnapshot } from "~storage/clipboardSnapshot";
import { getSettings } from "~storage/settings";
import { runFullSync } from "~utils/sync/engine";
import { createEntry, shouldBlockContentByBlacklist } from "~utils/storage";

import { handleUpdateContextMenusRequest } from "./updateContextMenus";

export interface CreateEntryRequestBody {
  content: string;
  timestamp: number;
}

const debouncedAutoSync = debounce(() => {
  runFullSync().catch(() => {});
}, 3000);

export type CreateEntryResponseBody = Record<PropertyKey, never>;

export const handleCreateEntryRequest = async (body: CreateEntryRequestBody) => {
  if (!body || !body.content) return;

  const [clipboardSnapshot, settings] = await Promise.all([getClipboardSnapshot(), getSettings()]);

  if (
    shouldBlockContentByBlacklist(
      body.content,
      settings.enableBlacklistFilter,
      settings.blacklistRules,
    )
  ) {
    return;
  }

  // 只要剪贴板新内容与最后存储不一致，即刻存入数据库、更新快照并触发后台 3s 静默自动同步
  if (!clipboardSnapshot || body.content !== clipboardSnapshot.content) {
    await Promise.all([
      updateClipboardSnapshot(body.content),
      (settings.allowBlankItems || body.content.trim().length > 0) &&
        (settings.localItemCharacterLimit === null ||
          body.content.length <= settings.localItemCharacterLimit) &&
        createEntry(body.content, settings.storageLocation),
    ]);

    handleUpdateContextMenusRequest();
    debouncedAutoSync();
  }
};

const handler: PlasmoMessaging.MessageHandler<
  CreateEntryRequestBody,
  CreateEntryResponseBody
> = async (req, res) => {
  if (req.body) {
    await handleCreateEntryRequest(req.body);
  }

  res.send({});
};

export default handler;
