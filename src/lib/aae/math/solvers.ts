import { BISECTION_ITERS } from "../constants";
import type { MediumProps, ModelParams } from "../types";
import { qReq, qTube, uEffective, lmtd } from "./thermo";

export interface AirSideOpts {
  /** Site velocity factor on free-field U [–]. Default 1. */
  fU?: number;
  /** Effective inlet air temperature for LMTD [°C]. Defaults to Tamb. */
  TambAir?: number;
}

/**
 * Actual gas outlet temperature [°C] for flow Q with N tubes (bisection).
 * Solves the area balance N · q_tube(T) = Q_req(T) on (T_sat, T_amb),
 * mirroring the workbook scan table (KAPACITA H8:J108, margins 0,5 K).
 * Returns null when the outlet stays two-phase (installed area cannot even
 * boil off the flow — workbook "DVOUFÁZOVÝ VÝSTUP") or there is no driving
 * force (T_amb ≤ T_sat).
 *
 * When site recirculation lowers TambAir below Tamb, the bisection upper
 * bound uses TambAir (coil cannot heat gas above local air temperature).
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
  air: AirSideOpts = {},
): number | null {
  const fU = air.fU ?? 1;
  const TambAir = air.TambAir ?? Tamb;
  let lo = Ts + 0.5;
  let hi = Math.min(Tamb, TambAir) - 0.5;
  if (hi <= lo) return null;

  const excess = (T: number): number =>
    N * qTube(model, afin, H, Tamb, sfTot, T, Ts, fU, TambAir) -
    qReq(medium, Q, T, Ts);

  if (excess(lo) < 0) return null; // two-phase outlet at requested Q
  if (excess(hi) > 0) return hi; // unit heavily oversized — clamp to T_air − 0,5

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
 * Returns null when LMTD at the target is impossible (T_air ≤ target).
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
  air: AirSideOpts = {},
): number | null {
  const fU = air.fU ?? 1;
  const TambAir = air.TambAir ?? Tamb;
  const L = lmtd(TambAir, Ts, ToutTarget);
  const dh = medium.L + medium.cp * (ToutTarget - Ts); // kJ/kg
  if (!Number.isFinite(L) || dh <= 0) return null;
  const aEff = (N * afin * H) / sfTot; // m²
  const qW = aEff * uEffective(Tamb, model, fU) * L; // W
  const mDot = qW / (dh * 1000); // kg/s
  return (mDot * 3600) / medium.rhoN;
}
