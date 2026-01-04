import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../../common';
import { useUIStore } from '../../../stores';
import type { ColumnType, CommonColumnDefinition, ColumnConstraints } from '../../../types';
import { APPSHEET_COLUMN_TYPES } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { SettingsCollapsibleSection } from '../SettingsCollapsibleSection';

const RAW_NOTE_OVERRIDE_KEY = '__AppSheetNoteOverride';

export function CommonColumnsSection() {
  const { t, i18n } = useTranslation();
  const {
    settings,
    updateSettings,
    isCommonColumnsOpen,
    toggleCommonColumnsOpen,
  } = useUIStore();

  const [selectedCommonColumnId, setSelectedCommonColumnId] = useState<string | null>(null);

  const isJapanese = useMemo(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    return lang === 'ja' || lang.startsWith('ja-');
  }, [i18n.language, i18n.resolvedLanguage]);

  const tEn = useMemo(() => i18n.getFixedT('en'), [i18n]);
  const tJa = useMemo(() => i18n.getFixedT('ja'), [i18n]);

  const commonColumnTypes: ColumnType[] = [...APPSHEET_COLUMN_TYPES];

  const commonColumns = settings.commonColumns ?? [];
  const selectedCommonColumn = selectedCommonColumnId
    ? commonColumns.find((c) => c.id === selectedCommonColumnId) ?? null
    : null;

  const applyCommonColumnsSetting = (next: CommonColumnDefinition[]) => {
    updateSettings({ commonColumns: next });
  };

  const ensureSelectedCommonColumn = (next: CommonColumnDefinition[]) => {
    if (!selectedCommonColumnId) return;
    if (next.some((c) => c.id === selectedCommonColumnId)) return;
    setSelectedCommonColumnId(next[0]?.id ?? null);
  };

  const addCommonColumn = () => {
    const nextItem: CommonColumnDefinition = {
      id: uuidv4(),
      name: `CommonColumn${commonColumns.length + 1}`,
      type: 'Text',
      constraints: {},
    };
    const next = [...commonColumns, nextItem];
    applyCommonColumnsSetting(next);
    setSelectedCommonColumnId(nextItem.id);
  };

  const updateCommonColumn = (id: string, updates: Partial<CommonColumnDefinition>) => {
    const next = commonColumns.map((c) => (c.id === id ? { ...c, ...updates } : c));
    applyCommonColumnsSetting(next);
  };

  const updateCommonColumnConstraints = (id: string, updates: Partial<ColumnConstraints>) => {
    const target = commonColumns.find((c) => c.id === id);
    if (!target) return;
    updateCommonColumn(id, { constraints: { ...(target.constraints ?? {}), ...updates } });
  };

  const setCommonColumnAppSheetString = (id: string, key: string, value: string) => {
    const target = commonColumns.find((c) => c.id === id);
    if (!target) return;
    const prev = (target.appSheet ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...prev };
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      delete next[key];
    } else {
      next[key] = value;
    }
    updateCommonColumn(id, { appSheet: Object.keys(next).length > 0 ? next : undefined });
  };

  const deleteCommonColumn = (id: string) => {
    const next = commonColumns.filter((c) => c.id !== id);
    applyCommonColumnsSetting(next);
    ensureSelectedCommonColumn(next);
  };

  const moveCommonColumn = (id: string, dir: -1 | 1) => {
    const idx = commonColumns.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const nextIndex = idx + dir;
    if (nextIndex < 0 || nextIndex >= commonColumns.length) return;
    const next = commonColumns.slice();
    const [item] = next.splice(idx, 1);
    next.splice(nextIndex, 0, item);
    applyCommonColumnsSetting(next);
  };

  return (
    <SettingsCollapsibleSection
      title={t('settings.commonColumns.title')}
      isOpen={isCommonColumnsOpen}
      onToggle={toggleCommonColumnsOpen}
    >
      <div className="space-y-2.5">
        <p className="text-[10px] theme-text-muted">{t('settings.commonColumns.description')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* List */}
          <div className="border rounded theme-border theme-bg-card">
            <div className="p-2 border-b flex items-center justify-between theme-border">
              <div className="text-xs font-semibold theme-text-secondary">{t('settings.commonColumns.listTitle')}</div>
              <Button size="sm" onClick={addCommonColumn}>
                {t('common.add')}
              </Button>
            </div>

            {commonColumns.length === 0 ? (
              <div className="p-3 text-[11px] theme-text-muted">{t('settings.commonColumns.empty')}</div>
            ) : (
              <ul className="divide-y theme-divide-y">
                {commonColumns.map((c, index) => {
                  const isSelected = c.id === selectedCommonColumnId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCommonColumnId(c.id)}
                        className={
                          'w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left theme-text-primary ' +
                          (isSelected ? 'theme-bg-muted' : 'bg-transparent')
                        }
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate theme-text-primary">{c.name || t('settings.commonColumns.unnamed')}</div>
                          <div className="text-[10px] theme-text-muted">{t('columnTypes.' + c.type)}</div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-1.5 py-0.5 text-[10px] theme-text-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCommonColumn(c.id, -1);
                            }}
                            disabled={index === 0}
                            aria-label={t('common.moveUp')}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 text-[10px] theme-text-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCommonColumn(c.id, 1);
                            }}
                            disabled={index === commonColumns.length - 1}
                            aria-label={t('common.moveDown')}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 text-[10px]"
                            style={{ color: 'var(--danger)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCommonColumn(c.id);
                            }}
                            aria-label={t('common.delete')}
                          >
                            ×
                          </button>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Editor */}
          <div className="border rounded theme-border theme-bg-card">
            <div className="p-2 border-b theme-border">
              <div className="text-xs font-semibold theme-text-secondary">{t('settings.commonColumns.editorTitle')}</div>
            </div>

            {selectedCommonColumn ? (
              <div className="p-3 space-y-2.5">
                <Input
                  label={t('common.name')}
                  value={selectedCommonColumn.name}
                  onChange={(e) => updateCommonColumn(selectedCommonColumn.id, { name: e.target.value })}
                  placeholder={t('settings.commonColumns.namePlaceholder')}
                />

                <Select
                  label={t('common.type')}
                  value={selectedCommonColumn.type}
                  options={commonColumnTypes.map((v) => ({
                    value: v,
                    label: isJapanese
                      ? `${String(tEn('columnTypes.' + v))}(${String(tJa('columnTypes.' + v))})`
                      : String(t('columnTypes.' + v)),
                  }))}
                  onChange={(e) => updateCommonColumn(selectedCommonColumn.id, { type: e.target.value as ColumnType })}
                />

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedCommonColumn.constraints?.required}
                      onChange={(e) => updateCommonColumnConstraints(selectedCommonColumn.id, { required: e.target.checked })}
                      className="w-3.5 h-3.5 rounded focus:ring-2 theme-input-border"
                    />
                    <span className="text-xs theme-text-secondary">{t('column.constraints.required')}</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selectedCommonColumn.constraints?.unique}
                      onChange={(e) => updateCommonColumnConstraints(selectedCommonColumn.id, { unique: e.target.checked })}
                      className="w-3.5 h-3.5 rounded focus:ring-2 theme-input-border"
                    />
                    <span className="text-xs theme-text-secondary">{t('column.constraints.unique')}</span>
                  </label>
                </div>

                <Input
                  label={t('column.constraints.defaultValue')}
                  value={selectedCommonColumn.constraints?.defaultValue ?? ''}
                  onChange={(e) =>
                    updateCommonColumnConstraints(selectedCommonColumn.id, {
                      defaultValue: e.target.value,
                    })
                  }
                />

                {(selectedCommonColumn.type === 'Enum' || selectedCommonColumn.type === 'EnumList') && (
                  <div>
                    <label
                      htmlFor={`common-enum-values-${selectedCommonColumn.id}`}
                      className="block text-xs font-medium mb-1"
                    >
                      {t('column.constraints.enumValues')}
                    </label>
                    <textarea
                      id={`common-enum-values-${selectedCommonColumn.id}`}
                      className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 theme-input-bg theme-input-border theme-text-primary"
                      rows={4}
                      placeholder={t('settings.commonColumns.enumHint')}
                      value={(selectedCommonColumn.constraints?.enumValues ?? []).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0);
                        updateCommonColumnConstraints(selectedCommonColumn.id, { enumValues: lines.length > 0 ? lines : undefined });
                      }}
                    />
                    <p className="mt-1 text-[10px] theme-text-muted">{t('settings.commonColumns.enumHint')}</p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor={`common-raw-note-${selectedCommonColumn.id}`}
                    className="block text-xs font-medium mb-1"
                  >
                    {t('settings.commonColumns.rawNoteLabel')}
                  </label>
                  <textarea
                    id={`common-raw-note-${selectedCommonColumn.id}`}
                    className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 theme-input-bg theme-input-border theme-text-primary"
                    rows={4}
                    placeholder={t('settings.commonColumns.rawNotePlaceholder')}
                    value={
                      typeof (selectedCommonColumn.appSheet as Record<string, unknown> | undefined)?.[RAW_NOTE_OVERRIDE_KEY] === 'string'
                        ? String((selectedCommonColumn.appSheet as Record<string, unknown> | undefined)?.[RAW_NOTE_OVERRIDE_KEY] ?? '')
                        : ''
                    }
                    onChange={(e) => setCommonColumnAppSheetString(selectedCommonColumn.id, RAW_NOTE_OVERRIDE_KEY, e.target.value)}
                  />
                  <p className="mt-1 text-[10px] theme-text-muted">{t('settings.commonColumns.rawNoteHint')}</p>
                </div>

                <p className="text-[10px] theme-text-muted">{t('settings.commonColumns.note')}</p>
              </div>
            ) : (
              <div className="p-3 text-[11px] theme-text-muted">{t('settings.commonColumns.selectToEdit')}</div>
            )}
          </div>
        </div>
      </div>
    </SettingsCollapsibleSection>
  );
}
