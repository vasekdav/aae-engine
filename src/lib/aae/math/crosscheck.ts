import { KELVIN } from "../constants";
import type { MediumProps, ModelParams } from "../types";

export interface TwoZoneBaseline {
  /** Combined frost efficiency η_time·η_T of the baseline model [–]. */
  etaFrost: number;
  /** Vaporization-zone area [m²]. */
  aVap: number;
  /** Superheat-zone area [m²]. */
  aSh: number;
  /** Total baseline area [m²]. */
  aBaseline: number;
}

/**
 * Independent two-zone NTU-ε cross-check — NAVRH C70–C77.
 * η_time = 1/(1+0,035·t^0,6); η_T = (T_K/293)^1,5
 * A_vap = ṁ·L/(U_vap·ΔT₁·η); ε = (T_out−T_boil)/(T_amb−T_boil);
 * NTU = −ln(1−ε); A_sh = NTU·ṁ·Cp/(U_sh·η)
 * @param mDot mass flow [kg/s]
 * @returns null when there is no driving force (T_amb ≤ T_sat)
 */
export function twoZoneBaseline(
  medium: MediumProps,
  model: ModelParams,
  mDot: number,
  Tamb: number,
  tHours: number,
  Tout: number,
  Ts: number,
): TwoZoneBaseline | null {
  const dT1 = Tamb - Ts;
  if (dT1 <= 0) return null;
  const etaTime = 1 / (1 + 0.035 * Math.pow(tHours, 0.6));
  const etaT = Math.pow((Tamb + KELVIN) / 293, 1.5);
  const etaFrost = etaTime * etaT;
  const aVap = (mDot * medium.L * 1000) / (model.Uvap * dT1 * etaFrost);
  const eps = Math.min(0.999, Math.max(0.001, (Tout - Ts) / dT1));
  const ntu = -Math.log(1 - eps);
  const aSh = (ntu * mDot * medium.cp * 1000) / (model.Ush * etaFrost);
  return { etaFrost, aVap, aSh, aBaseline: aVap + aSh };
}
