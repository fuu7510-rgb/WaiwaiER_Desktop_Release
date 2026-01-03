import { CollapsibleSection, InfoTooltip, Input, Select } from '../../../common';

import type { Column, ColumnConstraints } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;

  labelEnJa: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;

  getTriState: (key: string) => '' | 'true' | 'false';
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
              <InfoTooltip
                content={
                  <div>
                    <div>
                      {labelEnJa(
                        'Sets required-ness as a tri-state toggle (writes IsRequired). Use Required_If to decide by expression.',
                        '必須設定を3値トグルで指定します（IsRequiredを書き出します）。Required_Ifで数式指定もできます。'
                      )}
                    </div>
                    {requiredIfNonEmpty && (
                      <div className="mt-2 font-medium">
                        {labelEnJa(
                          "Disabled because 'Required_If' is set. Clear the expression to change this toggle.",
                          'Required_If（数式）が設定されているため変更できません。数式を削除すると変更できます。'
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </span>
          }
          value={isRequiredTriState}
          options={appSheetTriStateOptions}
          disabled={requiredIfNonEmpty}
          onChange={(e) => {
            const raw = e.target.value;

            // Toggle and formula are mutually exclusive.
            if (raw === 'true' || raw === 'false') {
              setAppSheetValues({
                Required_If: undefined,
                IsRequired: raw === 'true',
              });
            } else {
              // Empty = inherit (no explicit IsRequired)
              setAppSheetValues({ IsRequired: undefined });
            }
            handleConstraintUpdate({ required: raw === 'true' });
          }}
        />
        <Input
          label={labelEnJa('Required_If', '必須条件（数式）')}
          value={requiredIf}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim().length > 0) {
              // NOTE: Must update atomically; otherwise subsequent AppSheet updates
              // computed from stale selectedColumn.appSheet can wipe out Required_If.
              setAppSheetValues({ Required_If: v, IsRequired: undefined });
              handleConstraintUpdate({ required: false });
              // Required_If is present => Require? must not be output.
              return;
            }

            // Empty string should delete the key.
            setAppSheetValue('Required_If', v);
          }}
        />
      </div>
    </CollapsibleSection>
  );
}
