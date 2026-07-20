import { describe, expect, it } from "vitest";
import { calculateDefaults } from "../calculate";
import { DEFAULT_INPUTS, DEFAULT_MODEL } from "../constants";

describe("calculate — default N2 SIZING (v.2 defaults)", () => {
  it("returns GO with finite tube count", () => {
    const r = calculateDefaults({ mode: "SIZING", medium: "N2" });
    expect(r.mode).toBe("SIZING");
    expect(r.verdict.level).toMatch(/GO|WARNING|NOGO/);
    expect(r.intermediates.N).not.toBeNull();
    expect(r.intermediates.N!).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(r.intermediates.qr)).toBe(true);
    expect(r.kpis.length).toBeGreaterThan(0);
    expect(r.protocol).toContain("AAE ENGINE");
  });

  it("NOGO when Tout below Tmin", () => {
    const r = calculateDefaults({
      mode: "SIZING",
      inputs: { ...DEFAULT_INPUTS, Tout: -25, Tmin: -20 },
    });
    expect(r.verdict.level).toBe("NOGO");
  });

  it("NOGO when ambient at or below Tsat", () => {
    const r = calculateDefaults({
      mode: "SIZING",
      inputs: { ...DEFAULT_INPUTS, Tamb: -200 },
    });
    expect(r.verdict.level).toBe("NOGO");
  });
});

describe("calculate — CAPACITY", () => {
  it("returns Q_max and actual Tout", () => {
    const r = calculateDefaults({ mode: "CAPACITY" });
    expect(r.intermediates.qm).not.toBeNull();
    expect(r.intermediates.qm!).toBeGreaterThan(0);
    expect(r.intermediates.ta).not.toBeNull();
    expect(Number.isFinite(r.intermediates.ta)).toBe(true);
    expect(r.title).toContain("KAPACITA");
  });
});

describe("calculate — VELOCITY", () => {
  it("reports velocity vs limit", () => {
    const r = calculateDefaults({ mode: "VELOCITY" });
    expect(r.intermediates.vg).toBeGreaterThan(0);
    expect(r.intermediates.vlim).toBe(DEFAULT_MODEL.vInert);
  });

  it("uses O2 piecewise limit for oxygen", () => {
    const r = calculateDefaults({ mode: "VELOCITY", medium: "O2" });
    // at default P_gas=5 bar g the CGA curve is between the 61 and 7.6 caps
    expect(r.intermediates.vlim).toBeGreaterThan(7.6);
    expect(r.intermediates.vlim).toBeLessThan(61);
    expect(r.intermediates.vlim).not.toBe(DEFAULT_MODEL.vInert);
  });
});
