import { useTranslation } from 'react-i18next';

import { getStatusBadgeInfo, getStatusForField } from '../../../lib/appsheet/noteParameters';

/**
 * Note Parameterのサポート状況を示すバッジ
 * Excel出力時に該当パラメーターが出力されるかどうかを表示
 */
export function NoteParamBadge({ field }: { field: string }) {
  const { i18n } = useTranslation();
  const status = getStatusForField(field);

  if (!status) return null;

  const badge = getStatusBadgeInfo(status);
  const label = i18n.language === 'ja' ? badge.labelJa : badge.labelEn;

  return (
    <span
      className={`ml-1 px-1 py-0.5 text-[9px] rounded ${badge.colorClass}`}
      title={i18n.language === 'ja' ? `Excelエクスポート: ${label}` : `Excel export: ${label}`}
    >
      {badge.emoji}
    </span>
  );
}
