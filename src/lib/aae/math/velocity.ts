import { KELVIN, P_ATM_BAR } from "../constants";
import type { ModelParams } from "../types";

/**
 * Actual volumetric flow [m³/s] from normal flow [Nm³/h].
 * Ideal-gas scale: V̇ = Q_N/3600 · (P_atm/P_abs) · (T/T_std)
 */
export function actualVolFlow_m3s(
  Q_Nm3h: number,
  Pg_barg: number,
  Tg_C: number,
): number {
  const Pabs = Pg_barg + P_ATM_BAR;
  return (
    (Q_Nm3h / 3600) *
    (P_ATM_BAR / Pabs) *
    ((Tg_C + KELVIN) / KELVIN)
  );
}

/** Pipe cross-section [m²] for diameter D [mm]. */
export function pipeArea_m2(D_mm: number): number {
  return (Math.PI / 4) * Math.pow(D_mm / 1000, 2);
}

/**
 * Gas velocity in pipe [m/s].
 * @param Q_Nm3h normal flow
 * @param Pg_barg gauge pressure
 * @param Tg_C gas temperature
 * @param D_mm pipe ID
 */
export function vGas(
  Q_Nm3h: number,
  Pg_barg: number,
  Tg_C: number,
  D_mm: number,
): number {
  return actualVolFlow_m3s(Q_Nm3h, Pg_barg, Tg_C) / pipeArea_m2(D_mm);
}

/**
 * Liquid velocity in supply line [m/s] from normal gas flow.
 * ṁ_liq = Q · ρ_N, V̇_liq = ṁ / ρ_liq
 */
export function vLiq(
  Q_Nm3h: number,
  rhoN: number,
  rhoLiq: number,
  Dliq_mm: number,
): number {
  const massFlow_kg_s = (Q_Nm3h * rhoN) / 3600;
  const volFlow_m3_s = massFlow_kg_s / rhoLiq;
  return volFlow_m3_s / pipeArea_m2(Dliq_mm);
}

/**
 * O₂ velocity limit [m/s] — piecewise approximation of the CGA G-4.4 /
 * EIGA Doc 13 impingement curve for carbon steel (RYCHLOST C22, MODEL B17):
 * 61 m/s for P ≤ 0,21 MPa a; 7,6 m/s for P ≥ 4,14 MPa a;
 * 61·(P/0,21)^−0,699 in between. P in MPa absolute.
 */
export function vLimO2(Pg_barg: number): number {
  const P_MPa = (Pg_barg + P_ATM_BAR) / 10;
  if (P_MPa <= 0.21) return 61;
  if (P_MPa >= 4.14) return 7.6;
  return 61 * Math.pow(P_MPa / 0.21, -0.699);
}

/** Velocity limit for current medium / model. */
export function velocityLimit(
  isO2: boolean,
  Pg_barg: number,
  model: ModelParams,
): number {
  return isO2 ? vLimO2(Pg_barg) : model.vInert;
}
