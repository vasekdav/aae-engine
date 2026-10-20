import type { Fluid } from "../props";
import type { Status, Val } from "../types";

/**
 * Three-zone march along the finned tube: liquid heating → boiling → superheat.
 *
 * Heat balance per unit length with constant air-side conductance U′ [W/(m·K)]:
 *   ṁ·dh = U′·(T_air − T)·dL   ⇒   L = (ṁ/U′)·Λ,   Λ = ∫ dh / (T_air − T)
 * Λ [J/(kg·K)] depends only on (p, inlet state, T_air), so one integration
 * serves any flow, length or conductance.
 *
 * Superheat is integrated on s = ln((T_air − T_sat)/(T_air − T)), uniform
 * steps, with the exact log-mean ΔT of each step; enthalpy differences come
 * from the property table (variable c_p).
 */

/** Outlet is considered "at air temperature" this close to T_air [K]. */
export const D_END = 0.05;
const N_SH = 320;
const N_LIQ = 40;

export interface ProfilePoint {
  /** Cumulative Λ [J/(kg·K)]. */
  lam: number;
  T: number;
  zone: "liquid" | "boil" | "superheat";
}

export class Tube {
  readonly status: Status;
  readonly note: string | undefined;
  readonly p: number;
  readonly Tair: number;
  /** Saturation at line pressure. */
  readonly Tsat: number;
  readonly hl: number;
  readonly hv: number;
  /** Inlet (tank) state. */
  readonly TIn: number;
  readonly hIn: number;
  readonly lamLiq: number;
  readonly lamBoil: number;
  private readonly fluid: Fluid;
  private readonly d0: number;
  private readonly ds: number;
  /** Cumulative superheat Λ at s_k = k·ds. */
  private readonly lamSh: number[] = [];
  private readonly liqProfile: ProfilePoint[] = [];

  constructor(fluid: Fluid, pLine: number, pTank: number, Tair: number) {
    this.fluid = fluid;
    this.p = pLine;
    this.Tair = Tair;
    const sat = fluid.satP(pLine);
    const tank = fluid.satP(pTank);
    if (!sat || !tank) {
      this.status = "OUT_OF_TABLE";
      this.note = "tlak mimo tabulku vlastností (nadkritický nebo < 0,9 bar a)";
      this.Tsat = this.hl = this.hv = this.TIn = this.hIn = NaN;
      this.lamLiq = this.lamBoil = Infinity;
      this.d0 = this.ds = NaN;
      return;
    }
    this.Tsat = sat.T;
    this.hl = sat.hl;
    this.hv = sat.hv;
    this.TIn = Math.min(tank.T, sat.T);
    this.hIn = tank.hl;
    this.d0 = Tair - sat.T;
    if (this.d0 <= D_END || Tair <= this.TIn) {
      this.status = "UNREACHABLE";
      this.note = "T_air ≤ T_sat — chybí hnací teplotní rozdíl";
      this.lamLiq = this.lamBoil = Infinity;
      this.ds = NaN;
      return;
    }
    this.status = "OK";

    // Zone 1 — subcooled liquid from T_sat(p_tank) to T_sat(p_line).
    let lamLiq = 0;
    this.liqProfile.push({ lam: 0, T: this.TIn, zone: "liquid" });
    if (this.hIn < this.hl && sat.T > this.TIn) {
      let Tprev = this.TIn;
      let hprev = this.hIn;
      for (let k = 1; k <= N_LIQ; k++) {
        const T = this.TIn + ((sat.T - this.TIn) * k) / N_LIQ;
        const h = k === N_LIQ ? this.hl : (fluid.hLiquid(T) ?? hprev);
        lamLiq += (h - hprev) * invLogMean(Tair - Tprev, Tair - T);
        this.liqProfile.push({ lam: lamLiq, T, zone: "liquid" });
        Tprev = T;
        hprev = h;
      }
    }
    this.lamLiq = lamLiq;

    // Zone 2 — boiling at constant T_sat (flashing inlet starts two-phase).
    this.lamBoil = (this.hv - Math.max(this.hIn, this.hl)) / this.d0;

    // Zone 3 — superheat up to T_air − D_END.
    const sMax = Math.log(this.d0 / D_END);
    this.ds = sMax / N_SH;
    let lam = 0;
    let hprev = this.hv;
    this.lamSh.push(0);
    for (let k = 1; k <= N_SH; k++) {
      const T = Tair - this.d0 * Math.exp(-k * this.ds);
      const v = fluid.vapor(T, pLine);
      const h = v ? v.h : hprev;
      const dPrev = this.d0 * Math.exp(-(k - 1) * this.ds);
      const dNext = this.d0 * Math.exp(-k * this.ds);
      // Exact log-mean on a log-uniform grid: ΔT_lm = (d₁ − d₂)/Δs.
      lam += ((h - hprev) * this.ds) / (dPrev - dNext);
      this.lamSh.push(lam);
      hprev = h;
    }
  }

