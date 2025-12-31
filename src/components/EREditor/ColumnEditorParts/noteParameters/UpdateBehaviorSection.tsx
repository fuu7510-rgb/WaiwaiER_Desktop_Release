import { CollapsibleSection, InfoTooltip, Input } from '../../../common';

import type { Column } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleUpdate: (updates: Partial<Column>) => void;

  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;
  getTriState: (key: string) => '' | 'true' | 'false';
};

export function UpdateBehaviorSection({
  selectedColumn,
  handleUpdate,
  labelEnJa,
  helpText,
  setAppSheetValue,
  setAppSheetValues,
  getAppSheetString,
  getTriState,
}: Props) {
  return (
    <CollapsibleSection title={labelEnJa('Update Behavior', '更新動作')} storageKey="column-editor-update-behavior" defaultOpen={true}>
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isKey}
            onChange={(e) => handleUpdate({ isKey: e.target.checked })}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {labelEnJa('Key', 'キー')}
          </span>
          <InfoTooltip
            content={helpText('This column uniquely identifies rows from this table.', 'このカラムはテーブルの行を一意に識別します。')}
          />
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getTriState('Editable') !== 'false'}
            onChange={(e) => {
              const checked = e.target.checked;

              if (!checked) {
                setAppSheetValues({ Editable_If: undefined, Editable: false });
                return;
              }

              const current = getAppSheetString('Editable_If').trim();
              setAppSheetValues({ Editable_If: current.length > 0 ? current : 'TRUE', Editable: undefined });
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('Editable?', '編集可能')}</span>
          <InfoTooltip
            content={helpText(
              'Can users (or automatic app formulas) modify data in this column? You can also provide an Editable_If expression to decide.',
              'ユーザー（または自動アプリ数式）がこのカラムのデータを変更できますか？Editable_If式で条件を指定することもできます。'
            )}
          />
        </label>
        <Input
          label={labelEnJa('Editable_If', '編集可能条件（数式）')}
          value={getAppSheetString('Editable_If')}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim().length > 0) {
              setAppSheetValues({ Editable_If: v, Editable: undefined });
              return;
            }
            setAppSheetValues({ Editable_If: undefined });
          }}
        />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getAppSheetString('Reset_If').trim().length > 0}
            onChange={(e) => {
              const checked = e.target.checked;
              if (!checked) {
                setAppSheetValue('Reset_If', undefined);
                return;
              }
              const current = getAppSheetString('Reset_If').trim();
              setAppSheetValue('Reset_If', current.length > 0 ? current : 'TRUE');
            }}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('Reset on edit?', '編集時リセット')}</span>
          <InfoTooltip
            content={helpText(
              'Should this column be reset to its initial value when the row is edited?',
              '行が編集されたときにこのカラムを初期値にリセットしますか？'
            )}
          />
        </label>

        <Input
          label={labelEnJa('Reset_If', 'リセット条件')}
          value={getAppSheetString('Reset_If')}
          onChange={(e) => {
            const v = e.target.value;
            setAppSheetValue('Reset_If', v);
          }}
        />
      </div>
    </CollapsibleSection>
  );
}
