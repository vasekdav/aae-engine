/**
 * Domain contracts for the AAE sizing core.
 * Everything inside the core is SI: K, Pa(a), kg/s, J/kg, W, m, s.
 * Unit conversion (°C, bar g/a, Nm³/h, h) happens only in the UI layer.
 */

export type MediumId = "N2" | "O2" | "Ar";

/** A — Dimenzování, B — Ověření, C — Bezpečnostní profil, D — Porovnání umístění. */
export type Mode = "A" | "B" | "C" | "D";

/** Computation state instead of NaN. */
export type Status =
  | "OK"
  | "UNREACHABLE"
  | "BREAKTHROUGH"
  | "OUT_OF_TABLE"
  | "EXTRAPOLATED"
  | "INVALID";

export type Level = "GO" | "WARNING" | "NOGO" | "INVALID";

export type ConstStatus =
  | "STANDARD"
  | "CATALOGUE"
  | "CALIBRATED"
  | "ASSUMED"
  | "OVERRIDE";

export type SeriesId = "LEADVAP" | "FAIRVAP";

export type Drain = "FREE" | "RESTRICTED" | "BLOCKED";

/** Value with a computation state; `value` is null unless the state allows a number. */
export interface Val {
  status: Status;
  value: number | null;
  note?: string;
}

export interface LocationInput {
  preset: string;
  /** Additional simultaneously running rows (battery presets). */
  extraRows: number;
  /** Cold-air drain at the foot of the unit. */
  drain: Drain;
  /** Parametric model (preset CUSTOM). */
  phi: number;
  gH: number;
  /** Roof clearance / unit height; null = no roof. */
  rH: number | null;
}

export interface SizingCase {
  mode: Mode;
  medium: MediumId;
  /** Design (peak) mass flow [kg/s]. */
  mDot: number;
  /** Orifice / fully open PCV limited max credible flow [kg/s]; null = not given. */
  mDotOrifice: number | null;
  /** Hourly design ambient minimum [K]. */
  TambDesign: number;
  /** 50-year / record minimum for the protection decision [K]. */
  TambMinSafety: number;
  /** Summer ambient for the warm-gas velocity check [K]. */
  TambSummer: number;
  /** Valley inversion surcharge subtracted from both ambient temperatures [K]. */
  inversionK: number;
  /** Relative humidity [0–1]. */
  RH: number;
  material: string;
  /** Overridden T_limit [K] with a written justification. */
  TlimitOverride: { T: number; reason: string } | null;
  /** Safety margin above T_limit [K]. */
  margin: number;
  /** Continuous run until defrost / switchover [s]. */
  tEvent: number;
  /** Line (vaporizer) pressure [Pa a]. */
  pLine: number;
  /** Tank pressure — liquid inlet state [Pa a]. */
  pTank: number;
  /** Gas line inner diameter [m]. */
  pipeID: number;
  location: LocationInput;
  series: SeriesId;
  /** Fin star diameter [m]; null = auto by flow. */
  finDiameter: number | null;
  /** Selected tube height [m]. */
  H: number;
  /** Installed tube count (mode B, or C/D with a given unit). */
  N: number;
  /** C/D: evaluate the unit sized in A, or the given N × H. */
  unitSource: "SIZED" | "GIVEN";
  /** Carbon steel between vaporizer and shutoff valve. */
  csBeforeShutoff: boolean;
  /** Electric trim heater downstream of the AAE is part of the design. */
  trimHeater: boolean;
  /** Climate site for the annual-hours estimate. */
  siteId: string | null;
}

export interface TraceStep {
  n: number;
  title: string;
  eq?: string;
  subst?: string;
  result: string;
  source?: string;
  tone?: "ok" | "warn" | "bad" | "info";
}

export type RuleId =
  | "R01"
  | "R02"
  | "R03"
  | "R04"
  | "R05"
  | "R06"
  | "R07"
  | "R08"
  | "R09"
  | "R10"
  | "O2"
  | "VEL"
  | "DATA";

export interface RuleResult {
  id: RuleId;
  group: "capacity" | "protection" | "layout" | "model" | "pipe";
  level: Level;
  /** Rule passed (true) or fired (false). */
  pass: boolean;
  title: string;
  detail: string;
}

export interface Corner {
  id: "NOM" | "WORST" | "BEST";
  fU: number;
  fLoc: number;
  dT: number;
}

