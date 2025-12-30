import { useMemo } from 'react';

import { APPSHEET_COLUMN_TYPES } from '../../../../types';

type Option = { value: string; label: string };

type Args = {
  labelEnJa: (en: string, ja: string) => string;
  labelEnJaNoSpace: (en: string, ja: string) => string;
  tEn: (key: string) => unknown;
  tJa: (key: string) => unknown;
};

export function useColumnEditorOptions({ labelEnJa, labelEnJaNoSpace, tEn, tJa }: Args) {
  const typeOptions: Option[] = useMemo(
    () =>
      APPSHEET_COLUMN_TYPES.map((type) => ({
        value: type,
        label: labelEnJaNoSpace(String(tEn(`columnTypes.${type}`)), String(tJa(`columnTypes.${type}`))),
      })),
    [labelEnJaNoSpace, tEn, tJa]
  );

  const appSheetTriStateOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'true', label: labelEnJa('true', 'はい') },
      { value: 'false', label: labelEnJa('false', 'いいえ') },
    ],
    [labelEnJa]
  );

  const longTextFormattingOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Plain Text', label: labelEnJa('Plain Text', 'プレーンテキスト') },
      { value: 'Markdown', label: labelEnJa('Markdown', 'マークダウン') },
      { value: 'HTML', label: labelEnJa('HTML', 'HTML') },
    ],
    [labelEnJa]
  );

  const enumInputModeOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Buttons', label: labelEnJa('Buttons', 'ボタン') },
      { value: 'Stack', label: labelEnJa('Stack', 'スタック') },
      { value: 'Dropdown', label: labelEnJa('Dropdown', 'ドロップダウン') },
    ],
    [labelEnJa]
  );

  const refInputModeOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Buttons', label: labelEnJa('Buttons', 'ボタン') },
      { value: 'Dropdown', label: labelEnJa('Dropdown', 'ドロップダウン') },
    ],
    [labelEnJa]
  );

  const numberDisplayModeOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Auto', label: labelEnJa('Auto', '自動') },
      { value: 'Standard', label: labelEnJa('Standard', '標準') },
      { value: 'Range', label: labelEnJa('Range', '範囲') },
      { value: 'Label', label: labelEnJa('Label', 'ラベル') },
    ],
    [labelEnJa]
  );

  const updateModeOptions: Option[] = useMemo(
    () => [
      { value: '', label: labelEnJa('Unset', '未設定') },
      { value: 'Accumulate', label: labelEnJa('Accumulate', '累積') },
      { value: 'Reset', label: labelEnJa('Reset', 'リセット') },
    ],
    [labelEnJa]
  );

  return {
    typeOptions,
    appSheetTriStateOptions,
    longTextFormattingOptions,
    enumInputModeOptions,
    refInputModeOptions,
    numberDisplayModeOptions,
    updateModeOptions,
  };
}
