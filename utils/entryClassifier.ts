/**
 * utils/entryClassifier.ts
 *
 * 智能信息分类模块，分析剪贴板内容特征并生成自动标签。
 */

export function classifyEntryContent(content: string): string[] {
  if (!content) return [];
  const text = content.trim();
  const tags: string[] = [];

  // 1. URL 网址检测
  if (/^(https?:\/\/|www\.)[^\s]+$/i.test(text)) {
    tags.push("#URL");
  }

  // 2. Email 邮箱检测
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text)) {
    tags.push("#Email");
  }

  // 3. Hex / RGB 颜色代码检测
  if (/^#([0-9a-fA-F]{3}){1,2}$|^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(text)) {
    tags.push("#Color");
  }

  // 4. JSON 结构检测
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      JSON.parse(text);
      tags.push("#JSON");
    } catch {}
  }

  // 5. Code 代码段特征检测
  const codeKeywords = [
    "function ",
    "const ",
    "let ",
    "var ",
    "import ",
    "export ",
    "class ",
    "public ",
    "private ",
    "return ",
    "def ",
    "async ",
    "await ",
    "<div",
    "SELECT ",
    "FROM ",
    "WHERE ",
  ];
  if (codeKeywords.some((kw) => text.includes(kw)) || (text.includes(";") && text.includes("{"))) {
    tags.push("#Code");
  }

  // 6. 敏感 Token / API Key 特征检测
  if (
    /sk-[a-zA-Z0-9]{20,}/.test(text) ||
    /ghp_[a-zA-Z0-9]{30,}/.test(text) ||
    /AKIA[0-9A-Z]{16}/.test(text) ||
    /eyJ[a-zA-Z0-9_-]{10,}\.eyJ/.test(text)
  ) {
    tags.push("#Secret");
  }

  return tags;
}
