import { vLimO2 } from "@/lib/aae";
import {
  c,
  type ConstantSet,
  getMaterial,
  getSite,
  LOCATIONS,
  validateConstantSet,
} from "./constants";
import { fmt, fmtC, fmtValC, STATUS_LABEL } from "./format";
import {
  aFin as aFinOf,
  calibrate,
  type Calibration,
  finDiameterAuto,
  performanceFactor,
  sfRH as sfRHOf,
  sfTime,
  uAir,
  workbookSpecific,
} from "./model/air";
import { corners, resolveLocation } from "./model/location";
import { Tube } from "./model/zones";
import { type Fluid, getFluid } from "./props";
import { Trace } from "./trace";
import type {
  ChartData,
  Corner,
  Level,
  LocationInput,
  LocationResolved,
  LocationRow,
  NxHRow,
  RuleResult,
  SizingCase,
  SizingResult,
  Status,
  UnitGeom,
  Val,
} from "./types";
import {
  cToK,
  kgsToNm3h,
  kToC,
  paToBarg,
  sToH,
} from "./units";

type CornerId = Corner["id"];

const NXH_HEIGHTS = [3, 4, 5, 6, 7, 8];
const LEVEL_RANK: Record<Level, number> = { GO: 0, WARNING: 1, NOGO: 2, INVALID: 3 };
/** Among equally severe rules, the root cause names the verdict (R03 before its consequence R02). */
const DECISIVE_ORDER: RuleResult["id"][] = [
  "DATA", "R09", "R07", "R08", "R05", "R04", "R03", "R02", "R01", "VEL", "O2", "R06", "R10",
];

const valOk = (value: number, note?: string): Val => ({ status: "OK", value, note });
const valNo = (status: Status, note?: string): Val => ({ status, value: null, note });

interface Ctx {
  cs: SizingCase;
  set: ConstantSet;
  fluid: Fluid;
  cal: Calibration;
  location: LocationInput;
  tH: number;
  TambD: number;
  TambS: number;
  finD: number;
  aFin: number;
  sfRH: number;
  mDesign: number;
  mR02: number;
  Tlim: number;
  target: number;
  tubes: Map<string, Tube>;
}

interface AirPoint {
  Tair: number;
  uPrime: number;
  loc: LocationResolved;
  corner: Corner;
}

function tubeFor(ctx: Ctx, Tair: number): Tube {
  const key = Tair.toFixed(5);
  let t = ctx.tubes.get(key);
  if (!t) {
    t = new Tube(ctx.fluid, ctx.cs.pLine, ctx.cs.pTank, Tair);
    ctx.tubes.set(key, t);
  }
  return t;
}

/** Effective air temperature and conductance per metre U′ [W/(m·K)] at one corner. */
function airAt(
  ctx: Ctx,
  TambK: number,
  tH: number,
  cid: CornerId,
): AirPoint | null {
  const loc = resolveLocation(ctx.location, tH, ctx.set);
  const cs = corners(loc, ctx.set);
  if (!cs) return null;
  const k = cs[cid];
  const uPrime =
    (ctx.cal.C * uAir(TambK, ctx.set) * ctx.aFin * k.fLoc * k.fU) /
    (sfTime(tH, ctx.set) * ctx.sfRH);
  return { Tair: TambK - k.dT, uPrime, loc, corner: k };
}

function toutOf(
  ctx: Ctx,
  L: number,
  mDot: number,
  TambK: number,
  tH: number,
  cid: CornerId,
  uMult = 1,
): Val {
  const a = airAt(ctx, TambK, tH, cid);
  if (!a) return valNo("INVALID", "umístění mimo model");
  return tubeFor(ctx, a.Tair).toutAt((L * a.uPrime * uMult) / mDot);
}

function lengthOf(
  ctx: Ctx,
  Ttarget: number,
  mDot: number,
  TambK: number,
  tH: number,
  cid: CornerId,
): Val {
  const a = airAt(ctx, TambK, tH, cid);
  if (!a) return valNo("INVALID", "umístění mimo model");
  const lam = tubeFor(ctx, a.Tair).lambdaTo(Ttarget);
  if (lam.value === null) return lam;
  return valOk((mDot * lam.value) / a.uPrime);
}

interface Sizing {
  Lreq: Val;
  targetAAE: number;
  approach: number | null;
  r03pass: boolean;
  heaterIncluded: boolean;
  L1: Val;
  L2: Val;
  L15: Val;
}

function size(ctx: Ctx): Sizing {
  const a = airAt(ctx, ctx.TambD, ctx.tH, "WORST");
  if (!a) {
    const v = valNo("INVALID", "umístění mimo model");
    return {
      Lreq: v,
      targetAAE: ctx.target,
      approach: null,
      r03pass: false,
      heaterIncluded: ctx.cs.trimHeater,
      L1: v,
      L2: v,
      L15: v,
    };
  }
  const approach = a.Tair - ctx.target;
  const r03pass = approach >= c(ctx.set, "R03_MIN_APPROACH");
  const heaterIncluded = ctx.cs.trimHeater;
  const useLowTarget = heaterIncluded || !r03pass;
  const T15 = a.Tair - c(ctx.set, "CAL_APPROACH");
  const targetAAE = useLowTarget ? Math.min(ctx.target, T15) : ctx.target;
  const L1 = lengthOf(ctx, targetAAE, ctx.mDesign, ctx.TambD, ctx.tH, "WORST");
  const T2 = useLowTarget ? Math.min(ctx.Tlim, targetAAE) : ctx.Tlim;
  const L2 = lengthOf(ctx, T2, ctx.mR02, ctx.TambD, ctx.tH, "NOM");
  const L15 = lengthOf(ctx, T15, ctx.mDesign, ctx.TambD, ctx.tH, "WORST");
  let Lreq: Val;
  if (L1.value === null) Lreq = L1;
  else if (L2.value === null) Lreq = L2;
  else Lreq = valOk(Math.max(L1.value, L2.value));
  return { Lreq, targetAAE, approach, r03pass, heaterIncluded, L1, L2, L15 };
}

function unitOf(ctx: Ctx, N: number, H: number): UnitGeom {
  return { N, H, finD: ctx.finD, aFin: ctx.aFin, L: N * H };
}

