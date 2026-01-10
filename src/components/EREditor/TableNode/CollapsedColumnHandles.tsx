import { Handle, Position } from 'reactflow';
import { useCallback, useMemo } from 'react';
import { COLLAPSED_STRIP_HEIGHT } from './constants';
import type { Table } from './types';
import { useERStore, useUIStore } from '../../../stores';
import { maskIdentifier } from '../../../lib/masking';

interface CollapsedColumnHandlesProps {
  table: Table;
}

export function CollapsedColumnHandles({ table }: CollapsedColumnHandlesProps) {
  const isNameMaskEnabled = useUIStore((s) => s.isNameMaskEnabled);
  // IMPORTANT:
  // useSyncExternalStore (used internally by Zustand) requires getSnapshot to be referentially stable
  // when the store hasn't changed. Returning a newly allocated Array/Set each call can trigger
  // "getSnapshot should be cached" warnings and even infinite loops.
  // To keep the snapshot stable, return a primitive string key from the selector.
  const incomingTargetColumnKeySelector = useCallback(
    (state: { relations: { targetTableId: string; targetColumnId: string }[] }) => {
      const ids = state.relations
        .filter((r) => r.targetTableId === table.id)
        .map((r) => r.targetColumnId)
        .sort();
      return ids.join('|');
    },
    [table.id]
  );
  const incomingTargetColumnKey = useERStore(incomingTargetColumnKeySelector);

  const incomingSet = useMemo(() => {
    if (!incomingTargetColumnKey) return new Set<string>();
    return new Set(incomingTargetColumnKey.split('|').filter((v) => v.length > 0));
  }, [incomingTargetColumnKey]);

  const { retargetColumns, otherColumns } = useMemo(() => {
    const retarget: Table['columns'] = [];
    const other: Table['columns'] = [];

    for (const c of table.columns) {
      if (incomingSet.has(c.id)) retarget.push(c);
      else other.push(c);
    }

    return { retargetColumns: retarget, otherColumns: other };
  }, [incomingSet, table.columns]);

  return (
    <div className="nodrag" style={{ backgroundColor: 'var(--card)' }} aria-hidden>
      {/* Collapsed strip: existing columns are stacked and not connectable (current behavior) */}
      <div className="relative" style={{ height: COLLAPSED_STRIP_HEIGHT }}>
        {/* Minimal visual cue */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          …
        </div>

        {otherColumns.map((column) => {
          return (
            <div key={column.id}>
              <Handle
                type="target"
                position={Position.Left}
                id={column.id}
                className="!bg-zinc-400 !border !border-white !rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  minWidth: 8,
                  minHeight: 8,
                  maxWidth: 8,
                  maxHeight: 8,
                  left: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
                isConnectable={false}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />

              {column.isKey && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${column.id}__source`}
                  className="!bg-amber-400 !border !border-white hover:!bg-amber-500 cursor-crosshair !rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    minWidth: 8,
                    minHeight: 8,
                    maxWidth: 8,
                    maxHeight: 8,
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  isConnectable
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Retarget overlay handlers: show without stacking and allow connecting */}
      {retargetColumns.length > 0 && (
        <div className="relative">
          {retargetColumns.map((column) => {
            return (
              <div
                key={column.id}
                className="relative flex items-center px-2"
                style={{ height: 24, borderTop: '1px solid var(--border)' }}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={column.id}
                  className="!border !border-white !rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    minWidth: 10,
                    minHeight: 10,
                    maxWidth: 10,
                    maxHeight: 10,
                    left: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'var(--primary)',
                  }}
                  isConnectable
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />

                <span
                  className="min-w-0 truncate text-[10px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isNameMaskEnabled ? maskIdentifier(column.name) : column.name}
                </span>

                {column.isKey && (
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${column.id}__source`}
                    className="!bg-amber-400 !border !border-white hover:!bg-amber-500 cursor-crosshair !rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      minWidth: 8,
                      minHeight: 8,
                      maxWidth: 8,
                      maxHeight: 8,
                      right: -5,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    isConnectable
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
