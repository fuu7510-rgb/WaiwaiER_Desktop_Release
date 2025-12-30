import { CollapsibleSection, InfoTooltip, Input } from '../../../common';

import type { Column, ColumnConstraints } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;

  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  getAppSheetString: (key: string) => string;
};

export function AutoComputeSection({
  selectedColumn,
  handleConstraintUpdate,
  labelEnJa,
  helpText,
  setAppSheetValue,
  getAppSheetString,
}: Props) {
  return (
    <CollapsibleSection title={labelEnJa('Auto Compute', '自動計算')} storageKey="column-editor-auto-compute" defaultOpen={true}>
      <div className="space-y-2">
        <Input
          label={labelEnJa('App formula', 'アプリ数式')}
          labelSuffix={
            <InfoTooltip
              content={
                <div className="max-w-xs">
                  <div className="font-medium mb-1">{helpText('AppFormula Simulator', 'アプリ数式シミュレーター')}</div>
                  <p className="mb-2">
                    {helpText(
                      'Supported: [Column], [Ref].[Column], operators (+, -, *, /, &, =, <>, <, >, <=, >=), IF, AND, OR, NOT, ISBLANK, CONCATENATE, TEXT, TODAY, NOW, LOOKUP, FILTER, SELECT, ANY.',
                      '対応: [列名], [Ref].[列名], 演算子 (+, -, *, /, &, =, <>, <, >, <=, >=), IF, AND, OR, NOT, ISBLANK, CONCATENATE, TEXT, TODAY, NOW, LOOKUP, FILTER, SELECT, ANY'
                    )}
                  </p>
                  <p className="mb-2">
                    {helpText(
                      'Not supported: COUNT, SUM, MAX, MIN, SWITCH, IFS, CONTAINS, IN, SPLIT, LEN, LEFT, RIGHT, USEREMAIL, CONTEXT, etc.',
                      '未対応: COUNT, SUM, MAX, MIN, SWITCH, IFS, CONTAINS, IN, SPLIT, LEN, LEFT, RIGHT, USEREMAIL, CONTEXT など'
                    )}
                  </p>
                  <p>
                    {helpText(
                      'Compatibility: leading "=" is ignored; full-width operators are normalized; "-" is treated as blank; numbers like "1,234" are supported.',
                      '互換注意: 先頭の「=」は無視 / 全角演算子は正規化 / 「-」は空欄扱い / 「1,234」のようなカンマ付き数値に対応'
                    )}
                  </p>
                </div>
              }
            />
          }
          value={getAppSheetString('AppFormula')}
          onChange={(e) => {
            const v = e.target.value;
            setAppSheetValue('AppFormula', v);
            if (v.trim().length > 0) {
              handleConstraintUpdate({ defaultValue: undefined });
            }
          }}
        />
        <Input
          label={labelEnJa('Initial value', '初期値')}
          value={selectedColumn.constraints.defaultValue || ''}
          disabled={getAppSheetString('AppFormula').trim().length > 0}
          onChange={(e) => handleConstraintUpdate({ defaultValue: e.target.value })}
        />
        <Input
          label={labelEnJa('Suggested values', '候補値')}
          value={getAppSheetString('Suggested_Values')}
          onChange={(e) => setAppSheetValue('Suggested_Values', e.target.value)}
        />
        <Input
          label={labelEnJa('Spreadsheet formula', 'スプレッドシート数式')}
          value={getAppSheetString('SpreadsheetFormula')}
          onChange={(e) => setAppSheetValue('SpreadsheetFormula', e.target.value)}
          disabled
          placeholder={helpText('Generated from spreadsheet (read-only)', 'スプレッドシートから生成（読み取り専用）')}
        />
      </div>
    </CollapsibleSection>
  );
}
