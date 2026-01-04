import { useTranslation } from 'react-i18next';
import { Input } from '../../common';
import { useUIStore } from '../../../stores';
import { SettingsCollapsibleSection } from '../SettingsCollapsibleSection';

export function TableCreationRulesSection() {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
    isTableCreationRulesOpen,
    toggleTableCreationRulesOpen,
  } = useUIStore();

  return (
    <SettingsCollapsibleSection
      title={t('settings.tableCreationRules.title')}
      isOpen={isTableCreationRulesOpen}
      onToggle={toggleTableCreationRulesOpen}
    >
      <div className="space-y-4">
        {/* Table Name Settings */}
        <div>
          <h4 className="text-xs font-semibold mb-2 theme-text-secondary">{t('settings.tableName.title')}</h4>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
            <Input
              label={t('settings.tableName.prefix')}
              placeholder={t('settings.tableName.prefixPlaceholder')}
              value={settings.tableNamePrefix}
              onChange={(e) => updateSettings({ tableNamePrefix: e.target.value })}
            />

            <div className="w-full">
              <div className="block text-xs font-medium mb-1 theme-text-secondary">&nbsp;</div>
              <div className="px-1.5 py-[3px] text-sm whitespace-nowrap theme-text-muted">{t('settings.tableName.inputPlaceholder')}</div>
            </div>

            <Input
              label={t('settings.tableName.suffix')}
              placeholder={t('settings.tableName.suffixPlaceholder')}
              value={settings.tableNameSuffix}
              onChange={(e) => updateSettings({ tableNameSuffix: e.target.value })}
            />
          </div>
        </div>

        {/* Key Column Name Settings */}
        <div>
          <h4 className="text-xs font-semibold mb-2 theme-text-secondary">{t('settings.keyColumn.title')}</h4>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2.5">
              <Input
                label={t('settings.keyColumn.prefix')}
                placeholder={t('settings.keyColumn.prefixPlaceholder')}
                value={settings.keyColumnPrefix}
                onChange={(e) => updateSettings({ keyColumnPrefix: e.target.value })}
              />

              <div className="w-full">
                <div className="block text-xs font-medium mb-1 theme-text-secondary">&nbsp;</div>
                <div className="px-1.5 py-[3px] text-sm whitespace-nowrap theme-text-muted">{t('settings.keyColumn.inputPlaceholder')}</div>
              </div>

              <Input
                label={t('settings.keyColumn.suffix')}
                placeholder={t('settings.keyColumn.suffixPlaceholder')}
                value={settings.keyColumnSuffix}
                onChange={(e) => updateSettings({ keyColumnSuffix: e.target.value })}
              />
            </div>

            <Input
              label={t('settings.keyColumn.defaultKeyColumnName')}
              placeholder={t('settings.keyColumn.defaultKeyColumnNamePlaceholder')}
              value={settings.defaultKeyColumnName}
              onChange={(e) => updateSettings({ defaultKeyColumnName: e.target.value })}
            />

            <p className="text-[10px] theme-text-muted">{t('settings.keyColumn.description')}</p>
          </div>
        </div>
      </div>
    </SettingsCollapsibleSection>
  );
}
