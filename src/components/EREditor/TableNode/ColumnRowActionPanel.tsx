import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useColumnEditorLabels } from '../ColumnEditorParts/hooks/useColumnEditorLabels';
import { Tooltip } from '../../common';
import { MiniMetaEditor } from './MiniMetaEditor';
import type { Column, ColumnType, MiniMetaTab, EditableState } from './types';

interface ColumnRowActionPanelProps {
  column: Column;
  isFirst: boolean;
  isLast: boolean;
  isShown: boolean;
  showIfNonEmpty: boolean;
  editableState: EditableState;
  editableHasFormula: boolean;
  isRequired: boolean;
  requiredIfNonEmpty: boolean;
  deleteArmed: boolean;
  deleteHintPos: { x: number; y: number } | null;
  miniMetaTab: MiniMetaTab;
  setMiniMetaTab: (tab: MiniMetaTab) => void;
  miniMetaDraft: string;
  setMiniMetaDraft: (draft: string) => void;
  isEditingMiniMeta: boolean;
  setIsEditingMiniMeta: (editing: boolean) => void;
  isInitialValueDisabled: boolean;
  miniMetaInputRef: React.RefObject<HTMLInputElement | null>;
  onMoveUp: (e: React.MouseEvent) => void;
  onMoveDown: (e: React.MouseEvent) => void;
  onToggleKey: (e: React.MouseEvent) => void;
  onToggleLabel: (e: React.MouseEvent) => void;
  onToggleShow: (e: React.MouseEvent) => void;
  onToggleEditable: (e: React.MouseEvent) => void;
  onToggleRequired: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  commitMiniMeta: () => void;
  handleMiniMetaKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, inputRef: React.RefObject<HTMLInputElement | null>) => void;
  onTypeChange: (nextType: ColumnType) => void;
}

