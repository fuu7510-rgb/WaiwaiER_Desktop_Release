import { useTranslation } from 'react-i18next';
import { Input } from '../../common';
import { useUIStore } from '../../../stores';
import { SettingsCollapsibleSection } from '../SettingsCollapsibleSection';

export function BackupSettingsSection() {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    isBackupSettingsOpen,
    toggleBackupSettingsOpen,
  } = useUIStore();

  return (
    <SettingsCollapsibleSection
      title={t('settings.backup')}
      isOpen={isBackupSettingsOpen}
      onToggle={toggleBackupSettingsOpen}
    >
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.autoBackupEnabled}
          onChange={(e) => updateSettings({ autoBackupEnabled: e.target.checked })}
          className="w-3.5 h-3.5 rounded focus:ring-2 theme-input-border"
        />
        <span className="text-xs theme-text-secondary">{t('settings.autoBackup.enable')}</span>
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
    </SettingsCollapsibleSection>
  );
}
