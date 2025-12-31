import { Select } from '../../common';

import type { Column, ColumnConstraints, ColumnType } from '../../../types';

type Option = { value: string; label: string };

type Props = {
  selectedColumn: Column;
  typeOptions: Option[];
  labelKey: (key: string) => string;

  sanitizeForType: (
    type: ColumnType,
    constraints: ColumnConstraints,
    appSheet: Record<string, unknown> | undefined
  ) => { constraints: ColumnConstraints; appSheet: Record<string, unknown> | undefined };

  handleUpdate: (updates: Partial<Column>) => void;
};

export function ColumnTypeSection({
  selectedColumn,
  typeOptions,
  labelKey,
  sanitizeForType,
  handleUpdate,
}: Props) {
  return (
    <div>
      <div className="flex items-center mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{labelKey('table.columnType')}</span>
      </div>
      <Select
        value={selectedColumn.type}
        options={typeOptions}
        onChange={(e) => {
          const nextType = e.target.value as ColumnType;
          const { constraints, appSheet } = sanitizeForType(
            nextType,
            selectedColumn.constraints,
            selectedColumn.appSheet as Record<string, unknown> | undefined
          );
          handleUpdate({ type: nextType, constraints, appSheet });
        }}
      />
    </div>
  );
}
