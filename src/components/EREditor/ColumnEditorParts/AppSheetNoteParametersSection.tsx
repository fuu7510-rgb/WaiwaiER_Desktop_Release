import { useMemo, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CollapsibleSection, InfoTooltip, Input, Select } from '../../common';

import type { Column, ColumnConstraints, Table } from '../../../types';
import { ArrayLinesTextarea } from './ArrayLinesTextarea';
import { previewExcelColumnNotesLocal } from '../../../lib/appsheet/excelNotePreview';
import { useUIStore } from '../../../stores';

import { AutoComputeSection } from './noteParameters/AutoComputeSection';
import { DataValiditySection } from './noteParameters/DataValiditySection';
import { DisplaySection } from './noteParameters/DisplaySection';
import { OtherPropertiesSection } from './noteParameters/OtherPropertiesSection';
import { UpdateBehaviorSection } from './noteParameters/UpdateBehaviorSection';

type Option = { value: string; label: string };

type Labels = {
  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;
  labelKey: (key: string) => string;
};

type Props = {
  selectedColumn: Column;
  selectedTable: Table | undefined;
  tables: Table[];
  handleUpdate: (updates: Partial<Column>) => void;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;

  labels: Labels;

  setAppSheetValue: (key: string, value: unknown) => void;
  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;
  getAppSheetNumberString: (key: string) => string;
  getAppSheetArrayLines: (key: string) => string;
  getTriState: (key: string) => '' | 'true' | 'false';
  setTriState: (key: string, raw: string) => void;

  appSheetTriStateOptions: Option[];
  longTextFormattingOptions: Option[];
  enumInputModeOptions: Option[];
  refInputModeOptions: Option[];
  numberDisplayModeOptions: Option[];
  updateModeOptions: Option[];
};

