import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '../common';
import { useUIStore, useProjectStore } from '../../stores';
import type { Language, Theme } from '../../types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { settings, updateSettings, setLanguage, setTheme } = useUIStore();
  const { subscriptionPlan } = useProjectStore();

  const languageOptions = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.themes.light') },
    { value: 'dark', label: t('settings.themes.dark') },
    { value: 'system', label: t('settings.themes.system') },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="lg"
    >
      <div className="space-y-6">
        {/* General Settings */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.general')}</h3>
          
          <div className="space-y-4">
            <Select
              label={t('settings.language')}
              value={settings.language}
              options={languageOptions}
              onChange={(e) => setLanguage(e.target.value as Language)}
            />
            
            <Select
              label={t('settings.theme')}
              value={settings.theme}
              options={themeOptions}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />
          </div>
        </section>

        {/* Backup Settings */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.backup')}</h3>
          
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoBackupEnabled}
                onChange={(e) => updateSettings({ autoBackupEnabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('settings.autoBackup.enable')}</span>
            </label>
            
            {settings.autoBackupEnabled && (
              <>
                <Input
                  label={t('settings.autoBackup.interval')}
                  type="number"
                  min={1}
                  max={60}
                  value={settings.autoBackupIntervalMinutes}
                  onChange={(e) => updateSettings({ autoBackupIntervalMinutes: parseInt(e.target.value) || 5 })}
                />
                
                <Input
                  label={t('settings.autoBackup.retention')}
                  type="number"
                  min={1}
                  max={30}
                  value={settings.backupRetentionDays}
                  onChange={(e) => updateSettings({ backupRetentionDays: parseInt(e.target.value) || 7 })}
                />
              </>
            )}
          </div>
        </section>

        {/* License Settings */}
        <section>
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.license')}</h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{t('license.currentPlan')}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscriptionPlan === 'pro' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {subscriptionPlan === 'pro' ? t('license.pro') : t('license.free')}
              </span>
            </div>
            
            {subscriptionPlan === 'free' && (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <h4 className="font-medium mb-2">{t('license.proFeatures.title')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t('license.proFeatures.unlimitedProjects')}</li>
                    <li>{t('license.proFeatures.unlimitedTables')}</li>
                    <li>{t('license.proFeatures.prioritySupport')}</li>
                  </ul>
                </div>
                
                <Input
                  label={t('license.licenseKey')}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
                
                <Button className="w-full">{t('license.activate')}</Button>
              </div>
            )}
            
            {subscriptionPlan === 'pro' && (
              <div className="text-sm text-gray-600">
                <p className="text-green-600 mb-2">✓ ライセンス有効</p>
                <Button variant="secondary" size="sm">{t('license.deactivate')}</Button>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="border-t pt-4">
          <div className="text-center text-sm text-gray-500">
            <p className="font-medium">{t('app.title')}</p>
            <p>{t('app.version', { version: '0.1.0' })}</p>
            <p className="mt-2">© 2025 Fuaze. All rights reserved.</p>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
