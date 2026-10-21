/**
 * 剪贴板内容类型检测与美化工具
 */

export interface ContentAnalysis {
  isImage: boolean;
  isJson: boolean;
  isUrl: boolean;
  formattedJson?: string;
  imageUrl?: string;
}

/**
 * 判断字符串是否为图片（Base64 Data URI 或常见图片 URL）
 */
export function isImageContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (trimmed.startsWith("data:image/")) return true;
  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg|ico)(\?.*)?$/i.test(trimmed)) return true;
  return false;
}

/**
 * 判断并尝试解析 JSON 格式
 */
export function isJsonContent(content: string): { isJson: boolean; formatted?: string } {
  if (!content) return { isJson: false };
  const trimmed = content.trim();
  if ((!trimmed.startsWith("{") || !trimmed.endsWith("}")) && (!trimmed.startsWith("[") || !trimmed.endsWith("]"))) {
    return { isJson: false };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      return {
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2),
      };
    }
  } catch {
    // 不是合法 JSON
  }
  return { isJson: false };
}

/**
 * 判断字符串是否为 HTTP/HTTPS 网址
 */
export function isUrlContent(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed);
}

/**
 * 综合分析剪贴板条目内容特征
 */
export function analyzeContent(content: string): ContentAnalysis {
  const isImg = isImageContent(content);
  const jsonResult = isJsonContent(content);
  const isUrl = isUrlContent(content);

  return {
    isImage: isImg,
    imageUrl: isImg ? content.trim() : undefined,
    isJson: jsonResult.isJson,
    formattedJson: jsonResult.formatted,
    isUrl,
  };
}
