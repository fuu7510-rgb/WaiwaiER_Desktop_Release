import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import { AppSheetNoteParametersSection } from './ColumnEditorParts/AppSheetNoteParametersSection';
import { ColumnConstraintsSection } from './ColumnEditorParts/ColumnConstraintsSection';
import { ColumnDeleteSection } from './ColumnEditorParts/ColumnDeleteSection';
import { ColumnHeaderAndNameSection } from './ColumnEditorParts/ColumnHeaderAndNameSection';
import { ColumnTypeSection } from './ColumnEditorParts/ColumnTypeSection';
import { SampleDataSection } from './ColumnEditorParts/SampleDataSection';
import { useAppSheetConflictResolution } from './ColumnEditorParts/hooks/useAppSheetConflictResolution';
import { useAppSheetValues } from './ColumnEditorParts/hooks/useAppSheetValues';
import { useAppSheetSanitizer } from './ColumnEditorParts/hooks/useAppSheetSanitizer';
import { useColumnEditorLabels } from './ColumnEditorParts/hooks/useColumnEditorLabels';
import { useColumnEditorOptions } from './ColumnEditorParts/hooks/useColumnEditorOptions.ts';
import { useColumnEditorHandlers } from './ColumnEditorParts/hooks/useColumnEditorHandlers';
import { useSelectedTableColumn } from './ColumnEditorParts/hooks/useSelectedTableColumn';

export function ColumnEditor() {
  const { i18n } = useTranslation();
  const {
    tables,
    selectedTableId,
    selectedColumnId,
    updateColumn,
    deleteColumn,
    ensureSampleData,
    sampleDataByTableId,
    setSampleRowsForTable,
  } = useERStore();

  const { selectedTable, selectedColumn } = useSelectedTableColumn({ tables, selectedTableId, selectedColumnId });

  const { labelEnJa, labelEnJaNoSpace, helpText, tEn, tJa, labelKey } = useColumnEditorLabels(i18n);

  const { pruneAppSheet, sanitizeForType } = useAppSheetSanitizer();

  const { handleUpdate, handleConstraintUpdate, handleDelete } = useColumnEditorHandlers({
    selectedTableId,
    selectedColumnId,
    selectedColumn,
    updateColumn,
    deleteColumn,
  });

  const {
    setAppSheetValue,
    setAppSheetValues,
    getAppSheetString,
    getAppSheetNumberString,
    getAppSheetArrayLines,
    getTriState,
    setTriState,
  } = useAppSheetValues(selectedColumn, handleUpdate);

  useAppSheetConflictResolution({ selectedColumn, sanitizeForType, pruneAppSheet, handleUpdate });

  const {
    typeOptions,
    appSheetTriStateOptions,
    longTextFormattingOptions,
    enumInputModeOptions,
    refInputModeOptions,
    numberDisplayModeOptions,
    updateModeOptions,
  } = useColumnEditorOptions({ labelEnJa, labelEnJaNoSpace, tEn, tJa });

  // Keep this guard AFTER all hooks so hook order/count never changes.
  if (!selectedColumn) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <ColumnHeaderAndNameSection
        selectedColumn={selectedColumn}
        handleUpdate={handleUpdate}
        labels={{ labelEnJa, helpText, tEn, tJa, labelKey }}
      />
      
      {/* データ型 */}
      <ColumnTypeSection
        selectedColumn={selectedColumn}
        typeOptions={typeOptions}
        labelKey={labelKey}
        sanitizeForType={sanitizeForType}
        handleUpdate={handleUpdate}
      />
      
      
      <ColumnConstraintsSection
        selectedColumn={selectedColumn}
        handleConstraintUpdate={handleConstraintUpdate}
        labels={{ labelEnJa, helpText, labelKey }}
      />

      <AppSheetNoteParametersSection
        selectedColumn={selectedColumn}
        selectedTable={selectedTable}
        tables={tables}
        handleUpdate={handleUpdate}
        handleConstraintUpdate={handleConstraintUpdate}
        labels={{ labelEnJa, helpText, labelKey }}
        setAppSheetValue={setAppSheetValue}
        setAppSheetValues={setAppSheetValues}
        getAppSheetString={getAppSheetString}
        getAppSheetNumberString={getAppSheetNumberString}
        getAppSheetArrayLines={getAppSheetArrayLines}
        getTriState={getTriState}
        setTriState={setTriState}
        appSheetTriStateOptions={appSheetTriStateOptions}
        longTextFormattingOptions={longTextFormattingOptions}
        enumInputModeOptions={enumInputModeOptions}
        refInputModeOptions={refInputModeOptions}
        numberDisplayModeOptions={numberDisplayModeOptions}
        updateModeOptions={updateModeOptions}
      />

      <SampleDataSection
        ensureSampleData={ensureSampleData}
        sampleDataByTableId={sampleDataByTableId}
        setSampleRowsForTable={setSampleRowsForTable}
        selectedTableId={selectedTableId}
        selectedColumnId={selectedColumnId}
        labels={{ labelEnJa, helpText, labelKey }}
      />

      <ColumnDeleteSection labelKey={labelKey} onDelete={handleDelete} />
    </div>
  );
}
