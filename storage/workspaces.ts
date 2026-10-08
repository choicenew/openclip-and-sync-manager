import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });
const WORKSPACES_KEY = "openclip_workspaces";

export interface KanbanItem {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  tabId?: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  items: KanbanItem[];
}

export interface WorkspaceData {
  id: string;
  name: string;
  columns: KanbanColumn[];
  updatedAt: number;
}

export const defaultWorkspace: WorkspaceData = {
  id: "default_workspace",
  name: "默认工作区",
  updatedAt: Date.now(),
  columns: [
    {
      id: "col_todo",
      title: "待处理 (To Read)",
      color: "#3b82f6",
      items: [],
    },
    {
      id: "col_in_progress",
      title: "进行中 (In Progress)",
      color: "#10b981",
      items: [],
    },
    {
      id: "col_archive",
      title: "归档 (Saved)",
      color: "#8b5cf6",
      items: [],
    },
  ],
};

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const data = await storage.get<WorkspaceData>(WORKSPACES_KEY);
  return data || defaultWorkspace;
}

export async function setWorkspaceData(data: WorkspaceData): Promise<void> {
  await storage.set(WORKSPACES_KEY, { ...data, updatedAt: Date.now() });
}
