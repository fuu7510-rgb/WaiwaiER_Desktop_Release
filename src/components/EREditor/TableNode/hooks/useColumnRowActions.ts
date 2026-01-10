import { useCallback, useMemo } from 'react';
import { useERStore, useUIStore } from '../../../../stores';
import { useAppSheetSanitizer } from '../../ColumnEditorParts/hooks/useAppSheetSanitizer';
import type { Column, ColumnType, MiniMetaTab, EditableState } from '../types';

interface UseColumnRowActionsProps {
  column: Column;
  tableId: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  editName: string;
  setEditName: (name: string) => void;
  setIsEditingName: (editing: boolean) => void;
  setDeleteArmed: (armed: boolean) => void;
  setDeleteHintPos: (pos: { x: number; y: number } | null) => void;
  miniMetaTab: MiniMetaTab;
  miniMetaDraft: string;
  setIsEditingMiniMeta: (editing: boolean) => void;
  setMiniMetaDraft: (draft: string) => void;
  currentMiniMetaValue: string;
  currentAppFormula: string;
  editableState: EditableState;
  editableHasFormula: boolean;
  showIfNonEmpty: boolean;
  requiredIfNonEmpty: boolean;
  isRequired: boolean;
  deleteArmed: boolean;
}

export function useColumnRowActions({
  column,
  tableId,
  index,
  isFirst,
  isLast,
  editName,
  setEditName,
  setIsEditingName,
  setDeleteArmed,
  setDeleteHintPos,
  miniMetaTab,
  miniMetaDraft,
  setIsEditingMiniMeta,
  setMiniMetaDraft,
  currentMiniMetaValue,
  currentAppFormula,
  editableState,
  editableHasFormula,
  showIfNonEmpty,
  requiredIfNonEmpty,
  isRequired,
  deleteArmed,
}: UseColumnRowActionsProps) {
  const selectColumn = useERStore((state) => state.selectColumn);
  const reorderColumn = useERStore((state) => state.reorderColumn);
  const updateColumn = useERStore((state) => state.updateColumn);
  const deleteColumn = useERStore((state) => state.deleteColumn);
  const duplicateColumn = useERStore((state) => state.duplicateColumn);

  const isNameMaskEnabled = useUIStore((state) => state.isNameMaskEnabled);

  const { sanitizeForType, pruneAppSheet } = useAppSheetSanitizer();

  const isInitialValueDisabled = useMemo(() => {
    return miniMetaTab === 'initialValue' && currentAppFormula.trim().length > 0;
  }, [currentAppFormula, miniMetaTab]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ctrl/Shift/Meta + クリックの場合は、親ノードの複数選択を優先するため
    // stopPropagationを呼ばない（ノードクリックイベントを親に伝播させる）
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      return;
    }
    e.stopPropagation();
    selectColumn(tableId, column.id);
  }, [tableId, column.id, selectColumn]);

  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectColumn(tableId, column.id);
    if (isNameMaskEnabled) return;
    setIsEditingName(true);
    setEditName(column.name);
  }, [column.id, column.name, selectColumn, tableId, setEditName, setIsEditingName, isNameMaskEnabled]);

  const handleNameSubmit = useCallback(() => {
    const next = editName.trim();
    if (!next) {
      setIsEditingName(false);
      setEditName(column.name);
      return;
    }

    if (next !== column.name) {
      updateColumn(tableId, column.id, { name: next });
    }
    setIsEditingName(false);
  }, [column.id, column.name, editName, tableId, updateColumn, setEditName, setIsEditingName]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsEditingName(false);
      setEditName(column.name);
    }
  }, [column.name, handleNameSubmit, setEditName, setIsEditingName]);

  const resetDeleteState = useCallback(() => {
    setDeleteArmed(false);
    setDeleteHintPos(null);
  }, [setDeleteArmed, setDeleteHintPos]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();
    if (!isFirst) {
      reorderColumn(tableId, column.id, index - 1);
    }
  }, [tableId, column.id, index, isFirst, reorderColumn, resetDeleteState]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();
    if (!isLast) {
      reorderColumn(tableId, column.id, index + 1);
    }
  }, [tableId, column.id, index, isLast, reorderColumn, resetDeleteState]);

  const handleToggleKey = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();
    updateColumn(tableId, column.id, { isKey: !column.isKey });
  }, [column.id, column.isKey, tableId, updateColumn, resetDeleteState]);

  const handleToggleLabel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();
    updateColumn(tableId, column.id, { isLabel: !column.isLabel });
  }, [column.id, column.isLabel, tableId, updateColumn, resetDeleteState]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deleteArmed) {
      setDeleteArmed(true);
      setDeleteHintPos({ x: e.clientX, y: e.clientY });
      return;
    }

    resetDeleteState();
    deleteColumn(tableId, column.id);
  }, [column.id, deleteArmed, deleteColumn, tableId, resetDeleteState, setDeleteArmed, setDeleteHintPos]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();
    const newId = duplicateColumn(tableId, column.id);
    if (newId) {
      selectColumn(tableId, newId);
    }
  }, [column.id, duplicateColumn, selectColumn, tableId, resetDeleteState]);

  const handleToggleShow = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();

    const appSheet = column.appSheet as Record<string, unknown> | undefined;
    if (showIfNonEmpty) {
      return;
    }
    const isHiddenVal = appSheet?.IsHidden;
    const currentlyShown = isHiddenVal !== true;

    if (currentlyShown) {
      const nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), IsHidden: true }, ['Show_If']);
      updateColumn(tableId, column.id, { appSheet: nextAppSheet });
      return;
    }

    const nextAppSheet = pruneAppSheet(appSheet, ['IsHidden']);
    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.id, pruneAppSheet, tableId, updateColumn, showIfNonEmpty, resetDeleteState]);

  const handleToggleEditable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();

    if (editableHasFormula) {
      return;
    }

    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    let nextAppSheet: Record<string, unknown> | undefined;
    if (editableState === 'unset') {
      nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), Editable_If: 'TRUE' }, ['Editable']);
    } else if (editableState === 'true') {
      nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), Editable_If: 'FALSE' }, ['Editable']);
    } else {
      nextAppSheet = pruneAppSheet(appSheet, ['Editable_If', 'Editable']);
    }

    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.id, editableHasFormula, editableState, pruneAppSheet, tableId, updateColumn, resetDeleteState]);

  const handleToggleRequired = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resetDeleteState();

    const nextRequired = !isRequired;
    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    if (requiredIfNonEmpty) {
      return;
    }

    const nextAppSheet = nextRequired
      ? pruneAppSheet({ ...(appSheet ?? {}), IsRequired: true }, ['Required_If'])
      : pruneAppSheet(appSheet, ['IsRequired', 'Required_If']);

    updateColumn(tableId, column.id, {
      constraints: { ...column.constraints, required: nextRequired },
      appSheet: nextAppSheet,
    });
  }, [column.appSheet, column.constraints, column.id, isRequired, pruneAppSheet, tableId, updateColumn, requiredIfNonEmpty, resetDeleteState]);

  const commitMiniMeta = useCallback(() => {
    if (isInitialValueDisabled) {
      return;
    }

    const raw = miniMetaDraft;
    const trimmed = raw.trim();
    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    if (miniMetaTab === 'initialValue') {
      const nextDefault = trimmed.length > 0 ? raw : undefined;
      const nextConstraints = {
        ...column.constraints,
        defaultValue: nextDefault,
      };
      updateColumn(tableId, column.id, { constraints: nextConstraints });
      return;
    }

    const key =
      miniMetaTab === 'formula'
        ? 'AppFormula'
        : miniMetaTab === 'displayName'
          ? 'DisplayName'
          : 'Description';

    if (trimmed.length === 0) {
      const nextAppSheet = pruneAppSheet(appSheet, [key]);
      if (nextAppSheet !== appSheet) {
        updateColumn(tableId, column.id, { appSheet: nextAppSheet });
      }
      return;
    }

    const nextAppSheet = { ...(appSheet ?? {}), [key]: raw };

    if (miniMetaTab === 'formula' && (column.constraints.defaultValue ?? '').trim().length > 0) {
      const nextConstraints = { ...column.constraints, defaultValue: undefined };
      updateColumn(tableId, column.id, { appSheet: nextAppSheet, constraints: nextConstraints });
      return;
    }

    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.constraints, column.id, isInitialValueDisabled, miniMetaDraft, miniMetaTab, pruneAppSheet, tableId, updateColumn]);

  const handleMiniMetaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, inputRef: React.RefObject<HTMLInputElement | null>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitMiniMeta();
        setIsEditingMiniMeta(false);
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        setMiniMetaDraft(currentMiniMetaValue);
        setIsEditingMiniMeta(false);
        inputRef.current?.blur();
      }
    },
    [commitMiniMeta, currentMiniMetaValue, setIsEditingMiniMeta, setMiniMetaDraft]
  );

  const handleTypeChange = useCallback((nextType: ColumnType) => {
    if (nextType !== column.type) {
      const { constraints, appSheet } = sanitizeForType(
        nextType,
        column.constraints,
        column.appSheet as Record<string, unknown> | undefined
      );
      updateColumn(tableId, column.id, { type: nextType, constraints, appSheet });
    }
  }, [column.appSheet, column.constraints, column.id, column.type, sanitizeForType, tableId, updateColumn]);

  return {
    handleClick,
    handleNameDoubleClick,
    handleNameSubmit,
    handleNameKeyDown,
    handleMoveUp,
    handleMoveDown,
    handleToggleKey,
    handleToggleLabel,
    handleDelete,
    handleDuplicate,
    handleToggleShow,
    handleToggleEditable,
    handleToggleRequired,
    commitMiniMeta,
    handleMiniMetaKeyDown,
    handleTypeChange,
    isInitialValueDisabled,
  };
}
