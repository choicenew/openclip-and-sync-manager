import { Storage } from "@plasmohq/storage";

import type { SyncSession } from "~utils/sync/handlers/sessions";

const storage = new Storage({ area: "local" });
const SYNCED_SESSIONS_KEY = "openclip_synced_sessions";

export async function getSyncedSessions(): Promise<SyncSession[]> {
  const data = await storage.get<SyncSession[]>(SYNCED_SESSIONS_KEY);
  return data || [];
}

export async function setSyncedSessions(sessions: SyncSession[]): Promise<void> {
  if (!sessions) return;
  const existing = await getSyncedSessions();
  const map = new Map<string, SyncSession>();
  for (const s of existing) {
    if (s && s.id) map.set(s.id, s);
    if (s && s.deviceId) map.set(`device_${s.deviceId}`, s);
  }
  for (const s of sessions) {
    if (s && s.id) map.set(s.id, s);
    if (s && s.deviceId) map.set(`device_${s.deviceId}`, s);
  }
  await storage.set(SYNCED_SESSIONS_KEY, Array.from(map.values()));
}