function nxhTable(ctx: Ctx, Lreq: number): NxHRow[] {
  return NXH_HEIGHTS.map((H) => {
    const N = Math.max(1, Math.ceil(Lreq / H - 1e-9));
    return {
      H,
      N,
      reserve: (N * H) / Lreq - 1,
      ToutWorst: toutOf(ctx, N * H, ctx.mDesign, ctx.TambD, ctx.tH, "WORST"),
    };
  });
}

function hGas(ctx: Ctx, T: number): number | null {
  const v = ctx.fluid.vapor(T, ctx.cs.pLine);
  return v ? v.h : null;
}

/** Heater duty to lift gas from T_from to T_to at flow ṁ [W]. */
function heaterDuty(ctx: Ctx, mDot: number, Tfrom: Val, Tto: number): number | null {
  if (Tfrom.value === null) return null;
  if (Tfrom.value >= Tto) return 0;
  const h1 = hGas(ctx, Tfrom.value);
  const h2 = hGas(ctx, Tto);
  if (h1 === null || h2 === null) return null;
  return mDot * (h2 - h1);
}

/** Bisection for the ambient at which worst-corner T_out = target. */
function ambientCrit(ctx: Ctx, L: number): Val {
  const g = (TambK: number): number => {
    const v = toutOf(ctx, L, ctx.mDesign, TambK, ctx.tH, "WORST");
    return v.value === null ? -1e9 : v.value - ctx.target;
  };
  let lo = cToK(-60);
  let hi = cToK(50);
  if (g(hi) < 0) return valNo("UNREACHABLE", "ani při +50 °C nevyhoví");
  if (g(lo) >= 0) return valOk(lo, "vyhoví i při −60 °C");
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return valOk(hi);
}

/** Run time at which worst-corner T_out falls below the target [h]. */
function runTimeMax(ctx: Ctx, L: number): number | null {
  const g = (tH: number): number => {
    const v = toutOf(ctx, L, ctx.mDesign, ctx.TambD, tH, "WORST");
    return v.value === null ? -1e9 : v.value - ctx.target;
  };
  if (g(0) < 0) return 0;
  let lo = 0;
  let hi = 70;
  if (g(hi) >= 0) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) >= 0) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Catalogue-equivalent rating of a unit: medium, +20 °C, 8 h, approach 15 K [kg/s]. */
function catalogueRating(ctx: Ctx, fluid: Fluid, L: number): Val {
  const set = ctx.set;
  const pRef = ctx.cal.pRef;
  const Tair = cToK(c(set, "CAL_T_AMB"));
  const tube = new Tube(fluid, pRef, pRef, Tair);
  const lam = tube.lambdaTo(Tair - c(set, "CAL_APPROACH"));
  if (lam.value === null) return lam;
  const uPrime =
    (ctx.cal.C * uAir(Tair, set) * ctx.aFin) / sfTime(c(set, "CAL_T_H"), set);
  return valOk((L * uPrime) / lam.value);
}

function worstLevel(levels: Level[]): Level {
  return levels.reduce<Level>(
    (w, l) => (LEVEL_RANK[l] > LEVEL_RANK[w] ? l : w),
    "GO",
  );
}

const LEVEL_LABEL: Record<Level, string> = {
  GO: "GO",
  WARNING: "WARNING",
  NOGO: "NO-GO",
  INVALID: "NEPLATNÉ",
};

/**
 * Pure core: case + constant set + property table → result.
 * No I/O, randomness or clock; the same code runs in the browser and in tests.
 */
