import packageJson from "../package.json";

/** 自动从 package.json 获取唯一版本号定义 (Single Source of Truth) */
export const VERSION = packageJson.version;
