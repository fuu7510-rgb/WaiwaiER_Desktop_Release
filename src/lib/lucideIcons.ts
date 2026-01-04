import type { ComponentType } from 'react';
import * as Lucide from 'lucide-react';

export type LucideIconComponent = ComponentType<{ size?: number; className?: string }>;

const DENY_KEYS = new Set([
  // non-icon exports
  'createLucideIcon',
  'icons',
  'default',
  'DynamicIcon',
]);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const toKebabCase = (pascalCase: string) => {
  // Examples:
  // ArrowRight -> arrow-right
  // Link2 -> link-2
  // AArrowDown -> a-arrow-down
  return pascalCase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .toLowerCase();
};

const isProbablyIconExport = (key: string, value: unknown): value is LucideIconComponent => {
  if (DENY_KEYS.has(key)) return false;
  if (!/^[A-Z]/.test(key)) return false;
  if (typeof value !== 'function') return false;
  return true;
};

const ICON_EXPORTS = Object.entries(Lucide).filter(([key, value]) => isProbablyIconExport(key, value));
const NORMALIZED_TO_PASCAL = new Map<string, string>(ICON_EXPORTS.map(([key]) => [normalize(key), key]));
const KEBAB_NAMES_SORTED = ICON_EXPORTS.map(([key]) => toKebabCase(key)).sort((a, b) => a.localeCompare(b));

export const listLucideIconNamesKebab = (): string[] => KEBAB_NAMES_SORTED;

export const resolveLucideIconPascalName = (name: string): string | null => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;

  // Fast path: user already uses PascalCase export name
  if (trimmed in Lucide) {
    const maybe = (Lucide as Record<string, unknown>)[trimmed];
    return isProbablyIconExport(trimmed, maybe) ? trimmed : null;
  }

  // Normalized lookup: supports kebab_case, snake_case, spaces, etc.
  const normalized = normalize(trimmed);
  if (normalized.length === 0) return null;

  return NORMALIZED_TO_PASCAL.get(normalized) ?? null;
};

export const canonicalizeLucideIconName = (name: string): string => {
  const pascal = resolveLucideIconPascalName(name);
  return pascal ? toKebabCase(pascal) : name.trim();
};

export const getLucideIconComponent = (name: string | null | undefined): LucideIconComponent | null => {
  const raw = (name ?? '').trim();
  if (raw.length === 0) return null;

  const pascal = resolveLucideIconPascalName(raw);
  if (!pascal) return null;

  const maybe = (Lucide as Record<string, unknown>)[pascal];
  return isProbablyIconExport(pascal, maybe) ? (maybe as LucideIconComponent) : null;
};
