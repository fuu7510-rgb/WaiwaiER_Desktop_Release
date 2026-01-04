import { useTranslation } from 'react-i18next';
import { Select } from '../../common';
import { useUIStore } from '../../../stores';
import type { Language, Theme, FontSize } from '../../../types';
import { SettingsCollapsibleSection } from '../SettingsCollapsibleSection';

export function GeneralSettingsSection() {
  const { t } = useTranslation();
  const {
    settings,
    setLanguage,
    setTheme,
    setFontSize,
    isGeneralSettingsOpen,
    toggleGeneralSettingsOpen,
  } = useUIStore();

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
    <SettingsCollapsibleSection
      title={t('settings.general')}
      isOpen={isGeneralSettingsOpen}
      onToggle={toggleGeneralSettingsOpen}
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
    </SettingsCollapsibleSection>
  );
}
