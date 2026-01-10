import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactFlow } from 'reactflow';
import { useERStore, useUIStore } from '../../../stores';
import { maskIdentifier } from '../../../lib/masking';
import { Tooltip } from '../../common';
import type { Table } from './types';

interface TableNodeHeaderProps {
  table: Table;
}

export const TableNodeHeader = memo(({ table }: TableNodeHeaderProps) => {
  const { t } = useTranslation();
  const updateTable = useERStore((state) => state.updateTable);
  const selectTable = useERStore((state) => state.selectTable);
  const isNameMaskEnabled = useUIStore((state) => state.isNameMaskEnabled);
  const { setNodes } = useReactFlow();

  const lastNameClickRef = useRef<number | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const isCollapsed = table.isCollapsed ?? false;

  useEffect(() => {
    if (isNameMaskEnabled && isEditing) {
      setIsEditing(false);
      setEditName(table.name);
    }
  }, [isNameMaskEnabled, isEditing, table.name]);

  // Ctrl/Shift/Meta + クリックでの複数選択
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      e.stopPropagation();
      // 複数選択: 現在の選択状態をトグル
      setNodes((nds) =>
        nds.map((n) =>
          n.id === table.id ? { ...n, selected: !n.selected } : n
        )
      );
      return;
    }

    // 単一選択: 先にカラムが選択されている場合でも確実にテーブル選択へ切り替える
    // （ReactFlowのノードイベントが発火しないケースの保険）
    selectTable(table.id);
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === table.id })));
  }, [table.id, setNodes, selectTable]);

  // ブラウザの dblclick 判定は「直前の別要素クリック」を拾う環境があり、
  // 単クリックでも稀に編集が始まることがあるため、同一要素上の2回クリックでのみ編集開始する。
  const handleNameClick = useCallback((e: React.MouseEvent) => {
    if (isNameMaskEnabled) return;
    if (isEditing) return;
    if (e.ctrlKey || e.shiftKey || e.metaKey) return;

    const now = performance.now();
    const last = lastNameClickRef.current;

    // クリックバウンス対策: 速すぎる連続クリックは無視
    const MIN_DOUBLE_CLICK_MS = 60;
    const MAX_DOUBLE_CLICK_MS = 350;

    if (last != null) {
      const dt = now - last;
      if (dt >= MIN_DOUBLE_CLICK_MS && dt <= MAX_DOUBLE_CLICK_MS) {
        e.stopPropagation();
        setIsEditing(true);
        setEditName(table.name);
        lastNameClickRef.current = null;
        return;
      }
    }

    lastNameClickRef.current = now;
  }, [isEditing, isNameMaskEnabled, table.name]);

  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName !== table.name) {
      updateTable(table.id, { name: editName.trim() });
    }
    setIsEditing(false);
  }, [editName, table.id, table.name, updateTable]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(table.name);
    }
  }, [handleNameSubmit, table.name]);

  const handleToggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      // Ctrl/Shift/Meta + クリックの場合は、親ノードの複数選択を優先
      if (e.ctrlKey || e.shiftKey || e.metaKey) {
        return;
      }
      e.stopPropagation();
      selectTable(table.id);
      updateTable(table.id, { isCollapsed: !isCollapsed });
    },
    [selectTable, table.id, isCollapsed, updateTable]
  );

  // Ctrl/Shift/Meta キーでない場合のみドラッグ防止
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      return;
    }
    e.stopPropagation();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      return;
    }
    e.stopPropagation();
  }, []);

  return (
    <div
      className="px-2.5 py-1.5 rounded-t font-medium text-white text-xs flex items-center justify-between"
      style={{ backgroundColor: table.color || '#6366f1' }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {/* 同期テーブルインジケーター */}
        {table.syncGroupId && (
          <Tooltip content={t('table.syncTableTooltip')}>
            <span 
              className="flex-shrink-0 px-1 py-0.5 text-[8px] font-bold rounded bg-white/20 leading-none"
              title={t('table.syncTableTooltip')}
            >
              {t('table.syncIndicator')}
            </span>
          </Tooltip>
        )}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-white w-full text-xs"
            autoFocus
            aria-label={t('editor.tableName')}
          />
        ) : (
          <span className="truncate" onClick={handleNameClick}>
            {isNameMaskEnabled ? maskIdentifier(table.name) : table.name}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1.5">
        <Tooltip content={isCollapsed ? t('table.expand') : t('table.collapse')}>
          <button
            type="button"
            onClick={handleToggleCollapsed}
            onPointerDown={handlePointerDown}
            onMouseDown={handleMouseDown}
            className="p-0.5 rounded-sm transition-colors hover:bg-white/10"
            aria-label={isCollapsed ? t('table.expand') : t('table.collapse')}
            title={isCollapsed ? t('table.expand') : t('table.collapse')}
          >
            {isCollapsed ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </Tooltip>
        <span className="text-[10px] opacity-70 ml-0.5 tabular-nums">{table.columns.length}</span>
      </span>
    </div>
  );
});

TableNodeHeader.displayName = 'TableNodeHeader';
