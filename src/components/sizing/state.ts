import {
  bargToPa,
  CLIMATE,
  cToK,
  getFluid,
  getSite,
  hToS,
  kghToKgs,
  nm3hToKgs,
  P_ATM,
  type LocationInput,
  type MediumId,
  type Mode,
  type SeriesId,
  type SizingCase,
} from "@/lib/sizing";

/**
 * UI state in engineering units (°C, bar, Nm³/h, h, mm). The only place where
 * units are converted to the SI case consumed by the core.
 */

export type FlowUnit = "Nm3h" | "kgh";
export type PressureUnit = "g" | "a";
export type Service = "CONTINUOUS" | "BACKUP" | "INTERMITTENT";
export type Source = "USER" | "DEFAULT" | "PRESET" | "ASSUMED";

export interface UiState {
  mode: Mode;
  medium: MediumId;
  flowUnit: FlowUnit;
  flow: number;
  orificeOn: boolean;
  orifice: number;
  siteId: string;
  TambDesign: number;
  TambMinSafety: number;
  TambSummer: number;
  inversionK: number;
  RH: number;
  material: string;
  overrideOn: boolean;
  overrideT: number;
  overrideReason: string;
  margin: number;
  service: Service;
  tEvent: number;
  pLineUnit: PressureUnit;
  pLine: number;
  pTank: number;
  pipeMode: "DN" | "ID";
  dn: string;
  wall: number;
  pipeID: number;
  location: LocationInput;
  series: SeriesId;
  profile: string;
  H: number;
  N: number;
  unitSource: "SIZED" | "GIVEN";
  csBeforeShutoff: boolean;
  trimHeater: boolean;
  project: string;
  processedBy: string;
  checkedBy: string;
}

/** Pipe outside diameters [mm] — EN 10220 / ISO 4200 series 1. */
export const DN_OD: Record<string, number> = {
  DN15: 21.3,
  DN20: 26.9,
  DN25: 33.7,
  DN32: 42.4,
  DN40: 48.3,
  DN50: 60.3,
  DN65: 76.1,
  DN80: 88.9,
  DN100: 114.3,
  DN125: 139.7,
  DN150: 168.3,
  DN200: 219.1,
  DN250: 273.0,
};

export const SERVICE_HOURS: Record<Service, number | null> = {
  CONTINUOUS: 8,
  BACKUP: 24,
  INTERMITTENT: null,
};

export const SERVICE_LABEL: Record<Service, string> = {
  CONTINUOUS: "Kontinuální (do přepnutí)",
  BACKUP: "Záloha po výpadku ASU",
  INTERMITTENT: "Přerušovaný (kumulované hodiny)",
};

function siteTemps(siteId: string) {
  const s = getSite(siteId)!;
  return {
    TambDesign: s.thetaE - CLIMATE.hourlyOffsetK,
    TambMinSafety: s.thetaE - CLIMATE.safetyOffsetK,
    inversionK: s.inversionK ?? 0,
  };
}

export const DEFAULT_UI: UiState = {
  mode: "A",
  medium: "N2",
  flowUnit: "Nm3h",
  flow: 1000,
  orificeOn: false,
  orifice: 1500,
  siteId: "PRAHA",
  ...siteTemps("PRAHA"),
  TambSummer: 35,
  RH: 80,
  material: "P235GH",
  overrideOn: false,
  overrideT: -20,
  overrideReason: "",
  margin: 5,
  service: "CONTINUOUS",
  tEvent: 8,
  pLineUnit: "g",
  pLine: 10,
  pTank: 1.013,
  pipeMode: "DN",
  dn: "DN80",
  wall: 5.5,
  pipeID: 77.9,
  location: {
    preset: "FREE",
    extraRows: 0,
    drain: "FREE",
    phi: 0.5,
    gH: 0.2,
    rH: null,
  },
  series: "LEADVAP",
  profile: "AUTO",
  H: 6,
  N: 50,
  unitSource: "SIZED",
  csBeforeShutoff: false,
  trimHeater: false,
  project: "",
  processedBy: "",
  checkedBy: "",
};

export function presetForSite(siteId: string): Partial<UiState> {
  return { siteId, ...siteTemps(siteId) };
}

/** Line pressure [Pa a]. */
export function pLinePa(s: UiState): number {
  return s.pLineUnit === "g" ? bargToPa(s.pLine) : s.pLine * 1e5;
}

/** Convert the displayed pressure when the g/a toggle changes. */
export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  if (from === to) return value;
  const atm = P_ATM / 1e5;
  return to === "a" ? value + atm : value - atm;
}

export function convertFlow(value: number, from: FlowUnit, to: FlowUnit, medium: MediumId): number {
  if (from === to) return value;
  const rhoN = getFluid(medium).rhoN;
  return to === "kgh" ? value * rhoN : value / rhoN;
}

function toKgs(value: number, unit: FlowUnit, medium: MediumId): number {
  return unit === "Nm3h" ? nm3hToKgs(value, getFluid(medium).rhoN) : kghToKgs(value);
}

/** Pipe inner diameter [mm]. */
export function pipeIdMm(s: UiState): number {
  if (s.pipeMode === "ID") return s.pipeID;
  return Math.max(1, (DN_OD[s.dn] ?? 88.9) - 2 * s.wall);
}

const finite = (x: number, fallback: number) => (Number.isFinite(x) ? x : fallback);

export function toCase(s: UiState): SizingCase {
  const flow = Math.max(1e-6, finite(s.flow, 1));
  return {
    mode: s.mode,
    medium: s.medium,
    mDot: toKgs(flow, s.flowUnit, s.medium),
    mDotOrifice: s.orificeOn ? toKgs(Math.max(0, finite(s.orifice, 0)), s.flowUnit, s.medium) : null,
    TambDesign: cToK(finite(s.TambDesign, -15)),
    TambMinSafety: cToK(finite(s.TambMinSafety, -25)),
    TambSummer: cToK(finite(s.TambSummer, 35)),
    inversionK: Math.max(0, finite(s.inversionK, 0)),
    RH: Math.min(1, Math.max(0, finite(s.RH, 80) / 100)),
    material: s.material,
    TlimitOverride: s.overrideOn
      ? { T: cToK(finite(s.overrideT, -20)), reason: s.overrideReason }
      : null,
    margin: finite(s.margin, 5),
    tEvent: hToS(Math.max(0, finite(s.tEvent, 8))),
    pLine: Math.max(1, pLinePa(s)),
    pTank: Math.max(1, finite(s.pTank, 1.013) * 1e5),
    pipeID: Math.max(0.001, pipeIdMm(s) / 1000),
    location: s.location,
    series: s.series,
    finDiameter: s.profile === "AUTO" ? null : Number(s.profile.replace("F", "")) / 1000,
    H: Math.max(0.5, finite(s.H, 6)),
    N: Math.max(1, Math.round(finite(s.N, 1))),
    unitSource: s.unitSource,
    csBeforeShutoff: s.csBeforeShutoff,
    trimHeater: s.trimHeater,
    siteId: s.siteId || null,
  };
}
