import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Table } from '../../types';
import { generateSampleData } from '../../lib';
import { getRefDisplayLabel } from './recordLabel';

interface TableViewProps {
  table: Table;
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  searchQuery?: string;
  data?: Record<string, unknown>[];
  selectedRowKey?: string | null;
  onRowClick?: (row: Record<string, unknown>, rowKey: string, rowIndex: number) => void;
}

export function TableView({
  table,
  tables,
  sampleDataByTableId,
  searchQuery = '',
  data,
  selectedRowKey = null,
  onRowClick,
}: TableViewProps) {
  const { t } = useTranslation();
  const sampleData = useMemo(() => generateSampleData(table, 5), [table]);
  const rows = data ?? sampleData;

  const keyColumnId = useMemo(() => {
    return table.columns.find((c) => c.isKey)?.id ?? table.columns[0]?.id;
  }, [table.columns]);

  const indexedRows = useMemo(() => rows.map((row, index) => ({ row, index })), [rows]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return indexedRows;
    return indexedRows.filter(({ row }) =>
      table.columns.some((column) => String(row[column.id] ?? '').toLowerCase().includes(q))
    );
  }, [indexedRows, searchQuery, table.columns]);

  const getRowKey = (row: Record<string, unknown>, fallbackIndex: number): string => {
    const keyValue = keyColumnId ? row[keyColumnId] : undefined;
    const keyString = String(keyValue ?? '').trim();
    return keyString ? `${keyColumnId}:${keyString}` : `row:${fallbackIndex}`;
  };

  return (
    <div className="h-full bg-white border border-zinc-200 overflow-auto">
      <div className="min-w-full">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    {column.isKey && (
                      <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    )}
                    {column.name}
                    {column.constraints.required && <span className="text-red-400">*</span>}
                  </div>
                  <div className="text-zinc-400 font-normal normal-case text-[9px]">
                    {t(`columnTypes.${column.type}`)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-8 text-center text-zinc-400 text-xs"
                >
                  {t('simulator.noData')}
                </td>
              </tr>
            ) : (
              filteredData.map(({ row, index: originalIndex }) => (
                <tr
                  key={originalIndex}
                  onClick={() => {
                    if (!onRowClick) return;
                    onRowClick(row, getRowKey(row, originalIndex), originalIndex);
                  }}
                  className={`border-b border-zinc-100 hover:bg-zinc-50 ${
                    selectedRowKey === getRowKey(row, originalIndex) ? 'bg-zinc-100' : ''
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {table.columns.map((column) => (
                    <td key={column.id} className="px-3 py-2 text-xs text-zinc-700 whitespace-nowrap">
                      {column.type === 'Ref'
                        ? getRefDisplayLabel({
                            tables,
                            sampleDataByTableId,
                            column,
                            value: row[column.id],
                          })
                        : String(row[column.id] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
