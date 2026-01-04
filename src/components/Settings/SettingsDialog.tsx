import React, { useEffect, useMemo, useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '../common';
import { useUIStore, useProjectStore } from '../../stores';
import type { Language, Theme, FontSize, RelationLabelInitialMode, CommonColumnDefinition, ColumnType, ColumnConstraints } from '../../types';
import { APPSHEET_COLUMN_TYPES } from '../../types';
import { getAppInfo } from '../../lib/appInfo';
import { canonicalizeLucideIconName, getLucideIconComponent, listLucideIconNamesKebab } from '../../lib/lucideIcons';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { v4 as uuidv4 } from 'uuid';
import {
  NOTE_PARAM_STATUS,
  NOTE_PARAM_CATEGORIES,
  getNoteParamsGroupedByCategory,
  getDefaultNoteParamOutputSettings,
  type NoteParamCategory,
} from '../../lib/appsheet/noteParameters';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const {
    settings,
    updateSettings,
    setLanguage,
    setTheme,
    setFontSize,
    openAboutDialog,
    isTableCreationRulesOpen,
    toggleTableCreationRulesOpen,
    isCommonColumnsOpen,
    toggleCommonColumnsOpen,
    isBackupSettingsOpen,
    toggleBackupSettingsOpen,
    isNoteParamsSettingsOpen,
    toggleNoteParamsSettingsOpen,
    updateNoteParamOutputSetting,
    resetNoteParamOutputSettings,
  } = useUIStore();
  const { subscriptionPlan } = useProjectStore();

  const [selectedCommonColumnId, setSelectedCommonColumnId] = useState<string | null>(null);

  const edgeFollowerIconDatalistId = useId();
  const allLucideIconNames = useMemo(() => listLucideIconNamesKebab(), []);
  const [edgeFollowerIconDraft, setEdgeFollowerIconDraft] = useState<string>(settings.edgeFollowerIconName ?? 'arrow-right');

  const [appVersion, setAppVersion] = useState<string>('');
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const RAW_NOTE_OVERRIDE_KEY = '__AppSheetNoteOverride';

  const settingsFileBaseName = useMemo(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `waiwaier-settings-${yyyy}${mm}${dd}.json`;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    void (async () => {
      const info = await getAppInfo();
      if (cancelled) return;
      setAppVersion(info.version);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setEdgeFollowerIconDraft(settings.edgeFollowerIconName ?? 'arrow-right');
  }, [isOpen, settings.edgeFollowerIconName]);

  const handleClose = () => {
    setTransferMessage(null);
    onClose();
  };

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

  const edgeFollowerIconOptions = [
    { value: 'arrow-right', label: t('settings.editor.edgeFollowerIcon.options.arrowRight') },
    { value: 'link-2', label: t('settings.editor.edgeFollowerIcon.options.link2') },
    { value: 'zap', label: t('settings.editor.edgeFollowerIcon.options.zap') },
    { value: 'truck', label: t('settings.editor.edgeFollowerIcon.options.truck') },
    { value: 'circle', label: t('settings.editor.edgeFollowerIcon.options.circle') },
  ];

  const relationLabelModeOptions = [
    { value: 'auto', label: t('settings.relationLabel.modes.auto') },
    { value: 'hidden', label: t('settings.relationLabel.modes.hidden') },
    { value: 'custom', label: t('settings.relationLabel.modes.custom') },
  ];

  const isJapanese = useMemo(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    return lang === 'ja' || lang.startsWith('ja-');
  }, [i18n.language, i18n.resolvedLanguage]);

  const tEn = useMemo(() => i18n.getFixedT('en'), [i18n]);
  const tJa = useMemo(() => i18n.getFixedT('ja'), [i18n]);

  const commonColumnTypes: ColumnType[] = [...APPSHEET_COLUMN_TYPES];

  const applyCommonColumnsSetting = (next: CommonColumnDefinition[]) => {
    updateSettings({ commonColumns: next });
  };

  const commonColumns = settings.commonColumns ?? [];
  const selectedCommonColumn = selectedCommonColumnId
    ? commonColumns.find((c) => c.id === selectedCommonColumnId) ?? null
    : null;

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

  const coerceNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const sanitizeImportedSettings = (value: unknown) => {
    const source =
      typeof value === 'object' && value !== null && 'settings' in value
        ? (value as { settings: unknown }).settings
        : value;

    if (typeof source !== 'object' || source === null) return null;
    const obj = source as Record<string, unknown>;

    const next: Partial<typeof settings> = {};

    // enum
    if (obj.language === 'ja' || obj.language === 'en') next.language = obj.language;
    if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') next.theme = obj.theme;
    if (obj.fontSize === 'small' || obj.fontSize === 'medium' || obj.fontSize === 'large') next.fontSize = obj.fontSize;
    if (obj.relationLabelInitialMode === 'auto' || obj.relationLabelInitialMode === 'hidden' || obj.relationLabelInitialMode === 'custom') {
      next.relationLabelInitialMode = obj.relationLabelInitialMode;
    }

    // boolean
    if (typeof obj.autoBackupEnabled === 'boolean') next.autoBackupEnabled = obj.autoBackupEnabled;
    if (typeof obj.showNoteParamsSupportPanel === 'boolean') next.showNoteParamsSupportPanel = obj.showNoteParamsSupportPanel;
    if (typeof obj.edgeAnimationEnabled === 'boolean') next.edgeAnimationEnabled = obj.edgeAnimationEnabled;
    if (typeof obj.edgeFollowerIconEnabled === 'boolean') next.edgeFollowerIconEnabled = obj.edgeFollowerIconEnabled;

    // number
    const autoBackupIntervalMinutes = coerceNumber(obj.autoBackupIntervalMinutes);
    if (autoBackupIntervalMinutes !== null) next.autoBackupIntervalMinutes = Math.max(1, Math.min(60, Math.trunc(autoBackupIntervalMinutes)));

    const backupRetentionDays = coerceNumber(obj.backupRetentionDays);
    if (backupRetentionDays !== null) next.backupRetentionDays = Math.max(1, Math.min(30, Math.trunc(backupRetentionDays)));

    const edgeFollowerIconSize = coerceNumber(obj.edgeFollowerIconSize);
    if (edgeFollowerIconSize !== null) next.edgeFollowerIconSize = Math.max(8, Math.min(48, Math.trunc(edgeFollowerIconSize)));

    const edgeFollowerIconSpeed = coerceNumber(obj.edgeFollowerIconSpeed);
    if (edgeFollowerIconSpeed !== null) next.edgeFollowerIconSpeed = Math.max(10, Math.min(1000, edgeFollowerIconSpeed));

    // string
    if (typeof obj.backupLocation === 'string') next.backupLocation = obj.backupLocation;
    if (typeof obj.tableNamePrefix === 'string') next.tableNamePrefix = obj.tableNamePrefix;
    if (typeof obj.tableNameSuffix === 'string') next.tableNameSuffix = obj.tableNameSuffix;
    if (typeof obj.keyColumnPrefix === 'string') next.keyColumnPrefix = obj.keyColumnPrefix;
    if (typeof obj.keyColumnSuffix === 'string') next.keyColumnSuffix = obj.keyColumnSuffix;
    if (typeof obj.defaultKeyColumnName === 'string') next.defaultKeyColumnName = obj.defaultKeyColumnName;
    if (typeof obj.relationLabelInitialCustomText === 'string') next.relationLabelInitialCustomText = obj.relationLabelInitialCustomText;

    if (typeof obj.edgeFollowerIconName === 'string') next.edgeFollowerIconName = obj.edgeFollowerIconName;

    // commonColumns
    if (Array.isArray(obj.commonColumns)) {
      const rawList = obj.commonColumns as unknown[];
      const coerceConstraints = (v: unknown): ColumnConstraints => {
        if (typeof v !== 'object' || v === null) return {};
        const c = v as Record<string, unknown>;
        const out: ColumnConstraints = {};
        if (typeof c.required === 'boolean') out.required = c.required;
        if (typeof c.unique === 'boolean') out.unique = c.unique;
        if (typeof c.defaultValue === 'string') out.defaultValue = c.defaultValue;
        if (typeof c.minValue === 'number') out.minValue = c.minValue;
        if (typeof c.maxValue === 'number') out.maxValue = c.maxValue;
        if (typeof c.minLength === 'number') out.minLength = c.minLength;
        if (typeof c.maxLength === 'number') out.maxLength = c.maxLength;
        if (typeof c.pattern === 'string') out.pattern = c.pattern;
        if (Array.isArray(c.enumValues)) {
          out.enumValues = c.enumValues.map((x) => String(x).trim()).filter((s) => s.length > 0);
        }
        return out;
      };

      const isColumnType = (v: unknown): v is ColumnType => {
        if (typeof v !== 'string') return false;
        return [...APPSHEET_COLUMN_TYPES, 'UniqueID'].includes(v as ColumnType);
      };

      const nextCommon: CommonColumnDefinition[] = [];
      for (const item of rawList) {
        if (typeof item !== 'object' || item === null) continue;
        const it = item as Record<string, unknown>;
        const id = typeof it.id === 'string' ? it.id : '';
        const name = typeof it.name === 'string' ? it.name : '';
        const type = isColumnType(it.type) ? it.type : 'Text';
        const constraints = coerceConstraints(it.constraints);
        const appSheet = (typeof it.appSheet === 'object' && it.appSheet !== null) ? (it.appSheet as Record<string, unknown>) : undefined;

        if (!id) continue;
        nextCommon.push({ id, name, type, constraints, appSheet });
      }
      next.commonColumns = nextCommon;
    }

    // noteParamOutputSettings
    if (typeof obj.noteParamOutputSettings === 'object' && obj.noteParamOutputSettings !== null) {
      const raw = obj.noteParamOutputSettings as Record<string, unknown>;
      const validKeys = NOTE_PARAM_STATUS.map((p) => p.key);
      const nextSettings: Record<string, boolean> = {};

      // Backward compatibility: migrate legacy key `DEFAULT` -> `Default`
      if (typeof raw.DEFAULT === 'boolean' && typeof raw.Default !== 'boolean') {
        raw.Default = raw.DEFAULT;
      }

      for (const key of validKeys) {
        if (typeof raw[key] === 'boolean') {
          nextSettings[key] = raw[key];
        }
      }
      if (Object.keys(nextSettings).length > 0) {
        next.noteParamOutputSettings = nextSettings;
      }
    }

    return next;
  };

  const handleExportSettings = async () => {
    try {
      setTransferMessage(null);
      const filePath = await save({
        defaultPath: settingsFileBaseName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!filePath) return;

      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        app: {
          name: 'waiwaier-desktop',
          version: appVersion || undefined,
        },
        settings,
      };

      await writeTextFile(filePath, JSON.stringify(payload, null, 2));
      setTransferMessage({ type: 'success', text: t('settings.transfer.exportSuccess') });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTransferMessage({ type: 'error', text: t('settings.transfer.exportError', { message }) });
    }
  };

  const handleImportSettings = async () => {
    try {
      setTransferMessage(null);
      const selected = await open({
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;

      const text = await readTextFile(filePath);
      const parsed = JSON.parse(text) as unknown;
      const next = sanitizeImportedSettings(parsed);

      if (!next) {
        setTransferMessage({ type: 'error', text: t('settings.transfer.importInvalid') });
        return;
      }

      updateSettings(next);
      setTransferMessage({ type: 'success', text: t('settings.transfer.importSuccess') });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setTransferMessage({ type: 'error', text: t('settings.transfer.importError', { message }) });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t('settings.title')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Transfer Settings */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide mb-2.5 theme-text-muted">{t('settings.transfer.title')}</h3>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportSettings}>
                {t('settings.transfer.export')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportSettings}>
                {t('settings.transfer.import')}
              </Button>
            </div>

            {transferMessage && (
              <p className={transferMessage.type === 'success' ? 'text-[10px] text-green-600' : 'text-[10px] text-red-600'}>
                {transferMessage.text}
              </p>
            )}

            <p className="text-[10px] theme-text-muted">{t('settings.transfer.description')}</p>
          </div>
        </section>

        {/* General Settings */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide mb-2.5 theme-text-muted">{t('settings.general')}</h3>
          
          <div className="space-y-2.5">
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

            <div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.edgeAnimationEnabled ?? true}
                  onChange={(e) => updateSettings({ edgeAnimationEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
                />
                <span className="text-xs theme-text-secondary">{t('settings.editor.edgeAnimation.label')}</span>
              </label>
              <p className="mt-0.5 text-[10px] theme-text-muted">{t('settings.editor.edgeAnimation.hint')}</p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.edgeFollowerIconEnabled ?? false}
                    onChange={(e) => updateSettings({ edgeFollowerIconEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
                  />
                  <span className="text-xs theme-text-secondary">{t('settings.editor.edgeFollowerIcon.label')}</span>
                </label>
                <p className="mt-0.5 text-[10px] theme-text-muted">{t('settings.editor.edgeFollowerIcon.hint')}</p>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="w-full">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        label={t('settings.editor.edgeFollowerIcon.icon')}
                        placeholder="arrow-right"
                        list={edgeFollowerIconDatalistId}
                        disabled={!(settings.edgeFollowerIconEnabled ?? false)}
                        value={edgeFollowerIconDraft}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setEdgeFollowerIconDraft(nextValue);
                          const canonical = canonicalizeLucideIconName(nextValue);
                          if (getLucideIconComponent(canonical)) {
                            updateSettings({ edgeFollowerIconName: canonical });
                          }
                        }}
                        onBlur={() => {
                          const fallback = settings.edgeFollowerIconName ?? 'arrow-right';
                          const candidate = canonicalizeLucideIconName(edgeFollowerIconDraft || fallback);
                          if (getLucideIconComponent(candidate)) {
                            setEdgeFollowerIconDraft(candidate);
                            updateSettings({ edgeFollowerIconName: candidate });
                            return;
                          }
                          setEdgeFollowerIconDraft(fallback);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          (e.currentTarget as HTMLInputElement).blur();
                        }}
                      />
                      <datalist id={edgeFollowerIconDatalistId}>
                        {allLucideIconNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div
                      className="mb-[1px] flex h-[30px] w-[30px] items-center justify-center rounded border"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--input-border)',
                        color: 'var(--text-secondary)',
                        opacity: settings.edgeFollowerIconEnabled ?? false ? 1 : 0.5,
                      }}
                      aria-label={t('settings.editor.edgeFollowerIcon.icon')}
                    >
                      {(() => {
                        const Icon =
                          getLucideIconComponent(edgeFollowerIconDraft) ??
                          getLucideIconComponent(settings.edgeFollowerIconName ?? 'arrow-right') ??
                          getLucideIconComponent('arrow-right');
                        return Icon ? <Icon size={16} /> : null;
                      })()}
                    </div>
                  </div>
                </div>

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
        </section>

        {/* Table Creation Rules (Collapsible) */}
        <section>
          <button
            type="button"
            onClick={toggleTableCreationRulesOpen}
            className={
              'settings-collapsible-button w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isTableCreationRulesOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="settings-collapsible-title text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.tableCreationRules.title')}</h3>
            <svg
              className={
                'settings-collapsible-icon w-4 h-4 transition-transform ' +
                (isTableCreationRulesOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isTableCreationRulesOpen && (
            <div className="mt-2.5 space-y-4">
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
            </div>
          )}
        </section>

        {/* Common Columns (Collapsible) */}
        <section>
          <button
            type="button"
            onClick={toggleCommonColumnsOpen}
            className={
              'settings-collapsible-button w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isCommonColumnsOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="settings-collapsible-title text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.commonColumns.title')}</h3>
            <svg
              className={
                'settings-collapsible-icon w-4 h-4 transition-transform ' +
                (isCommonColumnsOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isCommonColumnsOpen && (
            <div className="mt-2.5 space-y-2.5">
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
                                  className="px-1.5 py-0.5 text-[10px] text-red-500 hover:text-red-700"
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
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
                          />
                          <span className="text-xs theme-text-secondary">{t('column.constraints.required')}</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selectedCommonColumn.constraints?.unique}
                            onChange={(e) => updateCommonColumnConstraints(selectedCommonColumn.id, { unique: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
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
                            className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 theme-input-bg theme-input-border theme-text-primary"
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
                          className="w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 theme-input-bg theme-input-border theme-text-primary"
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
          )}
        </section>

        {/* Backup Settings */}
        <section>
          <button
            type="button"
            onClick={toggleBackupSettingsOpen}
            className={
              'settings-collapsible-button w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isBackupSettingsOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="settings-collapsible-title text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.backup')}</h3>
            <svg
              className={
                'settings-collapsible-icon w-4 h-4 transition-transform ' +
                (isBackupSettingsOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isBackupSettingsOpen && (
            <div className="mt-2.5 space-y-2.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={(e) => updateSettings({ autoBackupEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
                />
                <span className="text-xs theme-text-secondary">{t('settings.autoBackup.enable')}</span>
              </label>

              {settings.autoBackupEnabled && (
                <>
                  <Input
                    label={t('settings.autoBackup.interval')}
                    type="number"
                    min={1}
                    max={60}
                    value={settings.autoBackupIntervalMinutes}
                    onChange={(e) => updateSettings({ autoBackupIntervalMinutes: parseInt(e.target.value) || 5 })}
                  />

                  <Input
                    label={t('settings.autoBackup.retention')}
                    type="number"
                    min={1}
                    max={30}
                    value={settings.backupRetentionDays}
                    onChange={(e) => updateSettings({ backupRetentionDays: parseInt(e.target.value) || 7 })}
                  />
                </>
              )}
            </div>
          )}
        </section>

        {/* Note Parameters Settings (Collapsible) */}
        <section>
          <button
            type="button"
            onClick={toggleNoteParamsSettingsOpen}
            className={
              'settings-collapsible-button w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ' +
              (isNoteParamsSettingsOpen
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/70 hover:border-indigo-300')
            }
          >
            <h3 className="settings-collapsible-title text-xs font-semibold text-indigo-700 uppercase tracking-wide">{t('settings.noteParams.title')}</h3>
            <svg
              className={
                'settings-collapsible-icon w-4 h-4 transition-transform ' +
                (isNoteParamsSettingsOpen ? 'rotate-180 text-indigo-600' : 'rotate-0 text-indigo-500/70')
              }
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isNoteParamsSettingsOpen && (
            <div className="mt-2.5 space-y-3">
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
                                    className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500/20 theme-input-border"
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
          )}
        </section>

        {/* License Settings */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide mb-2.5 theme-text-muted">{t('settings.license')}</h3>
          
          <div className="rounded p-3 theme-bg-muted">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] theme-text-muted">{t('license.currentPlan')}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                subscriptionPlan === 'pro' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'theme-bg-muted theme-text-secondary'
              }`}>
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
                <p className="text-green-600 mb-1.5 flex items-center gap-1">
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

        {/* About */}
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
      </div>
    </Dialog>
  );
}
