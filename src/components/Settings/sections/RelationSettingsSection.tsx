import { useTranslation } from 'react-i18next';
import { Input, Select, IconPicker } from '../../common';
import { useUIStore } from '../../../stores';
import type { RelationLabelInitialMode } from '../../../types';
import { SettingsSectionContent } from '../SettingsSectionContent';

export function RelationSettingsSection() {
  const { t } = useTranslation();
  const {
    settings,
    updateSettings,
  } = useUIStore();

  const relationLabelModeOptions = [
    { value: 'auto', label: t('settings.relationLabel.modes.auto') },
    { value: 'hidden', label: t('settings.relationLabel.modes.hidden') },
    { value: 'custom', label: t('settings.relationLabel.modes.custom') },
  ];

  return (
    <SettingsSectionContent
      title={t('settings.relationSettings.title')}
      description={t('settings.relationSettings.description')}
    >
      <div className="space-y-4">
        {/* Edge Animation */}
        <div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.edgeAnimationEnabled ?? true}
              onChange={(e) => updateSettings({ edgeAnimationEnabled: e.target.checked })}
              className="w-3.5 h-3.5 rounded focus:ring-2 theme-input-border"
            />
            <span className="text-xs theme-text-secondary">{t('settings.editor.edgeAnimation.label')}</span>
          </label>
          <p className="mt-0.5 text-[10px] theme-text-muted">{t('settings.editor.edgeAnimation.hint')}</p>
        </div>

        {/* Edge Line Style */}
        <div>
          <h4 className="text-xs font-semibold mb-2 theme-text-secondary">{t('settings.relationSettings.lineStyle.title')}</h4>
          <Select
            label={t('settings.relationSettings.lineStyle.label')}
            value={settings.edgeLineStyle ?? 'solid'}
            options={[
              { value: 'solid', label: t('settings.relationSettings.lineStyle.modes.solid') },
              { value: 'dashed', label: t('settings.relationSettings.lineStyle.modes.dashed') },
              { value: 'dotted', label: t('settings.relationSettings.lineStyle.modes.dotted') },
            ]}
            onChange={(e) => updateSettings({ edgeLineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })}
          />
          <p className="mt-1 text-[10px] theme-text-muted">{t('settings.relationSettings.lineStyle.description')}</p>
        </div>

        {/* Relation Label Settings */}
        <div>
          <h4 className="text-xs font-semibold mb-2 theme-text-secondary">{t('settings.relationLabel.title')}</h4>
          <div className="space-y-2.5">
            <Select
              label={t('settings.relationLabel.initialMode')}
              value={settings.relationLabelInitialMode}
              options={relationLabelModeOptions}
              onChange={(e) =>
                updateSettings({
                  relationLabelInitialMode: e.target.value as RelationLabelInitialMode,
                })
              }
            />

            {settings.relationLabelInitialMode === 'custom' && (
              <Input
                label={t('settings.relationLabel.customText')}
                placeholder={t('settings.relationLabel.customTextPlaceholder')}
                value={settings.relationLabelInitialCustomText}
                onChange={(e) => updateSettings({ relationLabelInitialCustomText: e.target.value })}
              />
            )}

            <p className="text-[10px] theme-text-muted">{t('settings.relationLabel.description')}</p>
          </div>
        </div>

        {/* Edge Follower Icon */}
        <div className="space-y-2">
          <div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.edgeFollowerIconEnabled ?? false}
                onChange={(e) => updateSettings({ edgeFollowerIconEnabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded focus:ring-2 theme-input-border"
              />
              <span className="text-xs theme-text-secondary">{t('settings.editor.edgeFollowerIcon.label')}</span>
            </label>
            <p className="mt-0.5 text-[10px] theme-text-muted">{t('settings.editor.edgeFollowerIcon.hint')}</p>
          </div>

          <div 
            className="grid grid-cols-3 gap-2.5"
            style={{ opacity: (settings.edgeFollowerIconEnabled ?? false) ? 1 : 0.5 }}
          >
            <IconPicker
              label={t('settings.editor.edgeFollowerIcon.icon')}
              value={settings.edgeFollowerIconName ?? 'arrow-right'}
              onChange={(iconName: string) => updateSettings({ edgeFollowerIconName: iconName })}
              disabled={!(settings.edgeFollowerIconEnabled ?? false)}
            />

            <Input
              label={t('settings.editor.edgeFollowerIcon.size')}
              type="number"
              min={8}
              max={48}
              step={1}
              disabled={!(settings.edgeFollowerIconEnabled ?? false)}
              value={String(settings.edgeFollowerIconSize ?? 14)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                updateSettings({ edgeFollowerIconSize: Math.max(8, Math.min(48, Math.trunc(n))) });
              }}
            />

            <Input
              label={t('settings.editor.edgeFollowerIcon.speed')}
              type="number"
              min={10}
              max={1000}
              step={5}
              disabled={!(settings.edgeFollowerIconEnabled ?? false)}
              value={String(settings.edgeFollowerIconSpeed ?? 90)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                updateSettings({ edgeFollowerIconSpeed: Math.max(10, Math.min(1000, n)) });
              }}
            />
          </div>
        </div>
      </div>
    </SettingsSectionContent>
  );
}
