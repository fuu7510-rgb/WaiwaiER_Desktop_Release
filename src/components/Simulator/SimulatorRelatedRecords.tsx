import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import { formatValue } from '../../lib';
import type { Column, SampleDataByTableId, SampleRow, Table } from '../../types';
import { getRefDisplayLabel } from './recordLabel';
import { computeRowWithAppFormulas } from '../../lib/appsheet/expression';

export interface RelatedSection {
  childTable: Table;
  refColumn: Column;
  rows: Array<{ row: SampleRow; rowIndex: number }>;
}

interface SimulatorRelatedRecordsProps {
  tables: Table[];
  sampleDataByTableId: SampleDataByTableId;
  relatedSections: RelatedSection[];
  onAddRelatedRow: (section: RelatedSection) => void;
  onSelectRelatedRow: (tableId: string, row: SampleRow, rowIndex: number) => void;
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
                  <div className="text-xs font-medium theme-text-primary truncate">{title}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded theme-text-muted theme-bg-muted">
                    {section.rows.length}
                  </span>
                </div>
              </div>

              <div className="border rounded overflow-hidden theme-border theme-bg-card">
                {section.rows.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs theme-text-muted">
                    {t('common.noResults', '該当なし')}
                  </div>
                ) : (
                  <div className="max-h-[260px] overflow-auto">
                    <table className="min-w-full border-collapse">
                      <thead className="sticky top-0 z-10 border-b theme-border theme-bg-muted">
                        <tr>
                          {section.childTable.columns.map((c) => (
                            <th
                              key={c.id}
                              className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider whitespace-nowrap theme-text-muted"
                            >
                              {c.name}
                            </th>
                          ))}
                          <th className="px-2 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody className="theme-bg-card">
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
                              className="border-b cursor-pointer theme-hover-bg-muted"
                              style={{ borderBottomColor: 'var(--border)' }}
                              onClick={() => onSelectRelatedRow(section.childTable.id, row, rowIndex)}
                            >
                              {section.childTable.columns.map((c) => (
                                <td
                                  key={c.id}
                                  className="px-3 py-2 text-xs whitespace-nowrap theme-text-primary"
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
                              <td className="px-2 py-2 text-right theme-text-muted">
                                <span aria-hidden="true">›</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t px-2 py-1.5 flex items-center justify-end theme-border theme-bg-muted">
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
