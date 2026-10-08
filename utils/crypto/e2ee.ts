/**
 * utils/crypto/e2ee.ts
 *
 * 基于 Web Crypto API (crypto.subtle) 的端到端零知识加密 (E2EE) 模块。
 * 采用 PBKDF2 密钥派生 + AES-256-GCM 认证加密，保证离端数据百分百密文上云。
 */

const E2EE_PREFIX = "ENC:v1:";
const PBKDF2_ITERATIONS = 100000;

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("当前环境不支持 Web Crypto API");
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const passphraseKey = await subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * 将明文字符串加密为带前缀标识的 Base64 密文
 */
export async function encryptE2EEText(plainText: string, passphrase: string): Promise<string> {
  if (!passphrase || !plainText) return plainText;

  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const encryptedBuf = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText),
  );

  const payload = {
    s: bufferToBase64(salt.buffer),
    i: bufferToBase64(iv.buffer),
    c: bufferToBase64(encryptedBuf),
  };

  return `${E2EE_PREFIX}${btoa(JSON.stringify(payload))}`;
}

/**
 * 解密带有 ENC:v1: 前缀的密文，非密文或无密码时平滑返回原串
 */
export async function decryptE2EEText(text: string, passphrase: string): Promise<string> {
  if (!text || !text.startsWith(E2EE_PREFIX)) {
    return text; // 未加密数据或平滑回退
  }

  if (!passphrase) {
    return "[已加密内容：请输入 E2EE 主密码解密]";
  }

  try {
    const subtle = getSubtleCrypto();
    const rawB64 = text.slice(E2EE_PREFIX.length);
    const jsonStr = atob(rawB64);
    const payload = JSON.parse(jsonStr) as { s: string; i: string; c: string };

    const salt = new Uint8Array(base64ToBuffer(payload.s));
    const iv = new Uint8Array(base64ToBuffer(payload.i));
    const ciphertext = base64ToBuffer(payload.c);

    const key = await deriveKey(passphrase, salt);
    const decryptedBuf = await subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuf);
  } catch (err) {
    console.warn("[E2EE] Decryption failed:", err);
    return "[E2EE 解密失败：主密码不匹配]";
  }
}
