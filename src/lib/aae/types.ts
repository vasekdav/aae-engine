/**
 * Domain types for AAE Engine — ambient air evaporator design & safety checks.
 * Pure data contracts; no UI dependencies.
 */

export type MediumId = "N2" | "O2" | "Ar";

export type CalcMode = "SIZING" | "CAPACITY" | "VELOCITY";

export type VerdictLevel = "GO" | "WARNING" | "NOGO";

export type StatusTone = "ok" | "warn" | "bad" | "neutral";

/** Thermophysical properties for a cryogenic medium (SI-friendly engineering units). */
export interface MediumProps {
  id: MediumId;
  /** Display name (Czech UI). */
  name: string;
  /** Normal boiling point at ~1.013 bar [°C]. */
  tb: number;
  /** Latent heat of vaporization [kJ/kg]. */
  L: number;
  /** Density at normal conditions [kg/Nm³]. */
  rhoN: number;
  /** Gas specific heat [kJ/(kg·K)]. */
  cp: number;
  /** Molar mass [g/mol]. */
  M: number;
  /** Liquid density [kg/m³]. */
  rhoLiq: number;
  /** Critical pressure [bar a] — FLUID DATA col. I, guard for CC extrapolation. */
  pc: number;
  /** True for oxygen — enables EIGA Doc 13 impingement limits. */
  o2: boolean;
}

/** Model / calibration parameters (sheet MODEL, calibrated vs. Linde L40). */
export interface ModelParams {
  /** Overall heat transfer coefficient at 0 °C [W/(m²·K)] — MODEL C5. */
  Ubase: number;
  /** Temperature correction coefficient for U(T_amb) [1/K] — MODEL C6. */
  Uk: number;
  /** Frost performance curve PF(t) = a·e^(b·t) + c — MODEL C7–C9. */
  pfA: number;
  pfB: number;
  pfC: number;
  /** Fin efficiency of the 12-fin star [–] — MODEL C10. */
  finEta: number;
  /** Cross-check U in the vaporization zone [W/(m²·K)] — MODEL C11. */
  Uvap: number;
  /** Cross-check U in the superheat zone [W/(m²·K)] — MODEL C12. */
  Ush: number;
  /** Velocity limit for inert gases [m/s] — MODEL C13. */
  vInert: number;
  /** Liquid velocity guideline limit [m/s] — MODEL C14. */
  vLiqLim: number;
}

/** User-facing process inputs. Fields used depend on mode. */
export interface ProcessInputs {
  /** Flow [Nm³/h]. */
  Q: number;
  /** Tube length [m]. */
  H: number;
  /** Installed tube count [pcs] — CAPACITY mode. */
  Ninst: number;
  /** Continuous run time before defrost [h]. */
  t: number;
  /** Ambient temperature [°C]. */
  Tamb: number;
  /** Relative humidity [%]. */
  RH: number;
  /** Liquid pressure before the vaporizer [bar g] — basis for T_sat. */
  Pliq: number;
  /** Gas pressure after vaporizer [bar g] — basis for gas density/velocity. */
  Pgas: number;
  /** Liquid line diameter [mm]. */
  Dliq: number;
  /** Gas line diameter [mm]. */
  Dgas: number;
  /** Target outlet temperature [°C] — SIZING / CAPACITY. */
  Tout: number;
  /** Gas temperature [°C] — VELOCITY mode. */
  Tgas: number;
  /** Brittle-fracture limit for carbon steel [°C]. */
  Tmin: number;
}

export interface CalcRequest {
  medium: MediumId;
  mode: CalcMode;
  inputs: ProcessInputs;
  model: ModelParams;
}

export interface SafetyCheck {
  level: VerdictLevel;
  message: string;
}

export interface Verdict {
  level: VerdictLevel;
  /** Short stamp text: GO / WARNING / NO-GO */
  label: string;
  why: string;
}

export interface KpiItem {
  label: string;
  value: string;
  unit: string;
  tone?: StatusTone;
}

export interface DerivationStep {
  n: string | number;
  text: string;
  value: string;
  tone?: StatusTone;
}

export interface CalcResult {
  medium: MediumId;
  mode: CalcMode;
  title: string;
  mediumName: string;
  verdict: Verdict;
  kpis: KpiItem[];
  derivation: DerivationStep[];
  checks: DerivationStep[];
  protocol: string;
  /** Intermediate values useful for tests and future verification.
   *  `null` = not computable (workbook "NELZE" / "—"), e.g. N when LMTD is impossible. */
  intermediates: Record<string, number | null>;
}
