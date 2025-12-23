import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Table } from '../../types';
import { generateSampleData, formatValue } from '../../lib';

interface TableViewProps {
  table: Table;
}

export function TableView({ table }: TableViewProps) {
  const { t } = useTranslation();
  const sampleData = useMemo(() => generateSampleData(table, 5), [table]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-zinc-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead className="bg-zinc-50">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider"
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
          <tbody className="bg-white divide-y divide-zinc-100">
            {sampleData.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-3 py-6 text-center text-zinc-400 text-xs"
                >
                  {t('simulator.noData')}
                </td>
              </tr>
            ) : (
              sampleData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-zinc-50">
                  {table.columns.map((column) => (
                    <td key={column.id} className="px-3 py-2 text-xs text-zinc-700 whitespace-nowrap">
                      {String(row[column.id] ?? '')}
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
