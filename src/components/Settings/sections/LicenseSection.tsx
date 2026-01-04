import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../common';
import { useProjectStore } from '../../../stores';
import { SettingsSectionContent } from '../SettingsSectionContent';

export function LicenseSection() {
  const { t } = useTranslation();
  const { subscriptionPlan } = useProjectStore();

  return (
    <SettingsSectionContent
      title={t('settings.license')}
      description={t('settings.licenseDescription')}
    >
      <div className="rounded p-4 theme-bg-muted">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs theme-text-muted">{t('license.currentPlan')}</span>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: subscriptionPlan === 'pro' ? 'var(--accent-bg)' : 'var(--muted)',
              color: subscriptionPlan === 'pro' ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}
          >
            {subscriptionPlan === 'pro' ? t('license.pro') : t('license.free')}
          </span>
        </div>
        
        {subscriptionPlan === 'free' && (
          <div className="space-y-3">
            <div className="text-xs theme-text-muted">
              <h4 className="font-medium mb-2 theme-text-secondary">{t('license.proFeatures.title')}</h4>
              <ul className="list-disc list-inside space-y-1">
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
          <div className="text-xs theme-text-muted">
            <p className="mb-2 flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('license.valid')}
            </p>
            <Button variant="secondary" size="sm">{t('license.deactivate')}</Button>
          </div>
        )}
      </div>
    </SettingsSectionContent>
  );
}
