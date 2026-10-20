import { kToC } from "./units";
import type { Val } from "./types";

/** Czech-locale number formatting. */
export function fmt(x: number | null | undefined, digits = 1): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  // Typographic minus; "-0,0" collapses to "0,0".
  return x
    .toLocaleString("cs-CZ", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: true,
    })
    .replace(/^-(0[,0]*)$/, "$1")
    .replace("-", "−");
}

/** Kelvin → "−12,3 °C". */
export function fmtC(k: number | null | undefined, digits = 1): string {
  if (k === null || k === undefined || !Number.isFinite(k)) return "—";
  return `${fmt(kToC(k), digits)} °C`;
}

export const STATUS_LABEL: Record<Val["status"], string> = {
  OK: "OK",
  UNREACHABLE: "NEDOSAŽITELNÉ",
  BREAKTHROUGH: "PRŮNIK KAPALINY",
  OUT_OF_TABLE: "MIMO TABULKU",
  EXTRAPOLATED: "EXTRAPOLACE",
  INVALID: "NEPLATNÉ",
};

/** Display a temperature Val: number when available, else its state. */
export function fmtValC(v: Val, digits = 1): string {
  if (v.value === null) return STATUS_LABEL[v.status];
  return fmtC(v.value, digits);
}

export function fmtVal(v: Val, digits = 1, scale = 1): string {
  if (v.value === null) return STATUS_LABEL[v.status];
  return fmt(v.value * scale, digits);
}
