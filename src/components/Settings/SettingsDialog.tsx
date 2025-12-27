import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '../common';
import { useUIStore, useProjectStore } from '../../stores';
import type { Language, Theme, RelationLabelInitialMode } from '../../types';
import { getAppInfo } from '../../lib/appInfo';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    setLanguage,
    setTheme,
    openAboutDialog,
    isTableCreationRulesOpen,
    toggleTableCreationRulesOpen,
    isBackupSettingsOpen,
    toggleBackupSettingsOpen,
  } = useUIStore();
  const { subscriptionPlan } = useProjectStore();

  const [appVersion, setAppVersion] = useState<string>('');
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const settingsFileBaseName = useMemo(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `waiwaier-settings-${yyyy}${mm}${dd}.json`;
  }, []);

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

  const handleClose = () => {
    setTransferMessage(null);
    onClose();
  };

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

  const coerceNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const sanitizeImportedSettings = (value: unknown) => {
    const source =
      typeof value === 'object' && value !== null && 'settings' in value
        ? (value as { settings: unknown }).settings
        : value;

    if (typeof source !== 'object' || source === null) return null;
    const obj = source as Record<string, unknown>;

    const next: Partial<typeof settings> = {};

    // enum
    if (obj.language === 'ja' || obj.language === 'en') next.language = obj.language;
    if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') next.theme = obj.theme;
    if (obj.relationLabelInitialMode === 'auto' || obj.relationLabelInitialMode === 'hidden' || obj.relationLabelInitialMode === 'custom') {
      next.relationLabelInitialMode = obj.relationLabelInitialMode;
    }

    // boolean
    if (typeof obj.autoBackupEnabled === 'boolean') next.autoBackupEnabled = obj.autoBackupEnabled;

    // number
    const autoBackupIntervalMinutes = coerceNumber(obj.autoBackupIntervalMinutes);
    if (autoBackupIntervalMinutes !== null) next.autoBackupIntervalMinutes = Math.max(1, Math.min(60, Math.trunc(autoBackupIntervalMinutes)));

    const backupRetentionDays = coerceNumber(obj.backupRetentionDays);
    if (backupRetentionDays !== null) next.backupRetentionDays = Math.max(1, Math.min(30, Math.trunc(backupRetentionDays)));

    // string
    if (typeof obj.backupLocation === 'string') next.backupLocation = obj.backupLocation;
    if (typeof obj.tableNamePrefix === 'string') next.tableNamePrefix = obj.tableNamePrefix;
    if (typeof obj.tableNameSuffix === 'string') next.tableNameSuffix = obj.tableNameSuffix;
    if (typeof obj.keyColumnPrefix === 'string') next.keyColumnPrefix = obj.keyColumnPrefix;
    if (typeof obj.keyColumnSuffix === 'string') next.keyColumnSuffix = obj.keyColumnSuffix;
    if (typeof obj.defaultKeyColumnName === 'string') next.defaultKeyColumnName = obj.defaultKeyColumnName;
    if (typeof obj.relationLabelInitialCustomText === 'string') next.relationLabelInitialCustomText = obj.relationLabelInitialCustomText;

    return next;
  };

  const handleExportSettings = async () => {
    try {
      setTransferMessage(null);
      const filePath = await save({
        defaultPath: settingsFileBaseName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) return;

      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        app: {
          name: 'waiwaier-desktop',
          version: appVersion || undefined,
        },
        settings,
      };

      await writeTextFile(filePath, JSON.stringify(payload, null, 2));
      setTransferMessage({ type: 'success', text: t('settings.transfer.exportSuccess') });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTransferMessage({ type: 'error', text: t('settings.transfer.exportError', { message }) });
    }
  };

  const handleImportSettings = async () => {
    try {
      setTransferMessage(null);
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;

      const text = await readTextFile(filePath);
      const parsed = JSON.parse(text) as unknown;
      const next = sanitizeImportedSettings(parsed);

      if (!next) {
        setTransferMessage({ type: 'error', text: t('settings.transfer.importInvalid') });
        return;
      }

      updateSettings(next);
      setTransferMessage({ type: 'success', text: t('settings.transfer.importSuccess') });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTransferMessage({ type: 'error', text: t('settings.transfer.importError', { message }) });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t('settings.title')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Transfer Settings */}
        <section>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2.5">{t('settings.transfer.title')}</h3>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportSettings}>
                {t('settings.transfer.export')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportSettings}>
                {t('settings.transfer.import')}
              </Button>
            </div>

            {transferMessage && (
              <p className={transferMessage.type === 'success' ? 'text-[10px] text-green-600' : 'text-[10px] text-red-600'}>
                {transferMessage.text}
              </p>
            )}

            <p className="text-[10px] text-zinc-400">{t('settings.transfer.description')}</p>
          </div>
        </section>

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

        {/* Table Creation Rules (Collapsible) */}
        <section>
          <button
            type="button"
            onClick={toggleTableCreationRulesOpen}
            className={
              'w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isTableCreationRulesOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.tableCreationRules.title')}</h3>
            <svg
              className={
                'w-4 h-4 transition-transform ' +
                (isTableCreationRulesOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isTableCreationRulesOpen && (
            <div className="mt-2.5 space-y-4">
              {/* Table Name Settings */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-600 mb-2">{t('settings.tableName.title')}</h4>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
                  <Input
                    label={t('settings.tableName.prefix')}
                    placeholder={t('settings.tableName.prefixPlaceholder')}
                    value={settings.tableNamePrefix}
                    onChange={(e) => updateSettings({ tableNamePrefix: e.target.value })}
                  />

                  <div className="w-full">
                    <div className="block text-xs font-medium text-zinc-600 mb-1">&nbsp;</div>
                    <div className="px-1.5 py-[3px] text-sm text-zinc-500 whitespace-nowrap">入力したテーブル名</div>
                  </div>

                  <Input
                    label={t('settings.tableName.suffix')}
                    placeholder={t('settings.tableName.suffixPlaceholder')}
                    value={settings.tableNameSuffix}
                    onChange={(e) => updateSettings({ tableNameSuffix: e.target.value })}
                  />
                </div>
              </div>

              {/* Key Column Name Settings */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-600 mb-2">{t('settings.keyColumn.title')}</h4>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
                    <Input
                      label={t('settings.keyColumn.prefix')}
                      placeholder={t('settings.keyColumn.prefixPlaceholder')}
                      value={settings.keyColumnPrefix}
                      onChange={(e) => updateSettings({ keyColumnPrefix: e.target.value })}
                    />

                    <div className="w-full">
                      <div className="block text-xs font-medium text-zinc-600 mb-1">&nbsp;</div>
                      <div className="px-1.5 py-[3px] text-sm text-zinc-500 whitespace-nowrap">入力したキーカラム名</div>
                    </div>

                    <Input
                      label={t('settings.keyColumn.suffix')}
                      placeholder={t('settings.keyColumn.suffixPlaceholder')}
                      value={settings.keyColumnSuffix}
                      onChange={(e) => updateSettings({ keyColumnSuffix: e.target.value })}
                    />
                  </div>

                  <Input
                    label={t('settings.keyColumn.defaultKeyColumnName')}
                    placeholder={t('settings.keyColumn.defaultKeyColumnNamePlaceholder')}
                    value={settings.defaultKeyColumnName}
                    onChange={(e) => updateSettings({ defaultKeyColumnName: e.target.value })}
                  />

                  <p className="text-[10px] text-zinc-400">{t('settings.keyColumn.description')}</p>
                </div>
              </div>

              {/* Relation Label Settings */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-600 mb-2">{t('settings.relationLabel.title')}</h4>
                <div className="space-y-2.5">
                  <Select
                    label={t('settings.relationLabel.initialMode')}
                    value={settings.relationLabelInitialMode}
                    options={relationLabelModeOptions}
                    onChange={(e) =>
                      updateSettings({
                        relationLabelInitialMode: e.target.value as RelationLabelInitialMode,
                      })
                    }
                  />

                  {settings.relationLabelInitialMode === 'custom' && (
                    <Input
                      label={t('settings.relationLabel.customText')}
                      placeholder={t('settings.relationLabel.customTextPlaceholder')}
                      value={settings.relationLabelInitialCustomText}
                      onChange={(e) => updateSettings({ relationLabelInitialCustomText: e.target.value })}
                    />
                  )}

                  <p className="text-[10px] text-zinc-400">{t('settings.relationLabel.description')}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Backup Settings */}
        <section>
          <button
            type="button"
            onClick={toggleBackupSettingsOpen}
            className={
              'w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isBackupSettingsOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.backup')}</h3>
            <svg
              className={
                'w-4 h-4 transition-transform ' +
                (isBackupSettingsOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isBackupSettingsOpen && (
            <div className="mt-2.5 space-y-2.5">
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
          )}
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
