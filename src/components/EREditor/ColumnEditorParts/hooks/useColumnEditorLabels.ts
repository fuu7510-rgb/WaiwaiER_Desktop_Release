import { useCallback, useMemo } from 'react';

import type { i18n as I18nInstance } from 'i18next';

export function useColumnEditorLabels(i18n: I18nInstance) {
  const isJapanese = useMemo(() => {
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    return lang === 'ja' || lang.startsWith('ja-');
  }, [i18n.language, i18n.resolvedLanguage]);

  // AppSheet画面に関連する項目（見出し、データ型名など）→「英語(日本語)」併記
  const labelEnJa = useCallback(
    (en: string, ja: string) => (isJapanese ? `${en} (${ja})` : en),
    [isJapanese]
  );

  const labelEnJaNoSpace = useCallback(
    (en: string, ja: string) => (isJapanese ? `${en}(${ja})` : en),
    [isJapanese]
  );

  // ヘルプテキストなどAppSheet画面にない説明文 → 言語別表示
  const helpText = useCallback(
    (en: string, ja: string) => (isJapanese ? ja : en),
    [isJapanese]
  );

  const tEn = useMemo(() => i18n.getFixedT('en'), [i18n]);
  const tJa = useMemo(() => i18n.getFixedT('ja'), [i18n]);

  const labelKey = useCallback(
    (key: string) => labelEnJa(String(tEn(key)), String(tJa(key))),
    [labelEnJa, tEn, tJa]
  );

  return {
    isJapanese,
    labelEnJa,
    labelEnJaNoSpace,
    helpText,
    tEn,
    tJa,
    labelKey,
  };
}
