import { describe, expect, it } from "vitest";
import { vGas, vLimO2, vLiq } from "../math/velocity";

describe("velocity", () => {
  it("vGas increases when diameter shrinks", () => {
    const v80 = vGas(1000, 5, -10, 80);
    const v40 = vGas(1000, 5, -10, 40);
    expect(v40).toBeGreaterThan(v80);
    expect(v80).toBeGreaterThan(0);
  });

  it("vLimO2 follows CGA G-4.4 piecewise curve", () => {
    // low pressure → 61 m/s cap
    expect(vLimO2(0)).toBe(61);
    // mid pressure: P_MPa = 6.01325/10 ≈ 0.601 → 61·(P/0.21)^−0.699
    const mid = vLimO2(5);
    expect(mid).toBeLessThan(61);
    expect(mid).toBeGreaterThan(7.6);
    // high pressure ≥ 4.14 MPa a
    expect(vLimO2(50)).toBe(7.6);
  });

  it("vLiq scales with mass flow", () => {
    const v = vLiq(1000, 1.2504, 807, 50);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1.5); // typical at defaults
  });
});
