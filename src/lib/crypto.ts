/**
 * 暗号化ユーティリティ
 * 
 * 要件:
 * - パスフレーズからArgon2idで鍵導出
 * - AES-256-GCMでデータ暗号化
 * - SQLCipherはRust側で処理（将来実装）
 */

// Web Crypto APIを使用した暗号化

export type EncryptedPayloadV1 = {
  v: 1;
  encrypted: string;
  salt: string;
  iv: string;
};

function ensureArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy as Uint8Array<ArrayBuffer>;
}

function ensureArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return ensureArrayBufferView(bytes).buffer;
}

// PBKDF2で鍵導出（Web Crypto APIで利用可能）
// 注: Argon2idはWebAssemblyモジュールが必要なため、
// MVPではPBKDF2をフォールバックとして使用
async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: ensureArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ソルトを生成
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// IVを生成
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

// データを暗号化
export async function encryptData(
  data: string,
  passphrase: string
): Promise<EncryptedPayloadV1> {
  const saltBytes: Uint8Array<ArrayBuffer> = ensureArrayBufferView(generateSalt());
  const ivBytes: Uint8Array<ArrayBuffer> = ensureArrayBufferView(generateIV());
  const key = await deriveKey(passphrase, saltBytes);
  
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encodedData
  );
  
  return {
    v: 1,
    encrypted: arrayBufferToBase64(encryptedBuffer),
    salt: arrayBufferToBase64(saltBytes),
    iv: arrayBufferToBase64(ivBytes),
  };
}

// データを復号
export async function decryptData(
  encryptedData: string,
  saltBase64: string,
  ivBase64: string,
  passphrase: string
): Promise<string> {
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedData);
  
  const key = await deriveKey(passphrase, new Uint8Array(salt));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// ヘルパー関数: ArrayBufferをBase64に変換
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ヘルパー関数: Base64をArrayBufferに変換
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// パスフレーズの強度をチェック
export function checkPassphraseStrength(passphrase: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  if (passphrase.length >= 8) {
    score += 1;
  } else {
    feedback.push('8文字以上にしてください');
  }
  
  if (passphrase.length >= 12) {
    score += 1;
  }
  
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) {
    score += 1;
  } else {
    feedback.push('大文字と小文字を含めてください');
  }
  
  if (/\d/.test(passphrase)) {
    score += 1;
  } else {
    feedback.push('数字を含めてください');
  }
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(passphrase)) {
    score += 1;
  }
  
  return { score, feedback };
}

// パスフレーズのハッシュを生成（検証用）
export async function hashPassphrase(passphrase: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(hashBuffer);
}

// パスフレーズを検証
export async function verifyPassphrase(
  passphrase: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const hash = await hashPassphrase(passphrase, salt);
  return hash === expectedHash;
}
