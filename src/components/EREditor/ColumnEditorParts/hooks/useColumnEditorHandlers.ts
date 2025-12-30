import { useCallback } from 'react';

import type { Column, ColumnConstraints } from '../../../../types';

type Args = {
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedColumn: Column | undefined;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
};

export function useColumnEditorHandlers({
  selectedTableId,
  selectedColumnId,
  selectedColumn,
  updateColumn,
  deleteColumn,
}: Args) {
  const handleUpdate = useCallback(
    (updates: Partial<Column>) => {
      if (selectedTableId && selectedColumnId) {
        updateColumn(selectedTableId, selectedColumnId, updates);
      }
    },
    [selectedTableId, selectedColumnId, updateColumn]
  );

  const handleConstraintUpdate = useCallback(
    (updates: Partial<ColumnConstraints>) => {
      if (selectedColumn) {
        handleUpdate({
          constraints: { ...selectedColumn.constraints, ...updates },
        });
      }
    },
    [handleUpdate, selectedColumn]
  );

  const handleDelete = useCallback(() => {
    if (selectedTableId && selectedColumnId) {
      deleteColumn(selectedTableId, selectedColumnId);
    }
  }, [selectedTableId, selectedColumnId, deleteColumn]);

  return { handleUpdate, handleConstraintUpdate, handleDelete };
}
