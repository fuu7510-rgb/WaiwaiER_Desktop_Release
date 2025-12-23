/**
 * ライセンスダイアログコンポーネント
 */
import React, { useState } from 'react';
import { Dialog } from '../common';
import { useLicenseStore } from '../../stores/licenseStore';
import { useTranslation } from 'react-i18next';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseDialog: React.FC<LicenseDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { license, limits, activate, deactivate, isLoading } = useLicenseStore();
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('ライセンスキーを入力してください');
      return;
    }

    setError(null);
    const result = await activate(licenseKey.trim());
    if (!result.success) {
      setError(result.error || 'アクティベーションに失敗しました');
    } else {
      setLicenseKey('');
      onClose();
    }
  };

  const handleDeactivate = () => {
    if (confirm('ライセンスを解除しますか？Freeプランに戻ります。')) {
      deactivate();
    }
  };

  const isPro = license.plan === 'pro';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('license.title', 'ライセンス管理')}
    >
      <div className="space-y-6">
        {/* 現在のプラン表示 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {isPro ? 'Pro プラン' : 'Free プラン'}
              </h3>
              {license.expiresAt && (
                <p className="text-sm text-gray-500 mt-1">
                  有効期限: {license.expiresAt.toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPro
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {isPro ? 'アクティブ' : '無料'}
            </div>
          </div>
        </div>

        {/* プラン制限 */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">現在の制限</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center">
              <span className="w-48">プロジェクト数:</span>
              <span className="font-medium">
                {limits.maxProjects === Infinity ? '無制限' : `${limits.maxProjects}個まで`}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-48">テーブル数/プロジェクト:</span>
              <span className="font-medium">
                {limits.maxTablesPerProject === Infinity
                  ? '無制限'
                  : `${limits.maxTablesPerProject}個まで`}
              </span>
            </li>
            <li className="flex items-center">
              <span className="w-48">プロジェクト暗号化:</span>
              <span className="font-medium">{limits.canEncrypt ? '利用可能' : '利用不可'}</span>
            </li>
            <li className="flex items-center">
              <span className="w-48">優先サポート:</span>
              <span className="font-medium">
                {limits.prioritySupport ? '利用可能' : '利用不可'}
              </span>
            </li>
          </ul>
        </div>

        {/* ライセンスキー入力 */}
        {!isPro && (
          <div className="space-y-3">
            <h4 className="font-medium">ライセンスキーを入力</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                onClick={handleActivate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '処理中...' : 'アクティベート'}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* Pro プランの場合のアクション */}
        {isPro && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              最終検証: {license.lastVerifiedAt.toLocaleString('ja-JP')}
            </div>
            <button
              onClick={handleDeactivate}
              className="text-sm text-red-600 hover:text-red-700"
            >
              ライセンスを解除
            </button>
          </div>
        )}

        {/* アップグレード案内 */}
        {!isPro && (
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              Proプランにアップグレード
            </h4>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              月額¥300で無制限のプロジェクトとテーブル、暗号化機能をご利用いただけます。
            </p>
            <a
              href="https://waiwai-er.lemonsqueezy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              購入ページへ
            </a>
          </div>
        )}

        {/* 閉じるボタン */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            閉じる
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default LicenseDialog;
