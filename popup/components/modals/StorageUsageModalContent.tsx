import { useAtom } from "jotai";
import React, { useEffect } from "react";

import { entriesAtom, storageUsageAtom } from "~popup/states/atoms";
import {
  entriesToStorageUsage,
  formatBytes,
  getPerformanceColor,
  getPerformanceScore,
  getPerformanceStatus,
} from "~utils/storageUsage";

export const StorageUsageModalContent: React.FC = () => {
  const [entries] = useAtom(entriesAtom);
  const [usage, setUsage] = useAtom(storageUsageAtom);

  useEffect(() => {
    entriesToStorageUsage(entries).then(setUsage);
  }, [entries]);

  return (
    <div className="native-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="flex-between">
        <span style={{ fontWeight: 700, fontSize: "14px" }}>📊 存储容量与性能统计</span>
      </div>

      {!usage ? (
        <div style={{ textAlign: "center", color: "var(--text-dimmed)", padding: "20px" }}>计算占用容量中...</div>
      ) : (
        <>
          {/* 总量概览 */}
          <div className="native-card-subtle flex-between" style={{ padding: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>已用总存储容量</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary-color)" }}>
                {formatBytes(usage.totalSize)} <span style={{ fontSize: "12px", color: "var(--text-dimmed)" }}>({usage.itemCount} 条)</span>
              </div>
            </div>
            <span className="native-badge native-badge-blue">已连接 DB</span>
          </div>

          {/* 本地 vs 云端分布 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="native-card-subtle" style={{ padding: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>💻 本地 Local 存储</div>
              <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatBytes(usage.localSize)}</div>
              <div style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>{usage.localItemCount} 条记录</div>
            </div>

            <div className="native-card-subtle" style={{ padding: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dimmed)" }}>☁️ 云端 Cloud 存储</div>
              <div style={{ fontSize: "15px", fontWeight: 700 }}>{formatBytes(usage.cloudSize)}</div>
              <div style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>{usage.cloudItemCount} 条记录</div>
            </div>
          </div>

          {/* 均值与最大记录 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="native-card-subtle" style={{ padding: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>平均单条容量：</span>
              <span style={{ fontWeight: 600, fontSize: "11px" }}>{formatBytes(usage.averageItemSize)}</span>
            </div>
            <div className="native-card-subtle" style={{ padding: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-dimmed)" }}>最大单条记录：</span>
              <span style={{ fontWeight: 600, fontSize: "11px" }}>{formatBytes(usage.largestItemSize)}</span>
            </div>
          </div>

          {/* 性能评估 */}
          <div className="native-card-subtle" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div className="flex-between">
              <span style={{ fontWeight: 600, fontSize: "11px" }}>性能影响评估 (Performance)</span>
              <span className="native-badge">{getPerformanceStatus(usage)}</span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-dimmed)", lineHeight: "1.4" }}>
              插件底层索引已针对海量剪贴板进行内存优化，支持无上限容纳。删除极旧或超长无用记录有助于保持极致的响应速度。
            </div>
          </div>
        </>
      )}
    </div>
  );
};
