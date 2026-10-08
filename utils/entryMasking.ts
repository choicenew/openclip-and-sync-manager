/**
 * utils/entryMasking.ts
 *
 * 敏感数据识别、遮罩与 TTL 自动清空清理工具。
 */

import type { Entry } from "~types/entry";

const SENSITIVE_PATTERNS = [
  // 中国 18 位身份证
  /\b[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]\b/i,
  // 银行卡 (13 - 19 位)
  /\b[1-9]\d{12,18}\b/,
  // JWT Token
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/,
  // OpenAI / GitHub / AWS Key
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  // 密码或密钥关键词
  /password\s*[:=]\s*\S+/i,
  /access_token\s*[:=]\s*\S+/i,
];

export function isSensitiveContent(content: string): boolean {
  if (!content) return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content));
}

export function maskSensitiveContent(content: string): string {
  if (!content) return content;
  let masked = content;

  // 1. 脱敏身份证号
  masked = masked.replace(
    /\b([1-9]\d{5})(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}([\dX])\b/gi,
    "$1********$2",
  );

  // 2. 脱敏 API Keys
  masked = masked.replace(/(sk-[a-zA-Z0-9]{4})[a-zA-Z0-9]{12,}([a-zA-Z0-9]{4})/g, "$1****$2");
  masked = masked.replace(/(ghp_[a-zA-Z0-9]{4})[a-zA-Z0-9]{20,}([a-zA-Z0-9]{4})/g, "$1****$2");

  // 3. 通用长密码脱敏
  if (masked === content && isSensitiveContent(content) && content.length > 8) {
    return content.slice(0, 3) + "••••••••" + content.slice(-3);
  }

  return masked;
}

/**
 * 清理超时已过期的敏感剪贴板条目 (TTL 清理)
 */
export function purgeExpiredSensitiveEntries(entries: Entry[], ttlMinutes: number): Entry[] {
  if (!ttlMinutes || ttlMinutes <= 0) return entries;
  const cutoffTime = Date.now() - ttlMinutes * 60 * 1000;

  return entries.filter((e) => {
    if (!isSensitiveContent(e.content)) return true;
    const itemTime = e.copiedAt || e.createdAt;
    return itemTime >= cutoffTime;
  });
}
