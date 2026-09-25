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
import { deletePinnedEntryIds, getPinnedEntryIds } from "~storage/pinnedEntryIds";
import { getRefreshToken } from "~storage/refreshToken";
import { getSettings } from "~storage/settings";
import { Entry } from "~types/entry";
import type { BlacklistRule } from "~types/settings";
import { StorageLocation } from "~types/storageLocation";

import { resolveCloudSettings } from "./cloudSettings";
import db from "./db/core";
import { applyLocalItemLimit, getEntryTimestamp } from "./entries";

// Do not change this without a migration.
const ENTRIES_STORAGE_KEY = "entryIdSetentries";

const storage = new Storage({
  area: "local",
});

export const generateEntryId = (content: string): string => {
  try {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16);
    return `e_${Date.now()}_${hex}_${Math.random().toString(36).slice(2, 6)}`;
  } catch {
    return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
};

export const getAllStoredEntries = async (): Promise<Entry[]> => {
  const entries = await storage.get<Entry[]>(ENTRIES_STORAGE_KEY);
  return entries || [];
};

export const watchEntries = (cb: (entries: Entry[]) => void) => {
  return storage.watch({
    [ENTRIES_STORAGE_KEY]: (c) => {
      if (c.newValue === undefined) {
        cb([]);
      } else {
        cb((c.newValue as Entry[]) || []);
      }
    },
  });
};

export const getEntries = async (): Promise<Entry[]> => {
  return getAllStoredEntries();
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
    getAllStoredEntries(),
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
    newEntryId = generateEntryId(content);
    nextEntries = [
      {
        id: newEntryId,
        content,
        createdAt: now,
      },
      ...entries,
    ];
  }

  const [finalEntries, deletedEntryIds] = applyLocalItemLimit(
    nextEntries,
    settings,
    favoriteEntryIds,
    pinnedEntryIds,
  );

  await Promise.all([
    _setEntries(finalEntries),
    deleteEntryIdsFromEntryIdToTags(deletedEntryIds),
    deleteFavoriteEntryIds(deletedEntryIds),
    deletePinnedEntryIds(deletedEntryIds),
    deleteEntryCommands(deletedEntryIds),
  ]);

  return Ok(null);
};

export const updateEntryContent = async (
  id: string,
  newContent: string,
): Promise<Result<null, Error>> => {
  const sysSettings = await getSettings();
  if (
    shouldBlockContentByBlacklist(
      newContent,
      sysSettings.enableBlacklistFilter,
      sysSettings.blacklistRules,
    )
  ) {
    return Err(new Error("Content blocked by blacklist filter rule"));
  }

  const entries = await getAllStoredEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) {
    return Err(new Error("Entry not found"));
  }

  const updatedEntries = [...entries];
  updatedEntries[index] = {
    ...updatedEntries[index],
    content: newContent,
    copiedAt: Date.now(),
  };

  await _setEntries(updatedEntries);
  return Ok(null);
};

export const deleteEntries = async (entryIds: string[]): Promise<Result<null, Error>> => {
  const entries = await getAllStoredEntries();

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
