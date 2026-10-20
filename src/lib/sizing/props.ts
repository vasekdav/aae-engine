import ar from "./data/props-ar.json";
import n2 from "./data/props-n2.json";
import o2 from "./data/props-o2.json";
import type { MediumId } from "./types";

/**
 * Thermophysical properties from CoolProp tables (scripts/props/generate_props.py).
 * Saturation: linear in ln p. Vapour: bilinear in (superheat dT, ln p), so every
 * row starts exactly on the saturation curve. Outside the table → null; callers
 * turn that into OUT_OF_TABLE instead of extrapolating.
 */

export interface PropsTable {
  medium: string;
  fluid: string;
  version: string;
  source: string;
  M: number;
  Tc: number;
  pc: number;
  pMin: number;
  pMax: number;
  /** Density at 0 °C, 1,01325 bar [kg/m³]. */
  rhoN: number;
  sat: {
    lnp: number[];
    T: number[];
    hl: number[];
    hv: number[];
    rhol: number[];
    rhov: number[];
  };
  vap: {
    lnp: number[];
    dT: number[];
    h: number[][];
    cp: number[][];
    rho: number[][];
  };
}

export interface SatState {
  p: number;
  T: number;
  hl: number;
  hv: number;
  rhol: number;
  rhov: number;
}

export interface VapState {
  h: number;
  cp: number;
  rho: number;
}

/** Index i with a[i] ≤ x ≤ a[i+1] for ascending a (clamped to the ends). */
function bracket(a: number[], x: number): number {
  let lo = 0;
  let hi = a.length - 1;
  if (x <= a[0]) return 0;
  if (x >= a[hi]) return hi - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (a[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

const lerp = (a: number, b: number, w: number): number => a + (b - a) * w;

export class Fluid {
  readonly id: MediumId;
  readonly t: PropsTable;
  private readonly lnpMin: number;
  private readonly lnpMax: number;

  constructor(id: MediumId, table: PropsTable) {
    this.id = id;
    this.t = table;
    this.lnpMin = table.sat.lnp[0];
    this.lnpMax = table.sat.lnp[table.sat.lnp.length - 1];
  }

  get rhoN(): number {
    return this.t.rhoN;
  }

  get pMin(): number {
    return this.t.pMin;
  }

  get pMax(): number {
    return this.t.pMax;
  }

  inRange(p: number): boolean {
    const l = Math.log(p);
    return l >= this.lnpMin - 1e-9 && l <= this.lnpMax + 1e-9;
  }

  private satAt(i: number, w: number, p: number): SatState {
    const s = this.t.sat;
    return {
      p,
      T: lerp(s.T[i], s.T[i + 1], w),
      hl: lerp(s.hl[i], s.hl[i + 1], w),
      hv: lerp(s.hv[i], s.hv[i + 1], w),
      rhol: lerp(s.rhol[i], s.rhol[i + 1], w),
      rhov: lerp(s.rhov[i], s.rhov[i + 1], w),
    };
  }

  /** Saturation state at pressure p [Pa a]; null outside the table. */
  satP(p: number): SatState | null {
    if (!this.inRange(p)) return null;
    const l = Math.log(p);
    const s = this.t.sat;
    const i = bracket(s.lnp, l);
    const w = (l - s.lnp[i]) / (s.lnp[i + 1] - s.lnp[i]);
    return this.satAt(i, w, p);
  }

  /** Saturation state at temperature T [K]; null outside the table. */
  satT(T: number): SatState | null {
    const s = this.t.sat;
    if (T < s.T[0] - 1e-9 || T > s.T[s.T.length - 1] + 1e-9) return null;
    const i = bracket(s.T, T);
    const w = (T - s.T[i]) / (s.T[i + 1] - s.T[i]);
    const lnp = lerp(s.lnp[i], s.lnp[i + 1], w);
    return this.satAt(i, w, Math.exp(lnp));
  }

  /** Superheated vapour at (T, p); null if subcooled or outside the table. */
  vapor(T: number, p: number): VapState | null {
    const sat = this.satP(p);
    if (!sat) return null;
    const dT = T - sat.T;
    const v = this.t.vap;
    if (dT < -1e-6 || dT > v.dT[v.dT.length - 1]) return null;
    const d = Math.max(0, dT);
    const l = Math.log(p);
    const i = bracket(v.lnp, l);
    const wp = (l - v.lnp[i]) / (v.lnp[i + 1] - v.lnp[i]);
    const j = bracket(v.dT, d);
    const wt = (d - v.dT[j]) / (v.dT[j + 1] - v.dT[j]);
    const at = (g: number[][]): number =>
      lerp(
        lerp(g[i][j], g[i][j + 1], wt),
        lerp(g[i + 1][j], g[i + 1][j + 1], wt),
        wp,
      );
    let h = at(v.h);
    // Anchor the row blend to the interpolated saturation curve at dT = 0
    // (the two rows' own saturation enthalpies differ from h_v(p)).
    const hv0 = lerp(v.h[i][0], v.h[i + 1][0], wp);
    h += sat.hv - hv0;
    return { h, cp: at(v.cp), rho: at(v.rho) };
  }

  /** Saturated-liquid enthalpy at temperature T (compressed-liquid correction neglected). */
  hLiquid(T: number): number | null {
    const s = this.satT(T);
    return s ? s.hl : null;
  }
}

const TABLES: Record<MediumId, PropsTable> = {
  N2: n2 as PropsTable,
  O2: o2 as PropsTable,
  Ar: ar as PropsTable,
};

const cache = new Map<MediumId, Fluid>();

export function getFluid(id: MediumId): Fluid {
  let f = cache.get(id);
  if (!f) {
    f = new Fluid(id, TABLES[id]);
    cache.set(id, f);
  }
  return f;
}

export const PROPS_TABLES = TABLES;
