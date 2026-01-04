import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Button } from '../../common';
import { useUIStore } from '../../../stores';
import type { Language, Theme, FontSize } from '../../../types';
import { SettingsSectionContent } from '../SettingsSectionContent';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { sanitizeImportedSettings, generateSettingsFileName, SETTINGS_SCHEMA_VERSION } from '../../../lib/settings';
import { getAppInfo } from '../../../lib/appInfo';

export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const {
    settings,
    setLanguage,
    setTheme,
    setFontSize,
    updateSettings,
  } = useUIStore();

  const [appVersion, setAppVersion] = useState<string>('');
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const info = await getAppInfo();
      setAppVersion(info.version);
    })();
  }, []);

  const handleExportSettings = async () => {
    try {
      setTransferMessage(null);
      const filePath = await save({
        defaultPath: generateSettingsFileName(),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) return;

      const payload = {
        schemaVersion: SETTINGS_SCHEMA_VERSION,
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

  const languageOptions = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.themes.light') },
    { value: 'dark', label: t('settings.themes.dark') },
    { value: 'system', label: t('settings.themes.system') },
  ];

  const fontSizeOptions = [
    { value: 'small', label: t('settings.fontSizes.small') },
    { value: 'medium', label: t('settings.fontSizes.medium') },
    { value: 'large', label: t('settings.fontSizes.large') },
  ];

  return (
    <SettingsSectionContent
      title={t('settings.general')}
      description={t('settings.generalDescription')}
    >
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

      <Select
        label={t('settings.fontSize')}
        value={settings.fontSize}
        options={fontSizeOptions}
        onChange={(e) => setFontSize(e.target.value as FontSize)}
      />

      {/* Settings Transfer */}
      <div
        className="mt-6 pt-4 border-t space-y-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <h4 className="text-xs font-semibold theme-text-secondary">
          {t('settings.transfer.title')}
        </h4>
        <p className="text-[10px] theme-text-muted">
          {t('settings.transfer.description')}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportSettings}>
            {t('settings.transfer.export')}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleImportSettings}>
            {t('settings.transfer.import')}
          </Button>
        </div>
        {transferMessage && (
          <p 
            className="text-[10px]"
            style={{ color: transferMessage.type === 'success' ? 'var(--success)' : 'var(--danger)' }}
          >
            {transferMessage.text}
          </p>
        )}
      </div>
    </SettingsSectionContent>
  );
}
