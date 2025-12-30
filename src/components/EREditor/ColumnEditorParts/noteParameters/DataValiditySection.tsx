import { CollapsibleSection, Input } from '../../../common';

import type { Column, ColumnConstraints } from '../../../../types';

import { NoteParamBadge } from '../NoteParamBadge';

type Props = {
  selectedColumn: Column;
  handleConstraintUpdate: (updates: Partial<ColumnConstraints>) => void;

  labelEnJa: (en: string, ja: string) => string;

  setAppSheetValue: (key: string, value: unknown) => void;
  setAppSheetValues: (values: Record<string, unknown>) => void;
  getAppSheetString: (key: string) => string;
};

export function DataValiditySection({
  selectedColumn,
  handleConstraintUpdate,
  labelEnJa,
  setAppSheetValue,
  setAppSheetValues,
  getAppSheetString,
}: Props) {
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
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!selectedColumn.constraints.required || getAppSheetString('Required_If').trim().length > 0}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                const current = getAppSheetString('Required_If').trim();
                setAppSheetValues({
                  Required_If: current.length > 0 ? current : 'TRUE',
                  IsRequired: undefined,
                });
                handleConstraintUpdate({ required: false });
                return;
              }

              setAppSheetValues({ Required_If: undefined, IsRequired: undefined });
              handleConstraintUpdate({ required: false });
            }}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">
            {labelEnJa('Require?', '必須')}
            <NoteParamBadge field="required" />
          </span>
        </label>
        <Input
          label={labelEnJa('Required_If', '必須条件（数式）')}
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
      </div>
    </CollapsibleSection>
  );
}
