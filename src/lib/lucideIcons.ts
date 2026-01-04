import { iconNames, type IconName } from 'lucide-react/dynamic';

export type LucideIconName = IconName;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const KEBAB_NAMES_SORTED = [...iconNames].sort((a, b) => a.localeCompare(b));
const KEBAB_NAME_SET = new Set<IconName>(KEBAB_NAMES_SORTED);
const NORMALIZED_TO_KEBAB = new Map<string, IconName>(
  KEBAB_NAMES_SORTED.map((name) => [normalize(name), name])
);

export const listLucideIconNamesKebab = (): IconName[] => KEBAB_NAMES_SORTED;

export const canonicalizeLucideIconName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '';
  const normalized = normalize(trimmed);
  if (normalized.length === 0) return trimmed;
  return (NORMALIZED_TO_KEBAB.get(normalized) ?? trimmed) as string;
};

export const isLucideIconName = (name: string): name is IconName => KEBAB_NAME_SET.has(name as IconName);

export const coerceLucideIconName = (
  name: string | null | undefined,
  fallback: IconName = 'arrow-right'
): IconName => {
  const canonical = canonicalizeLucideIconName(name ?? '');
  if (isLucideIconName(canonical)) return canonical;
  return fallback;
};
