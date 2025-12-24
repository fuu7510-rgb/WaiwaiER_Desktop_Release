/**
 * ライセンス状態管理ストア
 */
import { create } from 'zustand';
import type { LicenseInfo, LicenseLimits } from '../lib/license';
import {
  getLicenseLimits,
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

// アルファでは常にProプランとして扱う（アクティベート機能は未提供）
const initialLicense: LicenseInfo = {
  plan: 'pro',
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
    const limits = getLicenseLimits(initialLicense);
    set({ license: initialLicense, limits, warning: null });
  },

  // ライセンスをアクティベート
  activate: async (licenseKey: string) => {
    void licenseKey;
    return { success: false, error: '現在アクティベート機能は利用できません（アルファでは常にProです）' };
  },

  // ライセンスを解除
  deactivate: () => {
    // アルファでは常にPro扱い
    const limits = getLicenseLimits(initialLicense);
    set({ license: initialLicense, limits, warning: null });
  },

  // オンライン検証を試行
  checkOnline: async () => {
    return false;
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
}
