import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../common';
import { useProjectStore } from '../../../stores';

export function LicenseSection() {
  const { t } = useTranslation();
  const { subscriptionPlan } = useProjectStore();

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide mb-2.5 theme-text-muted">{t('settings.license')}</h3>
      
      <div className="rounded p-3 theme-bg-muted">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] theme-text-muted">{t('license.currentPlan')}</span>
          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: subscriptionPlan === 'pro' ? 'var(--accent-bg)' : 'var(--muted)',
              color: subscriptionPlan === 'pro' ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}
          >
            {subscriptionPlan === 'pro' ? t('license.pro') : t('license.free')}
          </span>
        </div>
        
        {subscriptionPlan === 'free' && (
          <div className="space-y-2.5">
            <div className="text-[10px] theme-text-muted">
              <h4 className="font-medium mb-1.5 theme-text-secondary">{t('license.proFeatures.title')}</h4>
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
          <div className="text-[10px] theme-text-muted">
            <p className="mb-1.5 flex items-center gap-1" style={{ color: 'var(--success)' }}>
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
  );
}
