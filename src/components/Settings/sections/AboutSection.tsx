import { useTranslation } from 'react-i18next';
import { Button } from '../../common';
import { useUIStore } from '../../../stores';
import { SettingsSectionContent } from '../SettingsSectionContent';

interface AboutSectionProps {
  appVersion: string;
}

export function AboutSection({ appVersion }: AboutSectionProps) {
  const { t } = useTranslation();
  const { openAboutDialog } = useUIStore();

  return (
    <SettingsSectionContent
      title={t('settings.about')}
    >
      <div className="flex flex-col items-center py-6">
        {/* App Icon */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--accent-bg)' }}
        >
          <svg className="w-10 h-10" style={{ color: 'var(--accent-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>

        <h3 className="text-base font-semibold theme-text-primary">{t('app.title')}</h3>
        <p className="text-xs theme-text-muted mb-4">
          {t('app.version', { version: appVersion || '0.0.0' })}
        </p>

        <Button variant="secondary" size="sm" onClick={openAboutDialog}>
          {t('about.open')}
        </Button>

        <p className="mt-6 text-[10px] theme-text-muted">
          © 2025 Fuaze. All rights reserved.
        </p>
      </div>
    </SettingsSectionContent>
  );
}
