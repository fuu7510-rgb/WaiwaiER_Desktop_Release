import { useTranslation } from 'react-i18next';
import { Button } from '../../common';
import { useUIStore } from '../../../stores';
import { useShortcutEditor } from '../../../hooks/useShortcutEditor';
import { formatShortcutForDisplay } from '../../../lib/shortcuts';
import { SettingsSectionContent } from '../SettingsSectionContent';
import type { ShortcutActionDefinition } from '../../../types';

interface ShortcutSettingsSectionProps {
  /** 親コンポーネントで編集状態をリセットするためのコールバック */
  onEditingStateChange?: (isEditing: boolean) => void;
}

export function ShortcutSettingsSection({ onEditingStateChange }: ShortcutSettingsSectionProps) {
  const { t } = useTranslation();
  const {
    settings,
    updateShortcutKey,
    resetShortcutKeys,
  } = useUIStore();

  const {
    shortcutActionsByCategory,
    mergedShortcutKeys,
    editingShortcutId,
    recordingKey,
    startEditing,
    cancelEditing,
    clearShortcut,
    handleKeyDown,
  } = useShortcutEditor({
    shortcutKeys: settings.shortcutKeys ?? {},
    updateShortcutKey,
  });

  return (
    <SettingsSectionContent
      title={t('settings.shortcuts.title')}
      description={t('settings.shortcuts.description')}
    >
      <div className="space-y-4">
        {/* Reset button */}
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={resetShortcutKeys}>
            {t('settings.shortcuts.resetToDefault')}
          </Button>
        </div>

        {/* Shortcut categories */}
        {(['file', 'edit', 'view', 'navigation'] as const).map((category) => {
          const actions = shortcutActionsByCategory[category];
          if (actions.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-xs font-semibold mb-2 theme-text-secondary">
                {t(`settings.shortcuts.categories.${category}`)}
              </h4>
              <div className="space-y-1">
                {actions.map((action: ShortcutActionDefinition) => {
                  const currentKey = mergedShortcutKeys[action.id] || '';
                  const isEditing = editingShortcutId === action.id;

                  return (
                    <div
                      key={action.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded"
                      style={{ backgroundColor: isEditing ? 'var(--muted)' : undefined }}
                    >
                      <span className="text-xs theme-text-secondary">
                        {t(action.labelKey)}
                      </span>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            readOnly
                            placeholder={t('settings.shortcuts.pressKey')}
                            value={recordingKey}
                            onKeyDown={(e) => handleKeyDown(e, action.id)}
                            onBlur={cancelEditing}
                            className="w-32 px-2 py-1 text-xs text-center rounded border theme-input-border theme-input-bg focus:outline-none focus:ring-2"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              startEditing(action.id);
                              onEditingStateChange?.(true);
                            }}
                            className="min-w-[80px] px-2 py-1 text-xs text-center rounded border theme-input-border transition-colors"
                            style={{ backgroundColor: 'var(--input-bg)' }}
                            title={t('settings.shortcuts.clickToEdit')}
                          >
                            {currentKey ? formatShortcutForDisplay(currentKey) : (
                              <span className="theme-text-muted">{t('settings.shortcuts.notSet')}</span>
                            )}
                          </button>
                        )}
                        {currentKey && !isEditing && (
                          <button
                            type="button"
                            onClick={() => clearShortcut(action.id)}
                            className="p-1 text-xs rounded theme-text-muted transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            title={t('settings.shortcuts.clear')}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSectionContent>
  );
}
