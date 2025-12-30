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
        <div className="text-[10px] text-zinc-400">{previewLabel}</div>
        <div className="text-xs text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-1.5 max-h-32 overflow-y-auto">
          {previewValues.length === 0 ? (
            <div className="text-zinc-400">-</div>
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
          <label className="block text-xs font-medium text-zinc-500 mb-1">{dummyDataLabel}</label>
          <textarea
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-h-[320px]"
            placeholder={placeholder}
          />
          <div className="text-[10px] text-zinc-400 mt-1">{oneValuePerLineHint}</div>
        </div>
      </div>
    </Dialog>
  );
}
