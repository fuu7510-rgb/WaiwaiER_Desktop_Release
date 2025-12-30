import { InfoTooltip, Input } from '../../common';

import type { Column } from '../../../types';

type Labels = {
  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;
  tEn: (key: string) => unknown;
  tJa: (key: string) => unknown;
  labelKey: (key: string) => string;
};

type Props = {
  selectedColumn: Column;
  handleUpdate: (updates: Partial<Column>) => void;
  labels: Labels;
};

export function ColumnHeaderAndNameSection({ selectedColumn, handleUpdate, labels }: Props) {
  const { labelEnJa, helpText, tEn, tJa, labelKey } = labels;

  return (
    <>
      <div className="flex items-center">
        <h3 className="font-bold text-xs text-zinc-500 uppercase tracking-wider">
          {labelEnJa(
            `${String(tEn('column.column'))} ${String(tEn('common.settings'))}`,
            `${String(tJa('column.column'))}${String(tJa('common.settings'))}`
          )}
        </h3>
        <InfoTooltip
          content={
            <div>
              <div className="font-medium mb-1">{helpText('Column Settings Help', 'カラム設定のヘルプ')}</div>
              <p>
                {helpText(
                  'Set basic column information such as name, data type, and key/label settings. These settings are exported as Note parameters for AppSheet.',
                  'カラム名、データ型、キー・ラベル設定などの基本情報を設定します。AppSheetエクスポート時にNoteパラメータとして出力されます。'
                )}
              </p>
            </div>
          }
        />
      </div>

      <Input
        label={labelKey('table.columnName')}
        value={selectedColumn.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
    </>
  );
}
