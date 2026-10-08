import React, { useEffect, useMemo, useState } from "react";

import { useCopyEntry } from "~popup/hooks/useCopyEntry";
import { getEntries } from "~utils/storage";

export interface SearchResultItem {
  id: string;
  type: "clipboard" | "tab" | "bookmark" | "history";
  title: string;
  subtitle?: string;
  url?: string;
  content?: string;
  icon: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OmniboxSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const copyEntry = useCopyEntry();

  useEffect(() => {
    if (!isOpen) return;

    async function loadSearchData() {
      const results: SearchResultItem[] = [];

      // 1. 剪贴板条目
      try {
        const entries = await getEntries();
        for (const e of entries.slice(0, 50)) {
          results.push({
            id: `clip_${e.id}`,
            type: "clipboard",
            title: e.content.slice(0, 100),
            subtitle: `复制于 ${new Date(e.copiedAt || e.createdAt).toLocaleTimeString()}`,
            content: e.content,
            icon: "📋",
          });
        }
      } catch {}

      // 2. 标签页数据
      if (typeof chrome !== "undefined" && chrome.tabs) {
        try {
          const tabs = await chrome.tabs.query({ currentWindow: true });
          for (const t of tabs) {
            results.push({
              id: `tab_${t.id}`,
              type: "tab",
              title: t.title || t.url || "Untitled",
              subtitle: t.url,
              url: t.url,
              icon: "🌐",
            });
          }
        } catch {}
      }

      // 3. 书签树
      if (typeof chrome !== "undefined" && chrome.bookmarks) {
        try {
          const bms = await chrome.bookmarks.getRecent(30);
          for (const b of bms) {
            if (b.url) {
              results.push({
                id: `bm_${b.id}`,
                type: "bookmark",
                title: b.title || b.url,
                subtitle: b.url,
                url: b.url,
                icon: "🔖",
              });
            }
          }
        } catch {}
      }

      setItems(results);
    }

    loadSearchData();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.slice(0, 20);
    const q = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          (item.content && item.content.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [items, query]);

  const handleSelect = (item: SearchResultItem) => {
    if (item.type === "clipboard" && item.content) {
      copyEntry({ id: item.id, content: item.content, createdAt: Date.now() });
    } else if (item.url) {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: item.url });
      } else {
        window.open(item.url, "_blank");
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(2px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "60px",
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "480px",
          maxWidth: "92vw",
          backgroundColor: "var(--card-bg, #ffffff)",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)",
          border: "1px solid var(--border-color, #e5e7eb)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>
        {/* 顶部搜索输入框与独立关闭按钮 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-color, #e5e7eb)",
            gap: "8px",
          }}>
          <span style={{ fontSize: "16px" }}>🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="全量极速模糊搜索 (剪贴板 / 标签页 / 书签)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "13px",
              backgroundColor: "transparent",
              color: "var(--text-color, #1f2937)",
            }}
          />
          <button
            onClick={onClose}
            title="关闭搜索框 (Esc)"
            style={{
              border: "none",
              backgroundColor: "rgba(0,0,0,0.05)",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "12px",
              color: "var(--text-dimmed, #6b7280)",
            }}>
            ✕
          </button>
        </div>

        {/* 搜索结果列表 */}
        <div style={{ maxHeight: "320px", overflowY: "auto", padding: "6px" }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text-dimmed)" }}>
              未匹配到任何剪贴板或网页记录
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: idx === selectedIndex ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  marginBottom: "2px",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
                  <span style={{ fontSize: "14px" }}>{item.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text-dimmed)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(0,0,0,0.05)",
                    color: "var(--text-dimmed)",
                    marginLeft: "8px",
                    flexShrink: 0,
                  }}>
                  {item.type === "clipboard" ? "剪贴板" : item.type === "tab" ? "标签页" : "书签"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* 底部快捷键提示 */}
        <div
          style={{
            padding: "6px 14px",
            backgroundColor: "var(--bg-secondary, #f9fafb)",
            borderTop: "1px solid var(--border-color, #e5e7eb)",
            fontSize: "10px",
            color: "var(--text-dimmed)",
            display: "flex",
            justifyContent: "space-between",
          }}>
          <span>提示：点击项目即可一键复制/打开页</span>
          <span>按 <kbd style={{ padding: "1px 4px", border: "1px solid #ccc", borderRadius: "3px" }}>Esc</kbd> 独立关闭</span>
        </div>
      </div>
    </div>
  );
};
