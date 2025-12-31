import { useTranslation } from 'react-i18next';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TABLE_BG_COLOR_CLASSES } from '../../lib/constants';
import type { Table } from '../../types';

interface SimulatorNavPanelProps {
  tables: Table[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onReorderTables: (activeId: string, overId: string) => void;
}

export function SimulatorNavPanel({
  tables,
  selectedTableId,
  onSelectTable,
  onReorderTables,
}: SimulatorNavPanelProps) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleTableDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    onReorderTables(activeId, overId);
  };

  return (
    <aside
      className="w-[280px] flex flex-col overflow-hidden border-r"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('simulator.title')}
        </div>
      </div>

      {/* Views (1 table = 1 view) */}
      <div className="px-2 pb-2">
        <div
          className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          VIEWS
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tables.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('common.noResults', '該当なし')}
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleTableDragEnd}>
            <SortableContext items={tables.map((tb) => tb.id)} strategy={verticalListSortingStrategy}>
              <ul
                className="divide-y"
                style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}
              >
                {tables.map((table, index) => {
                  const isSelected = table.id === selectedTableId;
                  const canMoveUp = index > 0;
                  const canMoveDown = index >= 0 && index < tables.length - 1;
                  return (
                    <SortableSimulatorTableNavItem
                      key={table.id}
                      table={table}
                      isSelected={isSelected}
                      canMoveUp={canMoveUp}
                      canMoveDown={canMoveDown}
                      onSelect={() => onSelectTable(table.id)}
                      onMoveUp={() => {
                        if (!canMoveUp) return;
                        const overId = tables[index - 1]?.id;
                        if (!overId) return;
                        onReorderTables(table.id, overId);
                      }}
                      onMoveDown={() => {
                        if (!canMoveDown) return;
                        const overId = tables[index + 1]?.id;
                        if (!overId) return;
                        onReorderTables(table.id, overId);
                      }}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </aside>
  );
}

interface SortableSimulatorTableNavItemProps {
  table: { id: string; name: string; color?: string };
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableSimulatorTableNavItem(props: SortableSimulatorTableNavItemProps) {
  const { t } = useTranslation();
  const { table, isSelected, canMoveUp, canMoveDown, onSelect, onMoveUp, onMoveDown } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isOver, isDragging } = useSortable({
    id: table.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors
          ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}
        `}
        style={{
          backgroundColor: isSelected ? 'var(--muted)' : 'transparent',
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {/* ドラッグハンドル */}
        <span
          {...attributes}
          {...listeners}
          className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm cursor-grab ${TABLE_BG_COLOR_CLASSES[table.color || '#6366f1'] || 'bg-indigo-500'}`}
          aria-hidden="true"
        />
        {/* クリック可能なテーブル名 */}
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left truncate hover:underline focus:outline-none focus:underline"
        >
          {table.name}
        </button>

        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-reorder-button="true"
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors
              ${canMoveUp ? '' : 'opacity-30 cursor-not-allowed'}
            `}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: canMoveUp ? 'var(--border)' : 'var(--muted)',
              color: 'var(--text-muted)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveUp) return;
              onMoveUp();
            }}
            aria-label={t('common.moveUp', '上に移動')}
            title={t('common.moveUp', '上に移動')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 4a1 1 0 01.707.293l5 5a1 1 0 11-1.414 1.414L10 6.414 5.707 10.707A1 1 0 114.293 9.293l5-5A1 1 0 0110 4z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            data-reorder-button="true"
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors
              ${canMoveDown ? '' : 'opacity-30 cursor-not-allowed'}
            `}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: canMoveDown ? 'var(--border)' : 'var(--muted)',
              color: 'var(--text-muted)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveDown) return;
              onMoveDown();
            }}
            aria-label={t('common.moveDown', '下に移動')}
            title={t('common.moveDown', '下に移動')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 16a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 13.586l4.293-4.293a1 1 0 111.414 1.414l-5 5A1 1 0 0110 16z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </span>
      </div>
    </li>
  );
}
