import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniMetaTab, ColumnType } from './types';
import { useColumnEditorLabels } from '../ColumnEditorParts/hooks/useColumnEditorLabels';
import { useColumnEditorOptions } from '../ColumnEditorParts/hooks/useColumnEditorOptions';

interface MiniMetaEditorProps {
  miniMetaTab: MiniMetaTab;
  setMiniMetaTab: (tab: MiniMetaTab) => void;
  miniMetaDraft: string;
  setMiniMetaDraft: (draft: string) => void;
  isEditingMiniMeta: boolean;
  setIsEditingMiniMeta: (editing: boolean) => void;
  isInitialValueDisabled: boolean;
  commitMiniMeta: () => void;
  handleMiniMetaKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, inputRef: React.RefObject<HTMLInputElement | null>) => void;
  miniMetaInputRef: React.RefObject<HTMLInputElement | null>;
  columnType: ColumnType;
  onTypeChange: (nextType: ColumnType) => void;
}

export const MiniMetaEditor = memo(({
  miniMetaTab,
  setMiniMetaTab,
  miniMetaDraft,
  setMiniMetaDraft,
  isEditingMiniMeta,
  setIsEditingMiniMeta,
  isInitialValueDisabled,
  commitMiniMeta,
  handleMiniMetaKeyDown,
  miniMetaInputRef,
  columnType,
  onTypeChange,
}: MiniMetaEditorProps) => {
  const { t, i18n } = useTranslation();
  const { labelEnJa, labelEnJaNoSpace, tEn, tJa } = useColumnEditorLabels(i18n);
  const { typeOptions } = useColumnEditorOptions({ labelEnJa, labelEnJaNoSpace, tEn, tJa });

  const handleTabClick = useCallback(
    (next: MiniMetaTab) => (e: React.MouseEvent) => {
      e.stopPropagation();
      if (next === miniMetaTab) return;

      if (isEditingMiniMeta) {
        commitMiniMeta();
        setIsEditingMiniMeta(false);
      }

      setMiniMetaTab(next);
    },
    [commitMiniMeta, isEditingMiniMeta, miniMetaTab, setIsEditingMiniMeta, setMiniMetaTab]
  );

  return (
    <div className="flex flex-col gap-1">
      <select
        value={columnType}
        onChange={(e) => {
          e.stopPropagation();
          onTypeChange(e.target.value as ColumnType);
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="text-[9px] px-1 py-0.5 rounded border shadow-sm cursor-pointer nodrag nopan"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          minWidth: '80px',
        }}
        title={t('column.changeTypeTooltip', 'クリックしてデータ型を変更')}
      >
        {typeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        ref={miniMetaInputRef}
        type="text"
        value={miniMetaDraft}
        disabled={isInitialValueDisabled}
        onFocus={() => setIsEditingMiniMeta(true)}
        onBlur={() => {
          commitMiniMeta();
          setIsEditingMiniMeta(false);
        }}
        onChange={(e) => setMiniMetaDraft(e.target.value)}
        onKeyDown={(e) => handleMiniMetaKeyDown(e, miniMetaInputRef)}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="text-[9px] px-1 py-0.5 rounded border shadow-sm nodrag nopan"
        style={{
          backgroundColor: 'var(--input-bg)',
          borderColor: 'var(--input-border)',
          color: 'var(--text-primary)',
          minWidth: '140px',
          opacity: isInitialValueDisabled ? 0.5 : 1,
          cursor: isInitialValueDisabled ? 'not-allowed' : 'text',
        }}
        placeholder={
          miniMetaTab === 'formula'
            ? t('column.formulaPlaceholder')
            : miniMetaTab === 'initialValue'
              ? t('column.initialValuePlaceholder')
              : miniMetaTab === 'displayName'
                ? t('column.displayNamePlaceholder')
                : t('column.descriptionPlaceholder')
        }
        aria-label={
          miniMetaTab === 'formula'
            ? t('column.formula')
            : miniMetaTab === 'initialValue'
              ? t('column.initialValue')
              : miniMetaTab === 'displayName'
                ? t('column.displayName')
                : t('common.description')
        }
        title={
          miniMetaTab === 'formula'
            ? t('column.formula')
            : miniMetaTab === 'initialValue'
              ? t('column.initialValue')
              : miniMetaTab === 'displayName'
                ? t('column.displayName')
                : t('common.description')
        }
      />

      <div
        className="flex border rounded overflow-hidden"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {(
          [
            { key: 'formula' as const, label: t('column.formula') },
            { key: 'initialValue' as const, label: t('column.initialValue') },
            { key: 'displayName' as const, label: t('column.displayName') },
            { key: 'description' as const, label: t('common.description') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={handleTabClick(tab.key)}
            className="px-1 py-0.5 text-[9px] border-r last:border-r-0"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: miniMetaTab === tab.key ? 'var(--section-bg-active)' : 'transparent',
              color: miniMetaTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            aria-pressed={miniMetaTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
});

MiniMetaEditor.displayName = 'MiniMetaEditor';
