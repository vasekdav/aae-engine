/**
 * Site airflow derating for ambient-air vaporizers (AAV / AAE).
 *
 * Free-field ratings assume unobstructed approach air. Nearby walls, courtyards
 * and building wakes reduce local air velocity and can recirculate cold plume
 * air back onto the fins (lower effective T_air → lower LMTD).
 *
 * Anchors (engineering synthesis — not a code table):
 *  - Lisowski et al., Energies 2024: capacity sensitivity ≈ +10–18 % per m/s air
 *  - Rogié et al., Fluids 2020: cold-air recirculation φ ~ 8–28 %
 *  - Gunter & Shipes 1971 / EVAPCO / BAC layout: enclosure & wall approach limits
 *  - Air-side h ∝ v^n with n ≈ 0.5–0.8 for finned surfaces
 *
 * Default FREE + vAir = V_AIR_REF reproduces the legacy free-field model exactly.
 */

export type SiteClass = "FREE" | "ONE_WALL" | "COURTYARD" | "WAKE";

/** Free-stream air speed at which U_base is calibrated [m/s]. */
export const V_AIR_REF = 1.5;

/** Floor on local approach velocity (near-stagnant air) [m/s]. */
export const V_AIR_MIN = 0.3;

/** Default design free-stream wind for outdoor AAV [m/s]. */
export const V_AIR_DEFAULT = 1.5;

/** Exponent for air-side conductance vs velocity: U ∝ v^n. */
export const N_VELOCITY = 0.6;

/**
 * Typical cold-plume ΔT used for mixing model [K].
 * T_air_in = (1−φ)·T_amb + φ·(T_amb − ΔT_plume) = T_amb − φ·ΔT_plume
 */
export const DELTA_T_PLUME_K = 8;

/** Local free-stream multiplier by site class (approach velocity reduction). */
export const SITE_F_VELOCITY: Record<SiteClass, number> = {
  FREE: 1.0,
  ONE_WALL: 0.85,
  COURTYARD: 0.65,
  WAKE: 0.55,
};

/**
 * Cold-air recirculation fraction φ by site class [–].
 * FREE: none; wall / wake moderate; courtyard highest short-circuit risk.
 */
export const SITE_PHI: Record<SiteClass, number> = {
  FREE: 0,
  ONE_WALL: 0.08,
  COURTYARD: 0.2,
  WAKE: 0.15,
};

export const SITE_CLASS_LABELS: Record<SiteClass, string> = {
  FREE: "Volné pole",
  ONE_WALL: "Jedna stěna",
  COURTYARD: "Dvůr / studna",
  WAKE: "Závětří budovy",
};

export const SITE_CLASS_HINTS: Record<SiteClass, string> = {
  FREE: "Bez překážek — free-field rating",
  ONE_WALL: "Jedna blízká stěna / plot (d ≳ 0,5–1× H bloku)",
  COURTYARD: "Uzavřený prostor, 3+ stěny, šachta",
  WAKE: "Závětří budovy (cavity ~1,5–3 H)",
};

export const SITE_CLASSES: SiteClass[] = [
  "FREE",
  "ONE_WALL",
  "COURTYARD",
  "WAKE",
];

export function isSiteClass(value: unknown): value is SiteClass {
  return (
    value === "FREE" ||
    value === "ONE_WALL" ||
    value === "COURTYARD" ||
    value === "WAKE"
  );
}

/** Clamp / sanitize free-stream design velocity [m/s]. */
export function sanitizeVAir(vAir: number): number {
  if (!Number.isFinite(vAir) || vAir < 0) return V_AIR_DEFAULT;
  return Math.min(vAir, 30);
}

/**
 * Local approach air velocity at the vaporizer [m/s].
 * v_local = max(v_min, v_air · f_site)
 */
export function localAirVelocity(vAir: number, site: SiteClass): number {
  const v = sanitizeVAir(vAir);
  return Math.max(V_AIR_MIN, v * SITE_F_VELOCITY[site]);
}

/**
 * Velocity factor on free-field U_eff [–].
 * f_U = (v_local / v_ref)^n
 */
export function airVelocityFactor(vLocal: number): number {
  const v = Math.max(V_AIR_MIN, vLocal);
  return Math.pow(v / V_AIR_REF, N_VELOCITY);
}

/**
 * Effective air temperature for LMTD after cold-plume recirculation [°C].
 * T_air = T_amb − φ · ΔT_plume
 */
export function effectiveAirTemperature(Tamb: number, site: SiteClass): number {
  return Tamb - SITE_PHI[site] * DELTA_T_PLUME_K;
}

export interface SiteAirResult {
  siteClass: SiteClass;
  /** Design free-stream air velocity [m/s]. */
  vAir: number;
  /** Local approach velocity after site reduction [m/s]. */
  vLocal: number;
  /** Multiplier on free-field U_eff [–]. */
  fU: number;
  /** Cold recirculation fraction φ [–]. */
  phi: number;
  /** Effective inlet air temperature for LMTD [°C]. */
  TambEff: number;
  /** Meteorological ambient used for U(T) climate term [°C]. */
  Tamb: number;
  /** True when free-field free-stream at reference speed (legacy match). */
  isFreeFieldRef: boolean;
}

/**
 * Resolve site-airflow factors for capacity / sizing.
 * @param Tamb meteorological ambient [°C]
 * @param vAir free-stream design wind [m/s]
 * @param site installation class
 */
export function resolveSiteAir(
  Tamb: number,
  vAir: number,
  site: SiteClass,
): SiteAirResult {
  const v = sanitizeVAir(vAir);
  const vLocal = localAirVelocity(v, site);
  const fU = airVelocityFactor(vLocal);
  const phi = SITE_PHI[site];
  const TambEff = effectiveAirTemperature(Tamb, site);
  const isFreeFieldRef =
    site === "FREE" && Math.abs(v - V_AIR_REF) < 1e-9 && phi === 0;

  return {
    siteClass: site,
    vAir: v,
    vLocal,
    fU,
    phi,
    TambEff,
    Tamb,
    isFreeFieldRef,
  };
}

/**
 * Approximate combined thermal derate vs free-field at same T_out / T_sat.
 * Uses LMTD ratio when both LMTDs exist; otherwise f_U alone.
 */
export function approxCapacityFactor(
  site: SiteAirResult,
  Ts: number,
  Tout: number,
  lmtdFn: (Tamb: number, Ts: number, Tout: number) => number,
): number | null {
  const L0 = lmtdFn(site.Tamb, Ts, Tout);
  const L1 = lmtdFn(site.TambEff, Ts, Tout);
  if (!Number.isFinite(L0) || !Number.isFinite(L1) || L0 <= 0) return null;
  return site.fU * (L1 / L0);
}
