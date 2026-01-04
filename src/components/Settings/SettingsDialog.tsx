import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../common';
import { getAppInfo } from '../../lib/appInfo';
import {
  SettingsTransferSection,
  GeneralSettingsSection,
  TableCreationRulesSection,
  RelationSettingsSection,
  CommonColumnsSection,
  BackupSettingsSection,
  NoteParamsSettingsSection,
  ShortcutSettingsSection,
  LicenseSection,
  AboutSection,
} from './sections';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Transfer Settings */}
        <SettingsTransferSection appVersion={appVersion} />

        {/* General Settings */}
        <GeneralSettingsSection />

        {/* Table Creation Rules */}
        <TableCreationRulesSection />

        {/* Relation Settings */}
        <RelationSettingsSection />

        {/* Common Columns */}
        <CommonColumnsSection />

        {/* Backup Settings */}
        <BackupSettingsSection />

        {/* Note Parameters Settings */}
        <NoteParamsSettingsSection />

        {/* Shortcut Keys Settings */}
        <ShortcutSettingsSection />

        {/* License Settings */}
        <LicenseSection />

        {/* About */}
        <AboutSection appVersion={appVersion} />
      </div>
    </Dialog>
  );
}
