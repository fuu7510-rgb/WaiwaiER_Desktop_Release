import { CollapsibleSection, InfoTooltip, Input, Select } from '../../../common';

import type { Column } from '../../../../types';

type Props = {
  selectedColumn: Column;
  handleUpdate: (updates: Partial<Column>) => void;

  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;

  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;
  getTriState: (key: string) => '' | 'true' | 'false';
  appSheetTriStateOptions: { value: string; label: string }[];
};

export function UpdateBehaviorSection({
  selectedColumn,
  handleUpdate,
  labelEnJa,
  helpText,
  setAppSheetValues,
  getAppSheetString,
  getTriState,
  appSheetTriStateOptions,
}: Props) {
  const editableIfRaw = getAppSheetString('Editable_If');
  const editableIfTrimmed = editableIfRaw.trim();
  const editableUpper = editableIfTrimmed.toUpperCase();
  const editableIsBoolean = editableUpper === 'TRUE' || editableUpper === 'FALSE';
  const editableHasFormula = editableIfTrimmed.length > 0 && !editableIsBoolean;
  const editableTriState: '' | 'true' | 'false' =
    editableIfTrimmed.length === 0
      ? ''
      : editableUpper === 'TRUE'
        ? 'true'
        : editableUpper === 'FALSE'
          ? 'false'
          : '';

  const editableFallbackTriState = getTriState('Editable');
  const editableUiTriState: '' | 'true' | 'false' = editableTriState !== '' ? editableTriState : editableFallbackTriState;

  const resetIfRaw = getAppSheetString('Reset_If');
  const resetIfTrimmed = resetIfRaw.trim();
  const resetUpper = resetIfTrimmed.toUpperCase();
  const resetIsBoolean = resetUpper === 'TRUE' || resetUpper === 'FALSE';
  const resetHasFormula = resetIfTrimmed.length > 0 && !resetIsBoolean;
  const resetTriState: '' | 'true' | 'false' =
    resetIfTrimmed.length === 0 ? '' : (resetUpper === 'TRUE' ? 'true' : resetUpper === 'FALSE' ? 'false' : '');

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
        <Select
          label={
            <span className="inline-flex items-center">
              {labelEnJa('Editable?', '編集可能')}
              <InfoTooltip
                content={
                  <div>
                    <div>
                      {helpText(
                        'Can users (or automatic app formulas) modify data in this column? This toggle sets Editable_If to TRUE/FALSE (or clears it). You can also enter an Editable_If expression.',
                        'ユーザー（または自動アプリ数式）がこのカラムのデータを変更できますか？このトグルは Editable_If を TRUE/FALSE（または空欄）に設定します。Editable_If の式も入力できます。'
                      )}
                    </div>
                    {editableHasFormula && (
                      <div className="mt-2 font-medium">
                        {helpText(
                          "Disabled because 'Editable_If' contains an expression (not TRUE/FALSE). Clear the expression to change this toggle.",
                          'Editable_If に TRUE/FALSE 以外の式が入っているため変更できません。式を削除すると変更できます。'
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </span>
          }
          value={editableHasFormula ? '' : editableUiTriState}
          options={appSheetTriStateOptions}
          disabled={editableHasFormula}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === '') {
              // Unset: clear boolean Editable_If, and also clear legacy Editable to avoid conflicts.
              setAppSheetValues({ Editable_If: undefined, Editable: undefined });
              return;
            }

            // Explicit toggle: set boolean constant into Editable_If.
            setAppSheetValues({ Editable_If: raw === 'true' ? 'TRUE' : 'FALSE', Editable: undefined });
          }}
        />
        <Input
          label={labelEnJa('Editable_If', '編集可能条件（数式）')}
          value={editableIfRaw}
          onChange={(e) => {
            const v = e.target.value;
            if (v.trim().length > 0) {
              setAppSheetValues({ Editable_If: v, Editable: undefined });
              return;
            }
            setAppSheetValues({ Editable_If: undefined });
          }}
        />
        <Select
          label={
            <span className="inline-flex items-center">
              {labelEnJa('Reset on edit?', '編集時リセット')}
              <InfoTooltip
                content={
                  <div>
                    <div>
                      {helpText(
                        'Should this column be reset to its initial value when the row is edited?',
                        '行が編集されたときにこのカラムを初期値にリセットしますか？'
                      )}
                    </div>
                    {resetHasFormula && (
                      <div className="mt-2 font-medium">
                        {helpText(
                          "Disabled because 'Reset_If' contains an expression (not TRUE/FALSE). Clear the expression to change this toggle.",
                          'Reset_If に TRUE/FALSE 以外の式が入っているため変更できません。式を削除すると変更できます。'
                        )}
                      </div>
                    )}
                  </div>
                }
              />
            </span>
          }
          value={resetTriState}
          options={appSheetTriStateOptions}
          disabled={resetHasFormula}
          onChange={(e) => {
            const raw = e.target.value;

            if (raw === '') {
              setAppSheetValues({ Reset_If: undefined });
              return;
            }

            if (raw === 'false') {
              setAppSheetValues({ Reset_If: 'FALSE' });
              return;
            }

            // true: always set TRUE (not keep old value which could be FALSE)
            setAppSheetValues({ Reset_If: 'TRUE' });
          }}
        />

        <Input
          label={labelEnJa('Reset_If', 'リセット条件')}
          value={getAppSheetString('Reset_If')}
          onChange={(e) => {
            const v = e.target.value;
            setAppSheetValues({ Reset_If: v });
          }}
        />
      </div>
    </CollapsibleSection>
  );
}
