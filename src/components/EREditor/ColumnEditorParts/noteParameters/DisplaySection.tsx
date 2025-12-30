import { CollapsibleSection, InfoTooltip, Input } from '../../../common';

import type { Column } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleUpdate: (updates: Partial<Column>) => void;

  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  getAppSheetString: (key: string) => string;
};

export function DisplaySection({
  selectedColumn,
  handleUpdate,
  labelEnJa,
  helpText,
  setAppSheetValue,
  getAppSheetString,
}: Props) {
  return (
    <CollapsibleSection title={labelEnJa('Display', '表示')} storageKey="column-editor-display" defaultOpen={true}>
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isLabel}
            onChange={(e) => handleUpdate({ isLabel: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">
            {labelEnJa('Label', 'ラベル')}
          </span>
          <InfoTooltip
            content={helpText(
              'This column represents rows from this table in lists and refs.',
              'このカラムは一覧や参照で、このテーブルの行を代表表示します。'
            )}
          />
        </label>
        <Input
          label={labelEnJa('Display name', '表示名')}
          labelSuffix={
            <InfoTooltip
              content={helpText(
                'The user-visible name for this column. Defaults to column name.',
                'このカラムの表示名です。未設定の場合はカラム名が使われます。'
              )}
            />
          }
          value={getAppSheetString('DisplayName')}
          onChange={(e) => setAppSheetValue('DisplayName', e.target.value)}
        />
        <Input
          label={labelEnJa('Description', '説明')}
          labelSuffix={<InfoTooltip content={helpText('Text description for this column.', 'このカラムの説明文です。')} />}
          value={getAppSheetString('Description')}
          onChange={(e) => setAppSheetValue('Description', e.target.value)}
        />
      </div>
    </CollapsibleSection>
  );
}