export function AppSheetNoteParametersSection({
  selectedColumn,
  selectedTable,
  tables,
  handleUpdate,
  handleConstraintUpdate,
  labels,
  setAppSheetValue,
  setAppSheetValues,
  getAppSheetString,
  getAppSheetNumberString,
  getAppSheetArrayLines,
  getTriState,
  setTriState,
  appSheetTriStateOptions,
  longTextFormattingOptions,
  enumInputModeOptions,
  refInputModeOptions,
  numberDisplayModeOptions,
  updateModeOptions,
}: Props) {
  const { labelEnJa, helpText } = labels;
  const { settings } = useUIStore();
  const noteParamOutputSettings = settings.noteParamOutputSettings;

  const RAW_NOTE_OVERRIDE_KEY = '__AppSheetNoteOverride';

  // ノートパラメーターのプレビュー
  const [notePreviewText, setNotePreviewText] = useState<string>('');

  // tablesやselectedColumnが変わったらノートプレビューを更新
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedTable) {
        setNotePreviewText('');
        return;
      }

      try {
        // Rustコマンドを試す
        const result = await invoke<Record<string, Record<string, string>>>(
          'preview_excel_column_notes',
          {
            request: {
              tables,
              sampleData: {},
              includeData: false,
              noteParamOutputSettings: noteParamOutputSettings,
            },
          }
        );
        if (!cancelled) {
          const tableNotes = result?.[selectedTable.id] ?? {};
          setNotePreviewText(tableNotes[selectedColumn.id] ?? '');
        }
      } catch {
        // Rustコマンドが失敗した場合はローカル計算
        if (!cancelled) {
          const local = previewExcelColumnNotesLocal(tables, noteParamOutputSettings);
          const tableNotes = local?.[selectedTable.id] ?? {};
          setNotePreviewText(tableNotes[selectedColumn.id] ?? '');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [tables, selectedTable, selectedColumn, noteParamOutputSettings]);

  return (
    <div className="border-t border-zinc-100 pt-3">
      <div className="flex items-center mb-2">
        <h4 className="font-medium text-xs text-zinc-500">{labelEnJa('AppSheet Note Parameters', 'AppSheetメモ設定')}</h4>
        <InfoTooltip
          content={
            <div>
              <div className="font-medium mb-1">{helpText('AppSheet Note Parameters', 'AppSheetメモ設定')}</div>
              <p className="mb-2">
                {helpText(
                  'Set AppSheet-specific formulas like AppFormula, Initial_Value, Show_If. These are exported as Notes in Excel export.',
                  'AppFormula、Initial_Value、Show_Ifなど、AppSheet特有の式を設定できます。Excelエクスポート時にNoteとして出力されます。'
                )}
              </p>
              <p className="mb-1">
                {helpText(
                  'Configure the JSON written to the header cell Note (unset keys are not written).',
                  'ヘッダーセルのNoteに出力されるAppSheetメモ（JSON）の中身を設定します（未設定は出力しません）。'
                )}
              </p>
              <p>
                {helpText(
                  'Type / IsKey / IsLabel / DEFAULT / EnumValues are generated from the settings above.',
                  'Type / IsKey / IsLabel / DEFAULT / EnumValues は上の設定から自動生成されます。'
                )}
              </p>
            </div>
          }
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={getAppSheetString('Show_If').trim().length > 0}
              onChange={(e) => {
                const checked = e.target.checked;

                if (checked) {
                  const current = getAppSheetString('Show_If').trim();
                  // Hide: Show_If and IsHidden should not both be set.
                  setAppSheetValues({ Show_If: current.length > 0 ? current : 'TRUE', IsHidden: undefined });
                  return;
                }

                // Unset (same pattern as Required_If toggle).
                setAppSheetValues({ Show_If: undefined, IsHidden: undefined });
              }}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-600">{labelEnJa('Show?', '表示?')}</span>
            <InfoTooltip
              content={helpText(
                "Is this column visible in the app? You can also provide a 'Show_If' expression to decide.",
                'このカラムはアプリ上で表示されますか？Show_If の式で表示条件を指定することもできます。'
              )}
            />
          </label>

          <Input
            label={labelEnJa('Show_If', '表示条件（Show_If）')}
            value={getAppSheetString('Show_If')}
            onChange={(e) => {
              const v = e.target.value;
              if (v.trim().length > 0) {
                // Hide: Show_If and IsHidden should not both be set.
                setAppSheetValues({ Show_If: v, IsHidden: undefined });
                return;
              }
              setAppSheetValue('Show_If', v);
            }}
          />
        </div>

        {/* 表示・編集 */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Display / Edit', '表示・編集')}</div>
        </div>

        <DataValiditySection
          selectedColumn={selectedColumn}
          handleConstraintUpdate={handleConstraintUpdate}
          labelEnJa={labelEnJa}
          setAppSheetValue={setAppSheetValue}
          setAppSheetValues={setAppSheetValues}
          getAppSheetString={getAppSheetString}
          getTriState={getTriState}
          setTriState={setTriState}
          appSheetTriStateOptions={appSheetTriStateOptions}
        />

        <AutoComputeSection
          selectedColumn={selectedColumn}
          handleConstraintUpdate={handleConstraintUpdate}
          labelEnJa={labelEnJa}
          helpText={helpText}
          setAppSheetValue={setAppSheetValue}
          getAppSheetString={getAppSheetString}
        />

        <UpdateBehaviorSection
          selectedColumn={selectedColumn}
          handleUpdate={handleUpdate}
          labelEnJa={labelEnJa}
          helpText={helpText}
          setAppSheetValue={setAppSheetValue}
          setAppSheetValues={setAppSheetValues}
          getAppSheetString={getAppSheetString}
          getTriState={getTriState}
        />

        <DisplaySection
          selectedColumn={selectedColumn}
          handleUpdate={handleUpdate}
          labelEnJa={labelEnJa}
          helpText={helpText}
          setAppSheetValue={setAppSheetValue}
          getAppSheetString={getAppSheetString}
        />

        <OtherPropertiesSection
          labelEnJa={labelEnJa}
          helpText={helpText}
          getTriState={getTriState}
          setTriState={setTriState}
        />

        {/* テキスト */}
        {(selectedColumn.type === 'LongText' || selectedColumn.type === 'EnumList') && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Text', 'テキスト')}</div>
            {selectedColumn.type === 'LongText' && (
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
            <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Enum / EnumList', '列挙 / 列挙リスト')}</div>
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

        {/* Type Details: 数値 */}
        {(selectedColumn.type === 'Number' ||
          selectedColumn.type === 'Decimal' ||
          selectedColumn.type === 'Percent' ||
          selectedColumn.type === 'Price' ||
          selectedColumn.type === 'Progress') && (
          <CollapsibleSection
            title={labelEnJa('Type Details', '型の詳細')}
            storageKey={`column-editor-type-details-${selectedColumn.type}`}
            defaultOpen={true}
          >
            <div className="space-y-2">
              <Input
                label={labelEnJa('Numeric digits', '桁数')}
                type="number"
                value={getAppSheetNumberString('NumericDigits')}
                onChange={(e) =>
                  setAppSheetValue('NumericDigits', e.target.value === '' ? undefined : Number(e.target.value))
                }
              />
              <Select
                label={labelEnJa('Show thousands separator', '3桁区切り')}
                value={getTriState('ShowThousandsSeparator')}
                options={appSheetTriStateOptions}
                onChange={(e) => setTriState('ShowThousandsSeparator', e.target.value)}
              />
              <Select
                label={labelEnJa('Display mode', '表示モード')}
                value={getAppSheetString('NumberDisplayMode')}
                options={numberDisplayModeOptions}
                onChange={(e) => setAppSheetValue('NumberDisplayMode', e.target.value)}
              />
              <Input
                label={labelEnJa('Maximum value', '最大値')}
                type="number"
                value={getAppSheetNumberString('MaxValue')}
                onChange={(e) => setAppSheetValue('MaxValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('Minimum value', '最小値')}
                type="number"
                value={getAppSheetNumberString('MinValue')}
                onChange={(e) => setAppSheetValue('MinValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('Increase/decrease step', '刻み')}
                type="number"
                value={getAppSheetNumberString('StepValue')}
                onChange={(e) => setAppSheetValue('StepValue', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Input
                label={labelEnJa('Decimal digits', '小数桁')}
                type="number"
                value={getAppSheetNumberString('DecimalDigits')}
                onChange={(e) => setAppSheetValue('DecimalDigits', e.target.value === '' ? undefined : Number(e.target.value))}
              />
              <Select
                label={labelEnJa('Update mode', '更新モード')}
                value={getAppSheetString('UpdateMode')}
                options={updateModeOptions}
                onChange={(e) => setAppSheetValue('UpdateMode', e.target.value)}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* Change系 */}
        {selectedColumn.type.startsWith('Change') && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-600">{labelEnJa('Change (audit) types', 'Change系')}</div>
            <ArrayLinesTextarea
              label={labelEnJa('ChangeColumns - 1 line per item', 'ChangeColumns - 1行=1項目')}
              value={getAppSheetArrayLines('ChangeColumns')}
              placeholder={labelEnJa('Enter one column name per line', 'カラム名を1行に1つ入力')}
              onChangeValue={(raw) =>
                setAppSheetValue(
                  'ChangeColumns',
                  raw
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0)
                )
              }
            />
            <ArrayLinesTextarea
              label={labelEnJa('ChangeValues - 1 line per item', 'ChangeValues - 1行=1項目')}
              value={getAppSheetArrayLines('ChangeValues')}
              placeholder={labelEnJa('Enter one value per line', '値を1行に1つ入力')}
              onChangeValue={(raw) =>
                setAppSheetValue(
                  'ChangeValues',
                  raw
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0)
                )
              }
            />
          </div>
        )}

        {/* メタキー */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600">
            <span>{labelEnJa('Note override (only if needed)', 'ノート上書き（必要な場合のみ）')}</span>
            <InfoTooltip
              content={
                <div>
                  <div className="font-medium mb-1">{helpText('Caution', '注意')}</div>
                  <p className="mb-2">
                    {helpText(
                      'If you set this, it overrides the generated Note Parameters completely.',
                      'ここに入力すると、生成されるノートパラメーター（AppSheet:...）を完全に上書きします。'
                    )}
                  </p>
                  <p className="mb-2">
                    {helpText(
                      'Enter the full Note text, including the prefix (e.g. AppSheet:{...}).',
                      '先頭のプレフィックスも含め、Note全文を入力してください（例: AppSheet:{...}）。'
                    )}
                  </p>
                  <p>
                    {helpText(
                      'Tip: If you are unsure, leave it blank and use the settings above.',
                      '迷ったら空欄のままで、上の設定を使ってください。'
                    )}
                  </p>
                </div>
              }
            />
          </div>
          <Input
            label={labelEnJa('Raw Note text', 'ノート文字列（そのまま）')}
            value={getAppSheetString(RAW_NOTE_OVERRIDE_KEY)}
            onChange={(e) => setAppSheetValue(RAW_NOTE_OVERRIDE_KEY, e.target.value)}
            placeholder={labelEnJa('Example: AppSheet:{"Type":"Text"}', '例: AppSheet:{"Type":"Text"}')}
          />
        </div>

        {/* Note Parameters Preview */}
        <div className="mt-4 pt-3 border-t border-zinc-200">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="text-[11px] font-medium text-zinc-600">
              {labelEnJa('Note Parameters Preview', 'ノートパラメータープレビュー')}
            </div>
            <InfoTooltip
              content={helpText(
                'Preview of the AppSheet Note that will be written to the Excel header cell. This is the actual value exported.',
                'Excelヘッダーセルに書き込まれるAppSheetメモのプレビューです。実際にエクスポートされる値です。'
              )}
            />
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded p-2 font-mono text-[10px] text-zinc-700 break-all whitespace-pre-wrap min-h-[32px]">
            {notePreviewText || (
              <span className="text-zinc-400 italic">
                {labelEnJa('(No note parameters)', '(ノートパラメーターなし)')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
