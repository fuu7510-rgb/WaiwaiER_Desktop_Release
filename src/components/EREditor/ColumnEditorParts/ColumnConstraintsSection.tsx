import { InfoTooltip } from '../../common';

import type { Column, ColumnConstraints } from '../../../types';

type Labels = {
  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;
  labelKey: (key: string) => string;
};

type Props = {
  selectedColumn: Column;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;
  labels: Labels;
};

export function ColumnConstraintsSection({ selectedColumn, handleConstraintUpdate, labels }: Props) {
  const { labelEnJa, helpText, labelKey } = labels;

  return (
    <div className="border-t border-zinc-100 pt-3">
      <div className="flex items-center mb-2">
        <h4 className="font-medium text-xs text-zinc-500">{labelKey('table.constraints')}</h4>
        <InfoTooltip
          content={
            <div>
              <div className="font-medium mb-1">{helpText('Constraints', '制約')}</div>
              <p>
                {helpText(
                  'Set constraints like required, unique, and default values. These become validation rules in AppSheet.',
                  '必須、ユニーク、デフォルト値などの制約を設定します。これらはAppSheetでのバリデーションルールになります。'
                )}
              </p>
            </div>
          }
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!selectedColumn.constraints.unique}
            onChange={(e) => handleConstraintUpdate({ unique: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">{labelKey('column.constraints.unique')}</span>
        </label>

        {(selectedColumn.type === 'Enum' || selectedColumn.type === 'EnumList') && (
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {labelKey('column.constraints.enumValues')}
            </label>
            <textarea
              value={selectedColumn.constraints.enumValues?.join('\n') || ''}
              onChange={(e) =>
                handleConstraintUpdate({
                  enumValues: e.target.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0),
                })
              }
              className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              rows={3}
              placeholder={labelEnJa('Enter one option per line', '選択肢を1行に1つ入力')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
