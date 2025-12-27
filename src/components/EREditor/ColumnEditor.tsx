import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import { Button, Dialog, Input, Select } from '../common';
import type { Column, ColumnType, ColumnConstraints } from '../../types';

const columnTypes: ColumnType[] = [
  'Text', 'Number', 'Decimal', 'Date', 'DateTime', 'Time', 'Duration',
  'Email', 'Phone', 'Url', 'Image', 'File', 'Enum', 'EnumList',
  'Yes/No', 'Color', 'LatLong', 'Address', 'Ref',
  'ChangeCounter', 'ChangeLocation', 'ChangeTimestamp', 'Progress', 'UniqueID'
];

export function ColumnEditor() {
  const { i18n } = useTranslation();
  const {
    tables,
    selectedTableId,
    selectedColumnId,
    updateColumn,
    deleteColumn,
    ensureSampleData,
    sampleDataByTableId,
    setSampleRowsForTable,
  } = useERStore();
  
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedColumn = selectedTable?.columns.find((c) => c.id === selectedColumnId);

  const isJapanese = useMemo(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    return lang === 'ja' || lang.startsWith('ja-');
  }, [i18n.language, i18n.resolvedLanguage]);

  const labelEnJa = useCallback(
    (en: string, ja: string) => (isJapanese ? `${en} (${ja})` : en),
    [isJapanese]
  );

  const tEn = useMemo(() => i18n.getFixedT('en'), [i18n]);
  const tJa = useMemo(() => i18n.getFixedT('ja'), [i18n]);

  const labelKey = useCallback(
    (key: string) => labelEnJa(String(tEn(key)), String(tJa(key))),
    [labelEnJa, tEn, tJa]
  );

  const pruneAppSheet = useCallback(
    (appSheet: Record<string, unknown> | undefined, removeKeys: string[]) => {
      if (!appSheet) return undefined;
      let changed = false;
      for (const key of removeKeys) {
        if (Object.prototype.hasOwnProperty.call(appSheet, key)) {
          changed = true;
          break;
        }
      }

      if (!changed) return appSheet;

      const next: Record<string, unknown> = { ...appSheet };
      for (const key of removeKeys) {
        delete next[key];
      }
      return Object.keys(next).length > 0 ? next : undefined;
    },
    []
  );

  const sanitizeForType = useCallback(
    (
      type: ColumnType,
      constraints: ColumnConstraints,
      appSheet: Record<string, unknown> | undefined
    ): { constraints: ColumnConstraints; appSheet: Record<string, unknown> | undefined } => {
      let nextConstraints: ColumnConstraints = constraints;
      let nextAppSheet = appSheet;

      // These keys are generated from the settings above (single source of truth).
      nextAppSheet = pruneAppSheet(nextAppSheet, ['Type', 'IsKey', 'IsLabel', 'IsRequired', 'DEFAULT', 'EnumValues']);

      const isEnum = type === 'Enum' || type === 'EnumList';
      const isRef = type === 'Ref';
      const isNumeric = type === 'Number' || type === 'Decimal' || type === 'Progress';
      const isChange = type.startsWith('Change');
      const isText = type === 'Text';
      const isEnumList = type === 'EnumList';

      if (!isEnum) {
        // Constraints
        if ((nextConstraints.enumValues?.length ?? 0) > 0) {
          nextConstraints = { ...nextConstraints, enumValues: undefined };
        }
        // AppSheet keys
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'BaseType',
          'ReferencedRootTableName',
          'AllowOtherValues',
          'AutoCompleteOtherValues',
          'EnumInputMode',
        ]);
      }

      if (!isRef) {
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'ReferencedTableName',
          'ReferencedKeyColumn',
          'ReferencedType',
          'IsAPartOf',
          'InputMode',
        ]);
      }

      if (!isNumeric) {
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'NumericDigits',
          'DecimalDigits',
          'ShowThousandsSeparator',
          'NumberDisplayMode',
          'MaxValue',
          'MinValue',
          'StepValue',
          'UpdateMode',
        ]);
      }

      if (!isChange) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['ChangeColumns', 'ChangeValues']);
      }

      if (!isText) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['LongTextFormatting']);
      }

      if (!isText && !isEnumList) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['ItemSeparator']);
      }

      return { constraints: nextConstraints, appSheet: nextAppSheet };
    },
    [pruneAppSheet]
  );

  const [isDummyValuesDialogOpen, setIsDummyValuesDialogOpen] = useState(false);
  const [dummyValuesDialogText, setDummyValuesDialogText] = useState('');

  useEffect(() => {
    ensureSampleData();
  }, [ensureSampleData]);

  const handleUpdate = useCallback((updates: Partial<Column>) => {
    if (selectedTableId && selectedColumnId) {
      updateColumn(selectedTableId, selectedColumnId, updates);
    }
  }, [selectedTableId, selectedColumnId, updateColumn]);

  const columnSampleValuesPreview = useMemo(() => {
    if (!selectedTableId || !selectedColumnId) return [];
    const rows = sampleDataByTableId[selectedTableId] ?? [];
    return rows.map((r) => String(r?.[selectedColumnId] ?? ''));
  }, [sampleDataByTableId, selectedColumnId, selectedTableId]);

  const openDummyValuesDialog = useCallback(() => {
    if (!selectedColumn) return;
    const rows = selectedTableId ? sampleDataByTableId[selectedTableId] ?? [] : [];
    const text = selectedColumnId
      ? rows.map((r) => String(r?.[selectedColumnId] ?? '')).join('\n')
      : '';
    setDummyValuesDialogText(text);
    setIsDummyValuesDialogOpen(true);
  }, [sampleDataByTableId, selectedColumn, selectedColumnId, selectedTableId]);

  const closeDummyValuesDialog = useCallback(() => {
    setIsDummyValuesDialogOpen(false);
  }, []);

  const saveDummyValuesFromDialog = useCallback(() => {
    if (!selectedTableId || !selectedColumnId || !selectedColumn) return;

    const lines = dummyValuesDialogText.split('\n');
    // Avoid creating an extra row from trailing newlines.
    while (lines.length > 0 && String(lines[lines.length - 1] ?? '').trim().length === 0) {
      lines.pop();
    }

    const currentRows = sampleDataByTableId[selectedTableId] ?? [];
    const desiredCount = lines.length;
    const nextRows: Record<string, unknown>[] = [];
    for (let i = 0; i < desiredCount; i++) {
      const base = currentRows[i] ?? {};
      nextRows.push({ ...base, [selectedColumnId]: lines[i] ?? '' });
    }

    setSampleRowsForTable(selectedTableId, nextRows);
    setIsDummyValuesDialogOpen(false);
  }, [dummyValuesDialogText, sampleDataByTableId, selectedColumn, selectedColumnId, selectedTableId, setSampleRowsForTable]);

  const handleConstraintUpdate = useCallback((updates: Partial<ColumnConstraints>) => {
    if (selectedColumn) {
      handleUpdate({
        constraints: { ...selectedColumn.constraints, ...updates }
      });
    }
  }, [selectedColumn, handleUpdate]);

  const setAppSheetValue = useCallback(
    (key: string, value: unknown) => {
      if (!selectedColumn) return;
      const current = (selectedColumn.appSheet ?? {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...current };

      const shouldDelete =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0);

      if (shouldDelete) {
        delete next[key];
      } else {
        next[key] = value;
      }

      handleUpdate({ appSheet: Object.keys(next).length > 0 ? next : undefined });
    },
    [handleUpdate, selectedColumn]
  );

  // Best-effort conflict resolution to match AppSheet behavior.
  useEffect(() => {
    if (!selectedColumn) return;

    let nextConstraints: ColumnConstraints = selectedColumn.constraints;
    let nextAppSheet = selectedColumn.appSheet as Record<string, unknown> | undefined;

    // Type-specific cleanup + remove generated duplicates.
    ({ constraints: nextConstraints, appSheet: nextAppSheet } = sanitizeForType(
      selectedColumn.type,
      nextConstraints,
      nextAppSheet
    ));

    // Required: if Required_If is set, turn off unconditional Required.
    const requiredIf = typeof nextAppSheet?.Required_If === 'string' ? nextAppSheet.Required_If.trim() : '';
    if (requiredIf.length > 0 && nextConstraints.required) {
      nextConstraints = { ...nextConstraints, required: false };
    }

    // Hide: Show_If and IsHidden should not both be set.
    const showIf = typeof nextAppSheet?.Show_If === 'string' ? nextAppSheet.Show_If.trim() : '';
    const isHiddenVal = nextAppSheet?.IsHidden;
    if (showIf.length > 0 && (isHiddenVal === true || isHiddenVal === false)) {
      nextAppSheet = pruneAppSheet(nextAppSheet, ['IsHidden']);
    }

    // AppFormula and Default are mutually confusing: prefer AppFormula.
    const appFormula = typeof nextAppSheet?.AppFormula === 'string' ? nextAppSheet.AppFormula.trim() : '';
    if (appFormula.length > 0 && (nextConstraints.defaultValue ?? '').trim().length > 0) {
      nextConstraints = { ...nextConstraints, defaultValue: undefined };
    }

    const shouldUpdateConstraints = nextConstraints !== selectedColumn.constraints;
    const shouldUpdateAppSheet = nextAppSheet !== selectedColumn.appSheet;
    if (shouldUpdateConstraints || shouldUpdateAppSheet) {
      handleUpdate({
        ...(shouldUpdateConstraints ? { constraints: nextConstraints } : {}),
        ...(shouldUpdateAppSheet ? { appSheet: nextAppSheet } : {}),
      });
    }
  }, [handleUpdate, pruneAppSheet, sanitizeForType, selectedColumn]);

  const getAppSheetString = useCallback(
    (key: string): string => {
      const v = (selectedColumn?.appSheet as Record<string, unknown> | undefined)?.[key];
      return typeof v === 'string' ? v : '';
    },
    [selectedColumn]
  );

  const getAppSheetNumberString = useCallback(
    (key: string): string => {
      const v = (selectedColumn?.appSheet as Record<string, unknown> | undefined)?.[key];
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return '';
    },
    [selectedColumn]
  );

  const getAppSheetArrayLines = useCallback(
    (key: string): string => {
      const v = (selectedColumn?.appSheet as Record<string, unknown> | undefined)?.[key];
      if (Array.isArray(v)) return v.map((x) => String(x ?? '')).join('\n');
      return '';
    },
    [selectedColumn]
  );

  const getTriState = useCallback(
    (key: string): '' | 'true' | 'false' => {
      const v = (selectedColumn?.appSheet as Record<string, unknown> | undefined)?.[key];
      if (v === true) return 'true';
      if (v === false) return 'false';
      return '';
    },
    [selectedColumn]
  );

  const setTriState = useCallback(
    (key: string, raw: string) => {
      if (raw === 'true') return setAppSheetValue(key, true);
      if (raw === 'false') return setAppSheetValue(key, false);
      return setAppSheetValue(key, undefined);
    },
    [setAppSheetValue]
  );

  const handleDelete = useCallback(() => {
    if (selectedTableId && selectedColumnId) {
      deleteColumn(selectedTableId, selectedColumnId);
    }
  }, [selectedTableId, selectedColumnId, deleteColumn]);

  const typeOptions = columnTypes.map((type) => ({
    value: type,
    label: labelEnJa(String(tEn(`columnTypes.${type}`)), String(tJa(`columnTypes.${type}`))),
  }));

  const appSheetTriStateOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'true', label: labelEnJa('true', 'はい') },
      { value: 'false', label: labelEnJa('false', 'いいえ') },
    ],
    [labelEnJa]
  );

  const longTextFormattingOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Plain Text', label: labelEnJa('Plain Text', 'プレーンテキスト') },
      { value: 'Markdown', label: labelEnJa('Markdown', 'マークダウン') },
      { value: 'HTML', label: labelEnJa('HTML', 'HTML') },
    ],
    [labelEnJa]
  );

  const enumInputModeOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Buttons', label: labelEnJa('Buttons', 'ボタン') },
      { value: 'Stack', label: labelEnJa('Stack', 'スタック') },
      { value: 'Dropdown', label: labelEnJa('Dropdown', 'ドロップダウン') },
    ],
    [labelEnJa]
  );

  const refInputModeOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Buttons', label: labelEnJa('Buttons', 'ボタン') },
      { value: 'Dropdown', label: labelEnJa('Dropdown', 'ドロップダウン') },
    ],
    [labelEnJa]
  );

  const numberDisplayModeOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Standard', label: labelEnJa('Standard', '標準') },
      { value: 'Range', label: labelEnJa('Range', '範囲') },
      { value: 'Label', label: labelEnJa('Label', 'ラベル') },
    ],
    [labelEnJa]
  );

  const updateModeOptions = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Accumulate', label: labelEnJa('Accumulate', '累積') },
      { value: 'Reset', label: labelEnJa('Reset', 'リセット') },
    ],
    [labelEnJa]
  );

  // Keep this guard AFTER all hooks so hook order/count never changes.
  if (!selectedColumn) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-2">
        {labelEnJa(
          `${tEn('column.column')} ${tEn('common.settings')}`,
          `${tJa('column.column')}${tJa('common.settings')}`
        )}
      </h3>
      
      {/* カラム名 */}
      <Input
        label={labelKey('table.columnName')}
        value={selectedColumn.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
      
      {/* データ型 */}
      <Select
        label={labelKey('table.columnType')}
        value={selectedColumn.type}
        options={typeOptions}
        onChange={(e) => {
          const nextType = e.target.value as ColumnType;
          const { constraints, appSheet } = sanitizeForType(
            nextType,
            selectedColumn.constraints,
            selectedColumn.appSheet as Record<string, unknown> | undefined
          );
          handleUpdate({ type: nextType, constraints, appSheet });
        }}
      />
      
      {/* キー設定 */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isKey}
            onChange={(e) => handleUpdate({ isKey: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">{labelKey('table.isKey')}</span>
        </label>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isLabel}
            onChange={(e) => handleUpdate({ isLabel: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">{labelKey('table.isLabel')}</span>
        </label>
      </div>
      
      {/* 制約設定 */}
      <div className="border-t border-zinc-100 pt-3">
        <h4 className="font-medium text-xs text-zinc-500 mb-2">{labelKey('table.constraints')}</h4>
        
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!selectedColumn.constraints.required}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  // Prefer unconditional Required -> clear conditional formula.
                  setAppSheetValue('Required_If', undefined);
                  setAppSheetValue('IsRequired', undefined);
                }
                handleConstraintUpdate({ required: checked });
              }}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-600">{labelKey('column.constraints.required')}</span>
          </label>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!selectedColumn.constraints.unique}
              onChange={(e) => handleConstraintUpdate({ unique: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-600">{labelKey('column.constraints.unique')}</span>
          </label>
          
          <Input
            label={labelKey('column.constraints.defaultValue')}
            value={selectedColumn.constraints.defaultValue || ''}
            disabled={getAppSheetString('AppFormula').trim().length > 0}
            onChange={(e) => handleConstraintUpdate({ defaultValue: e.target.value })}
          />
          
          {/* Enum選択肢（Enum/EnumListの場合） */}
          {(selectedColumn.type === 'Enum' || selectedColumn.type === 'EnumList') && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                {labelKey('column.constraints.enumValues')}
              </label>
              <textarea
                value={selectedColumn.constraints.enumValues?.join('\n') || ''}
                onChange={(e) => handleConstraintUpdate({
                  enumValues: e.target.value.split('\n').filter(v => v.trim())
                })}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                rows={3}
                placeholder={labelEnJa('Enter one option per line', '選択肢を1行に1つ入力')}
              />
            </div>
          )}
        </div>
      </div>

      {/* AppSheetメモ設定（Note Parameters） */}
      <div className="border-t border-zinc-100 pt-3">
        <h4 className="font-medium text-xs text-zinc-500 mb-2">
          {labelEnJa('AppSheet Note Parameters', 'AppSheetメモ設定')}
        </h4>
        <div className="text-[10px] text-zinc-400 mb-2">
          {labelEnJa(
            'Configure the JSON written to the header cell Note (unset keys are not written).',
            'ヘッダーセルのNoteに出力されるAppSheetメモ（JSON）の中身を設定します（未設定は出力しません）。'
          )}
          <div>
            {labelEnJa(
              'Type / IsKey / IsLabel / IsRequired / DEFAULT / EnumValues are generated from the settings above.',
              'Type / IsKey / IsLabel / IsRequired / DEFAULT / EnumValues は上の設定から自動生成されます。'
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* 基本 */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Basic', '基本')}</div>

            <Input
              label={labelEnJa('DisplayName', '表示名')}
              value={getAppSheetString('DisplayName')}
              onChange={(e) => setAppSheetValue('DisplayName', e.target.value)}
            />

            <Input
              label={labelEnJa('Description', '説明')}
              value={getAppSheetString('Description')}
              onChange={(e) => setAppSheetValue('Description', e.target.value)}
            />

            <Select
              label={labelEnJa('IsHidden / Show_If - toggle', '非表示 / 表示条件 - トグル')}
              value={getTriState('IsHidden')}
              options={appSheetTriStateOptions}
              onChange={(e) => setTriState('IsHidden', e.target.value)}
            />

            <Input
              label={labelEnJa('Show_If - expression', '表示条件 - 数式')}
              value={getAppSheetString('Show_If')}
              onChange={(e) => {
                const v = e.target.value;
                setAppSheetValue('Show_If', v);
                if (v.trim().length > 0) {
                  setAppSheetValue('IsHidden', undefined);
                }
              }}
            />

            <Input
              label={labelEnJa('Required_If - expression', '必須条件 - 数式')}
              value={getAppSheetString('Required_If')}
              onChange={(e) => {
                const v = e.target.value;
                setAppSheetValue('Required_If', v);
                if (v.trim().length > 0) {
                  handleConstraintUpdate({ required: false });
                  setAppSheetValue('IsRequired', undefined);
                }
              }}
            />

            <div className="space-y-1">
              <Input
                label={labelEnJa('AppFormula', 'アプリ数式')}
                value={getAppSheetString('AppFormula')}
                onChange={(e) => {
                  const v = e.target.value;
                  setAppSheetValue('AppFormula', v);
                  if (v.trim().length > 0) {
                    handleConstraintUpdate({ defaultValue: undefined });
                  }
                }}
              />
              <div className="text-[11px] text-zinc-500 leading-snug">
                {labelEnJa(
                  'Compatibility: leading "=" is ignored; full-width operators are normalized; "-" is treated as blank; numbers like "1,234" are supported.',
                  '互換注意: 先頭の「=」は無視されます / 全角演算子は正規化されます / 「-」は空欄扱いになります / 「1,234」のようなカンマ付き数値に対応しています。'
                )}
              </div>
            </div>
          </div>

          {/* 識別・検索 */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">
              {labelEnJa('Identification / Search', '識別・検索')}
            </div>
            <Select
              label={labelEnJa('IsScannable', 'スキャン可')}
              value={getTriState('IsScannable')}
              options={appSheetTriStateOptions}
              onChange={(e) => setTriState('IsScannable', e.target.value)}
            />
            <Select
              label={labelEnJa('IsNfcScannable', 'NFCスキャン可')}
              value={getTriState('IsNfcScannable')}
              options={appSheetTriStateOptions}
              onChange={(e) => setTriState('IsNfcScannable', e.target.value)}
            />
            <Select
              label={labelEnJa('Searchable', '検索対象')}
              value={getTriState('Searchable')}
              options={appSheetTriStateOptions}
              onChange={(e) => setTriState('Searchable', e.target.value)}
            />
            <Select
              label={labelEnJa('IsSensitive', '機密')}
              value={getTriState('IsSensitive')}
              options={appSheetTriStateOptions}
              onChange={(e) => setTriState('IsSensitive', e.target.value)}
            />
          </div>

          {/* 表示・編集 */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">
              {labelEnJa('Display / Edit', '表示・編集')}
            </div>
            <Input
              label={labelEnJa('Category', 'カテゴリ')}
              value={getAppSheetString('Category')}
              onChange={(e) => setAppSheetValue('Category', e.target.value)}
            />
            <Input
              label={labelEnJa('Content', 'コンテンツ')}
              value={getAppSheetString('Content')}
              onChange={(e) => setAppSheetValue('Content', e.target.value)}
            />
            <Input
              label={labelEnJa('Editable_If', '編集可能条件')}
              value={getAppSheetString('Editable_If')}
              onChange={(e) => setAppSheetValue('Editable_If', e.target.value)}
            />
            <Input
              label={labelEnJa('Reset_If', 'リセット条件')}
              value={getAppSheetString('Reset_If')}
              onChange={(e) => setAppSheetValue('Reset_If', e.target.value)}
            />
          </div>

          {/* バリデーション */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">
              {labelEnJa('Validation', 'バリデーション')}
            </div>
            <Input
              label={labelEnJa('Valid_If', '有効条件')}
              value={getAppSheetString('Valid_If')}
              onChange={(e) => setAppSheetValue('Valid_If', e.target.value)}
            />
            <Input
              label={labelEnJa('Error_Message_If_Invalid', '無効時メッセージ')}
              value={getAppSheetString('Error_Message_If_Invalid')}
              onChange={(e) => setAppSheetValue('Error_Message_If_Invalid', e.target.value)}
            />
            <Input
              label={labelEnJa('Suggested_Values', '候補値')}
              value={getAppSheetString('Suggested_Values')}
              onChange={(e) => setAppSheetValue('Suggested_Values', e.target.value)}
            />
          </div>

          {/* テキスト */}
          {(selectedColumn.type === 'Text' || selectedColumn.type === 'EnumList') && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Text', 'テキスト')}</div>
              {selectedColumn.type === 'Text' && (
                <Select
                  label={labelEnJa('LongTextFormatting', '長文フォーマット')}
                  value={getAppSheetString('LongTextFormatting')}
                  options={longTextFormattingOptions}
                  onChange={(e) => setAppSheetValue('LongTextFormatting', e.target.value)}
                />
              )}
              {selectedColumn.type === 'EnumList' && (
                <Input
                  label={labelEnJa('ItemSeparator', '項目区切り')}
                  value={getAppSheetString('ItemSeparator')}
                  onChange={(e) => setAppSheetValue('ItemSeparator', e.target.value)}
                />
              )}
            </div>
          )}

          {/* Enum */}
          {(selectedColumn.type === 'Enum' || selectedColumn.type === 'EnumList') && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-600">
                {labelEnJa('Enum / EnumList', '列挙 / 列挙リスト')}
              </div>
              <Input
                label={labelEnJa('BaseType', '基本型')}
                value={getAppSheetString('BaseType')}
                onChange={(e) => setAppSheetValue('BaseType', e.target.value)}
              />
              <Input
                label={labelEnJa(
                  'ReferencedRootTableName - Enum/EnumList base type reference',
                  'ReferencedRootTableName - 列挙の参照元テーブル'
                )}
                value={getAppSheetString('ReferencedRootTableName')}
                onChange={(e) => setAppSheetValue('ReferencedRootTableName', e.target.value)}
              />
              <Select
                label={labelEnJa('AllowOtherValues', 'その他値を許可')}
                value={getTriState('AllowOtherValues')}
                options={appSheetTriStateOptions}
                onChange={(e) => setTriState('AllowOtherValues', e.target.value)}
              />
              <Select
                label={labelEnJa('AutoCompleteOtherValues', 'その他値の補完')}
                value={getTriState('AutoCompleteOtherValues')}
                options={appSheetTriStateOptions}
                onChange={(e) => setTriState('AutoCompleteOtherValues', e.target.value)}
              />
              <Select
                label={labelEnJa('EnumInputMode', '入力モード')}
                value={getAppSheetString('EnumInputMode')}
                options={enumInputModeOptions}
                onChange={(e) => setAppSheetValue('EnumInputMode', e.target.value)}
              />
            </div>
          )}

          {/* Ref */}
          {selectedColumn.type === 'Ref' && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Ref', '参照')}</div>
              <Input
                label={labelEnJa('ReferencedTableName', '参照テーブル')}
                value={getAppSheetString('ReferencedTableName')}
                onChange={(e) => setAppSheetValue('ReferencedTableName', e.target.value)}
              />
              <Input
                label={labelEnJa('ReferencedKeyColumn', '参照キー列')}
                value={getAppSheetString('ReferencedKeyColumn')}
                onChange={(e) => setAppSheetValue('ReferencedKeyColumn', e.target.value)}
              />
              <Input
                label={labelEnJa('ReferencedType', '参照型')}
                value={getAppSheetString('ReferencedType')}
                onChange={(e) => setAppSheetValue('ReferencedType', e.target.value)}
              />
              <Select
                label={labelEnJa('IsAPartOf', '子(PartOf)')}
                value={getTriState('IsAPartOf')}
                options={appSheetTriStateOptions}
                onChange={(e) => setTriState('IsAPartOf', e.target.value)}
              />
              <Select
                label={labelEnJa('InputMode', '入力モード')}
                value={getAppSheetString('InputMode')}
                options={refInputModeOptions}
                onChange={(e) => setAppSheetValue('InputMode', e.target.value)}
              />
            </div>
          )}

          {/* 数値 */}
          {(selectedColumn.type === 'Number' || selectedColumn.type === 'Decimal' || selectedColumn.type === 'Progress') && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Number', '数値')}</div>
              <Input
                label={labelEnJa('NumericDigits', '桁数')}
                type="number"
                value={getAppSheetNumberString('NumericDigits')}
                onChange={(e) => setAppSheetValue('NumericDigits', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Select
                label={labelEnJa('ShowThousandsSeparator', '3桁区切り')}
                value={getTriState('ShowThousandsSeparator')}
                options={appSheetTriStateOptions}
                onChange={(e) => setTriState('ShowThousandsSeparator', e.target.value)}
              />
              <Select
                label={labelEnJa('NumberDisplayMode', '表示モード')}
                value={getAppSheetString('NumberDisplayMode')}
                options={numberDisplayModeOptions}
                onChange={(e) => setAppSheetValue('NumberDisplayMode', e.target.value)}
              />
              <Input
                label={labelEnJa('MaxValue', '最大値')}
                type="number"
                value={getAppSheetNumberString('MaxValue')}
                onChange={(e) => setAppSheetValue('MaxValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('MinValue', '最小値')}
                type="number"
                value={getAppSheetNumberString('MinValue')}
                onChange={(e) => setAppSheetValue('MinValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('StepValue', '刻み')}
                type="number"
                value={getAppSheetNumberString('StepValue')}
                onChange={(e) => setAppSheetValue('StepValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('DecimalDigits', '小数桁')}
                type="number"
                value={getAppSheetNumberString('DecimalDigits')}
                onChange={(e) => setAppSheetValue('DecimalDigits', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Select
                label={labelEnJa('UpdateMode', '更新モード')}
                value={getAppSheetString('UpdateMode')}
                options={updateModeOptions}
                onChange={(e) => setAppSheetValue('UpdateMode', e.target.value)}
              />
            </div>
          )}

          {/* Change系 */}
          {selectedColumn.type.startsWith('Change') && (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-600">
                {labelEnJa('Change (audit) types', 'Change系')}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {labelEnJa('ChangeColumns - 1 line per item', 'ChangeColumns - 1行=1項目')}
                </label>
                <textarea
                  value={getAppSheetArrayLines('ChangeColumns')}
                  onChange={(e) => setAppSheetValue('ChangeColumns', e.target.value.split('\n').map((v) => v.trim()).filter((v) => v.length > 0))}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  rows={3}
                  placeholder={labelEnJa('Enter one column name per line', 'カラム名を1行に1つ入力')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {labelEnJa('ChangeValues - 1 line per item', 'ChangeValues - 1行=1項目')}
                </label>
                <textarea
                  value={getAppSheetArrayLines('ChangeValues')}
                  onChange={(e) => setAppSheetValue('ChangeValues', e.target.value.split('\n').map((v) => v.trim()).filter((v) => v.length > 0))}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  rows={3}
                  placeholder={labelEnJa('Enter one value per line', '値を1行に1つ入力')}
                />
              </div>
            </div>
          )}

          {/* メタキー */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">
              {labelEnJa('Meta keys (only if needed)', 'メタキー（必要な場合のみ）')}
            </div>
            <Input
              label={labelEnJa('TypeAuxData - JSON string', 'TypeAuxData（JSON文字列）')}
              value={getAppSheetString('TypeAuxData')}
              onChange={(e) => setAppSheetValue('TypeAuxData', e.target.value)}
              placeholder={labelEnJa('Example: {"RefTable":"Customers"}', '例: {"RefTable":"顧客"}')}
            />
            <Input
              label={labelEnJa('BaseTypeQualifier', '基本型修飾子')}
              value={getAppSheetString('BaseTypeQualifier')}
              onChange={(e) => setAppSheetValue('BaseTypeQualifier', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* サンプルデータ */}
      <div className="border-t border-zinc-100 pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="font-medium text-xs text-zinc-500">{labelKey('column.dummyData')}</h4>
          <Button variant="secondary" size="sm" onClick={openDummyValuesDialog}>
            {labelEnJa('Edit Sample Data', 'サンプルデータ編集')}
          </Button>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-zinc-400 mb-1">{labelKey('column.dummyDataPreview')}</div>
          <div className="text-xs text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-1.5">
            {columnSampleValuesPreview.length === 0 ? (
              <div className="text-zinc-400">-</div>
            ) : (
              <div className="space-y-0.5">
                {columnSampleValuesPreview.map((v, i) => (
                  <div key={i} className="truncate">{v}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] text-zinc-400">{labelKey('column.dummyDataPlaceholder')}</div>
      </div>

      <Dialog
        isOpen={isDummyValuesDialogOpen}
        onClose={closeDummyValuesDialog}
        title={labelEnJa('Edit Sample Data', 'サンプルデータ編集')}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeDummyValuesDialog}>
              {labelKey('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={saveDummyValuesFromDialog}>
              {labelKey('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-400">{labelKey('column.dummyDataPreview')}</div>
          <div className="text-xs text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-1.5 max-h-32 overflow-y-auto">
            {columnSampleValuesPreview.length === 0 ? (
              <div className="text-zinc-400">-</div>
            ) : (
              <div className="space-y-0.5">
                {columnSampleValuesPreview.map((v, i) => (
                  <div key={i} className="truncate">{v}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {labelKey('column.dummyData')}
            </label>
            <textarea
              value={dummyValuesDialogText}
              onChange={(e) => setDummyValuesDialogText(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-h-[320px]"
              placeholder={labelKey('column.dummyDataPlaceholder')}
            />
            <div className="text-[10px] text-zinc-400 mt-1">{labelEnJa('One value per line', '1行に1つ入力')}</div>
          </div>
        </div>
      </Dialog>
      
      {/* 削除ボタン */}
      <div className="border-t border-zinc-100 pt-3">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          {labelKey('column.deleteColumn')}
        </Button>
      </div>
    </div>
  );
}
