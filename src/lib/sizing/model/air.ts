import { lmtd, MEDIA, Tsat as TsatClausius } from "@/lib/aae";
import { c, type ConstantSet } from "../constants";
import { getFluid } from "../props";
import { bargToPa, cToK, KELVIN } from "../units";
import { Tube } from "./zones";

/**
 * Air-side conductance per metre of finned tube, frost derating and the
 * calibration that anchors the zone model to the L40 workbook model.
 */

/** Overall air-side U at meteorological ambient [W/(m²·K)] — MODEL C5/C6, NAVRH C52. */
export function uAir(TambK: number, set: ConstantSet): number {
  return Math.max(
    c(set, "U_FLOOR"),
    c(set, "U_BASE") * (1 + c(set, "U_K") * (TambK - KELVIN)),
  );
}

/** Fin area per metre of tube [m²/m] — NAVRH C60: n·2·(Ø/2 − r)·η. */
export function aFin(finD: number, set: ConstantSet): number {
  return Math.max(
    0.2,
    c(set, "FIN_COUNT") * 2 * (finD / 2 - c(set, "TUBE_R")) * c(set, "FIN_ETA"),
  );
}

/** Frost performance factor PF(t) = a·e^(b·t) + c, t in hours — NAVRH C53. */
export function performanceFactor(tH: number, set: ConstantSet): number {
  return c(set, "PF_A") * Math.exp(c(set, "PF_B") * tH) + c(set, "PF_C");
}

/** SF(t) = max(1; 1/PF(t)) — NAVRH C54. */
export function sfTime(tH: number, set: ConstantSet): number {
  return Math.max(1, 1 / performanceFactor(tH, set));
}

/** SF_RH: 1 up to RH 70 %, linear to 1 + max at 100 % — NAVRH C55. */
export function sfRH(RH: number, set: ConstantSet): number {
  const r = Math.min(1, Math.max(0, (RH - 0.7) / 0.3));
  return 1 + c(set, "SF_RH_MAX") * r;
}

/** Auto fin diameter by normal flow [m] — NAVRH C34 (<200 / ≤500 / ≤1200 / >1200 Nm³/h). */
export function finDiameterAuto(qNm3h: number): number {
  const mm = qNm3h < 200 ? 80 : qNm3h <= 500 ? 127 : qNm3h <= 1200 ? 152 : 200;
  return mm / 1000;
}

export interface Calibration {
  /** Multiplier on U so the zone model reproduces the workbook area at the catalogue point. */
  C: number;
  pRef: number;
  TairRef: number;
  ToutRef: number;
  /** Λ of the zone model at the reference [J/(kg·K)]. */
  lamRef: number;
  /** Workbook Δh/LMTD at the reference [J/(kg·K)]. */
  wbRef: number;
}

/**
 * Workbook (U·A·LMTD) specific area term Δh/LMTD [J/(kg·K)] — NAVRH C30, C50, Q_req.
 * A_wb/ṁ = (Δh/LMTD)·SF/U with constant L and c_p and Clausius–Clapeyron T_sat.
 * Returns null when LMTD is impossible.
 */
export function workbookSpecific(
  medium: keyof typeof MEDIA,
  pLine: number,
  Tair: number,
  Tout: number,
): number | null {
  const m = MEDIA[medium];
  const tsC = TsatClausius(m, pLine / 1e5);
  const L = lmtd(Tair - KELVIN, tsC, Tout - KELVIN);
  if (!Number.isFinite(L) || L <= 0) return null;
  const dh = (m.L + m.cp * (Tout - KELVIN - tsC)) * 1000;
  return dh / L;
}

const calCache = new Map<string, Calibration>();

/**
 * Zone-model calibration factor C at the catalogue reference point
 * (N₂, T_amb +20 °C, 8 h, approach 15 K, saturated liquid at CAL_P_BARG):
 * C = Λ_zone(ref) / (Δh/LMTD)_workbook(ref). Air-side U, SF and fin area
 * are common to both models and cancel.
 */
export function calibrate(set: ConstantSet): Calibration {
  const key = `${set.version}:${c(set, "CAL_P_BARG")}:${c(set, "CAL_T_AMB")}:${c(set, "CAL_APPROACH")}`;
  const hit = calCache.get(key);
  if (hit) return hit;
  const pRef = bargToPa(c(set, "CAL_P_BARG"));
  const TairRef = cToK(c(set, "CAL_T_AMB"));
  const ToutRef = TairRef - c(set, "CAL_APPROACH");
  const tube = new Tube(getFluid("N2"), pRef, pRef, TairRef);
  const lam = tube.lambdaTo(ToutRef).value;
  const wb = workbookSpecific("N2", pRef, TairRef, ToutRef);
  if (lam === null || wb === null) {
    throw new Error("Calibration reference point is not computable");
  }
  const cal: Calibration = {
    C: lam / wb,
    pRef,
    TairRef,
    ToutRef,
    lamRef: lam,
    wbRef: wb,
  };
  calCache.set(key, cal);
  return cal;
}
