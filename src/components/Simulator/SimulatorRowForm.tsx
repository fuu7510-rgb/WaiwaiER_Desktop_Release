import { useTranslation } from 'react-i18next';
import type { Column, Table } from '../../types';
import { Select } from '../common/Select';
import { getRowLabel, getRefDisplayLabel } from './recordLabel';
import { getAppFormulaString } from '../../lib/appsheet/expression';
import { formatValue } from '../../lib';

interface SimulatorRowFormProps {
  column: Column;
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  selectedRow: Record<string, unknown>;
  draftRow: Record<string, unknown> | null;
  computedDraftRow: Record<string, unknown> | null;
  computedSelectedRow: Record<string, unknown> | null;
  onDraftChange: (updater: (prev: Record<string, unknown> | null) => Record<string, unknown>) => void;
}

function getInputType(column: Column): string {
  switch (column.type) {
    case 'Number':
    case 'Decimal':
    case 'Percent':
    case 'Price':
    case 'Progress':
      return 'number';
    case 'Date':
      return 'date';
    case 'DateTime':
      return 'datetime-local';
    case 'Time':
      return 'time';
    case 'Email':
      return 'email';
    case 'Phone':
      return 'tel';
    case 'Url':
      return 'url';
    case 'Color':
      return 'color';
    default:
      return 'text';
  }
}

function parseEnumList(value: unknown): Set<string> {
  if (Array.isArray(value)) {
    return new Set(
      value
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }
  const s = String(value ?? '').trim();
  if (!s) return new Set();
  return new Set(
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

function formatEnumList(values: Set<string>): string {
  return Array.from(values.values()).join(', ');
}

export function SimulatorRowForm({
  column,
  tables,
  sampleDataByTableId,
  selectedRow,
  draftRow,
  computedDraftRow,
  computedSelectedRow,
  onDraftChange,
}: SimulatorRowFormProps) {
  const { t } = useTranslation();

  const appFormula = getAppFormulaString(column);
  const displayRow = computedDraftRow ?? draftRow ?? computedSelectedRow ?? selectedRow;
  const currentValue = displayRow?.[column.id];

  // AppFormula列は編集不可（表示のみ）
  if (appFormula.length > 0) {
    if (column.type === 'Ref') {
      return (
        <>
          {getRefDisplayLabel({
            tables,
            sampleDataByTableId,
            column,
            value: currentValue,
          })}
        </>
      );
    }
    return <>{formatValue(currentValue, column.type)}</>;
  }

  if (column.type === 'Yes/No') {
    const checked =
      currentValue === true ||
      String(currentValue ?? '').toLowerCase() === 'yes' ||
      String(currentValue ?? '').toLowerCase() === 'true' ||
      String(currentValue ?? '').trim() === '1';
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            const nextValue: unknown = e.target.checked ? 'Yes' : 'No';
            onDraftChange((prev) => ({
              ...(prev ?? { ...selectedRow }),
              [column.id]: nextValue,
            }));
          }}
          className="w-4 h-4 rounded border-zinc-300"
          aria-label={column.name}
          title={column.name}
        />
        <span className="text-xs text-zinc-600">{checked ? 'Yes' : 'No'}</span>
      </label>
    );
  }

  if (column.type === 'Enum') {
    const options = column.constraints.enumValues ?? [];
    return (
      <Select
        aria-label={column.name}
        title={column.name}
        value={String(currentValue ?? '')}
        onChange={(e) => {
          const nextValue: unknown = e.target.value;
          onDraftChange((prev) => ({
            ...(prev ?? { ...selectedRow }),
            [column.id]: nextValue,
          }));
        }}
        options={[
          { value: '', label: t('common.select', '選択') },
          ...options.map((opt) => ({ value: opt, label: opt })),
        ]}
      />
    );
  }

  if (column.type === 'EnumList') {
    const options = column.constraints.enumValues ?? [];
    const selected = parseEnumList(currentValue);
    return (
      <div className="space-y-1">
        {options.length === 0 ? (
          <div className="text-xs text-zinc-400">{t('common.noOptions', '選択肢なし')}</div>
        ) : (
          options.map((opt) => {
            const isChecked = selected.has(opt);
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(opt);
                    else next.delete(opt);
                    const nextValue: unknown = formatEnumList(next);
                    onDraftChange((prev) => ({
                      ...(prev ?? { ...selectedRow }),
                      [column.id]: nextValue,
                    }));
                  }}
                  className="w-4 h-4 rounded border-zinc-300"
                  aria-label={`${column.name}:${opt}`}
                  title={`${column.name}:${opt}`}
                />
                <span className="text-xs text-zinc-600">{opt}</span>
              </label>
            );
          })
        )}
      </div>
    );
  }

  if (column.type === 'Ref') {
    const refTableId = column.constraints.refTableId;
    const refTable = refTableId ? tables.find((tb) => tb.id === refTableId) : undefined;
    const refRows = refTableId ? sampleDataByTableId[refTableId] ?? [] : [];
    const refKeyColId =
      column.constraints.refColumnId ??
      refTable?.columns.find((c) => c.isKey)?.id ??
      refTable?.columns[0]?.id;

    const options =
      refTable && refKeyColId
        ? refRows
            .map((r) => {
              const v = String(r[refKeyColId] ?? '').trim();
              const label = getRowLabel(refTable, r, { fallback: v }) || v;
              return { value: v, label };
            })
            .filter((opt) => opt.value)
        : [];

    return (
      <Select
        aria-label={column.name}
        title={column.name}
        value={String(currentValue ?? '')}
        onChange={(e) => {
          const nextValue: unknown = e.target.value;
          onDraftChange((prev) => ({
            ...(prev ?? { ...selectedRow }),
            [column.id]: nextValue,
          }));
        }}
        options={[
          {
            value: '',
            label: refTable
              ? `${refTable.name} ${t('common.select', '選択')}`
              : t('common.select', '選択'),
          },
          ...options,
        ]}
      />
    );
  }

  // それ以外はシンプル入力（従来どおり）
  return (
    <input
      type={getInputType(column)}
      aria-label={column.name}
      title={column.name}
      value={String(currentValue ?? '')}
      onChange={(e) => {
        const nextValue: unknown = e.target.value;
        onDraftChange((prev) => ({
          ...(prev ?? { ...selectedRow }),
          [column.id]: nextValue,
        }));
      }}
      className="w-full text-xs px-2 py-1 border border-zinc-200 rounded bg-white"
    />
  );
}
