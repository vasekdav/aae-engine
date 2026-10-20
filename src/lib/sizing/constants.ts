import climateData from "./data/climate.json";
import constantsData from "./data/constants.json";
import locationsData from "./data/locations.json";
import materialsData from "./data/materials.json";
import type { ConstStatus, SeriesId } from "./types";

/**
 * Constants with a "birth certificate": value, unit, status, source, validity
 * and the phenomenon the factor covers. A constant set in which two different
 * factors cover the same phenomenon is rejected (double counting).
 */

export interface ConstEntry {
  value: number;
  unit: string;
  status: ConstStatus;
  source: string;
  validity: string;
  /** Group of constants forming one physical factor. */
  factor?: string;
  /** Phenomenon the factor covers. */
  covers?: string;
}

export interface SeriesEntry {
  label: string;
  PS_barg: number;
  tValid_h: number;
  calibrated: boolean;
  status: ConstStatus;
}

export interface ProfileEntry {
  id: string;
  diameter_mm: number;
  label: string;
}

export interface ConstantSet {
  version: string;
  items: Record<ConstId, ConstEntry>;
  series: Record<SeriesId, SeriesEntry>;
  profiles: ProfileEntry[];
}

export type ConstId = keyof typeof constantsData.items;

export const DEFAULT_CONSTANTS: ConstantSet = constantsData as ConstantSet;

export function c(set: ConstantSet, id: ConstId): number {
  return set.items[id].value;
}

/**
 * Double-counting guard: each phenomenon may be covered by one factor only.
 * Returns the list of conflicts (empty = valid set).
 */
export function validateConstantSet(set: ConstantSet): string[] {
  const byPhenomenon = new Map<string, Set<string>>();
  for (const [id, e] of Object.entries(set.items) as [string, ConstEntry][]) {
    if (!e.covers) continue;
    const factor = e.factor ?? id;
    const s = byPhenomenon.get(e.covers) ?? new Set<string>();
    s.add(factor);
    byPhenomenon.set(e.covers, s);
  }
  const conflicts: string[] = [];
  for (const [phen, factors] of byPhenomenon) {
    if (factors.size > 1) {
      conflicts.push(`„${phen}“ pokrývá více faktorů: ${[...factors].join(", ")}`);
    }
  }
  return conflicts;
}

// ---- Location presets ---------------------------------------------------

export interface LocationPreset {
  id: string;
  label: string;
  hint: string;
  fLoc: number | null;
  dT8: number | null;
  grows: boolean;
  perExtraRowK?: number;
  impact: "NONE" | "WARNING" | "NOGO" | "PARAMETRIC";
  reason?: string;
  pictogram: string;
}

export const LOCATIONS = locationsData as {
  version: string;
  status: ConstStatus;
  source: string;
  presets: LocationPreset[];
  parametric: {
    kD: { FREE: number; RESTRICTED: number; BLOCKED: number | null };
    fLocMin: number;
    enclosedPhi: number;
  };
};

export function getPreset(id: string): LocationPreset {
  return LOCATIONS.presets.find((p) => p.id === id) ?? LOCATIONS.presets[0];
}

// ---- Materials ----------------------------------------------------------

export interface Material {
  id: string;
  label: string;
  Tlimit_C: number;
  lowTempSensitive: boolean;
  status: ConstStatus;
  note: string;
}

export const MATERIALS = materialsData as {
  version: string;
  source: string;
  items: Material[];
};

export function getMaterial(id: string): Material {
  return MATERIALS.items.find((m) => m.id === id) ?? MATERIALS.items[0];
}

// ---- Climate ------------------------------------------------------------

export interface ClimateSite {
  id: string;
  label: string;
  thetaE: number;
  mean: number;
  inversionK?: number;
}

export const CLIMATE = climateData as {
  version: string;
  status: ConstStatus;
  source: string;
  hourlyOffsetK: number;
  safetyOffsetK: number;
  sites: ClimateSite[];
};

export function getSite(id: string | null): ClimateSite | null {
  if (!id) return null;
  return CLIMATE.sites.find((s) => s.id === id) ?? null;
}
