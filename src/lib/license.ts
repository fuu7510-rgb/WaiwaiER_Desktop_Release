/**
 * ライセンス管理モジュール
 * オフラインライセンス検証（署名付きJWT方式）
 */

// LemonSqueezy用の公開鍵（本番環境では環境変数から読み込む）
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
REPLACE_WITH_ACTUAL_KEY_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
REPLACE_WITH_ACTUAL_KEY_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
REPLACE_WITH_ACTUAL_KEY_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
QIDAQAB
-----END PUBLIC KEY-----`;

// プラン定義
export type LicensePlan = 'free' | 'pro';

// ライセンス情報の型定義
export interface LicenseInfo {
  plan: LicensePlan;
  userId?: string;
  email?: string;
  expiresAt: Date | null; // null = 永久（Freeプラン）
  activatedAt: Date;
  lastVerifiedAt: Date;
  machineId?: string;
  isValid: boolean;
  gracePeriodDays: number; // 猶予期間残日数
}

// ライセンス制限
export interface LicenseLimits {
  maxProjects: number;
  maxTablesPerProject: number;
  canExport: boolean;
  canEncrypt: boolean;
  prioritySupport: boolean;
}

// JWTペイロード
interface LicenseJWTPayload {
  sub: string; // ユーザーID
  plan: LicensePlan;
  email?: string;
  exp: number; // 有効期限（Unix timestamp）
  iat: number; // 発行日時
  mid?: string; // マシンID
  iss: string; // 発行者
}

// プランごとの制限
const PLAN_LIMITS: Record<LicensePlan, LicenseLimits> = {
  free: {
    maxProjects: 3,
    maxTablesPerProject: 5,
    canExport: true,
    canEncrypt: false,
    prioritySupport: false,
  },
  pro: {
    maxProjects: Infinity,
    maxTablesPerProject: Infinity,
    canExport: true,
    canEncrypt: true,
    prioritySupport: true,
  },
};

// 猶予期間設定（日数）
const GRACE_PERIOD = {
  WARNING_START: 30, // 警告開始
  LIMIT_START: 37, // 機能制限開始
  READONLY_START: 45, // 読み取り専用開始
};

// ライセンスストレージキー
const LICENSE_STORAGE_KEY = 'waiwai_license';
const LAST_ONLINE_CHECK_KEY = 'waiwai_last_online_check';

/**
 * Base64URL文字列をArrayBufferにデコード
 */
function base64UrlDecode(base64url: string): ArrayBuffer {
  // Base64URLをBase64に変換
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * PEM形式の公開鍵をCryptoKeyにインポート
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  // PEMヘッダー/フッターを除去
  const pemContents = pemKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');

  const binaryDer = base64UrlDecode(
    pemContents.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  );

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

/**
 * JWTを検証（RS256）
 */
async function verifyJWT(token: string): Promise<LicenseJWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // ヘッダー検証
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
    if (header.alg !== 'RS256') {
      console.error('Unsupported algorithm:', header.alg);
      return null;
    }

    // 署名検証
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    const publicKey = await importPublicKey(PUBLIC_KEY_PEM);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      signedData
    );

    if (!isValid) {
      console.error('Invalid JWT signature');
      return null;
    }

    // ペイロードをデコード
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    ) as LicenseJWTPayload;

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * マシンIDを生成（簡易版）
 */
async function generateMachineId(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');

  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(components)
  );

  return Array.from(new Uint8Array(hash))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * ライセンスキーをアクティベート
 */
export async function activateLicense(
  licenseKey: string
): Promise<{ success: boolean; error?: string; license?: LicenseInfo }> {
  try {
    const payload = await verifyJWT(licenseKey);

    if (!payload) {
      return { success: false, error: 'ライセンスキーが無効です' };
    }

    // 有効期限チェック
    const now = Date.now() / 1000;
    if (payload.exp < now) {
      return { success: false, error: 'ライセンスの有効期限が切れています' };
    }

    // 発行者チェック
    if (payload.iss !== 'waiwai-desktop' && payload.iss !== 'lemonsqueezy') {
      return { success: false, error: '不正なライセンス発行者です' };
    }

    // ライセンス情報を構築
    const license: LicenseInfo = {
      plan: payload.plan,
      userId: payload.sub,
      email: payload.email,
      expiresAt: new Date(payload.exp * 1000),
      activatedAt: new Date(),
      lastVerifiedAt: new Date(),
      machineId: await generateMachineId(),
      isValid: true,
      gracePeriodDays: 0,
    };

    // ローカルに保存
    saveLicenseToStorage(license, licenseKey);

    return { success: true, license };
  } catch (error) {
    console.error('License activation failed:', error);
    return { success: false, error: 'ライセンスのアクティベーションに失敗しました' };
  }
}

/**
 * ライセンス情報をローカルストレージに保存
 */
function saveLicenseToStorage(license: LicenseInfo, licenseKey: string): void {
  const data = {
    license: {
      ...license,
      expiresAt: license.expiresAt?.toISOString() || null,
      activatedAt: license.activatedAt.toISOString(),
      lastVerifiedAt: license.lastVerifiedAt.toISOString(),
    },
    licenseKey,
  };
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data));
}

/**
 * ローカルストレージからライセンス情報を読み込み
 */
export function loadLicenseFromStorage(): LicenseInfo | null {
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    const license = data.license;

    return {
      ...license,
      expiresAt: license.expiresAt ? new Date(license.expiresAt) : null,
      activatedAt: new Date(license.activatedAt),
      lastVerifiedAt: new Date(license.lastVerifiedAt),
    };
  } catch (error) {
    console.error('Failed to load license from storage:', error);
    return null;
  }
}

/**
 * 保存されているライセンスキーを取得
 */
export function getStoredLicenseKey(): string | null {
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored).licenseKey || null;
  } catch {
    return null;
  }
}

/**
 * ライセンスを削除（ログアウト）
 */
export function clearLicense(): void {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
  localStorage.removeItem(LAST_ONLINE_CHECK_KEY);
}

/**
 * 現在のライセンス状態を検証
 */
export function validateCurrentLicense(): LicenseInfo {
  const license = loadLicenseFromStorage();

  if (!license) {
    // Freeプランとして扱う
    return getFreeLicense();
  }

  // 有効期限チェック
  const now = new Date();
  if (license.expiresAt && license.expiresAt < now) {
    // 期限切れの場合、猶予期間を計算
    const daysSinceExpiry = Math.floor(
      (now.getTime() - license.expiresAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceExpiry >= GRACE_PERIOD.READONLY_START) {
      // 読み取り専用モード
      return {
        ...getFreeLicense(),
        gracePeriodDays: -daysSinceExpiry,
        isValid: false,
      };
    } else if (daysSinceExpiry >= GRACE_PERIOD.LIMIT_START) {
      // Free版相当に制限
      return {
        ...getFreeLicense(),
        gracePeriodDays: GRACE_PERIOD.READONLY_START - daysSinceExpiry,
        isValid: false,
      };
    } else if (daysSinceExpiry >= GRACE_PERIOD.WARNING_START) {
      // 警告表示（まだ全機能使用可能）
      return {
        ...license,
        gracePeriodDays: GRACE_PERIOD.LIMIT_START - daysSinceExpiry,
        isValid: true,
      };
    }
  }

  // オフライン猶予期間チェック
  const daysSinceLastVerified = Math.floor(
    (now.getTime() - license.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastVerified >= GRACE_PERIOD.READONLY_START) {
    return {
      ...getFreeLicense(),
      gracePeriodDays: -daysSinceLastVerified,
      isValid: false,
    };
  } else if (daysSinceLastVerified >= GRACE_PERIOD.LIMIT_START) {
    return {
      ...getFreeLicense(),
      gracePeriodDays: GRACE_PERIOD.READONLY_START - daysSinceLastVerified,
      isValid: false,
    };
  } else if (daysSinceLastVerified >= GRACE_PERIOD.WARNING_START) {
    return {
      ...license,
      gracePeriodDays: GRACE_PERIOD.LIMIT_START - daysSinceLastVerified,
      isValid: true,
    };
  }

  return {
    ...license,
    gracePeriodDays: GRACE_PERIOD.WARNING_START - daysSinceLastVerified,
    isValid: true,
  };
}

/**
 * Freeプランのライセンス情報を取得
 */
function getFreeLicense(): LicenseInfo {
  return {
    plan: 'free',
    expiresAt: null,
    activatedAt: new Date(),
    lastVerifiedAt: new Date(),
    isValid: true,
    gracePeriodDays: 0,
  };
}

/**
 * 現在のプランの制限を取得
 */
export function getLicenseLimits(license?: LicenseInfo): LicenseLimits {
  const currentLicense = license || validateCurrentLicense();
  return PLAN_LIMITS[currentLicense.plan];
}

/**
 * 制限チェック: プロジェクト数
 */
export function canCreateProject(currentCount: number, license?: LicenseInfo): boolean {
  const limits = getLicenseLimits(license);
  return currentCount < limits.maxProjects;
}

/**
 * 制限チェック: テーブル数
 */
export function canCreateTable(currentCount: number, license?: LicenseInfo): boolean {
  const limits = getLicenseLimits(license);
  return currentCount < limits.maxTablesPerProject;
}

/**
 * オンライン検証を試行（バックグラウンド）
 */
export async function tryOnlineVerification(): Promise<boolean> {
  const licenseKey = getStoredLicenseKey();
  if (!licenseKey) return false;

  try {
    // LemonSqueezy APIで検証（将来実装）
    // const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ license_key: licenseKey }),
    // });

    // ローカル再検証（オフライン用）
    const payload = await verifyJWT(licenseKey);
    if (!payload) return false;

    // 検証成功、lastVerifiedAtを更新
    const license = loadLicenseFromStorage();
    if (license) {
      license.lastVerifiedAt = new Date();
      saveLicenseToStorage(license, licenseKey);
    }

    localStorage.setItem(LAST_ONLINE_CHECK_KEY, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/**
 * ライセンス状態の警告メッセージを取得
 */
export function getLicenseWarning(license: LicenseInfo): string | null {
  if (!license.isValid) {
    if (license.gracePeriodDays < 0) {
      return '読み取り専用モードです。オンラインでライセンスを更新してください。';
    }
    return `機能制限中です。${license.gracePeriodDays}日後に読み取り専用になります。`;
  }

  if (license.gracePeriodDays > 0 && license.gracePeriodDays <= 7) {
    return `オンライン検証が必要です。あと${license.gracePeriodDays}日間全機能が使用可能です。`;
  }

  return null;
}

/**
 * 開発用: テスト用ライセンスキーを生成（本番では使用しない）
 */
export function generateTestLicenseKey(
  plan: LicensePlan = 'pro',
  daysValid: number = 365
): string {
  // 注意: これはテスト用の簡易実装です
  // 本番環境では、サーバーサイドで秘密鍵を使って署名します
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: LicenseJWTPayload = {
    sub: 'test-user-001',
    plan,
    email: 'test@example.com',
    exp: Math.floor(Date.now() / 1000) + daysValid * 24 * 60 * 60,
    iat: Math.floor(Date.now() / 1000),
    iss: 'waiwai-desktop',
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

  // テスト用の簡易署名（本番ではRS256を使用）
  const signature = 'test-signature';

  return `${encode(header)}.${encode(payload)}.${signature}`;
}
