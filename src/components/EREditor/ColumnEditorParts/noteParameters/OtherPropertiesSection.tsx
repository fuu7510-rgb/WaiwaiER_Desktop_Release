import { CollapsibleSection, InfoTooltip } from '../../../common';

type Props = {
  labelEnJa: (en: string, ja: string) => string;
  helpText: (en: string, ja: string) => string;

  getTriState: (key: string) => '' | 'true' | 'false';
  setTriState: (key: string, raw: string) => void;
};

export function OtherPropertiesSection({ labelEnJa, helpText, getTriState, setTriState }: Props) {
  return (
    <CollapsibleSection title={labelEnJa('Other Properties', 'その他のプロパティ')} storageKey="column-editor-other-properties" defaultOpen={true}>
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getTriState('Searchable') !== 'false'}
            onChange={(e) => setTriState('Searchable', e.target.checked ? '' : 'false')}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('Searchable', '検索対象')}</span>
          <InfoTooltip
            content={helpText('Include data from this column when searching.', '検索時にこのカラムのデータを対象に含めます。')}
          />
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getTriState('IsScannable') === 'true'}
            onChange={(e) => setTriState('IsScannable', e.target.checked ? 'true' : '')}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('Scannable', 'スキャン可')}</span>
          <InfoTooltip content={helpText('Use a barcode scanner to fill in this column.', 'バーコードスキャナーでこのカラムを入力できます。')} />
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getTriState('IsNfcScannable') === 'true'}
            onChange={(e) => setTriState('IsNfcScannable', e.target.checked ? 'true' : '')}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('NFC Scannable', 'NFCスキャン可')}</span>
          <InfoTooltip content={helpText('Use NFC to fill in this column.', 'NFCでこのカラムを入力できます。')} />
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={getTriState('IsSensitive') === 'true'}
            onChange={(e) => setTriState('IsSensitive', e.target.checked ? 'true' : '')}
            className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500/20"
            style={{ borderColor: 'var(--input-border)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{labelEnJa('Sensitive data', '機密データ')}</span>
          <InfoTooltip
            content={helpText(
              'This column holds personally identifiable information (PII).',
              'このカラムは個人を特定できる情報（PII）を含みます。'
            )}
          />
        </label>
      </div>
    </CollapsibleSection>
  );
}
