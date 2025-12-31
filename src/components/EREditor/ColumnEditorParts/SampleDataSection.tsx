import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, InfoTooltip } from '../../common';

import { SampleDataDialog } from './SampleDataDialog';

type Labels = {
  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;
  labelKey: (key: string) => string;
};

type Props = {
  ensureSampleData: () => void;
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  setSampleRowsForTable: (tableId: string, rows: Record<string, unknown>[]) => void;

  selectedTableId: string | null | undefined;
  selectedColumnId: string | null | undefined;

  labels: Labels;
};

export function SampleDataSection({
  ensureSampleData,
  sampleDataByTableId,
  setSampleRowsForTable,
  selectedTableId,
  selectedColumnId,
  labels,
}: Props) {
  const { labelEnJa, helpText, labelKey } = labels;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogText, setDialogText] = useState('');

  useEffect(() => {
    ensureSampleData();
  }, [ensureSampleData]);

  const previewValues = useMemo(() => {
    if (!selectedTableId || !selectedColumnId) return [];
    const rows = sampleDataByTableId[selectedTableId] ?? [];
    return rows.map((r) => String(r?.[selectedColumnId] ?? ''));
  }, [sampleDataByTableId, selectedColumnId, selectedTableId]);

  const openDialog = useCallback(() => {
    if (!selectedTableId || !selectedColumnId) return;
    const rows = sampleDataByTableId[selectedTableId] ?? [];
    const text = rows.map((r) => String(r?.[selectedColumnId] ?? '')).join('\n');
    setDialogText(text);
    setIsDialogOpen(true);
  }, [sampleDataByTableId, selectedColumnId, selectedTableId]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const saveFromDialog = useCallback(() => {
    if (!selectedTableId || !selectedColumnId) return;

    const lines = dialogText.split('\n');
    // Avoid creating an extra row from trailing newlines.
    while (lines.length > 0 && String(lines[lines.length - 1] ?? '').trim().length === 0) {
      lines.pop();
    }

    const currentRows = sampleDataByTableId[selectedTableId] ?? [];
    const desiredCount = lines.length;
    const nextRows: Record<string, unknown>[] = [];
    for (let i = 0; i < desiredCount; i++) {
      const base = currentRows[i] ?? {};
      nextRows.push({ ...base, [selectedColumnId]: lines[i] ?? '' });
    }

    setSampleRowsForTable(selectedTableId, nextRows);
    setIsDialogOpen(false);
  }, [dialogText, sampleDataByTableId, selectedColumnId, selectedTableId, setSampleRowsForTable]);

  return (
    <>
      <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center">
            <h4 className="font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{labelKey('column.dummyData')}</h4>
            <InfoTooltip
              content={
                <div>
                  <div className="font-medium mb-1">{helpText('Sample Data', 'サンプルデータ')}</div>
                  <p>
                    {helpText(
                      'Set sample data displayed in the simulator. This data is also included in Excel exports.',
                      'シミュレーターで表示されるサンプルデータを設定します。Excelエクスポート時にもこのデータが含まれます。'
                    )}
                  </p>
                </div>
              }
            />
          </div>
          <Button variant="secondary" size="sm" onClick={openDialog}>
            {labelEnJa('Edit Sample Data', 'サンプルデータ編集')}
          </Button>
        </div>

        <div className="mb-2">
          <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{labelKey('column.dummyDataPreview')}</div>
          <div className="text-xs border rounded px-2 py-1.5" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
            {previewValues.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>-</div>
            ) : (
              <div className="space-y-0.5">
                {previewValues.map((v, i) => (
                  <div key={i} className="truncate">
                    {v}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{labelKey('column.dummyDataPlaceholder')}</div>
      </div>

      <SampleDataDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onSave={saveFromDialog}
        title={labelEnJa('Edit Sample Data', 'サンプルデータ編集')}
        cancelLabel={labelKey('common.cancel')}
        saveLabel={labelKey('common.save')}
        previewLabel={labelKey('column.dummyDataPreview')}
        dummyDataLabel={labelKey('column.dummyData')}
        placeholder={labelKey('column.dummyDataPlaceholder')}
        oneValuePerLineHint={labelEnJa('One value per line', '1行に1つ入力')}
        previewValues={previewValues}
        value={dialogText}
        onChangeValue={setDialogText}
      />
    </>
  );
}
