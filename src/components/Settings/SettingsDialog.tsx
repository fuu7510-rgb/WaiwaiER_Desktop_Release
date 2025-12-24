import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '../common';
import { useUIStore, useProjectStore } from '../../stores';
import type { Language, Theme, RelationLabelInitialMode } from '../../types';
import { getAppInfo } from '../../lib/appInfo';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const { settings, updateSettings, setLanguage, setTheme, openAboutDialog } = useUIStore();
  const { subscriptionPlan } = useProjectStore();

  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      const info = await getAppInfo();
      if (cancelled) return;
      setAppVersion(info.version);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const languageOptions = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.themes.light') },
    { value: 'dark', label: t('settings.themes.dark') },
    { value: 'system', label: t('settings.themes.system') },
  ];

  const relationLabelModeOptions = [
    { value: 'auto', label: t('settings.relationLabel.modes.auto') },
    { value: 'hidden', label: t('settings.relationLabel.modes.hidden') },
    { value: 'custom', label: t('settings.relationLabel.modes.custom') },
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

        {/* Table Name Settings */}
        <section>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.tableName.title')}</h3>
          
          <div className="space-y-2.5">
            <Input
              label={t('settings.tableName.prefix')}
              placeholder={t('settings.tableName.prefixPlaceholder')}
              value={settings.tableNamePrefix}
              onChange={(e) => updateSettings({ tableNamePrefix: e.target.value })}
            />
            
            <Input
              label={t('settings.tableName.suffix')}
              placeholder={t('settings.tableName.suffixPlaceholder')}
              value={settings.tableNameSuffix}
              onChange={(e) => updateSettings({ tableNameSuffix: e.target.value })}
            />
          </div>
        </section>

        {/* Key Column Name Settings */}
        <section>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.keyColumn.title')}</h3>
          
          <div className="space-y-2.5">
            <Input
              label={t('settings.keyColumn.prefix')}
              placeholder={t('settings.keyColumn.prefixPlaceholder')}
              value={settings.keyColumnPrefix}
              onChange={(e) => updateSettings({ keyColumnPrefix: e.target.value })}
            />
            
            <Input
              label={t('settings.keyColumn.suffix')}
              placeholder={t('settings.keyColumn.suffixPlaceholder')}
              value={settings.keyColumnSuffix}
              onChange={(e) => updateSettings({ keyColumnSuffix: e.target.value })}
            />
            
            <Input
              label={t('settings.keyColumn.defaultKeyColumnName')}
              placeholder={t('settings.keyColumn.defaultKeyColumnNamePlaceholder')}
              value={settings.defaultKeyColumnName}
              onChange={(e) => updateSettings({ defaultKeyColumnName: e.target.value })}
            />
            
            <p className="text-[10px] text-zinc-400">
              {t('settings.keyColumn.description')}
            </p>
          </div>
        </section>

        {/* Relation Label Settings */}
        <section>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.relationLabel.title')}</h3>

          <div className="space-y-2.5">
            <Select
              label={t('settings.relationLabel.initialMode')}
              value={settings.relationLabelInitialMode}
              options={relationLabelModeOptions}
              onChange={(e) => updateSettings({ relationLabelInitialMode: e.target.value as RelationLabelInitialMode })}
            />

            {settings.relationLabelInitialMode === 'custom' && (
              <Input
                label={t('settings.relationLabel.customText')}
                placeholder={t('settings.relationLabel.customTextPlaceholder')}
                value={settings.relationLabelInitialCustomText}
                onChange={(e) => updateSettings({ relationLabelInitialCustomText: e.target.value })}
              />
            )}

            <p className="text-[10px] text-zinc-400">
              {t('settings.relationLabel.description')}
            </p>
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
                  {t('license.valid')}
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
            <p>{t('app.version', { version: appVersion || '0.0.0' })}</p>
            <div className="mt-2 flex justify-center">
              <Button variant="secondary" size="sm" onClick={openAboutDialog}>
                {t('about.open')}
              </Button>
            </div>
            <p className="mt-1">© 2025 Fuaze. All rights reserved.</p>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
