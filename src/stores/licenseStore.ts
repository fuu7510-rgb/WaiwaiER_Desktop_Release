/**
 * ライセンス状態管理ストア
 */
import { create } from 'zustand';
import type { LicenseInfo, LicenseLimits, LicensePlan } from '../lib/license';
import {
  validateCurrentLicense,
  getLicenseLimits,
  activateLicense,
  clearLicense,
  tryOnlineVerification,
  getLicenseWarning,
  canCreateProject,
  canCreateTable,
} from '../lib/license';

interface LicenseState {
  // ライセンス情報
  license: LicenseInfo;
  limits: LicenseLimits;
  warning: string | null;

  // UI状態
  isLoading: boolean;
  showUpgradeDialog: boolean;
  showLicenseDialog: boolean;

  // アクション
  refreshLicense: () => void;
  activate: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
  deactivate: () => void;
  checkOnline: () => Promise<boolean>;

  // 制限チェック
  canCreateProject: (currentCount: number) => boolean;
  canCreateTable: (currentCount: number) => boolean;

  // UI制御
  setShowUpgradeDialog: (show: boolean) => void;
  setShowLicenseDialog: (show: boolean) => void;
}

// Freeプランの初期値
const initialLicense: LicenseInfo = {
  plan: 'free',
  expiresAt: null,
  activatedAt: new Date(),
  lastVerifiedAt: new Date(),
  isValid: true,
  gracePeriodDays: 0,
};

export const useLicenseStore = create<LicenseState>((set, get) => ({
  // 初期状態
  license: initialLicense,
  limits: getLicenseLimits(initialLicense),
  warning: null,
  isLoading: false,
  showUpgradeDialog: false,
  showLicenseDialog: false,

  // ライセンス情報を更新
  refreshLicense: () => {
    const license = validateCurrentLicense();
    const limits = getLicenseLimits(license);
    const warning = getLicenseWarning(license);
    set({ license, limits, warning });
  },

  // ライセンスをアクティベート
  activate: async (licenseKey: string) => {
    set({ isLoading: true });
    try {
      const result = await activateLicense(licenseKey);
      if (result.success && result.license) {
        const limits = getLicenseLimits(result.license);
        const warning = getLicenseWarning(result.license);
        set({
          license: result.license,
          limits,
          warning,
          isLoading: false,
          showLicenseDialog: false,
        });
      } else {
        set({ isLoading: false });
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'ライセンスの処理中にエラーが発生しました' };
    }
  },

  // ライセンスを解除
  deactivate: () => {
    clearLicense();
    const license = validateCurrentLicense();
    const limits = getLicenseLimits(license);
    set({ license, limits, warning: null });
  },

  // オンライン検証を試行
  checkOnline: async () => {
    const success = await tryOnlineVerification();
    if (success) {
      get().refreshLicense();
    }
    return success;
  },

  // プロジェクト作成可能かチェック
  canCreateProject: (currentCount: number) => {
    return canCreateProject(currentCount, get().license);
  },

  // テーブル作成可能かチェック
  canCreateTable: (currentCount: number) => {
    return canCreateTable(currentCount, get().license);
  },

  // UI制御
  setShowUpgradeDialog: (show: boolean) => set({ showUpgradeDialog: show }),
  setShowLicenseDialog: (show: boolean) => set({ showLicenseDialog: show }),
}));

// アプリ起動時にライセンスを検証
export function initializeLicenseStore(): void {
  const store = useLicenseStore.getState();
  store.refreshLicense();

  // バックグラウンドでオンライン検証を試行
  setTimeout(() => {
    store.checkOnline();
  }, 5000);

  // 定期的にオンライン検証を試行（1時間ごと）
  setInterval(
    () => {
      store.checkOnline();
    },
    60 * 60 * 1000
  );
}
