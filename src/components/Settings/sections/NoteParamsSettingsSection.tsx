import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../common';
import { useUIStore } from '../../../stores';
import {
  NOTE_PARAM_CATEGORIES,
  getNoteParamsGroupedByCategory,
  getDefaultNoteParamOutputSettings,
  type NoteParamCategory,
} from '../../../lib/appsheet/noteParameters';
import { SettingsCollapsibleSection } from '../SettingsCollapsibleSection';

export function NoteParamsSettingsSection() {
  const { t, i18n } = useTranslation();
  const {
    settings,
    isNoteParamsSettingsOpen,
    toggleNoteParamsSettingsOpen,
    updateNoteParamOutputSetting,
    resetNoteParamOutputSettings,
  } = useUIStore();

  const isJapanese = useMemo(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    return lang === 'ja' || lang.startsWith('ja-');
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <SettingsCollapsibleSection
      title={t('settings.noteParams.title')}
      isOpen={isNoteParamsSettingsOpen}
      onToggle={toggleNoteParamsSettingsOpen}
    >
      <div className="space-y-3">
        <p className="text-[10px] theme-text-muted">{t('settings.noteParams.description')}</p>

        {/* Reset Button */}
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={resetNoteParamOutputSettings}>
            {t('settings.noteParams.resetToDefault')}
          </Button>
        </div>

        {/* Parameters Table */}
        <div className="max-h-80 overflow-y-auto border rounded theme-border theme-bg-card">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 theme-bg-card">
              <tr className="border-b theme-border">
                <th className="px-1.5 py-1 text-center w-10 theme-text-muted" title={isJapanese ? '新規取り込み時' : 'On Import'}>{t('settings.noteParams.tableHeaders.import')}</th>
                <th className="px-1.5 py-1 text-center w-10 theme-text-muted" title={isJapanese ? '構造再生成時' : 'On Regenerate'}>{t('settings.noteParams.tableHeaders.regenerate')}</th>
                <th className="px-1.5 py-1 text-center w-10 theme-text-muted">{t('settings.noteParams.tableHeaders.output')}</th>
                <th className="px-1.5 py-1 text-left theme-text-muted">{t('settings.noteParams.tableHeaders.keyName')}</th>
                <th className="px-1.5 py-1 text-left theme-text-muted">{t('settings.noteParams.tableHeaders.note')}</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(NOTE_PARAM_CATEGORIES) as NoteParamCategory[]).map((category) => {
                const params = getNoteParamsGroupedByCategory().get(category) ?? [];
                if (params.length === 0) return null;
                const categoryInfo = NOTE_PARAM_CATEGORIES[category];
                return (
                  <React.Fragment key={category}>
                    {/* Category Header Row */}
                    <tr className="theme-bg-muted">
                      <td colSpan={5} className="px-1.5 py-1 font-semibold theme-text-muted">
                        {isJapanese ? categoryInfo.labelJa : categoryInfo.labelEn}
                      </td>
                    </tr>
                    {/* Parameter Rows */}
                    {params.map((param) => {
                      const outputSettings = settings.noteParamOutputSettings ?? getDefaultNoteParamOutputSettings();
                      const isEnabled = outputSettings[param.key] ?? false;
                      const importOk = param.importStatus === 'verified' || param.importStatus === 'unstable';
                      const regenerateOk = param.regenerateStatus === 'verified' || param.regenerateStatus === 'unstable';
                      const noteText = isJapanese ? param.noteJa : param.noteEn;
                      return (
                        <tr key={param.key} className="border-b theme-border hover:theme-bg-muted/50">
                          <td className="px-1.5 py-0.5 text-center">
                            <span
                              className={importOk ? 'text-xs font-semibold theme-text-primary' : 'text-xs font-semibold theme-text-muted'}
                              title={
                                isJapanese
                                  ? importOk
                                    ? '✓ 新規取り込みで反映される（確認済み/不安定）'
                                    : '✕ 新規取り込みで反映されない（未対応/未検証）'
                                  : importOk
                                    ? '✓ Applied on Import (Verified/Unstable)'
                                    : '✕ Not applied on Import (Unsupported/Untested)'
                              }
                              aria-label={
                                isJapanese
                                  ? importOk
                                    ? '新規取り込み: 反映される'
                                    : '新規取り込み: 反映されない'
                                  : importOk
                                    ? 'Import: applied'
                                    : 'Import: not applied'
                              }
                            >
                              {importOk ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="px-1.5 py-0.5 text-center">
                            <span
                              className={regenerateOk ? 'text-xs font-semibold theme-text-primary' : 'text-xs font-semibold theme-text-muted'}
                              title={
                                isJapanese
                                  ? regenerateOk
                                    ? '✓ 構造再生成で反映される（確認済み/不安定）'
                                    : '✕ 構造再生成で反映されない（未対応/未検証）'
                                  : regenerateOk
                                    ? '✓ Applied on Regenerate (Verified/Unstable)'
                                    : '✕ Not applied on Regenerate (Unsupported/Untested)'
                              }
                              aria-label={
                                isJapanese
                                  ? regenerateOk
                                    ? '構造再生成: 反映される'
                                    : '構造再生成: 反映されない'
                                  : regenerateOk
                                    ? 'Regenerate: applied'
                                    : 'Regenerate: not applied'
                              }
                            >
                              {regenerateOk ? '✓' : '✕'}
                            </span>
                          </td>
                          <td className="px-1.5 py-0.5 text-center">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => updateNoteParamOutputSetting(param.key, e.target.checked)}
                              className="w-3 h-3 rounded focus:ring-2 theme-input-border"
                            />
                          </td>
                          <td className="px-1.5 py-0.5 theme-text-primary">
                            <span title={param.key}>
                              {param.key}
                              <span className="ml-1 theme-text-muted">
                                ({isJapanese ? param.labelJa : param.labelEn})
                              </span>
                            </span>
                          </td>
                          <td className="px-1.5 py-0.5 theme-text-muted truncate max-w-[120px]" title={noteText || ''}>
                            {noteText || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] theme-text-muted">{t('settings.noteParams.legend')}</p>
      </div>
    </SettingsCollapsibleSection>
  );
}
