/**
 * テーブルカラーパレット（グリッド形式）
 * 行: 色の種類（色相）
 * 列: 濃淡（9段階: 100, 200, 300, 400, 500, 600, 700, 800, 900）
 */
export const TABLE_COLOR_GRID = [
  // indigo: 100-900
  ['#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  // violet: 100-900
  ['#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
  // fuchsia: 100-900
  ['#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'],
  // pink: 100-900
  ['#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
  // red: 100-900
  ['#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
  // orange: 100-900
  ['#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
  // amber: 100-900
  ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
  // lime: 100-900
  ['#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'],
  // green: 100-900
  ['#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
  // teal: 100-900
  ['#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
  // cyan: 100-900
  ['#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
  // gray: 100-900
  ['#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'],
] as const;

/**
 * テーブルカラーパレット（フラット配列 - 後方互換性用）
 * テーブルノードの色として選択可能な色の配列
 */
export const TABLE_COLOR_PALETTE = TABLE_COLOR_GRID.flat();

/** デフォルトのテーブルカラー */
export const DEFAULT_TABLE_COLOR = '#6366f1';

/**
 * テーブルカラー選択ボタン用のCSSクラス
 * TableEditor のカラーピッカーで使用
 * TABLE_COLOR_PALETTE から動的に生成
 */
export const TABLE_COLOR_PICKER_CLASSES: Record<string, string> = Object.fromEntries(
  TABLE_COLOR_PALETTE.map(color => [color, `bg-[${color}] border-[${color}]`])
);

/**
 * テーブル背景色のCSSクラス
 * シミュレーター等のUI要素で使用
 * TABLE_COLOR_PALETTE から動的に生成
 */
export const TABLE_BG_CLASSES: Record<string, string> = Object.fromEntries(
  TABLE_COLOR_PALETTE.map(color => [color, `bg-[${color}]`])
);

/**
 * TableNode用のCSSクラス
 * ER図キャンバス上のテーブルノードで使用
 * border と bg を分離して適用できる形式
 * TABLE_COLOR_PALETTE から動的に生成
 */
export const TABLE_NODE_STYLE_CLASSES: Record<string, { border: string; bg: string }> = Object.fromEntries(
  TABLE_COLOR_PALETTE.map(color => [color, { border: `border-[${color}]`, bg: `bg-[${color}]` }])
);

// 後方互換性のためのエイリアス（非推奨、将来削除予定）
/** @deprecated TABLE_COLOR_PALETTE を使用してください */
export const TABLE_COLORS = TABLE_COLOR_PALETTE;
/** @deprecated TABLE_COLOR_PICKER_CLASSES を使用してください */
export const TABLE_COLOR_CLASSES = TABLE_COLOR_PICKER_CLASSES;
/** @deprecated TABLE_BG_CLASSES を使用してください */
export const TABLE_BG_COLOR_CLASSES = TABLE_BG_CLASSES;
/** @deprecated TABLE_NODE_STYLE_CLASSES を使用してください */
export const TABLE_NODE_COLOR_CLASSES = TABLE_NODE_STYLE_CLASSES;
