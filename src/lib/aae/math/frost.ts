import type { ModelParams } from "../types";

/**
 * Frost / derating model from the workbook (NAVRH C52–C56, MODEL C5–C9).
 * Instead of a stacked efficiency η the primary model derates via
 * safety factors: effective conductance = U_eff / SF_total.
 */

/** Frost performance factor PF(t) = a·e^(b·t) + c — NAVRH C53. */
export function performanceFactor(
  tHours: number,
  model: ModelParams,
): number {
  return model.pfA * Math.exp(model.pfB * tHours) + model.pfC;
}

/** Time safety factor SF = max(1; 1/PF) — NAVRH C54. */
export function sfTime(tHours: number, model: ModelParams): number {
  return Math.max(1, 1 / performanceFactor(tHours, model));
}

/**
 * Humidity surcharge SF_RH — NAVRH C55:
 * 1 up to RH 70 %, linear ramp to 1,15 at RH 100 %.
 */
export function sfRH(rhPercent: number): number {
  return rhPercent > 70
    ? 1 + (0.15 * Math.min(rhPercent - 70, 30)) / 30
    : 1;
}

/** Total safety factor SF_total = SF · SF_RH — NAVRH C56. */
export function sfTotal(
  tHours: number,
  rhPercent: number,
  model: ModelParams,
): number {
  return sfTime(tHours, model) * sfRH(rhPercent);
}
