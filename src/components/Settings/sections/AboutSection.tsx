import { useTranslation } from 'react-i18next';
import { Button } from '../../common';
import { useUIStore } from '../../../stores';

interface AboutSectionProps {
  appVersion: string;
}

export function AboutSection({ appVersion }: AboutSectionProps) {
  const { t } = useTranslation();
  const { openAboutDialog } = useUIStore();

  return (
    <section className="border-t pt-3 theme-border">
      <div className="text-center text-[10px] theme-text-muted">
        <p className="font-medium theme-text-secondary">{t('app.title')}</p>
        <p>{t('app.version', { version: appVersion || '0.0.0' })}</p>
        <div className="mt-2 flex justify-center">
          <Button variant="secondary" size="sm" onClick={openAboutDialog}>
            {t('about.open')}
          </Button>
        </div>
        <p className="mt-1">© 2025 Fuaze. All rights reserved.</p>
      </div>
    </section>
  );
}
