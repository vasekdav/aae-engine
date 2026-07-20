/**
 * Czech locale number formatting (matches original engine display).
 */
export function fmt(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("cs-CZ", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