export const ColumnRowActionPanel = memo(({
  column,
  isFirst,
  isLast,
  isShown,
  showIfNonEmpty,
  editableState,
  editableHasFormula,
  isRequired,
  requiredIfNonEmpty,
  deleteArmed,
  deleteHintPos,
  miniMetaTab,
  setMiniMetaTab,
  miniMetaDraft,
  setMiniMetaDraft,
  isEditingMiniMeta,
  setIsEditingMiniMeta,
  isInitialValueDisabled,
  miniMetaInputRef,
  onMoveUp,
  onMoveDown,
  onToggleKey,
  onToggleLabel,
  onToggleShow,
  onToggleEditable,
  onToggleRequired,
  onDelete,
  onDuplicate,
  commitMiniMeta,
  handleMiniMetaKeyDown,
  onTypeChange,
}: ColumnRowActionPanelProps) => {
  const { t, i18n } = useTranslation();
  const { labelEnJa } = useColumnEditorLabels(i18n);

  return (
    <div className="flex absolute left-full top-1/2 -translate-y-1/2 flex-col items-start gap-1 z-10 ml-1">
      {/* Move up/down and Key/Label buttons */}
      <div
        className="flex shadow-sm border rounded overflow-hidden"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            data-reorder-button="true"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-0.5 ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}`}
            style={{ color: 'var(--text-muted)' }}
            title={t('common.moveUp')}
            aria-label={t('common.moveUp')}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            data-reorder-button="true"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-0.5 border-t ${isLast ? 'opacity-20 cursor-not-allowed' : ''}`}
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            title={t('common.moveDown')}
            aria-label={t('common.moveDown')}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col">
          <div className="flex border-l" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onDuplicate}
              data-reorder-button="true"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 flex items-center justify-center border-r"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
              title={t('column.duplicateColumn')}
              aria-label={t('column.duplicateColumn')}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10v10H8z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16H5a1 1 0 01-1-1V5a1 1 0 011-1h10a1 1 0 011 1v1" />
              </svg>
            </button>

            <div className="flex flex-col">
              <div className="flex">
                <button
                  onClick={onToggleKey}
                  data-reorder-button="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-0.5 flex items-center justify-center"
                  style={{
                    backgroundColor: column.isKey ? 'var(--section-bg-active)' : 'transparent',
                  }}
                  title={t('table.toggleKey')}
                  aria-label={t('table.toggleKey')}
                >
                  <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>

                <Tooltip disabled={!showIfNonEmpty} content={t('table.lockedByShowIf')}>
                  <button
                    type="button"
                    onClick={onToggleShow}
                    data-reorder-button="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-0.5 border-l flex items-center justify-center ${showIfNonEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: isShown ? 'var(--section-bg-active)' : 'transparent',
                      color: isShown ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    aria-label={
                      showIfNonEmpty
                        ? labelEnJa("Show toggle locked by Show_If", 'Show_Ifでロック中（表示トグル変更不可）')
                        : `${t('table.toggleShow')}: ${isShown ? t('common.on') : t('common.off')}`
                    }
                  >
                    {isShown ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.477 10.477A3 3 0 0012 15a3 3 0 002.523-4.523"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6.228 6.228C4.434 7.36 3.091 9.06 2.458 12c1.274 4.057 5.065 7 9.542 7 1.63 0 3.16-.39 4.5-1.08"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88A3 3 0 0115 12" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.772 17.772C19.566 16.64 20.909 14.94 21.542 12 20.268 7.943 16.477 5 12 5c-1.63 0-3.16.39-4.5 1.08"
                        />
                      </svg>
                    )}
                  </button>
                </Tooltip>
              </div>

              <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={onToggleLabel}
                  data-reorder-button="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-0.5 flex items-center justify-center"
                  style={{
                    backgroundColor: column.isLabel ? 'var(--section-bg-active)' : 'transparent',
                  }}
                  title={t('table.toggleLabel')}
                  aria-label={t('table.toggleLabel')}
                >
                  <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>

                <Tooltip disabled={!editableHasFormula} content={t('table.lockedByEditableIf')}>
                  <button
                    type="button"
                    onClick={onToggleEditable}
                    data-reorder-button="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-0.5 border-l flex items-center justify-center ${editableHasFormula ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: editableState === 'false' ? 'transparent' : 'var(--section-bg-active)',
                      color: editableState === 'true' ? '#4ade80' : editableState === 'unset' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    aria-label={
                      editableHasFormula
                        ? labelEnJa('Editable toggle locked by Editable_If', 'Editable_Ifでロック中（編集トグル変更不可）')
                        : `${t('table.toggleEditable')}: ${editableState === 'true' ? 'TRUE' : editableState === 'false' ? 'FALSE' : 'Unset'}`
                    }
                  >
                    {editableState === 'false' ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20l1-4 7.5-7.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 5.5l4 4" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                        />
                      </svg>
                    )}
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="flex flex-col border-l self-stretch" style={{ borderColor: 'var(--border)' }}>
              <Tooltip disabled={!requiredIfNonEmpty} content={t('table.lockedByRequiredIf')}>
                <button
                  type="button"
                  onClick={onToggleRequired}
                  data-reorder-button="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`p-0.5 flex-1 flex items-center justify-center ${requiredIfNonEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: isRequired ? 'var(--section-bg-active)' : 'transparent',
                    color: isRequired ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                  aria-label={
                    requiredIfNonEmpty
                      ? labelEnJa('Required toggle locked by Required_If', 'Required_Ifでロック中（必須トグル変更不可）')
                      : `${t('table.toggleRequired')}: ${isRequired ? t('common.on') : t('common.off')}`
                  }
                >
                  <span className="text-[10px] font-bold leading-none" aria-hidden="true">*</span>
                </button>
              </Tooltip>

              <button
                type="button"
                onClick={onDelete}
                data-reorder-button="true"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-0.5 flex-1 border-t flex items-center justify-center"
                style={{
                  borderColor: deleteArmed ? 'var(--destructive)' : 'var(--border)',
                  backgroundColor: deleteArmed ? 'var(--section-bg-active)' : 'transparent',
                  color: deleteArmed ? 'var(--destructive)' : 'var(--text-muted)',
                }}
                title={deleteArmed ? t('table.deleteColumnArmedHint') : t('common.delete', '削除')}
                aria-label={deleteArmed ? t('table.deleteColumnArmedHint') : t('common.delete', '削除')}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 11v6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7l1 14h10l1-14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {deleteArmed && deleteHintPos && typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed px-1 py-[1px] rounded border whitespace-nowrap pointer-events-none"
              style={{
                left: deleteHintPos.x + 12,
                top: deleteHintPos.y + 12,
                backgroundColor: 'var(--card)',
                borderColor: 'var(--destructive)',
                color: 'var(--destructive)',
                zIndex: 99999,
              }}
            >
              {t('table.deleteColumnArmedHint')}
            </div>,
            document.body
          )}
      </div>

      {/* Type selector dropdown + Formula */}
      <MiniMetaEditor
        miniMetaTab={miniMetaTab}
        setMiniMetaTab={setMiniMetaTab}
        miniMetaDraft={miniMetaDraft}
        setMiniMetaDraft={setMiniMetaDraft}
        isEditingMiniMeta={isEditingMiniMeta}
        setIsEditingMiniMeta={setIsEditingMiniMeta}
        isInitialValueDisabled={isInitialValueDisabled}
        commitMiniMeta={commitMiniMeta}
        handleMiniMetaKeyDown={handleMiniMetaKeyDown}
        miniMetaInputRef={miniMetaInputRef}
        columnType={column.type}
        onTypeChange={onTypeChange}
      />
    </div>
  );
});

ColumnRowActionPanel.displayName = 'ColumnRowActionPanel';
