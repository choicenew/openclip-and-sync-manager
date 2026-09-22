import { createHash } from "crypto";
import { Err, Ok, Result } from "ts-results";
import { z } from "zod";

import { Storage } from "@plasmohq/storage";

import { handleUpdateTotalItemsBadgeRequest } from "~background/messages/updateTotalItemsBadge";
import { _setEntryCommands, deleteEntryCommands, getEntryCommands } from "~storage/entryCommands";
import {
  _setEntryIdToTags,
  deleteEntryIdsFromEntryIdToTags,
  getEntryIdToTags,
} from "~storage/entryIdToTags";
import {
  _setFavoriteEntryIds,
  addFavoriteEntryIds,
  deleteFavoriteEntryIds,
  getFavoriteEntryIds,
} from "~storage/favoriteEntryIds";
import { getPinnedEntryIds } from "~storage/pinnedEntryIds";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { Entry } from "~types/entry";
import type { BlacklistRule } from "~types/settings";
import { StorageLocation } from "~types/storageLocation";

import { resolveCloudSettings } from "./cloudSettings";
import db from "./db/core";
import { applyLocalItemLimit, getEntryTimestamp, handleEntryIds } from "./entries";

// Do not change this without a migration.
const ENTRIES_STORAGE_KEY = "entryIdSetentries";

const storage = new Storage({
  area: "local",
});

// Entries are not parsed to optimize for performance. This means corrupted entries will break the
// extension.
export const watchEntries = (cb: (entries: Entry[]) => void) => {
  return storage.watch({
    [ENTRIES_STORAGE_KEY]: (c) => {
      if (c.newValue === undefined) {
        cb([]);
      } else {
        const fullList = c.newValue as Entry[];
        // 限制在内存里的记录条数，绝不在内存中常驻上千条长文本
        cb(fullList.slice(0, 100));
      }
    },
  });
};

export const getEntries = async () => {
  const entries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY);
  if (entries === undefined) {
    return [];
  }
  // 在内存中仅保留最近 100 条条目以实现接近 0MB 内存占用
  return entries.slice(0, 100);
};

export const _setEntries = async (entries: Entry[]) => {
  await Promise.all([
    storage.set(ENTRIES_STORAGE_KEY, entries),
    handleUpdateTotalItemsBadgeRequest(entries.length),
  ]);
};

export const shouldBlockContentByBlacklist = (
  content: string,
  enableFilter: boolean,
  rules?: BlacklistRule[],
): boolean => {
  if (!enableFilter || !rules || rules.length === 0 || !content) return false;
  const lowerContent = content.toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled || !rule.keywords) continue;
    for (const kw of rule.keywords) {
      if (kw && lowerContent.includes(kw.toLowerCase())) {
        return true;
      }
    }
  }
  return false;
};

export const createEntry = async (
  content: string,
  storageLocation: StorageLocation,
): Promise<Result<null, Error>> => {
  const sysSettings = await getSettings();
  if (
    shouldBlockContentByBlacklist(
      content,
      sysSettings.enableBlacklistFilter,
      sysSettings.blacklistRules,
    )
  ) {
    console.warn("[Storage] Entry blocked by keyword filter rule:", content.slice(0, 20));
    return Err(new Error("Content blocked by keyword filter rule"));
  }

  const [entries, entryIdToTags, favoriteEntryIds, pinnedEntryIds, settings] = await Promise.all([
    getEntries(),
    getEntryIdToTags(),
    getFavoriteEntryIds(),
    getPinnedEntryIds(),
    getSettings(),
  ]);

  const existingEntry = entries.find((entry) => entry.content === content);
  const now = Date.now();

  let nextEntries: Entry[];
  let newEntryId: string;

  if (existingEntry && settings.deduplicateEntries !== false) {
    newEntryId = existingEntry.id;
    nextEntries = [
      {
        ...existingEntry,
        copiedAt: now,
      },
      ...entries.filter((entry) => entry.id !== existingEntry.id),
    ];
  } else {
    newEntryId = createHash("sha256").update(content).digest("hex");
    nextEntries = [
      {
        id: newEntryId,
        content,
        createdAt: now,
      },
      ...entries,
    ];
  }

  const { entries: finalEntries, deletedEntryIds } = handleEntryIds({
    entries: nextEntries,
    favoriteEntryIds,
    pinnedEntryIds,
    localItemLimit: settings.localItemLimit,
  });

  await Promise.all([
    _setEntries(finalEntries),
    deleteEntryIdsFromEntryIdToTags(deletedEntryIds),
    deleteFavoriteEntryIds(deletedEntryIds),
    deletePinnedEntryIds(deletedEntryIds),
    deleteEntryCommands(deletedEntryIds),
  ]);

  return Ok(null);
};

export const deleteEntries = async (entryIds: string[]): Promise<Result<null, Error>> => {
  const [entries] = await Promise.all([getEntries()]);

  const entryIdsSet = new Set(entryIds);
  const nextEntries = entries.filter((entry) => !entryIdsSet.has(entry.id));

  await Promise.all([
    _setEntries(nextEntries),
    deleteEntryIdsFromEntryIdToTags(entryIds),
    deleteFavoriteEntryIds(entryIds),
    deletePinnedEntryIds(entryIds),
    deleteEntryCommands(entryIds),
  ]);

  return Ok(null);
};
