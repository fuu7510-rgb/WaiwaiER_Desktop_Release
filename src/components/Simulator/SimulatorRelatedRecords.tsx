import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import { formatValue } from '../../lib';
import type { Column, Table } from '../../types';
import { getRefDisplayLabel } from './recordLabel';
import { computeRowWithAppFormulas } from '../../lib/appsheet/expression';

export interface RelatedSection {
  childTable: Table;
  refColumn: Column;
  rows: Array<{ row: Record<string, unknown>; rowIndex: number }>;
}

interface SimulatorRelatedRecordsProps {
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  relatedSections: RelatedSection[];
  onAddRelatedRow: (section: RelatedSection) => void;
  onSelectRelatedRow: (tableId: string, row: Record<string, unknown>, rowIndex: number) => void;
}

export function SimulatorRelatedRecords({
  tables,
  sampleDataByTableId,
  relatedSections,
  onAddRelatedRow,
  onSelectRelatedRow,
}: SimulatorRelatedRecordsProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-3">
      <div className="space-y-3">
        {relatedSections.map((section) => {
          const sameRefCount = relatedSections.filter(
            (s) => s.childTable.id === section.childTable.id
          ).length;

          const titleBase = `Related ${section.childTable.name}s`;
          const title = sameRefCount > 1 ? `${titleBase} (${section.refColumn.name})` : titleBase;

          return (
            <div key={`${section.childTable.id}:${section.refColumn.id}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-xs font-medium text-zinc-700 truncate">{title}</div>
                  <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                    {section.rows.length}
                  </span>
                </div>
              </div>

              <div className="border border-zinc-200 rounded bg-white overflow-hidden">
                {section.rows.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-zinc-400">
                    {t('common.noResults', '該当なし')}
                  </div>
                ) : (
                  <div className="max-h-[260px] overflow-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          {section.childTable.columns.map((c) => (
                            <th
                              key={c.id}
                              className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {c.name}
                            </th>
                          ))}
                          <th className="px-2 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {section.rows.map(({ row, rowIndex }) => {
                          const computedRow = computeRowWithAppFormulas({
                            tables,
                            sampleDataByTableId,
                            table: section.childTable,
                            row,
                            now: new Date(),
                          });

                          return (
                            <tr
                              key={rowIndex}
                              className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                              onClick={() => onSelectRelatedRow(section.childTable.id, row, rowIndex)}
                            >
                              {section.childTable.columns.map((c) => (
                                <td
                                  key={c.id}
                                  className="px-3 py-2 text-xs text-zinc-700 whitespace-nowrap"
                                >
                                  {c.type === 'Ref'
                                    ? getRefDisplayLabel({
                                        tables,
                                        sampleDataByTableId,
                                        column: c,
                                        value: computedRow[c.id],
                                      })
                                    : formatValue(computedRow[c.id], c.type)}
                                </td>
                              ))}
                              <td className="px-2 py-2 text-right text-zinc-400">
                                <span aria-hidden="true">›</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t border-zinc-200 bg-zinc-50 px-2 py-1.5 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onAddRelatedRow(section)}
                  >
                    {t('simulator.addRow', '＋追加')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
