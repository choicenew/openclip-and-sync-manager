import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useEffect, useState } from "react";

import {
  getWorkspaceData,
  setWorkspaceData,
  type KanbanColumn,
  type KanbanItem,
  type WorkspaceData,
} from "~storage/workspaces";
import { suspendAllInactiveTabs, suspendTab } from "~utils/tabSuspend";

interface SortableItemProps {
  item: KanbanItem;
  columnId: string;
}

function SortableItem({ item, columnId }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { columnId },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    padding: "8px",
    marginBottom: "6px",
    borderRadius: "6px",
    backgroundColor: "var(--card-bg, #ffffff)",
    border: "1px solid var(--border-color, #e5e7eb)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", flex: 1 }}>
        {item.favIconUrl && (
          <img src={item.favIconUrl} alt="" style={{ width: "14px", height: "14px", flexShrink: 0 }} />
        )}
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
          }}>
          {item.title}
        </span>
      </div>
      {item.tabId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.tabId) suspendTab(item.tabId);
          }}
          title="休眠挂起此标签页以释放内存"
          style={{
            fontSize: "10px",
            padding: "2px 5px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            color: "#6366f1",
            cursor: "pointer",
            flexShrink: 0,
            marginLeft: "4px",
          }}>
          💤 休眠
        </button>
      )}
    </div>
  );
}

export const TabKanbanBoard: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);
  const [suspendMsg, setSuspendMsg] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  );

  useEffect(() => {
    async function loadData() {
      const ws = await getWorkspaceData();
      if (typeof chrome !== "undefined" && chrome.tabs) {
        try {
          const currentTabs = await chrome.tabs.query({ currentWindow: true });
          const liveItems: KanbanItem[] = currentTabs.map((t) => ({
            id: `tab_${t.id}`,
            title: t.title || t.url || "Untitled Tab",
            url: t.url || "",
            favIconUrl: t.favIconUrl,
            tabId: t.id,
          }));

          const updatedCols = ws.columns.map((col, idx) => {
            if (idx === 0) {
              const existingIds = new Set(col.items.map((i) => i.id));
              const newLive = liveItems.filter((i) => !existingIds.has(i.id));
              return { ...col, items: [...col.items, ...newLive] };
            }
            return col;
          });

          const updatedWs = { ...ws, columns: updatedCols };
          setWorkspace(updatedWs);
          setWorkspaceData(updatedWs);
          return;
        } catch {}
      }
      setWorkspace(ws);
    }
    loadData();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (!workspace) return;
    for (const col of workspace.columns) {
      const found = col.items.find((i) => i.id === active.id);
      if (found) {
        setActiveItem(found);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || !workspace) return;

    const activeId = active.id;
    const overId = over.id;

    let sourceCol: KanbanColumn | null = null;
    let targetCol: KanbanColumn | null = null;

    for (const col of workspace.columns) {
      if (col.items.some((i) => i.id === activeId)) sourceCol = col;
      if (col.id === overId || col.items.some((i) => i.id === overId)) targetCol = col;
    }

    if (!sourceCol || !targetCol) return;

    if (sourceCol.id === targetCol.id) {
      const oldIndex = sourceCol.items.findIndex((i) => i.id === activeId);
      const newIndex = sourceCol.items.findIndex((i) => i.id === overId);
      if (oldIndex !== newIndex && newIndex !== -1) {
        const reordered = arrayMove(sourceCol.items, oldIndex, newIndex);
        const newCols = workspace.columns.map((c) => (c.id === sourceCol?.id ? { ...c, items: reordered } : c));
        const newWs = { ...workspace, columns: newCols };
        setWorkspace(newWs);
        setWorkspaceData(newWs);
      }
    } else {
      const movedItem = sourceCol.items.find((i) => i.id === activeId);
      if (!movedItem) return;

      const newSourceItems = sourceCol.items.filter((i) => i.id !== activeId);
      const newTargetItems = [...targetCol.items, movedItem];

      const newCols = workspace.columns.map((c) => {
        if (c.id === sourceCol?.id) return { ...c, items: newSourceItems };
        if (c.id === targetCol?.id) return { ...c, items: newTargetItems };
        return c;
      });

      const newWs = { ...workspace, columns: newCols };
      setWorkspace(newWs);
      setWorkspaceData(newWs);
    }
  };

  const handleAddColumn = () => {
    if (!workspace) return;
    const title = prompt("请输入新看板列名称：");
    if (!title) return;

    const newCol: KanbanColumn = {
      id: `col_${Date.now()}`,
      title,
      color: "#f59e0b",
      items: [],
    };

    const newWs = { ...workspace, columns: [...workspace.columns, newCol] };
    setWorkspace(newWs);
    setWorkspaceData(newWs);
  };

  const handleSuspendInactive = async () => {
    const res = await suspendAllInactiveTabs();
    setSuspendMsg(`成功挂起休眠 ${res.suspendedCount} 个闲置背景标签页！`);
    setTimeout(() => setSuspendMsg(""), 3000);
  };

  if (!workspace) return <div style={{ padding: "16px", fontSize: "12px" }}>加载看板中...</div>;

  return (
    <div style={{ padding: "12px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* 顶部工具栏 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px" }}>📋 工作区看板 (Workspace Kanban)</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleSuspendInactive}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              borderRadius: "4px",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              color: "#059669",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              cursor: "pointer",
              fontWeight: 500,
            }}>
            💤 一键休眠所有背景页
          </button>
          <button
            onClick={handleAddColumn}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              borderRadius: "4px",
              backgroundColor: "var(--primary-color, #6366f1)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
            }}>
            + 新建列
          </button>
        </div>
      </div>

      {suspendMsg && (
        <div style={{ fontSize: "11px", color: "#059669", marginBottom: "8px", fontWeight: 500 }}>
          {suspendMsg}
        </div>
      )}

      {/* DnD 画布 */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", flex: 1, paddingBottom: "8px" }}>
          {workspace.columns.map((col) => (
            <div
              key={col.id}
              style={{
                width: "220px",
                flexShrink: 0,
                backgroundColor: "var(--bg-secondary, #f9fafb)",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border-color, #e5e7eb)",
              }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                <span>{col.title}</span>
                <span
                  style={{
                    fontSize: "10px",
                    backgroundColor: "rgba(0,0,0,0.05)",
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}>
                  {col.items.length}
                </span>
              </div>

              <div style={{ flex: 1, minHeight: "150px" }}>
                <SortableContext items={col.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {col.items.map((item) => (
                    <SortableItem key={item.id} item={item} columnId={col.id} />
                  ))}
                </SortableContext>
              </div>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeItem ? (
            <div
              style={{
                padding: "8px",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                border: "1px solid #6366f1",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontSize: "12px",
                fontWeight: 500,
              }}>
              {activeItem.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