export interface LocationResolved {
  presetId: string;
  label: string;
  /** Nominal heat-transfer factor [–]; null = outside the model (NO-GO). */
  fLoc: number | null;
  /** Nominal cold-air recirculation at the event time [K]. */
  dTRecirc: number | null;
  impact: "NONE" | "WARNING" | "NOGO";
  reason: string | null;
  /** Factors not covered by the preset table (parametric). */
  parametric: boolean;
}

export interface UnitGeom {
  N: number;
  H: number;
  /** Fin star diameter [m]. */
  finD: number;
  /** Fin area per metre of tube [m²/m]. */
  aFin: number;
  /** Total finned tube length [m]. */
  L: number;
}

export interface NxHRow {
  H: number;
  N: number;
  /** Real reserve after rounding, N·H / L_req − 1. */
  reserve: number;
  /** Worst-corner outlet temperature with this unit [K]. */
  ToutWorst: Val;
}

export interface SeriesPoint {
  x: number;
  y: number | null;
}

export interface ChartData {
  /** T_out [K] vs time [h], nominal + band. */
  time: {
    nominal: SeriesPoint[];
    worst: SeriesPoint[];
    best: SeriesPoint[];
    tOpMax: number | null;
  };
  /** T_out [K] vs T_amb [K]. */
  ambient: { nominal: SeriesPoint[]; worst: SeriesPoint[] };
  /** Tube count vs height. */
  nxh: NxHRow[];
  /** Temperature along the tube, x = length [m]. */
  along: {
    points: { L: number; T: number; zone: "liquid" | "boil" | "superheat" }[];
    breakthrough: boolean;
    Ltotal: number;
  } | null;
  /** C — T_out worst over T_amb × flow factor. */
  heatmap: {
    TambC: number[];
    qFactors: number[];
    cells: { T: number | null; level: Level; status: Status }[][];
  } | null;
}

export interface LocationRow {
  presetId: string;
  label: string;
  fLoc: number | null;
  dTRecirc: number | null;
  impact: "NONE" | "WARNING" | "NOGO";
  /** Worst-corner T_out of the reference unit at design conditions [K]. */
  ToutWorst: Val;
  /** Tube count needed at the selected H for this variant. */
  Nreq: number | null;
  level: Level;
}

export interface SizingResult {
  mode: Mode;
  medium: MediumId;
  status: Status;
  verdict: {
    level: Level;
    label: string;
    /** One sentence: which condition decided. */
    sentence: string;
  };
  capacity: { level: Level; label: string };
  protection: { ltpsRequired: boolean; label: string };
  rules: RuleResult[];
  /** Key temperatures [K]. */
  Tlimit: number;
  Ttarget: number;
  TambDesignEff: number;
  TambMinSafetyEff: number;
  TlimitOverridden: boolean;
  location: LocationResolved;
  /** Heat duty breakdown at the reference outlet temperature [W]. */
  duty: {
    Tout: number | null;
    total: number;
    liquid: number;
    boil: number;
    superheat: number;
  } | null;
  /** Required finned length [m] (A). */
  Lreq: Val;
  /** Required length / length of a unit sized by catalogue rating (+20 °C, 8 h, 15 K) for ṁ_design (A). */
  ratioVsCatalogue: number | null;
  unit: UnitGeom | null;
  nxh: NxHRow[];
  /** Equivalent catalogue rating of the unit, N₂ +20 °C 8 h 15 K [kg/s of N₂]. */
  catalogueN2: Val;
  /** Same unit at catalogue conditions in the actual medium [kg/s]. */
  catalogueMedium: Val;
  /** Independent check: workbook U·A·LMTD area / zone-model area at design. */
  workbookRatio: number | null;
  tout: { nominal: Val; worst: Val; r02: Val; wind1ms: Val };
  /** Uncertainty band rows: flow factor × corners [K]. */
  band: { qf: number; nominal: Val; worst: Val; best: Val }[];
  TambCrit: Val;
  hoursBelowCrit: number | null;
  /** B: max flow meeting R01 and R02 [kg/s]. */
  mDotMax: Val;
  heater: { required: boolean; Qdesign: number | null; QminSafety: number | null };
  velocity: {
    cold: { T: number; rho: number; v: number } | null;
    summer: { T: number; rho: number; v: number } | null;
    limit: number;
    o2: boolean;
  };
  ltps: {
    alarm: number;
    trip: number;
    items: string[];
  };
  psv: { minCapacity: number | null; note: string };
  iceMass: number | null;
  sitingChecks: string[];
  charts: ChartData;
  locations: LocationRow[] | null;
  trace: TraceStep[];
  intermediates: Record<string, number | null>;
}
