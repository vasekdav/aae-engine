import { describe, expect, it } from "vitest";
import { calculateDefaults } from "../calculate";
import { DEFAULT_INPUTS, DEFAULT_MODEL, P_ATM_BAR } from "../constants";
import { performanceFactor } from "../math/frost";
import { Tsat, PabsFromGauge } from "../math/thermo";
import { getMedium } from "../media";

/**
 * VERIFIKACE sheet — golden-value test suite, valid at the workbook default
 * scenario only (N₂, 1000 Nm³/h, H=5 m, t=8 h, 0 °C, RH 80 %, 12/5 bar g,
 * DN80, T_min −20 °C). Tolerances per VERIFIKACE column E.
 * Expected values are the workbook's cached results; small deviations come
 * from the app's more precise NIST media constants (see media.ts).
 */
describe("VERIFIKACE — workbook golden values (default scenario)", () => {
  const sizing = calculateDefaults({ mode: "SIZING", medium: "N2" });
  const capacity = calculateDefaults({ mode: "CAPACITY", medium: "N2" });

  it("T1 — T_boil N₂ at 13,01 bar a vs NIST −163,9 °C (±0,5 K)", () => {
    const ts = Tsat(getMedium("N2"), PabsFromGauge(DEFAULT_INPUTS.Pliq));
    expect(PabsFromGauge(DEFAULT_INPUTS.Pliq)).toBeCloseTo(12 + P_ATM_BAR, 6);
    expect(Math.abs(ts - -163.9)).toBeLessThan(0.5);
  });

  it("T2 — PF(8 h) = 1 calibration point of the vendor frost curve (±0,003)", () => {
    expect(Math.abs(performanceFactor(8, DEFAULT_MODEL) - 1)).toBeLessThan(
      0.003,
    );
  });

  it("T3 — SIZING: N = 50 tubes at default inputs (exact)", () => {
    expect(sizing.intermediates.N).toBe(50);
  });

  it("T4 — two-zone cross-check ratio inside the 0,8–1,6 corridor", () => {
    const ratio = sizing.intermediates.ratio;
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(0.8);
    expect(ratio!).toBeLessThanOrEqual(1.6);
  });

  it("T5 — v_gas = 8,97 m/s at default inputs (±0,3 m/s)", () => {
    expect(Math.abs(sizing.intermediates.vg! - 8.97)).toBeLessThan(0.3);
  });

  it("T6 — ROUNDTRIP: Q_max(CAPACITY, N=50) ≈ 1000 Nm³/h (±2,5 %)", () => {
    const qm = capacity.intermediates.qm;
    expect(qm).not.toBeNull();
    expect(Math.abs(qm! - 1000) / 1000).toBeLessThan(0.025);
  });

  it("T7 — ROUNDTRIP: T_out(CAPACITY, Q=1000, N=50) ≈ −10 °C (±1,5 K)", () => {
    const ta = capacity.intermediates.ta;
    expect(ta).not.toBeNull();
    expect(Math.abs(ta! - -10)).toBeLessThan(1.5);
  });

  it("T8 — SIZING verdict = GO at default inputs", () => {
    expect(sizing.verdict.level).toBe("GO");
  });

  it("T8b — CAPACITY verdict = GO at default inputs (KAPACITA B89)", () => {
    expect(capacity.verdict.level).toBe("GO");
  });
});
