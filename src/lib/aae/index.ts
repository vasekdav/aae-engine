/**
 * AAE Engine — pure calculation library.
 *
 * Architecture:
 *  - types / constants / media  → domain data
 *  - math/*                     → thermo, frost, velocity, solvers
 *  - modes/*                    → SIZING | CAPACITY | VELOCITY
 *  - calculate()                → single entry point for UI & tests
 *
 * Math verification later: add golden tests under lib/aae/__tests__
 * without touching React components.
 */

export { calculate, calculateDefaults } from "./calculate";
export {
  DEFAULT_INPUTS,
  DEFAULT_MODEL,
  MODEL_LINE,
  STANDARDS_LINE,
} from "./constants";
export { fmt } from "./format";
export { MEDIA, getMedium } from "./media";
export type {
  CalcMode,
  CalcRequest,
  CalcResult,
  DerivationStep,
  KpiItem,
  MediumId,
  MediumProps,
  ModelParams,
  ProcessInputs,
  SafetyCheck,
  SiteClass,
  StatusTone,
  Verdict,
  VerdictLevel,
} from "./types";

// Re-export pure math for verification notebooks / future tests
export {
  performanceFactor,
  sfRH,
  sfTime,
  sfTotal,
} from "./math/frost";
export {
  aFinPerMeter,
  finDiameterAuto,
  lmtd,
  PabsFromGauge,
  qReq,
  qTube,
  Tsat,
  uEffective,
} from "./math/thermo";
export {
  actualVolFlow_m3s,
  pipeArea_m2,
  velocityLimit,
  vGas,
  vLimO2,
  vLiq,
} from "./math/velocity";
export { qMax, toutActual } from "./math/solvers";
export {
  airVelocityFactor,
  approxCapacityFactor,
  effectiveAirTemperature,
  isSiteClass,
  localAirVelocity,
  resolveSiteAir,
  SITE_CLASS_HINTS,
  SITE_CLASS_LABELS,
  SITE_CLASSES,
  V_AIR_DEFAULT,
  V_AIR_REF,
} from "./math/site-airflow";
export type { SiteAirResult } from "./math/site-airflow";
export { twoZoneBaseline } from "./math/crosscheck";
export { verdictFromChecks } from "./safety";
