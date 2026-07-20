import { V_AIR_DEFAULT } from "./math/site-airflow";
import type { ModelParams, ProcessInputs } from "./types";

/** Universal gas constant [J/(mol·K)] — MODEL C15. */
export const R = 8.314;

/** Standard atmosphere [bar] — workbook uses 1,01325 everywhere. */
export const P_ATM_BAR = 1.01325;

/** Absolute zero offset [K]. */
export const KELVIN = 273.15;

/** Default model parameters — sheet MODEL (calibrated vs. Linde L40). */
export const DEFAULT_MODEL: ModelParams = {
  Ubase: 7,
  Uk: 0.007,
  pfA: 0.675,
  pfB: -0.1373,
  pfC: 0.775,
  finEta: 0.9,
  Uvap: 8,
  Ush: 3.4,
  vInert: 20,
  vLiqLim: 2,
};

/** Default process inputs matching the workbook default scenario. */
export const DEFAULT_INPUTS: ProcessInputs = {
  Q: 1000,
  H: 5,
  Ninst: 50,
  t: 8,
  Tamb: 0,
  RH: 80,
  Pliq: 12,
  Pgas: 5,
  Dliq: 80,
  Dgas: 80,
  Tout: -10,
  Tgas: -10,
  Tmin: -20,
  /** Free-stream design wind; FREE + 1,5 m/s = free-field baseline. */
  vAir: V_AIR_DEFAULT,
  siteClass: "FREE",
};

/** Near-limit velocity ratio for WARNING. */
export const VELOCITY_NEAR = 0.9;

/** Extra headroom warning band above T_min [K] — NAVRH E91 ("rezerva < 5 K"). */
export const TMIN_MARGIN_WARN_K = 5;

/** O₂ advisory outlet temperature [°C] — NAVRH E92 / FLUID DATA T_lim. */
export const O2_ADVISORY_TOUT = -15;

/** Frost curve validated range [h] — NAVRH F10 ("křivka validní 1–30 h"). */
export const T_RUN_VALID_MIN_H = 1;
export const T_RUN_VALID_MAX_H = 30;

/** Fraction of P_crit above which the Clausius-Clapeyron extrapolation warns — NAVRH E28. */
export const PCRIT_FRACTION_WARN = 0.8;

/** Accepted corridor for the two-zone cross-check ratio — NAVRH E97. */
export const CROSSCHECK_MIN = 0.8;
export const CROSSCHECK_MAX = 1.6;

/** Bisection iterations for the T_out solver. */
export const BISECTION_ITERS = 60;

export const STANDARDS_LINE =
  "CGA P-56 · EIGA Doc 133 · EIGA Doc 13 / CGA G-4.4 · ASME B31.3";

export const MODEL_LINE =
  "kalibrace L40 (U_base 7 W/m²K · k 0,007/K · PF křivka námrazy · SF_RH · site airflow v^0,6 + φ)";
