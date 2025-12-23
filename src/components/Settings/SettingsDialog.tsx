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
      <div className="space-y-4">
        {/* General Settings */}
        <section>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.general')}</h3>
          
          <div className="space-y-2.5">
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
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.backup')}</h3>
          
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoBackupEnabled}
                onChange={(e) => updateSettings({ autoBackupEnabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
              />
              <span className="text-xs text-zinc-600">{t('settings.autoBackup.enable')}</span>
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
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.license')}</h3>
          
          <div className="bg-zinc-50 rounded p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-zinc-500">{t('license.currentPlan')}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                subscriptionPlan === 'pro' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-zinc-200 text-zinc-600'
              }`}>
                {subscriptionPlan === 'pro' ? t('license.pro') : t('license.free')}
              </span>
            </div>
            
            {subscriptionPlan === 'free' && (
              <div className="space-y-2.5">
                <div className="text-[10px] text-zinc-500">
                  <h4 className="font-medium mb-1.5 text-zinc-600">{t('license.proFeatures.title')}</h4>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>{t('license.proFeatures.unlimitedProjects')}</li>
                    <li>{t('license.proFeatures.unlimitedTables')}</li>
                    <li>{t('license.proFeatures.prioritySupport')}</li>
                  </ul>
                </div>
                
                <Input
                  label={t('license.licenseKey')}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
                
                <Button className="w-full" size="sm">{t('license.activate')}</Button>
              </div>
            )}
            
            {subscriptionPlan === 'pro' && (
              <div className="text-[10px] text-zinc-500">
                <p className="text-green-600 mb-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ライセンス有効
                </p>
                <Button variant="secondary" size="sm">{t('license.deactivate')}</Button>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="border-t border-zinc-100 pt-3">
          <div className="text-center text-[10px] text-zinc-400">
            <p className="font-medium text-zinc-500">{t('app.title')}</p>
            <p>{t('app.version', { version: '0.1.0' })}</p>
            <p className="mt-1">© 2025 Fuaze. All rights reserved.</p>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
