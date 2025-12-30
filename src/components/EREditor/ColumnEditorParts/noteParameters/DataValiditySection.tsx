import { CollapsibleSection, Input, Select } from '../../../common';

import type { Column, ColumnConstraints } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;

  labelEnJa: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;

  getTriState: (key: string) => '' | 'true' | 'false';
  setTriState: (key: string, raw: string) => void;
  appSheetTriStateOptions: { value: string; label: string }[];
};

export function DataValiditySection({
  selectedColumn,
  handleConstraintUpdate,
  labelEnJa,
  setAppSheetValue,
  setAppSheetValues,
  getAppSheetString,
  getTriState,
  setTriState,
  appSheetTriStateOptions,
}: Props) {
  const requiredIf = getAppSheetString('Required_If');
  const requiredIfNonEmpty = requiredIf.trim().length > 0;

  // Prefer explicit Note Parameters value; fallback to derived constraints for legacy data.
  const isRequiredTriState = requiredIfNonEmpty
    ? ''
    : (getTriState('IsRequired') !== '' ? getTriState('IsRequired') : (selectedColumn.constraints.required ? 'true' : ''));

  return (
    <CollapsibleSection title={labelEnJa('Data Validity', 'データ検証')} storageKey="column-editor-data-validity" defaultOpen={true}>
      <div className="space-y-2">
        <Input
          label={labelEnJa('Valid If', '有効条件')}
          value={getAppSheetString('Valid_If')}
          onChange={(e) => setAppSheetValue('Valid_If', e.target.value)}
        />
        <Input
          label={labelEnJa('Invalid value error', '無効時エラーメッセージ')}
          value={getAppSheetString('Error_Message_If_Invalid')}
          onChange={(e) => setAppSheetValue('Error_Message_If_Invalid', e.target.value)}
        />
        <Select
          label={
            <span className="inline-flex items-center">
              {labelEnJa('Require? (toggle)', '必須（トグル）')}
            </span>
          }
          value={isRequiredTriState}
          options={appSheetTriStateOptions}
          disabled={requiredIfNonEmpty}
          onChange={(e) => {
            const raw = e.target.value;

            // Toggle and formula are mutually exclusive.
            if (raw === 'true' || raw === 'false') {
              setAppSheetValue('Required_If', undefined);
            }

            setTriState('IsRequired', raw);
            handleConstraintUpdate({ required: raw === 'true' });
          }}
        />
        <Input
          label={labelEnJa('Required_If', '必須条件（数式）')}
          value={requiredIf}
          onChange={(e) => {
            const v = e.target.value;
            setAppSheetValue('Required_If', v);
            if (v.trim().length > 0) {
              handleConstraintUpdate({ required: false });
              // Required_If is present => Require? must not be output.
              setTriState('IsRequired', '');
            }
          }}
        />
      </div>
    </CollapsibleSection>
  );
}
