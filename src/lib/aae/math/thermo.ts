import { KELVIN, P_ATM_BAR, R } from "../constants";
import type { MediumProps, ModelParams } from "../types";

/**
 * Saturation temperature via Clausius–Clapeyron [°C] — NAVRH C30.
 * 1/T = 1/T_ref − (R/h_fg,mol)·ln(P_abs/P₀)
 * @param medium medium properties
 * @param Pabs absolute pressure [bar]
 */
export function Tsat(medium: MediumProps, Pabs: number): number {
  const TbK = medium.tb + KELVIN;
  const Mkg = medium.M / 1000; // kg/mol
  const L_Jkg = medium.L * 1000; // J/kg
  const invT =
    1 / TbK - (R * Math.log(Pabs / P_ATM_BAR)) / (Mkg * L_Jkg);
  return 1 / invT - KELVIN;
}

/**
 * Log-mean temperature difference for ambient-air vaporizer [K] — NAVRH C50.
 * dT1 = T_amb − T_boil(P), dT2 = T_amb − T_out.
 * Returns NaN ("NELZE") when the duty is impossible (dT1 ≤ 0 or dT2 ≤ 0).
 */
export function lmtd(Tamb: number, Ts: number, Tout: number): number {
  const dT1 = Tamb - Ts;
  const dT2 = Tamb - Tout;
  if (dT1 <= 0 || dT2 <= 0) return NaN;
  if (Math.abs(dT1 - dT2) < 0.001) return dT1;
  return (dT1 - dT2) / Math.log(dT1 / dT2);
}

/**
 * Heat duty required for flow Q to reach Tout [kW].
 * Q_req = ṁ · (L + cp · ΔT_superheat) with ṁ = Q · ρ_N [kg/h].
 */
export function qReq(
  medium: MediumProps,
  Q_Nm3h: number,
  Tout: number,
  Ts: number,
): number {
  return (Q_Nm3h * medium.rhoN * (medium.L + medium.cp * (Tout - Ts))) / 3600;
}

/**
 * Effective overall heat transfer coefficient [W/(m²·K)] — NAVRH C52.
 * U_free = max(4; U_base·(1 + k·T_amb))
 * Optional fU multiplies free-field U for site air-velocity derating
 * (Lisowski / finned-surface h ∝ v^n). Floor after site: max(2; U_free·fU).
 * @param fU velocity factor [–], default 1 (free field at calibration speed)
 */
export function uEffective(
  TambC: number,
  model: ModelParams,
  fU = 1,
): number {
  const Ufree = Math.max(4, model.Ubase * (1 + model.Uk * TambC));
  const f = Number.isFinite(fU) && fU > 0 ? fU : 1;
  return Math.max(2, Ufree * f);
}

/**
 * Fin diameter auto-selected by flow Q [mm] — NAVRH C34.
 * <200 → 80 / ≤500 → 127 / ≤1200 → 152 / >1200 → 200
 */
export function finDiameterAuto(Q_Nm3h: number): number {
  return Q_Nm3h < 200 ? 80 : Q_Nm3h <= 500 ? 127 : Q_Nm3h <= 1200 ? 152 : 200;
}

/**
 * Fin area per tube length [m²/m] — NAVRH C60.
 * a_fin = max(0,2; 12·2·((Ø/2 − 12,7)/1000)·η_fin)
 */
export function aFinPerMeter(finMm: number, finEta: number): number {
  return Math.max(0.2, 12 * 2 * ((finMm / 2 - 12.7) / 1000) * finEta);
}

/**
 * Per-tube heat duty at given outlet temperature [kW].
 * q = U_eff · (a_fin·H) · LMTD / SF_total / 1000
 * Returns NaN when LMTD is impossible ("NELZE").
 *
 * @param Tamb climate ambient for U(T) [°C]
 * @param fU site air-velocity factor on U [–]
 * @param TambAir effective inlet air temperature for LMTD [°C]
 *        (defaults to Tamb; use lower value when cold plume recirculates)
 */
export function qTube(
  model: ModelParams,
  afin: number,
  H: number,
  Tamb: number,
  sfTot: number,
  Tout: number,
  Ts: number,
  fU = 1,
  TambAir: number = Tamb,
): number {
  const L = lmtd(TambAir, Ts, Tout);
  if (!Number.isFinite(L)) return NaN;
  return (uEffective(Tamb, model, fU) * afin * H * L) / sfTot / 1000;
}

/** Absolute pressure from gauge [bar a]. */
export function PabsFromGauge(Pg_barg: number): number {
  return Pg_barg + P_ATM_BAR;
}
