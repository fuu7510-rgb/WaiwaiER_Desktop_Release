import { Button, Dialog } from '../../common';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  cancelLabel: string;
  saveLabel: string;
  previewLabel: string;
  dummyDataLabel: string;
  placeholder: string;
  oneValuePerLineHint: string;
  previewValues: string[];
  value: string;
  onChangeValue: (next: string) => void;
};

export function SampleDataDialog({
  isOpen,
  onClose,
  onSave,
  title,
  cancelLabel,
  saveLabel,
  previewLabel,
  dummyDataLabel,
  placeholder,
  oneValuePerLineHint,
  previewValues,
  value,
  onChangeValue,
}: Props) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" size="sm" onClick={onSave}>
            {saveLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{previewLabel}</div>
        <div className="text-xs border rounded px-2 py-1.5 max-h-32 overflow-y-auto" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}>
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

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{dummyDataLabel}</label>
          <textarea
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-h-[320px]"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            placeholder={placeholder}
          />
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{oneValuePerLineHint}</div>
        </div>
      </div>
    </Dialog>
  );
}
