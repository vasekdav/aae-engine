import type { SizingCase } from "./types";
import { bargToPa, cToK, hToS, nm3hToKgs } from "./units";

/** ρ_N of N₂ used only to express the 1000 Nm³/h default as kg/s. */
const RHO_N_N2 = 1.2504;

/** Default case: N₂ 1000 Nm³/h, Praha, CS P235GH, free field, 8 h. */
export const DEFAULT_CASE: SizingCase = {
  mode: "A",
  medium: "N2",
  mDot: nm3hToKgs(1000, RHO_N_N2),
  mDotOrifice: null,
  TambDesign: cToK(-15),
  TambMinSafety: cToK(-24),
  TambSummer: cToK(35),
  inversionK: 0,
  RH: 0.8,
  material: "P235GH",
  TlimitOverride: null,
  margin: 5,
  tEvent: hToS(8),
  pLine: bargToPa(10),
  pTank: 101325,
  pipeID: 0.0779,
  location: {
    preset: "FREE",
    extraRows: 0,
    drain: "FREE",
    phi: 0.5,
    gH: 0.2,
    rH: null,
  },
  series: "LEADVAP",
  finDiameter: null,
  H: 6,
  N: 50,
  unitSource: "SIZED",
  csBeforeShutoff: false,
  trimHeater: false,
  siteId: "PRAHA",
};

export function caseWith(patch: Partial<SizingCase>): SizingCase {
  return {
    ...DEFAULT_CASE,
    ...patch,
    location: { ...DEFAULT_CASE.location, ...(patch.location ?? {}) },
  };
}
