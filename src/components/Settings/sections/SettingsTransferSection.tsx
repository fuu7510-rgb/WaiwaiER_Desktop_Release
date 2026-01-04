import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../common';
import { useUIStore } from '../../../stores';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { sanitizeImportedSettings, generateSettingsFileName, SETTINGS_SCHEMA_VERSION } from '../../../lib/settings';

interface SettingsTransferSectionProps {
  appVersion: string;
}

export function SettingsTransferSection({ appVersion }: SettingsTransferSectionProps) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useUIStore();
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide mb-2.5 theme-text-muted">{t('settings.transfer.title')}</h3>

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
          <p 
            className="text-[10px]"
            style={{ color: transferMessage.type === 'success' ? 'var(--success)' : 'var(--danger)' }}
          >
            {transferMessage.text}
          </p>
        )}

        <p className="text-[10px] theme-text-muted">{t('settings.transfer.description')}</p>
      </div>
    </section>
  );
}