  get ok(): boolean {
    return this.status === "OK";
  }

  /** Λ at the onset of superheat (end of boiling). */
  get lamVapor(): number {
    return this.lamLiq + this.lamBoil;
  }

  /** Λ needed to reach outlet temperature T. */
  lambdaTo(T: number): Val {
    if (!this.ok) return { status: this.status, value: null, note: this.note };
    if (T <= this.Tsat) {
      return {
        status: "INVALID",
        value: null,
        note: "cílová teplota ≤ T_sat — výstup by nebyl plyn",
      };
    }
    const d = this.Tair - T;
    if (d <= D_END) {
      return {
        status: "UNREACHABLE",
        value: null,
        note: "cíl ≥ T_air — plyn nemůže být teplejší než vzduch",
      };
    }
    const s = Math.log(this.d0 / d);
    const x = s / this.ds;
    const i = Math.min(Math.floor(x), N_SH - 1);
    const w = x - i;
    const lamSh = this.lamSh[i] + (this.lamSh[i + 1] - this.lamSh[i]) * w;
    return { status: "OK", value: this.lamVapor + lamSh };
  }

  /** Outlet temperature for available Λ; BREAKTHROUGH if still two-phase. */
  toutAt(lam: number): Val {
    if (!this.ok) return { status: this.status, value: null, note: this.note };
    const r = lam - this.lamVapor;
    if (r < 0) {
      const x = this.qualityAt(lam);
      return {
        status: "BREAKTHROUGH",
        value: null,
        note: `kapalina na výstupu (kvalita x ≈ ${x.toFixed(2)})`,
      };
    }
    const last = this.lamSh[N_SH];
    if (r >= last) {
      return { status: "OK", value: this.Tair - D_END, note: "≈ T_air" };
    }
    let lo = 0;
    let hi = N_SH;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.lamSh[mid] <= r) lo = mid;
      else hi = mid;
    }
    const w = (r - this.lamSh[lo]) / (this.lamSh[hi] - this.lamSh[lo] || 1);
    const s = (lo + w) * this.ds;
    return { status: "OK", value: this.Tair - this.d0 * Math.exp(-s) };
  }

  /** Vapour quality at Λ inside the boiling zone (0 in liquid zone). */
  qualityAt(lam: number): number {
    if (lam <= this.lamLiq) return 0;
    const h = Math.max(this.hIn, this.hl) + (lam - this.lamLiq) * this.d0;
    return Math.min(1, Math.max(0, (h - this.hl) / (this.hv - this.hl)));
  }

  /** Specific enthalpy of superheated gas at T [J/kg]; null outside the table. */
  hGas(T: number): number | null {
    if (T <= this.Tsat) return this.hv;
    const v = this.fluid.vapor(T, this.p);
    return v ? v.h : null;
  }

  /** Temperature profile up to Λ_max, for the "along the tube" chart. */
  profile(lamMax: number): ProfilePoint[] {
    if (!this.ok) return [];
    const pts: ProfilePoint[] = [];
    for (const p of this.liqProfile) {
      if (p.lam > lamMax) break;
      pts.push(p);
    }
    if (lamMax <= this.lamLiq) return pts;
    pts.push({ lam: this.lamLiq, T: this.Tsat, zone: "boil" });
    const endBoil = Math.min(lamMax, this.lamVapor);
    pts.push({ lam: endBoil, T: this.Tsat, zone: "boil" });
    if (lamMax <= this.lamVapor) return pts;
    const step = Math.max(1, Math.floor(N_SH / 80));
    for (let k = 0; k <= N_SH; k += step) {
      const lam = this.lamVapor + this.lamSh[k];
      if (lam > lamMax) break;
      pts.push({
        lam,
        T: this.Tair - this.d0 * Math.exp(-k * this.ds),
        zone: "superheat",
      });
    }
    const end = this.toutAt(lamMax);
    if (end.value !== null) {
      pts.push({ lam: lamMax, T: end.value, zone: "superheat" });
    }
    return pts;
  }
}

/** 1/ΔT_lm for a step between driving differences d1 and d2 [1/K]. */
function invLogMean(d1: number, d2: number): number {
  if (Math.abs(d1 - d2) < 1e-9) return 1 / d1;
  return Math.log(d1 / d2) / (d1 - d2);
}
