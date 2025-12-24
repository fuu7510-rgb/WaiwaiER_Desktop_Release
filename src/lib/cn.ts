import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSのクラス名を安全にマージするユーティリティ関数
 * 
 * 使用例:
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4が優先される)
 * cn('bg-red-500', isActive && 'bg-blue-500') // 条件付きクラス
 * cn(baseStyles, variantStyles, className) // 複数の引数
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

