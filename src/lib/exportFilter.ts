import type { ERDiagram, ExportTarget, Table } from '../types';

const ALL_EXPORT_TARGETS: ExportTarget[] = ['excel', 'json', 'package'];

export function getEffectiveExportTargets(table: Table): ExportTarget[] {
  return table.exportTargets ?? ALL_EXPORT_TARGETS;
}

export function shouldExportTable(table: Table, target: ExportTarget): boolean {
  return getEffectiveExportTargets(table).includes(target);
}

export function filterTablesForExport(tables: Table[], target: ExportTarget): Table[] {
  return tables.filter((t) => shouldExportTable(t, target));
}

export function filterDiagramForExport(diagram: ERDiagram, target: ExportTarget): ERDiagram {
  const tables = filterTablesForExport(diagram.tables ?? [], target);
  const includedIds = new Set(tables.map((t) => t.id));
  const relations = (diagram.relations ?? []).filter(
    (r) => includedIds.has(r.sourceTableId) && includedIds.has(r.targetTableId)
  );

  return {
    ...diagram,
    tables,
    relations,
    // memos はテーブルに依存しないため、そのまま出す
    memos: diagram.memos ?? [],
  };
}
