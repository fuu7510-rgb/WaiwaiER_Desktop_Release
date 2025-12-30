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
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}
