import { Handle, Position } from 'reactflow';
import { COLLAPSED_STRIP_HEIGHT } from './constants';
import type { Table } from './types';

interface CollapsedColumnHandlesProps {
  table: Table;
}

export function CollapsedColumnHandles({ table }: CollapsedColumnHandlesProps) {
  return (
    <div
      className="relative nodrag"
      style={{ height: COLLAPSED_STRIP_HEIGHT, backgroundColor: 'var(--card)' }}
      aria-hidden
    >
      {/* Minimal visual cue */}
      <div
        className="absolute inset-0 flex items-center justify-center text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        …
      </div>

      {table.columns.map((column) => {
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
  );
}
