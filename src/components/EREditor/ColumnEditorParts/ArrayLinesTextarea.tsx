type Props = {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChangeValue: (raw: string) => void;
};

export function ArrayLinesTextarea({ label, value, placeholder, rows = 3, onChangeValue }: Props) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}
