import { describe, expect, it } from "vitest";
import {
  airVelocityFactor,
  effectiveAirTemperature,
  localAirVelocity,
  resolveSiteAir,
  SITE_PHI,
  V_AIR_REF,
} from "../math/site-airflow";
import { calculateDefaults } from "../calculate";
import { DEFAULT_INPUTS } from "../constants";

describe("site-airflow", () => {
  it("FREE at v_ref → fU = 1 and TambEff = Tamb", () => {
    const s = resolveSiteAir(0, V_AIR_REF, "FREE");
    expect(s.fU).toBeCloseTo(1, 10);
    expect(s.vLocal).toBeCloseTo(V_AIR_REF, 10);
    expect(s.TambEff).toBe(0);
    expect(s.phi).toBe(0);
    expect(s.isFreeFieldRef).toBe(true);
  });

  it("local velocity scales with site factor and floors at v_min", () => {
    expect(localAirVelocity(1.5, "ONE_WALL")).toBeCloseTo(1.5 * 0.85, 6);
    expect(localAirVelocity(0, "FREE")).toBe(0.3);
  });

  it("airVelocityFactor follows (v/v_ref)^0.6", () => {
    expect(airVelocityFactor(V_AIR_REF)).toBeCloseTo(1, 10);
    expect(airVelocityFactor(3)).toBeCloseTo(Math.pow(3 / V_AIR_REF, 0.6), 6);
    expect(airVelocityFactor(0.75)).toBeLessThan(1);
  });

  it("COURTYARD lowers T_air by φ·ΔT_plume", () => {
    const Tamb = 10;
    const Te = effectiveAirTemperature(Tamb, "COURTYARD");
    expect(Te).toBeCloseTo(Tamb - SITE_PHI.COURTYARD * 8, 6);
  });

  it("sizing FREE+v_ref matches legacy tube count (no site derate)", () => {
    const r = calculateDefaults({ mode: "SIZING", medium: "N2" });
    expect(r.intermediates.fU).toBeCloseTo(1, 6);
    expect(r.intermediates.N).not.toBeNull();
    expect(r.intermediates.N!).toBeGreaterThanOrEqual(1);
  });

  it("COURTYARD increases required N vs FREE", () => {
    const free = calculateDefaults({
      mode: "SIZING",
      inputs: { ...DEFAULT_INPUTS, siteClass: "FREE", vAir: 1.5 },
    });
    const yard = calculateDefaults({
      mode: "SIZING",
      inputs: { ...DEFAULT_INPUTS, siteClass: "COURTYARD", vAir: 1.5 },
    });
    expect(yard.intermediates.N!).toBeGreaterThan(free.intermediates.N!);
    expect(yard.intermediates.fU!).toBeLessThan(1);
    expect(yard.verdict.level).not.toBe("GO"); // site WARNING
  });

  it("higher free-stream wind increases CAPACITY Q_max", () => {
    const calm = calculateDefaults({
      mode: "CAPACITY",
      inputs: { ...DEFAULT_INPUTS, siteClass: "FREE", vAir: 1.0 },
    });
    const windy = calculateDefaults({
      mode: "CAPACITY",
      inputs: { ...DEFAULT_INPUTS, siteClass: "FREE", vAir: 3.0 },
    });
    expect(windy.intermediates.qm!).toBeGreaterThan(calm.intermediates.qm!);
  });

  it("WAKE reduces Q_max vs FREE at same wind", () => {
    const free = calculateDefaults({
      mode: "CAPACITY",
      inputs: { ...DEFAULT_INPUTS, siteClass: "FREE", vAir: 1.5 },
    });
    const wake = calculateDefaults({
      mode: "CAPACITY",
      inputs: { ...DEFAULT_INPUTS, siteClass: "WAKE", vAir: 1.5 },
    });
    expect(wake.intermediates.qm!).toBeLessThan(free.intermediates.qm!);
  });
});
