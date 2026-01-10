export function maskIdentifier(name: string): string {
  if (!name) return '';

  const trimmed = name.trim();
  if (!trimmed) return name;

  // Avoid leaking exact length while keeping the UI stable.
  const maskLen = Math.min(12, Math.max(4, trimmed.length));
  return '●'.repeat(maskLen);
}
