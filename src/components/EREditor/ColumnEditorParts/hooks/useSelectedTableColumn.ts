import { useMemo } from 'react';

import type { Table } from '../../../../types';

type Args = {
  tables: Table[];
  selectedTableId: string | null;
  selectedColumnId: string | null;
};

export function useSelectedTableColumn({ tables, selectedTableId, selectedColumnId }: Args) {
  return useMemo(() => {
    const selectedTable = tables.find((t) => t.id === selectedTableId);
    const selectedColumn = selectedTable?.columns.find((c) => c.id === selectedColumnId);
    return { selectedTable, selectedColumn };
  }, [tables, selectedTableId, selectedColumnId]);
}
