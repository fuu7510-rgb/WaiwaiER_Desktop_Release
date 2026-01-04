import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../common';
import { getAppInfo } from '../../lib/appInfo';
import { useUIStore, type SettingsSectionId } from '../../stores/uiStore';
import { SettingsSidebar } from './SettingsSidebar';
import {
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
  const { activeSettingsSection, setActiveSettingsSection } = useUIStore();

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

  const handleSectionChange = useCallback((section: SettingsSectionId) => {
    setActiveSettingsSection(section);
  }, [setActiveSettingsSection]);

  const renderContent = () => {
    switch (activeSettingsSection) {
      case 'general':
        return <GeneralSettingsSection />;
      case 'tableCreationRules':
        return <TableCreationRulesSection />;
      case 'relationSettings':
        return <RelationSettingsSection />;
      case 'commonColumns':
        return <CommonColumnsSection />;
      case 'backup':
        return <BackupSettingsSection />;
      case 'noteParams':
        return <NoteParamsSettingsSection />;
      case 'shortcuts':
        return <ShortcutSettingsSection />;
      case 'license':
        return <LicenseSection />;
      case 'about':
        return <AboutSection appVersion={appVersion} />;
      default:
        return <GeneralSettingsSection />;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="3xl"
    >
      <div 
        className="flex -mx-4 -my-3"
        style={{ height: '70vh', minHeight: '480px' }}
      >
        {/* Sidebar Navigation */}
        <div
          className="flex-shrink-0 w-52 border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          <SettingsSidebar
            activeSection={activeSettingsSection}
            onSectionChange={handleSectionChange}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </Dialog>
  );
}
