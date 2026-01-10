import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useERStore, useUIStore } from '../../../../stores';
import type { Column, MiniMetaTab, EditableState, ColumnDerivedState } from '../types';

interface UseColumnRowStateProps {
  column: Column;
  tableId: string;
}

export function useColumnRowState({ column, tableId }: UseColumnRowStateProps) {
  const isNameMaskEnabled = useUIStore((state) => state.isNameMaskEnabled);
  // Selection state
  const isSelectedSelector = useCallback(
    (state: { selectedColumnId: string | null }) => state.selectedColumnId === column.id,
    [column.id]
  );
  const isSelected = useERStore(isSelectedSelector);

  // Incoming relation check
  const hasIncomingRelationSelector = useCallback(
    (state: { relations: { targetTableId: string; targetColumnId: string }[] }) =>
      state.relations.some((r) => r.targetTableId === tableId && r.targetColumnId === column.id),
    [tableId, column.id]
  );
  const hasIncomingRelation = useERStore(hasIncomingRelationSelector);

  // Local editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteHintPos, setDeleteHintPos] = useState<{ x: number; y: number } | null>(null);

  // Mini meta state
  const [miniMetaTab, setMiniMetaTab] = useState<MiniMetaTab>('formula');
  const [isEditingMiniMeta, setIsEditingMiniMeta] = useState(false);
  const [miniMetaDraft, setMiniMetaDraft] = useState('');

  // Refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const miniMetaInputRef = useRef<HTMLInputElement | null>(null);

  // Derived state from column.appSheet
  const derivedState = useMemo((): ColumnDerivedState => {
    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    const isHiddenVal = appSheet?.IsHidden;
    const isShown = isHiddenVal !== true;

    const showIf = typeof appSheet?.Show_If === 'string' ? appSheet.Show_If.trim() : '';
    const showIfNonEmpty = showIf.length > 0;

    const editableIf = typeof appSheet?.Editable_If === 'string' ? appSheet.Editable_If.trim() : '';
    const editableUpper = editableIf.toUpperCase();
    let editableState: EditableState = 'unset';
    if (editableUpper === 'TRUE') editableState = 'true';
    else if (editableUpper === 'FALSE') editableState = 'false';
    else {
      const editableVal = appSheet?.Editable;
      if (editableVal === true) editableState = 'true';
      else if (editableVal === false) editableState = 'false';
    }

    const editableHasFormula = editableIf.length > 0 && editableUpper !== 'TRUE' && editableUpper !== 'FALSE';

    const isRequired = !!column.constraints.required;

    const requiredIf = typeof appSheet?.Required_If === 'string' ? appSheet.Required_If.trim() : '';
    const requiredIfNonEmpty = requiredIf.length > 0;

    const currentAppFormula = typeof appSheet?.AppFormula === 'string' ? appSheet.AppFormula : '';
    const currentDisplayName = typeof appSheet?.DisplayName === 'string' ? appSheet.DisplayName : '';
    const currentDescription = typeof appSheet?.Description === 'string' ? appSheet.Description : '';
    const currentInitialValue = column.constraints.defaultValue ?? '';

    return {
      isShown,
      showIfNonEmpty,
      editableState,
      editableHasFormula,
      isRequired,
      requiredIfNonEmpty,
      currentAppFormula,
      currentDisplayName,
      currentDescription,
      currentInitialValue,
    };
  }, [column.appSheet, column.constraints.defaultValue, column.constraints.required]);

  const currentMiniMetaValue = useMemo(() => {
    switch (miniMetaTab) {
      case 'formula':
        return derivedState.currentAppFormula;
      case 'initialValue':
        return derivedState.currentInitialValue;
      case 'displayName':
        return derivedState.currentDisplayName;
      case 'description':
        return derivedState.currentDescription;
      default:
        return '';
    }
  }, [derivedState, miniMetaTab]);

  // Effects
  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isNameMaskEnabled && isEditingName) {
      setIsEditingName(false);
      setEditName(column.name);
    }
  }, [isNameMaskEnabled, isEditingName, column.name]);

  useEffect(() => {
    if (!isSelected) {
      Promise.resolve().then(() => {
        setDeleteArmed(false);
        setDeleteHintPos(null);
      });
    }
  }, [isSelected]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDeleteArmed(false);
      setDeleteHintPos(null);
    });
  }, [column.id]);

  useEffect(() => {
    if (!deleteArmed) return;

    const handleMove = (e: MouseEvent) => {
      setDeleteHintPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, [deleteArmed]);

  useEffect(() => {
    if (!isEditingMiniMeta) {
      Promise.resolve().then(() => {
        setMiniMetaDraft(currentMiniMetaValue);
      });
    }
  }, [currentMiniMetaValue, isEditingMiniMeta]);

  return {
    isSelected,
    hasIncomingRelation,
    isEditingName,
    setIsEditingName,
    editName,
    setEditName,
    deleteArmed,
    setDeleteArmed,
    deleteHintPos,
    setDeleteHintPos,
    miniMetaTab,
    setMiniMetaTab,
    isEditingMiniMeta,
    setIsEditingMiniMeta,
    miniMetaDraft,
    setMiniMetaDraft,
    inputRef,
    miniMetaInputRef,
    currentMiniMetaValue,
    ...derivedState,
  };
}
