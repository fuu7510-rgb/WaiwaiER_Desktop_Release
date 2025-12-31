/**
 * テーブルカラーパレット
 * テーブルノードの色として選択可能な色の配列
 */
export const TABLE_COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
] as const;

/** デフォルトのテーブルカラー */
export const DEFAULT_TABLE_COLOR = '#6366f1';

/**
 * テーブルカラー選択ボタン用のCSSクラス
 * TableEditor のカラーピッカーで使用
 */
export const TABLE_COLOR_PICKER_CLASSES: Record<string, string> = {
  '#6366f1': 'bg-[#6366f1] border-[#6366f1]',
  '#8b5cf6': 'bg-[#8b5cf6] border-[#8b5cf6]',
  '#ec4899': 'bg-[#ec4899] border-[#ec4899]',
  '#ef4444': 'bg-[#ef4444] border-[#ef4444]',
  '#f97316': 'bg-[#f97316] border-[#f97316]',
  '#f59e0b': 'bg-[#f59e0b] border-[#f59e0b]',
  '#84cc16': 'bg-[#84cc16] border-[#84cc16]',
  '#22c55e': 'bg-[#22c55e] border-[#22c55e]',
  '#14b8a6': 'bg-[#14b8a6] border-[#14b8a6]',
  '#06b6d4': 'bg-[#06b6d4] border-[#06b6d4]',
};

/**
 * テーブル背景色のCSSクラス
 * シミュレーター等のUI要素で使用
 */
export const TABLE_BG_CLASSES: Record<string, string> = {
  '#6366f1': 'bg-[#6366f1]',
  '#8b5cf6': 'bg-[#8b5cf6]',
  '#ec4899': 'bg-[#ec4899]',
  '#ef4444': 'bg-[#ef4444]',
  '#f97316': 'bg-[#f97316]',
  '#f59e0b': 'bg-[#f59e0b]',
  '#84cc16': 'bg-[#84cc16]',
  '#22c55e': 'bg-[#22c55e]',
  '#14b8a6': 'bg-[#14b8a6]',
  '#06b6d4': 'bg-[#06b6d4]',
};

/**
 * TableNode用のCSSクラス
 * ER図キャンバス上のテーブルノードで使用
 * border と bg を分離して適用できる形式
 */
export const TABLE_NODE_STYLE_CLASSES: Record<string, { border: string; bg: string }> = {
  '#6366f1': { border: 'border-indigo-500', bg: 'bg-indigo-500' },
  '#8b5cf6': { border: 'border-violet-500', bg: 'bg-violet-500' },
  '#ec4899': { border: 'border-pink-500', bg: 'bg-pink-500' },
  '#ef4444': { border: 'border-red-500', bg: 'bg-red-500' },
  '#f97316': { border: 'border-orange-500', bg: 'bg-orange-500' },
  '#f59e0b': { border: 'border-amber-500', bg: 'bg-amber-500' },
  '#84cc16': { border: 'border-lime-500', bg: 'bg-lime-500' },
  '#22c55e': { border: 'border-green-500', bg: 'bg-green-500' },
  '#14b8a6': { border: 'border-teal-500', bg: 'bg-teal-500' },
  '#06b6d4': { border: 'border-cyan-500', bg: 'bg-cyan-500' },
};

// 後方互換性のためのエイリアス（非推奨、将来削除予定）
/** @deprecated TABLE_COLOR_PALETTE を使用してください */
export const TABLE_COLORS = TABLE_COLOR_PALETTE;
/** @deprecated TABLE_COLOR_PICKER_CLASSES を使用してください */
export const TABLE_COLOR_CLASSES = TABLE_COLOR_PICKER_CLASSES;
/** @deprecated TABLE_BG_CLASSES を使用してください */
export const TABLE_BG_COLOR_CLASSES = TABLE_BG_CLASSES;
/** @deprecated TABLE_NODE_STYLE_CLASSES を使用してください */
export const TABLE_NODE_COLOR_CLASSES = TABLE_NODE_STYLE_CLASSES;
