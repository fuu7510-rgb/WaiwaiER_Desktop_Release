import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useERStore } from '../../../stores';
import { ColumnRow } from './ColumnRow';
import type { Table } from './types';

interface SortableColumnsProps {
  table: Table;
}

export function SortableColumns({ table }: SortableColumnsProps) {
  const reorderColumn = useERStore((state) => state.reorderColumn);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    const toIndex = table.columns.findIndex((c) => c.id === overId);
    if (toIndex < 0) return;
    reorderColumn(table.id, activeId, toIndex);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={table.columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-zinc-100 nodrag overflow-visible">
          {table.columns.map((column, index) => (
            <ColumnRow
              key={column.id}
              column={column}
              tableId={table.id}
              index={index}
              isFirst={index === 0}
              isLast={index === table.columns.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