export function solve(
  cs: SizingCase,
  set: ConstantSet,
  fluid: Fluid,
): SizingResult {
  const tr = new Trace();
  const rules: RuleResult[] = [];
  const material = getMaterial(cs.material);
  const tH = sToH(cs.tEvent);
  const series = set.series[cs.series];
  const conflicts = validateConstantSet(set);
  const cal = calibrate(set);

  const margin = Math.max(cs.margin, c(set, "MARGIN_MIN"));
  const overridden = cs.TlimitOverride !== null;
  const Tlim = overridden ? cs.TlimitOverride!.T : cToK(material.Tlimit_C);
  const target = Tlim + margin;
  const TambD = cs.TambDesign - cs.inversionK;
  const TambS = cs.TambMinSafety - cs.inversionK;
  const qN = kgsToNm3h(cs.mDot, fluid.rhoN);
  const finD = cs.finDiameter ?? finDiameterAuto(qN);
  const aFin = aFinOf(finD, set);
  const sfRH = sfRHOf(cs.RH, set);
  const mOr = cs.mDotOrifice ?? 0;
  const mDesign = Math.max(cs.mDot, mOr);
  const mR02 = Math.max(c(set, "Q_R02_FACTOR") * cs.mDot, mOr);

  const ctx: Ctx = {
    cs,
    set,
    fluid,
    cal,
    location: cs.location,
    tH,
    TambD,
    TambS,
    finD,
    aFin,
    sfRH,
    mDesign,
    mR02,
    Tlim,
    target,
    tubes: new Map(),
  };

  // ---- 1. Data and inputs -------------------------------------------------
  tr.add(
    "Sada konstant a tabulky vlastností",
    conflicts.length ? `NEPLATNÁ: ${conflicts.join("; ")}` : `OK (v${set.version})`,
    {
      eq: "každý jev smí pokrývat nejvýše jeden faktor",
      source: `${fluid.t.source}, tabulka v${fluid.t.version}`,
      tone: conflicts.length ? "bad" : "ok",
    },
  );
  const satLine = fluid.satP(cs.pLine);
  const satTank = fluid.satP(cs.pTank);
  tr.add(
    "Stav kapaliny a tlak odpařovače",
    satLine && satTank
      ? `T_sat(p_potrubí) = ${fmtC(satLine.T)} · T_in = T_sat(p_zásobník) = ${fmtC(satTank.T)} · h_fg = ${fmt((satLine.hv - satLine.hl) / 1000)} kJ/kg`
      : STATUS_LABEL.OUT_OF_TABLE,
    {
      eq: "T_sat(p), h_l, h_v z tabulky; vstup = nasycená kapalina při tlaku zásobníku",
      subst: `p_potrubí = ${fmt(cs.pLine / 1e5, 3)} bar(a) · p_zásobník = ${fmt(cs.pTank / 1e5, 3)} bar(a)`,
      source: "CoolProp (HEOS)",
      tone: satLine && satTank ? "ok" : "bad",
    },
  );
  tr.add(
    "Návrhový průtok",
    `ṁ_design = ${fmt(mDesign, 4)} kg/s (${fmt(kgsToNm3h(mDesign, fluid.rhoN), 0)} Nm³/h) · ṁ_R02 = ${fmt(mR02, 4)} kg/s`,
    {
      eq: "ṁ_design = max(ṁ_špička; ṁ_clona) · ṁ_R02 = max(1,2·ṁ_špička; ṁ_clona)",
      subst: `ṁ_špička = ${fmt(cs.mDot, 4)} kg/s · ṁ_clona = ${cs.mDotOrifice === null ? "nezadáno" : fmt(cs.mDotOrifice, 4) + " kg/s"} · ρ_N = ${fmt(fluid.rhoN, 4)} kg/m³`,
      source: "Podklad — Návrhový základ; CGA P-56 / EIGA Doc 133",
    },
  );
  tr.add(
    "Teplotní limit a cíl",
    `T_limit = ${fmtC(Tlim)} · cíl T_limit + rezerva = ${fmtC(target)}${overridden ? " · PŘEPSÁNO" : ""}`,
    {
      eq: "T_cíl = T_limit + rezerva (rezerva ≥ 3 K)",
      subst: overridden
        ? `přepsáno uživatelem: „${cs.TlimitOverride!.reason || "bez zdůvodnění"}“`
        : `${material.label}: ${material.Tlimit_C} °C (${material.note}) · rezerva ${fmt(margin)} K`,
      source: overridden ? "OVERRIDE" : `Knihovna materiálů — ${material.status}`,
      tone: overridden ? "warn" : "info",
    },
  );
  tr.add(
    "Teploty okolí",
    `T_amb,design = ${fmtC(TambD)} · T_amb,min,bezp = ${fmtC(TambS)}`,
    {
      eq: "T_amb,eff = T_amb − inverzní přirážka",
      subst: `${fmtC(cs.TambDesign)} − ${fmt(cs.inversionK)} K · ${fmtC(cs.TambMinSafety)} − ${fmt(cs.inversionK)} K`,
      source: "Uživatel / klimatická předvolba (ASSUMED)",
    },
  );

  // ---- 2. Air side ----------------------------------------------------------
  const loc = resolveLocation(cs.location, tH, set);
  const cn = corners(loc, set);
  tr.add(
    "Umístění",
    loc.fLoc === null
      ? `${loc.label}: MIMO MODEL — ${loc.reason}`
      : `f_loc = ${fmt(loc.fLoc, 2)} · ΔT_recirc(${fmt(tH, 1)} h) = ${fmt(loc.dTRecirc, 1)} K`,
    {
      eq: loc.parametric
        ? "ΔT_recirc = ΔT_max·√(t/8)·(1 − φ)·k_D · f_loc = min(1; 0,6 + 2·g/H)·min(1; 0,7 + 0,6·r/H)"
        : "předvolba: f_loc, ΔT_recirc(8 h); roste ∝ √(t/8) u uzavřených dispozic",
      subst: loc.parametric
        ? `φ = ${fmt(cs.location.phi, 2)} · g/H = ${fmt(cs.location.gH, 2)} · r/H = ${cs.location.rH === null ? "bez střechy" : fmt(cs.location.rH, 2)} · odtok ${cs.location.drain}`
        : `${loc.label}; další řady ${cs.location.extraRows}; odtok ${cs.location.drain}`,
      source: `${LOCATIONS.source} (${LOCATIONS.status})`,
      tone: loc.impact === "NOGO" ? "bad" : loc.impact === "WARNING" ? "warn" : "info",
    },
  );
  const U = uAir(TambD, set);
  const pf = performanceFactor(tH, set);
  const sft = sfTime(tH, set);
  tr.add(
    "Přestup tepla na straně vzduchu",
    `U = ${fmt(U, 2)} W/(m²·K) · a_fin = ${fmt(aFin, 3)} m²/m · SF = ${fmt(sft, 3)} · SF_RH = ${fmt(sfRH, 3)}`,
    {
      eq: "U = max(4; U_base·(1 + k·T_amb)) · a_fin = 12·2·(Ø/2 − r)·η · PF(t) = a·e^(b·t) + c · SF = max(1; 1/PF)",
      subst: `T_amb = ${fmt(kToC(TambD))} °C · Ø = ${fmt(finD * 1000, 0)} mm${cs.finDiameter === null ? " (auto dle průtoku)" : ""} · PF(${fmt(tH, 1)} h) = ${fmt(pf, 3)} · RH = ${fmt(cs.RH * 100, 0)} %`,
      source: "Kalibrace L40 — MODEL C5–C10, NAVRH C52–C60 (CALIBRATED)",
    },
  );
  tr.add(
    "Kalibrace zónového modelu na L40",
    `C = ${fmt(cal.C, 4)}`,
    {
      eq: "C = Λ_zóny(ref) / (Δh/LMTD)_sešit(ref); ref = N₂, +20 °C, 8 h, přístup 15 K",
      subst: `Λ_ref = ${fmt(cal.lamRef, 0)} J/(kg·K) · (Δh/LMTD)_sešit = ${fmt(cal.wbRef, 0)} J/(kg·K) · p_ref = ${fmt(cal.pRef / 1e5, 2)} bar(a)`,
      source: "Zónový model ukotven na plochu kalibrovaného sešitu v katalogovém bodě",
    },
  );
  const aNom = airAt(ctx, TambD, tH, "NOM");
  const aWorst = airAt(ctx, TambD, tH, "WORST");
  if (aNom && aWorst && cn) {
    tr.add(
      "Efektivní vzduch a vodivost na metr trubky",
      `nominál: T_air,eff = ${fmtC(aNom.Tair)}, U′ = ${fmt(aNom.uPrime, 2)} W/(m·K) · nejhorší roh: ${fmtC(aWorst.Tair)}, U′ = ${fmt(aWorst.uPrime, 2)} W/(m·K)`,
      {
        eq: "T_air,eff = T_amb − ΔT_recirc · U′ = C·U·a_fin·f_loc·f_U / (SF·SF_RH)",
        subst: `roh: f_U = ${fmt(cn.WORST.fU, 2)}, f_loc = ${fmt(cn.WORST.fLoc, 2)}, ΔT_recirc = ${fmt(cn.WORST.dT, 1)} K`,
        source: "Nejistota: U ±10 %, f_loc ±0,05, ΔT_recirc ±50 % (ASSUMED)",
      },
    );
  }

  // ---- 3. Sizing / unit -----------------------------------------------------
  const sizedNeeded =
    cs.mode === "A" || ((cs.mode === "C" || cs.mode === "D") && cs.unitSource === "SIZED");
  const sz = size(ctx);
  let unit: UnitGeom | null = null;
  let nxh: NxHRow[] = [];
  let ratio15: number | null = null; // L_req / length of a catalogue-sized unit
  if (sizedNeeded) {
    if (sz.Lreq.value !== null) {
      const N = Math.max(1, Math.ceil(sz.Lreq.value / cs.H - 1e-9));
      unit = unitOf(ctx, N, cs.H);
      nxh = nxhTable(ctx, sz.Lreq.value);
      const cat1 = catalogueRating(ctx, fluid, 1);
      if (cat1.value !== null) ratio15 = sz.Lreq.value / (mDesign / cat1.value);
    }
    tr.add(
      "Potřebná délka žebrované trubky",
      sz.Lreq.value === null
        ? `${STATUS_LABEL[sz.Lreq.status]}${sz.Lreq.note ? ` — ${sz.Lreq.note}` : ""}`
        : `L_req = ${fmt(sz.Lreq.value, 1)} m → ${unit!.N} × ${fmt(cs.H, 1)} m`,
      {
        eq: "L = ṁ·Λ(T_cíl)/U′, Λ = ∫ dh/(T_air,eff − T) přes ohřev kapaliny, var a přehřátí; L_req = max(L_R01; L_R02)",
        subst: `L_R01 (ṁ_design, roh, cíl ${fmtC(sz.targetAAE)}) = ${fmt(sz.L1.value, 1)} m · L_R02 (ṁ_R02, nominál) = ${fmt(sz.L2.value, 1)} m${sz.heaterIncluded || !sz.r03pass ? " · AAE dimenzován na přístup 15 K, zbytek dohřívač" : ""}`,
        source: "Zónový model (tato aplikace)",
        tone: sz.Lreq.value === null ? "bad" : "ok",
      },
    );
  } else {
    unit = unitOf(ctx, Math.max(1, Math.round(cs.N)), cs.H);
    tr.add("Zadaná jednotka", `${unit.N} × ${fmt(unit.H, 1)} m = ${fmt(unit.L, 1)} m trubky`, {
      eq: "L = N·H",
      subst: `profil Ø${fmt(finD * 1000, 0)} mm, a_fin = ${fmt(aFin, 3)} m²/m`,
    });
  }

  // ---- 4. Evaluate the unit ------------------------------------------------
  const L = unit?.L ?? null;
  const none = valNo("INVALID", "bez jednotky");
  const ToutNom = L !== null ? toutOf(ctx, L, mDesign, TambD, tH, "NOM") : none;
  const ToutWorst = L !== null ? toutOf(ctx, L, mDesign, TambD, tH, "WORST") : none;
  const ToutR02 = L !== null ? toutOf(ctx, L, mR02, TambD, tH, "NOM") : none;
  const ToutWind =
    L !== null
      ? toutOf(ctx, L, mDesign, TambD, tH, "WORST", 1 + c(set, "WIND_SENS"))
      : none;
  tr.add(
    "Výstupní teplota na konci doby provozu",
    `nominál ${fmtValC(ToutNom)} · nejhorší roh ${fmtValC(ToutWorst)} · 1,2·Q ${fmtValC(ToutR02)}`,
    {
      eq: "Λ_k dispozici = L·U′/ṁ → T_out z integrálu Λ(T); Λ < Λ_var → průnik kapaliny",
      subst: `L = ${fmt(L, 1)} m · t = ${fmt(tH, 1)} h · T_amb = ${fmtC(TambD)}`,
      source: "Zónový model",
      tone:
        ToutWorst.value === null
          ? "bad"
          : ToutWorst.value < target
            ? "warn"
            : "ok",
    },
  );

  const band = [0.8, 1, 1.2].map((qf) => ({
    qf,
    nominal: L !== null ? toutOf(ctx, L, mDesign * qf, TambD, tH, "NOM") : none,
    worst: L !== null ? toutOf(ctx, L, mDesign * qf, TambD, tH, "WORST") : none,
    best: L !== null ? toutOf(ctx, L, mDesign * qf, TambD, tH, "BEST") : none,
  }));

  // Duty breakdown at the reference outlet temperature.
  const tubeNom = aNom ? tubeFor(ctx, aNom.Tair) : null;
  const Tref = sizedNeeded ? sz.targetAAE : (ToutNom.value ?? target);
  let duty: SizingResult["duty"] = null;
  if (tubeNom && tubeNom.ok) {
    const hOut = hGas(ctx, Tref);
    if (hOut !== null) {
      const liquid = mDesign * Math.max(0, tubeNom.hl - tubeNom.hIn);
      const boil = mDesign * (tubeNom.hv - Math.max(tubeNom.hIn, tubeNom.hl));
      const superheat = mDesign * Math.max(0, hOut - tubeNom.hv);
      duty = { Tout: Tref, total: liquid + boil + superheat, liquid, boil, superheat };
      tr.add(
        "Výkon odpařovače",
        `Q̇ = ${fmt(duty.total / 1000)} kW (ohřev kapaliny ${fmt(liquid / 1000)} · var ${fmt(boil / 1000)} · přehřátí ${fmt(superheat / 1000)} kW)`,
        {
          eq: "Q̇ = ṁ·[h(T_out, p) − h_l(T_sat(p_zásobník))]",
          subst: `ṁ = ${fmt(mDesign, 4)} kg/s · T_out = ${fmtC(Tref)}`,
          source: "CoolProp entalpie",
        },
      );
    }
  }

  // ---- 5. Heater, ambient limit, catalogue --------------------------------
  const ToutWorstSafety =
    L !== null ? toutOf(ctx, L, mDesign, TambS, tH, "WORST") : none;
  const qDesign = heaterDuty(ctx, mDesign, ToutWorst, target);
  const qR02 = heaterDuty(ctx, mR02, ToutR02, Tlim);
  const qHeaterDesign =
    qDesign === null && qR02 === null ? null : Math.max(qDesign ?? 0, qR02 ?? 0);
  const qHeaterSafety = heaterDuty(ctx, mDesign, ToutWorstSafety, target);
  const heaterRequired = sz.heaterIncluded || !sz.r03pass || (qHeaterDesign ?? 0) > 0;

  const TambCrit = L !== null ? ambientCrit(ctx, L) : none;
  const site = getSite(cs.siteId);
  const hoursBelowCrit =
    site && TambCrit.value !== null
      ? 8760 *
        phi((kToC(TambCrit.value) - site.mean) / c(set, "AMBIENT_HOURS_SIGMA"))
      : null;
  tr.add(
    "Kritická teplota okolí",
    TambCrit.value === null
      ? STATUS_LABEL[TambCrit.status]
      : `T_amb,crit = ${fmtC(TambCrit.value)}${hoursBelowCrit !== null ? ` · odhad ${fmt(hoursBelowCrit, 0)} h/rok pod ní (${site!.label})` : ""}`,
    {
      eq: "T_out(ṁ_design, t, T_amb,crit, roh) = T_limit + rezerva (bisekce) · hodiny = 8760·Φ((T − μ)/σ)",
      source: "Hodiny: normální rozdělení, σ = 8 K (ASSUMED, řádový odhad)",
    },
  );
  tr.add(
    "Dohřívač",
    heaterRequired
      ? `Q_trim = ${fmt((qHeaterDesign ?? 0) / 1000)} kW (návrh) · ${fmt((qHeaterSafety ?? 0) / 1000)} kW (T_amb,min,bezp)`
      : "nepotřebný při návrhových podmínkách",
    {
      eq: "Q_trim = ṁ·[h(T_limit + rezerva) − h(T_out,AAE)]",
      subst: `T_out,AAE = ${fmtValC(ToutWorst)} (návrh) · ${fmtValC(ToutWorstSafety)} (min. bezp.)`,
      source: "Podklad — Výstupy bezpečnostní části",
      tone: heaterRequired ? "warn" : "ok",
    },
  );

  const catN2 = L !== null ? catalogueRating(ctx, getN2(fluid), L) : none;
  const catMed = L !== null ? catalogueRating(ctx, fluid, L) : none;
  let workbookRatio: number | null = null;
  if (aNom && tubeNom?.ok) {
    const Tchk = ToutNom.value ?? target;
    const wb = workbookSpecific(cs.medium, cs.pLine, aNom.Tair, Tchk);
    const lam = tubeNom.lambdaTo(Tchk).value;
    if (wb !== null && lam !== null) workbookRatio = wb / (cal.C * lam);
  }
  tr.add(
    "Katalogový ekvivalent a nezávislá kontrola",
    `${fmt(catN2.value !== null ? kgsToNm3h(catN2.value, getN2(fluid).rhoN) : null, 0)} Nm³/h N₂ (+20 °C, 8 h, přístup 15 K) · sešit/zóny = ${fmt(workbookRatio, 2)}`,
    {
      eq: "ṁ_kat = L·U′_ref/Λ_ref · poměr = (Δh/LMTD)_sešit / (C·Λ_zóny) při návrhových podmínkách",
      source: "Výběr typu L40 / FairVap podle katalogového výkonu ≥ tohoto",
    },
  );

  // ---- 6. Velocities --------------------------------------------------------
  const area = (Math.PI / 4) * cs.pipeID * cs.pipeID;
  const vel = (T: number | null) => {
    if (T === null) return null;
    const v = fluid.vapor(T, cs.pLine);
    if (!v) return null;
    return { T, rho: v.rho, v: mDesign / (v.rho * area) };
  };
  const Tcold = heaterRequired && ToutWorst.value !== null ? Math.max(ToutWorst.value, target) : ToutWorst.value;
  const velCold = vel(Tcold);
  const velSummer = vel(cs.TambSummer);
  const o2 = cs.medium === "O2";
  const vLimit = o2 ? vLimO2(paToBarg(cs.pLine)) : c(set, "V_INERT");
  tr.add(
    "Rychlost plynu v potrubí",
    `za studena ${fmt(velCold?.v)} m/s · v létě ${fmt(velSummer?.v)} m/s · limit ${fmt(vLimit)} m/s`,
    {
      eq: "v = ṁ/(ρ(T, p)·π·D²/4)",
      subst: `D = ${fmt(cs.pipeID * 1000, 1)} mm · ρ_studený = ${fmt(velCold?.rho, 2)} · ρ_léto = ${fmt(velSummer?.rho, 2)} kg/m³`,
      source: o2
        ? "EIGA Doc 13 / CGA G-4.4 — impingement křivka (konzervativně)"
        : "Orientační limit inertů 20 m/s",
    },
  );

  // ---- 7. Rules ---------------------------------------------------------------
  const tTxt = `${fmt(tH, 1)} h`;
  const cornerTxt = cn
    ? `U −${fmt(c(set, "UNC_U") * 100, 0)} %, f_loc ${fmt(cn.WORST.fLoc, 2)}, ΔT_recirc ${fmt(cn.WORST.dT, 1)} K`
    : "";
  const heaterOn = sz.heaterIncluded;

  // R01
  {
    const ok = ToutWorst.value !== null && (heaterOn || ToutWorst.value >= target);
    rules.push({
      id: "R01",
      group: "capacity",
      level: ok ? "GO" : "WARNING",
      pass: ok,
      title: "Kapacita při návrhu s rezervou",
      detail: `T_amb ${fmtC(TambD, 0)}, ${tTxt}, ${cornerTxt} → T_out ${fmtValC(ToutWorst)}${heaterOn && ToutWorst.value !== null && ToutWorst.value < target ? ` → dohřívač na ${fmtC(target)}` : ""} (požadavek ≥ ${fmtC(target)})`,
    });
  }
  // R02
  {
    const ok = ToutR02.value !== null && (heaterOn || ToutR02.value >= Tlim);
    rules.push({
      id: "R02",
      group: "capacity",
      level: ok ? "GO" : "NOGO",
      pass: ok,
      title: "Rezerva na kapacitě (1,2·Q nebo clona)",
      detail: `ṁ_R02 = ${fmt(kgsToNm3h(mR02, fluid.rhoN), 0)} Nm³/h → T_out ${fmtValC(ToutR02)} (požadavek ≥ ${fmtC(Tlim)})${ok ? "" : " — KAPACITA NEDOSTATEČNÁ"}`,
    });
  }
  // R03
  {
    const ok = sz.r03pass;
    rules.push({
      id: "R03",
      group: "capacity",
      level: ok || heaterOn ? "GO" : "NOGO",
      pass: ok,
      title: "Fyzikální proveditelnost AAE samotného",
      detail:
        sz.approach === null
          ? "nelze posoudit — umístění mimo model"
          : `T_air,eff (roh) − (T_limit + rezerva) = ${fmt(sz.approach, 1)} K ${ok ? "≥" : "<"} ${fmt(c(set, "R03_MIN_APPROACH"), 0)} K${ok ? "" : heaterOn ? ` → dohřívač ${fmt((qHeaterDesign ?? 0) / 1000)} kW zapracován` : ` → AAE samotný nestačí, dohřívač Q_trim ≈ ${fmt((qHeaterDesign ?? 0) / 1000)} kW`}`,
    });
  }
  // R04
  {
    const bt =
      ToutWorst.status === "BREAKTHROUGH" || ToutR02.status === "BREAKTHROUGH";
    rules.push({
      id: "R04",
      group: "capacity",
      level: bt ? "NOGO" : "GO",
      pass: !bt,
      title: "Průnik kapaliny na výstup",
      detail: bt
        ? `kapalina dosáhne výstupu (${ToutWorst.status === "BREAKTHROUGH" ? `Q_design: ${ToutWorst.note}` : `Q_R02: ${ToutR02.note}`})`
        : "plyn na výstupu při Q_design i Q_R02",
    });
  }
  // R05
  {
    const pg = paToBarg(cs.pLine);
    const ok = pg <= series.PS_barg;
    rules.push({
      id: "R05",
      group: "capacity",
      level: ok ? "GO" : "NOGO",
      pass: ok,
      title: "Tlak vs. PS řady",
      detail: `p = ${fmt(pg, 1)} bar(g) ${ok ? "≤" : ">"} PS ${series.label} ${fmt(series.PS_barg, 0)} bar`,
    });
  }
  // R06
  {
    const ex: string[] = [];
    if (tH > series.tValid_h) ex.push(`t ${fmt(tH, 1)} h > ${series.tValid_h} h (${series.label})`);
    const tdC = kToC(TambD);
    if (tdC < c(set, "T_AMB_VALID_MIN") || tdC > c(set, "T_AMB_VALID_MAX"))
      ex.push(`T_amb ${fmt(tdC, 1)} °C mimo −30…+50 °C`);
    if (loc.parametric) ex.push("neověřené faktory umístění (parametrický model)");
    if (!series.calibrated) ex.push(`profil mimo L40 (${series.label})`);
    rules.push({
      id: "R06",
      group: "model",
      level: ex.length ? "WARNING" : "GO",
      pass: ex.length === 0,
      title: "Rozsah platnosti modelu",
      detail: ex.length ? `extrapolace: ${ex.join("; ")} — max. WARNING` : "v rozsahu kalibrace",
    });
  }
  // R07
  {
    const level: Level =
      loc.impact === "NOGO" ? "NOGO" : loc.impact === "WARNING" ? "WARNING" : "GO";
    rules.push({
      id: "R07",
      group: "layout",
      level,
      pass: level === "GO",
      title: "Dispozice umístění",
      detail: loc.reason ? `${loc.label}: ${loc.reason}` : `${loc.label} — bez omezení`,
    });
  }
  // R08
  rules.push({
    id: "R08",
    group: "protection",
    level: cs.csBeforeShutoff ? "NOGO" : "GO",
    pass: !cs.csBeforeShutoff,
    title: "CS mezi odpařovačem a uzávěrem",
    detail: cs.csBeforeShutoff
      ? "uhlíková ocel před uzávěrem LTPS — nepřípustné"
      : "TE a uzávěr na nerezu, CS až za uzávěrem",
  });
  // R09
  {
    const noReason = overridden && cs.TlimitOverride!.reason.trim().length < 5;
    rules.push({
      id: "R09",
      group: "model",
      level: noReason ? "INVALID" : "GO",
      pass: !noReason,
      title: "Přepsání T_limit",
      detail: !overridden
        ? `T_limit z knihovny materiálů (${material.label})`
        : noReason
          ? "T_limit přepsán bez písemného zdůvodnění — výpočet NEPLATNÝ"
          : `PŘEPSÁNO: ${fmtC(Tlim)} — „${cs.TlimitOverride!.reason.trim()}“`,
    });
  }
  // R10
  const ltpsRequired =
    material.lowTempSensitive && Tlim > TambS - c(set, "R10_OFFSET");
  rules.push({
    id: "R10",
    group: "protection",
    level: "GO",
    pass: !ltpsRequired,
    title: "Ochrana nízkoteplotní pojistkou (LTPS)",
    detail: ltpsRequired
      ? `T_limit ${fmtC(Tlim)} > T_amb,min,bezp ${fmtC(TambS)} − 5 K → LTPS POVINNÁ (min. TE + SO, latch dle MS-79511)`
      : material.lowTempSensitive
        ? `T_limit ${fmtC(Tlim)} ≤ T_amb,min,bezp − 5 K — LTPS podle materiálu nevyžadována (ověřit všechny navazující komponenty)`
        : `${material.label} — LTPS podle materiálu nevyžadována (ověřit všechny navazující komponenty)`,
  });
  // O₂ advisory
  if (o2) {
    const Tsys = Tcold;
    const bad = Tsys !== null && Tsys < cToK(c(set, "O2_ADVISORY"));
    rules.push({
      id: "O2",
      group: "pipe",
      level: bad ? "WARNING" : "GO",
      pass: !bad,
      title: "O₂ advisory výstupní teploty",
      detail: `T_out ${fmtC(Tsys)} ${bad ? "<" : "≥"} ${fmt(c(set, "O2_ADVISORY"), 0)} °C · čistota dle EIGA Doc 33, žádný asfalt pod LOX`,
    });
  }
  // Velocity
  {
    const v = velSummer?.v ?? null;
    const over = v !== null && v > vLimit;
    const near = v !== null && v > 0.9 * vLimit;
    rules.push({
      id: "VEL",
      group: "pipe",
      level: over ? (o2 ? "NOGO" : "WARNING") : near ? "WARNING" : "GO",
      pass: !near,
      title: "Rychlost plynu v potrubí",
      detail: `v_léto ${fmt(v)} m/s · v_studený ${fmt(velCold?.v ?? null)} m/s · limit ${fmt(vLimit)} m/s${o2 ? " (O₂ impingement)" : ""}`,
    });
  }
  // Data
  {
    const outOfTable = !satLine || !satTank;
    const bad = conflicts.length > 0 || outOfTable;
    rules.push({
      id: "DATA",
      group: "model",
      level: bad ? "INVALID" : "GO",
      pass: !bad,
      title: "Data a stavy výpočtu",
      detail: conflicts.length
        ? `dvojí započtení: ${conflicts.join("; ")}`
        : outOfTable
          ? "tlak mimo tabulku vlastností (OUT_OF_TABLE) — nadkritický nebo < 0,9 bar(a)"
          : "tabulky i sada konstant platné",
    });
  }

  // ---- 8. Verdict -------------------------------------------------------------
  let level = worstLevel(rules.map((r) => r.level));
  const r06 = rules.find((r) => r.id === "R06")!;
  if (level === "GO" && !r06.pass) level = "WARNING";
  const fired = rules
    .filter((r) => r.level !== "GO")
    .sort(
      (a, b) =>
        LEVEL_RANK[b.level] - LEVEL_RANK[a.level] ||
        DECISIVE_ORDER.indexOf(a.id) - DECISIVE_ORDER.indexOf(b.id),
    );
  const decisive = fired[0];
  const sentence = decisive
    ? `${decisive.id} — ${decisive.title}: ${decisive.detail}`
    : `Rozhodlo R01: ${rules[0].detail}`;

  const r = (id: string) => rules.find((x) => x.id === id)!;
  let capLevel: Level = worstLevel(["R01", "R02", "R03", "R04"].map((id) => r(id).level));
  let capLabel: string;
  if (!r("R04").pass) capLabel = "PRŮNIK KAPALINY";
  else if (!r("R03").pass && !heaterOn) capLabel = "AAE SAMOTNÝ NESTAČÍ — DOHŘÍVAČ";
  else if (!r("R02").pass) capLabel = "KAPACITA NEDOSTATEČNÁ";
  else if (!r("R01").pass) capLabel = "KAPACITA BEZ REZERVY";
  else capLabel = heaterOn && heaterRequired ? "KAPACITA OK (AAE + DOHŘÍVAČ)" : "KAPACITA OK";
  if (L === null) {
    capLevel = loc.impact === "NOGO" ? "NOGO" : "INVALID";
    capLabel = "NELZE POSOUDIT";
  }

  // ---- 9. Protection, PSV, ice, siting -----------------------------------
  const alarm = Tlim + c(set, "LTPS_ALARM");
  const trip = Tlim + c(set, "LTPS_TRIP");
  const ltpsItems = [
    `TE na výstupu odpařovače na nerezovém úseku; alarm ${fmtC(alarm)} (T_limit + 10 K), vypnutí ${fmtC(trip)} (T_limit + 5 K) — návrh k potvrzení`,
    "Automatický uzávěr (SO) na nerezu; poloha při poruše: ZAVŘENO (fail-closed); latch s ručním resetem",
    "Doba zavření uzávěru a min. délka nerezového úseku před CS: k určení dle MS-79511 (dopravní zpoždění TE + doba zavření)",
    "CS potrubí začíná až za uzávěrem; LTPS zůstává povinná i s dohřívačem (výpadek napájení)",
  ];
  const psvBase = Math.max(catMed.value ?? 0, mDesign);
  const psv = {
    minCapacity: L !== null ? c(set, "PSV_FACTOR") * psvBase : null,
    note: "PSV ≥ 1,5 × nominální výkon odpařovače (LeadVap §6) + tepelná pojistka mezi armaturami",
  };
  const iceMass =
    duty !== null
      ? (c(set, "ICE_SHARE") * cs.RH * duty.total * cs.tEvent) / c(set, "L_SUBLIMATION")
      : null;
  const spacing = cs.H >= 5 ? 2 : 1;
  const sitingChecks = [
    `Rozestupy (LeadVap §7): min. ${spacing} m mezi jednotkami a od budov (H = ${fmt(cs.H, 1)} m); vstupní strana kapaliny ke slunci`,
    "Základ min. 0,3 m nad terénem, resp. nad 50letou výškou sněhu — sníh u paty blokuje odtok studeného vzduchu",
    `Námraza po ${fmt(tH, 0)} h řádově ${fmt(iceMass, 0)} kg (odhad) — vymezit zónu padajícího ledu`,
    "Mlha z odpařovače u komunikací — posoudit viditelnost",
  ];
  if (o2) {
    sitingChecks.push(
      "O₂: odstupové vzdálenosti dle EIGA Doc 115; žádný asfalt pod LOX zařízením; čistota dle EIGA Doc 33",
    );
  }

  // ---- 10. Charts -------------------------------------------------------------
  const charts: ChartData = {
    time: { nominal: [], worst: [], best: [], tOpMax: null },
    ambient: { nominal: [], worst: [] },
    nxh,
    along: null,
    heatmap: null,
  };
  if (L !== null) {
    const y = (v: Val) => v.value;
    for (let t = 0; t <= 16 + 1e-9; t += 0.5) {
      charts.time.nominal.push({ x: t, y: y(toutOf(ctx, L, mDesign, TambD, t, "NOM")) });
      charts.time.worst.push({ x: t, y: y(toutOf(ctx, L, mDesign * 1.2, TambD, t, "WORST")) });
      charts.time.best.push({ x: t, y: y(toutOf(ctx, L, mDesign * 0.8, TambD, t, "BEST")) });
    }
    charts.time.tOpMax = runTimeMax(ctx, L);
    for (let tc = -30; tc <= 40 + 1e-9; tc += 2.5) {
      const Tk = cToK(tc);
      charts.ambient.nominal.push({ x: Tk, y: y(toutOf(ctx, L, mDesign, Tk, tH, "NOM")) });
      charts.ambient.worst.push({ x: Tk, y: y(toutOf(ctx, L, mDesign, Tk, tH, "WORST")) });
    }
    if (aNom && tubeNom?.ok) {
      const lamAvail = (L * aNom.uPrime) / mDesign;
      const pts = tubeNom.profile(lamAvail);
      charts.along = {
        points: pts.map((p) => ({ L: (p.lam * mDesign) / aNom.uPrime, T: p.T, zone: p.zone })),
        breakthrough: lamAvail < tubeNom.lamVapor,
        Ltotal: L,
      };
    }
    if (cs.mode === "C") {
      const TambC = [-30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20];
      const qFactors = [0.4, 0.6, 0.8, 1, 1.2, 1.4];
      charts.heatmap = {
        TambC,
        qFactors,
        cells: TambC.map((tc) =>
          qFactors.map((qf) => {
            const v = toutOf(ctx, L, mDesign * qf, cToK(tc), tH, "WORST");
            const lvl: Level =
              v.value === null
                ? "NOGO"
                : v.value < Tlim
                  ? "NOGO"
                  : v.value < target
                    ? "WARNING"
                    : "GO";
            return { T: v.value, level: lvl, status: v.status };
          }),
        ),
      };
    }
  }

  // ---- 11. Location comparison (D) ---------------------------------------
  let locations: LocationRow[] | null = null;
  if (cs.mode === "D") {
    let refL = L;
    if (refL === null) {
      const free = { ...ctx, location: { ...cs.location, preset: "FREE", drain: "FREE" as const }, tubes: ctx.tubes };
      const s = size(free);
      refL = s.Lreq.value !== null ? Math.ceil(s.Lreq.value / cs.H - 1e-9) * cs.H : null;
    }
    locations = LOCATIONS.presets
      .filter((p) => p.impact !== "PARAMETRIC")
      .map((p) => {
        const li: LocationInput = { ...cs.location, preset: p.id };
        const sub: Ctx = { ...ctx, location: li };
        const lr = resolveLocation(li, tH, set);
        const Tw = refL !== null ? toutOf(sub, refL, mDesign, TambD, tH, "WORST") : none;
        const s = size(sub);
        const Nreq = s.Lreq.value !== null ? Math.max(1, Math.ceil(s.Lreq.value / cs.H - 1e-9)) : null;
        const lvl: Level =
          lr.impact === "NOGO" || Tw.value === null
            ? "NOGO"
            : Tw.value < Tlim
              ? "NOGO"
              : lr.impact === "WARNING" || Tw.value < target
                ? "WARNING"
                : "GO";
        return {
          presetId: p.id,
          label: p.label,
          fLoc: lr.fLoc,
          dTRecirc: lr.dTRecirc,
          impact: lr.impact,
          ToutWorst: Tw,
          Nreq,
          level: lvl,
        };
      });
  }

  const status: Status = !satLine || !satTank
    ? "OUT_OF_TABLE"
    : r("R09").level === "INVALID" || conflicts.length
      ? "INVALID"
      : ToutWorst.status;

  return {
    mode: cs.mode,
    medium: cs.medium,
    status,
    verdict: { level, label: LEVEL_LABEL[level], sentence },
    capacity: { level: capLevel, label: capLabel },
    protection: {
      ltpsRequired,
      label: ltpsRequired ? "LTPS POVINNÁ" : "LTPS DLE MATERIÁLU NEVYŽADOVÁNA",
    },
    rules,
    Tlimit: Tlim,
    Ttarget: target,
    TambDesignEff: TambD,
    TambMinSafetyEff: TambS,
    TlimitOverridden: overridden,
    location: loc,
    duty,
    Lreq: sizedNeeded ? sz.Lreq : valNo("OK"),
    ratioVsCatalogue: ratio15,
    unit,
    nxh,
    catalogueN2: catN2,
    catalogueMedium: catMed,
    workbookRatio,
    tout: { nominal: ToutNom, worst: ToutWorst, r02: ToutR02, wind1ms: ToutWind },
    band,
    TambCrit,
    hoursBelowCrit,
    mDotMax: L !== null ? qMaxOf(ctx, L) : none,
    heater: { required: heaterRequired, Qdesign: qHeaterDesign, QminSafety: qHeaterSafety },
    velocity: { cold: velCold, summer: velSummer, limit: vLimit, o2 },
    ltps: { alarm, trip, items: ltpsItems },
    psv,
    iceMass,
    sitingChecks,
    charts,
    locations,
    trace: tr.steps,
    intermediates: {
      C: cal.C,
      Tsat: satLine?.T ?? null,
      TIn: satTank?.T ?? null,
      U,
      aFin,
      finD,
      pf,
      sfTime: sft,
      sfRH,
      TairNom: aNom?.Tair ?? null,
      TairWorst: aWorst?.Tair ?? null,
      uPrimeNom: aNom?.uPrime ?? null,
      uPrimeWorst: aWorst?.uPrime ?? null,
      mDesign,
      mR02,
      Lreq: sz.Lreq.value,
      L1: sz.L1.value,
      L2: sz.L2.value,
      L15: sz.L15.value,
      approach: sz.approach,
      ToutNom: ToutNom.value,
      ToutWorst: ToutWorst.value,
      ToutR02: ToutR02.value,
      TambCrit: TambCrit.value,
      workbookRatio,
      catN2: catN2.value,
      Qtrim: qHeaterDesign,
    },
  };
}

/** B — max flow meeting R01 (worst corner, target) and R02 (nominal, T_limit) [kg/s]. */
function qMaxOf(ctx: Ctx, L: number): Val {
  const aW = airAt(ctx, ctx.TambD, ctx.tH, "WORST");
  const aN = airAt(ctx, ctx.TambD, ctx.tH, "NOM");
  if (!aW || !aN) return valNo("INVALID", "umístění mimo model");
  const l1 = tubeFor(ctx, aW.Tair).lambdaTo(ctx.target);
  const l2 = tubeFor(ctx, aN.Tair).lambdaTo(ctx.Tlim);
  if (l1.value === null) return l1;
  if (l2.value === null) return l2;
  const m1 = (L * aW.uPrime) / l1.value;
  const m2 = (L * aN.uPrime) / l2.value / c(ctx.set, "Q_R02_FACTOR");
  return valOk(Math.min(m1, m2));
}

/** Catalogue ratings are quoted in N₂. */
function getN2(f: Fluid): Fluid {
  return f.id === "N2" ? f : getFluid("N2");
}
