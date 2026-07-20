import { BISECTION_ITERS } from "../constants";
import type { MediumProps, ModelParams } from "../types";
import { qReq, qTube, uEffective, lmtd } from "./thermo";

/**
 * Actual gas outlet temperature [°C] for flow Q with N tubes (bisection).
 * Solves the area balance N · q_tube(T) = Q_req(T) on (T_sat, T_amb),
 * mirroring the workbook scan table (KAPACITA H8:J108, margins 0,5 K).
 * Returns null when the outlet stays two-phase (installed area cannot even
 * boil off the flow — workbook "DVOUFÁZOVÝ VÝSTUP") or there is no driving
 * force (T_amb ≤ T_sat).
 */
export function toutActual(
  medium: MediumProps,
  model: ModelParams,
  afin: number,
  Q: number,
  N: number,
  H: number,
  Tamb: number,
  sfTot: number,
  Ts: number,
): number | null {
  let lo = Ts + 0.5;
  let hi = Tamb - 0.5;
  if (hi <= lo) return null;

  const excess = (T: number): number =>
    N * qTube(model, afin, H, Tamb, sfTot, T, Ts) -
    qReq(medium, Q, T, Ts);

  if (excess(lo) < 0) return null; // two-phase outlet at requested Q
  if (excess(hi) > 0) return hi; // unit heavily oversized — clamp to T_amb − 0,5

  for (let i = 0; i < BISECTION_ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (excess(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Maximum normal flow [Nm³/h] with N tubes at target T_out — closed form
 * from KAPACITA C56–C59:
 * Q̇_max = A_eff·U_eff·LMTD, ṁ_max = Q̇_max/Δh, Q_max = ṁ_max·3600/ρ_N
 * with A_eff = N·a_fin·H / SF_total.
 * Returns null when LMTD at the target is impossible (T_amb ≤ target).
 * Caller must keep the target above T_sat (superheat floor).
 */
export function qMax(
  medium: MediumProps,
  model: ModelParams,
  afin: number,
  N: number,
  H: number,
  Tamb: number,
  sfTot: number,
  Ts: number,
  ToutTarget: number,
): number | null {
  const L = lmtd(Tamb, Ts, ToutTarget);
  const dh = medium.L + medium.cp * (ToutTarget - Ts); // kJ/kg
  if (!Number.isFinite(L) || dh <= 0) return null;
  const aEff = (N * afin * H) / sfTot; // m²
  const qW = aEff * uEffective(Tamb, model) * L; // W
  const mDot = qW / (dh * 1000); // kg/s
  return (mDot * 3600) / medium.rhoN;
}
