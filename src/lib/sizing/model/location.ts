import { c, type ConstantSet, getPreset, LOCATIONS } from "../constants";
import type { Corner, LocationInput, LocationResolved } from "../types";

/**
 * Siting model: two separate effects —
 *  ΔT_recirc  cold-air lake lowers the effective inlet air temperature (main),
 *  f_loc      reduced heat transfer when inflow is actually obstructed (minor).
 * T_air,eff = T_amb − ΔT_recirc. All factors are ASSUMED until field data.
 */

/** Growth of recirculation with run time for enclosed layouts: ∝ √(t/8). */
function growth(tH: number): number {
  return Math.sqrt(Math.max(0, tH) / 8);
}

export function resolveLocation(
  input: LocationInput,
  tH: number,
  set: ConstantSet,
): LocationResolved {
  const preset = getPreset(input.preset);
  const base = { presetId: preset.id, label: preset.label };

  if (input.drain === "BLOCKED") {
    return {
      ...base,
      fLoc: null,
      dTRecirc: null,
      impact: "NOGO",
      reason: "zablokovaný odtok studeného vzduchu u paty",
      parametric: preset.impact === "PARAMETRIC",
    };
  }

  if (preset.impact === "PARAMETRIC") {
    const P = LOCATIONS.parametric;
    const phi = Math.min(1, Math.max(0, input.phi));
    const kD = input.drain === "RESTRICTED" ? P.kD.RESTRICTED : P.kD.FREE;
    const g = phi < P.enclosedPhi ? growth(tH) : 1;
    const dT = c(set, "DT_RECIRC_MAX") * g * (1 - phi) * kD;
    const fWall = Math.min(1, 0.6 + 2 * Math.max(0, input.gH));
    const fRoof =
      input.rH === null ? 1 : Math.min(1, 0.7 + 0.6 * Math.max(0, input.rH));
    const fLoc = fWall * fRoof;
    if (fLoc < P.fLocMin) {
      return {
        ...base,
        fLoc: null,
        dTRecirc: null,
        impact: "NOGO",
        reason: `f_loc = ${fLoc.toFixed(2)} < ${P.fLocMin} — umístění mimo model`,
        parametric: true,
      };
    }
    return {
      ...base,
      fLoc,
      dTRecirc: dT,
      impact: input.drain === "RESTRICTED" ? "WARNING" : "NONE",
      reason: input.drain === "RESTRICTED" ? "omezený odtok studeného vzduchu u paty" : null,
      parametric: true,
    };
  }

  if (preset.impact === "NOGO" || preset.fLoc === null || preset.dT8 === null) {
    return {
      ...base,
      fLoc: null,
      dTRecirc: null,
      impact: "NOGO",
      reason: preset.reason ?? "umístění mimo model",
      parametric: false,
    };
  }

  const rows = Math.max(0, Math.floor(input.extraRows));
  const dT =
    preset.dT8 * (preset.grows ? growth(tH) : 1) +
    (preset.perExtraRowK ?? 0) * rows;
  let impact: LocationResolved["impact"] = preset.impact;
  let reason = preset.reason ?? null;
  if (input.drain === "RESTRICTED" && impact === "NONE") {
    impact = "WARNING";
    reason = "omezený odtok studeného vzduchu u paty";
  }
  return {
    ...base,
    fLoc: preset.fLoc,
    dTRecirc: dT,
    impact,
    reason,
    parametric: false,
  };
}

/** Nominal, worst and best corners of the uncertainty box. */
export function corners(
  loc: LocationResolved,
  set: ConstantSet,
): Record<Corner["id"], Corner> | null {
  if (loc.fLoc === null || loc.dTRecirc === null) return null;
  const uU = c(set, "UNC_U");
  const uF = c(set, "UNC_FLOC");
  const uD = c(set, "UNC_DT");
  return {
    NOM: { id: "NOM", fU: 1, fLoc: loc.fLoc, dT: loc.dTRecirc },
    WORST: {
      id: "WORST",
      fU: 1 - uU,
      fLoc: Math.max(LOCATIONS.parametric.fLocMin, loc.fLoc - uF),
      dT: loc.dTRecirc * (1 + uD),
    },
    BEST: {
      id: "BEST",
      fU: 1 + uU,
      fLoc: Math.min(1, loc.fLoc + uF),
      dT: loc.dTRecirc * (1 - uD),
    },
  };
}
