/**
 * AAE sizing core — pure TypeScript, no React/DOM.
 * Entry point: solve(case, constants, props) → result.
 */
export { solve } from "./solve";
export {
  CLIMATE,
  DEFAULT_CONSTANTS,
  getMaterial,
  getPreset,
  getSite,
  LOCATIONS,
  MATERIALS,
  validateConstantSet,
} from "./constants";
export type {
  ClimateSite,
  ConstantSet,
  ConstEntry,
  LocationPreset,
  Material,
} from "./constants";
export { getFluid, PROPS_TABLES } from "./props";
export type { Fluid } from "./props";
export {
  aFin,
  calibrate,
  finDiameterAuto,
  performanceFactor,
  sfRH,
  sfTime,
  uAir,
} from "./model/air";
export { corners, resolveLocation } from "./model/location";
export { Tube } from "./model/zones";
export { fmt, fmtC, fmtVal, fmtValC, STATUS_LABEL } from "./format";
export * from "./units";
export * from "./types";
export { DEFAULT_CASE, caseWith } from "./defaults";
export {
  APP_VERSION,
  dataFingerprint,
  dataManifest,
  hashJson,
  runSelfTest,
} from "./selftest";
export type { DataManifestRow, SelfTestRow } from "./selftest";
