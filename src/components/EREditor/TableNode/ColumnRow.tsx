import { memo, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Handle, Position, useStore as useReactFlowStore } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useColumnRowState, useColumnRowActions } from './hooks';
import { ColumnRowActionPanel } from './ColumnRowActionPanel';
import { columnTypeClasses } from './constants';
import type { ColumnRowProps } from './types';

export const ColumnRow = memo(({ column, tableId, index, isFirst, isLast }: ColumnRowProps) => {
  const { t } = useTranslation();

  // State management via custom hook
  const state = useColumnRowState({ column, tableId });

  // Zoom for drag transform adjustment
  const zoom = useReactFlowStore((s) => s.transform[2], (a, b) => a === b) ?? 1;
  const typeClass = columnTypeClasses[column.type] || 'bg-slate-500';
  const showRetargetOverlay = state.hasIncomingRelation;

  // Action handlers via custom hook
  const actions = useColumnRowActions({
    column,
    tableId,
    index,
    isFirst,
    isLast,
    editName: state.editName,
    setEditName: state.setEditName,
    setIsEditingName: state.setIsEditingName,
    setDeleteArmed: state.setDeleteArmed,
    setDeleteHintPos: state.setDeleteHintPos,
    miniMetaTab: state.miniMetaTab,
    miniMetaDraft: state.miniMetaDraft,
    setIsEditingMiniMeta: state.setIsEditingMiniMeta,
    setMiniMetaDraft: state.setMiniMetaDraft,
    currentMiniMetaValue: state.currentMiniMetaValue,
    currentAppFormula: state.currentAppFormula,
    editableState: state.editableState,
    editableHasFormula: state.editableHasFormula,
    showIfNonEmpty: state.showIfNonEmpty,
    requiredIfNonEmpty: state.requiredIfNonEmpty,
    isRequired: state.isRequired,
    deleteArmed: state.deleteArmed,
  });

  // Sortable setup
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: column.id,
  });

  const adjustedTransform = useMemo(() => {
    if (!transform) return null;
    const safeZoom = zoom > 0 ? zoom : 1;
    return {
      ...transform,
      x: transform.x / safeZoom,
      y: transform.y / safeZoom,
    };
  }, [transform, zoom]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(adjustedTransform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  const dragListeners = state.isEditingName ? undefined : listeners;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: state.isSelected ? 'var(--section-bg-active)' : undefined,
      }}
      className={`
        relative px-2 py-1 flex items-center gap-1.5 cursor-pointer
        transition-colors
        ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}
        nodrag
      `}
      onClick={actions.handleClick}
      {...attributes}
    >
      {/* Left Handle (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id={column.id}
        className={
          showRetargetOverlay
            ? '!bg-transparent !border-0 !opacity-0 !pointer-events-none'
            : '!bg-zinc-400 !border !border-white !rounded-full'
        }
        style={
          showRetargetOverlay
            ? { width: 1, height: 1, left: -6 }
            : { width: 8, height: 8, minWidth: 8, minHeight: 8, maxWidth: 8, maxHeight: 8, left: -5 }
        }
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Retarget overlay */}
      {showRetargetOverlay && (
        <div
          className="absolute z-30"
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            boxSizing: 'border-box',
            backgroundColor: 'var(--primary)',
            border: '1px solid #fff',
            cursor: 'default',
            left: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          title={t('table.hasIncomingRelation', '他テーブルから参照されています')}
        />
      )}

      {/* Action Panel (visible when selected) */}
      {state.isSelected && (
        <ColumnRowActionPanel
          column={column}
          isFirst={isFirst}
          isLast={isLast}
          isShown={state.isShown}
          showIfNonEmpty={state.showIfNonEmpty}
          editableState={state.editableState}
          editableHasFormula={state.editableHasFormula}
          isRequired={state.isRequired}
          requiredIfNonEmpty={state.requiredIfNonEmpty}
          deleteArmed={state.deleteArmed}
          deleteHintPos={state.deleteHintPos}
          miniMetaTab={state.miniMetaTab}
          setMiniMetaTab={state.setMiniMetaTab}
          miniMetaDraft={state.miniMetaDraft}
          setMiniMetaDraft={state.setMiniMetaDraft}
          isEditingMiniMeta={state.isEditingMiniMeta}
          setIsEditingMiniMeta={state.setIsEditingMiniMeta}
          isInitialValueDisabled={actions.isInitialValueDisabled}
          miniMetaInputRef={state.miniMetaInputRef}
          onMoveUp={actions.handleMoveUp}
          onMoveDown={actions.handleMoveDown}
          onToggleKey={actions.handleToggleKey}
          onToggleLabel={actions.handleToggleLabel}
          onToggleShow={actions.handleToggleShow}
          onToggleEditable={actions.handleToggleEditable}
          onToggleRequired={actions.handleToggleRequired}
          onDelete={actions.handleDelete}
          onDuplicate={actions.handleDuplicate}
          commitMiniMeta={actions.commitMiniMeta}
          handleMiniMetaKeyDown={actions.handleMiniMetaKeyDown}
          onTypeChange={actions.handleTypeChange}
        />
      )}

      {/* Key/Label indicators */}
      <div className="flex gap-0.5 w-6 justify-center">
        {column.isKey && (
          <span title={t('table.isKey')}>
            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        {column.isLabel && (
          <span title={t('table.isLabel')}>
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>

      {/* Column name */}
      <span
        className="flex-1 min-w-0 text-[11px]"
        style={{ color: 'var(--text-secondary)' }}
        onDoubleClick={actions.handleNameDoubleClick}
        ref={setActivatorNodeRef}
        {...(dragListeners ?? {})}
      >
        {state.isEditingName ? (
          <input
            ref={state.inputRef}
            type="text"
            value={state.editName}
            onChange={(e) => state.setEditName(e.target.value)}
            onBlur={actions.handleNameSubmit}
            onKeyDown={actions.handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded px-1 py-0.5 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 border"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--text-primary)',
            }}
            aria-label={t('table.columnName')}
          />
        ) : (
          <span className="flex min-w-0 items-center gap-0.5">
            <span className="min-w-0 truncate">{column.name}</span>
            {column.constraints.required && (
              <span
                className="shrink-0 text-[10px] font-bold"
                style={{ color: 'var(--text-primary)' }}
                aria-label={t('column.constraints.required')}
                title={t('column.constraints.required')}
              >
                *
              </span>
            )}
          </span>
        )}
      </span>

      {/* Column type badge */}
      <span
        className={`text-[9px] px-1 py-0.5 rounded font-medium text-white/90 ${typeClass}`}
      >
        {t(`columnTypes.${column.type}`)}
      </span>

      {/* Right Handle (for outgoing connections) - only for key columns */}
      {column.isKey && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${column.id}__source`}
          className="!bg-amber-400 !border !border-white hover:!bg-amber-500 cursor-crosshair !rounded-full"
          style={{ width: 8, height: 8, minWidth: 8, minHeight: 8, maxWidth: 8, maxHeight: 8, right: -5 }}
          title="ドラッグして他のテーブルのカラムに接続"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
});

ColumnRow.displayName = 'ColumnRow';
