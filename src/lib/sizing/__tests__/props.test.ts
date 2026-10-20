import { describe, expect, it } from "vitest";
import { getFluid } from "@/lib/sizing";

describe("property tables", () => {
  it("normal boiling points (NIST)", () => {
    expect(getFluid("N2").satP(101325)!.T).toBeCloseTo(77.35, 1);
    expect(getFluid("O2").satP(101325)!.T).toBeCloseTo(90.19, 1);
    expect(getFluid("Ar").satP(101325)!.T).toBeCloseTo(87.3, 1);
  });

  it("normal densities ρ_N at 0 °C, 1,01325 bar", () => {
    expect(getFluid("N2").rhoN).toBeCloseTo(1.2504, 3);
    expect(getFluid("O2").rhoN).toBeCloseTo(1.4290, 3);
    expect(getFluid("Ar").rhoN).toBeCloseTo(1.7840, 3);
  });

  it("latent heat of N₂ at 1 atm ≈ 199 kJ/kg", () => {
    const s = getFluid("N2").satP(101325)!;
    expect((s.hv - s.hl) / 1000).toBeCloseTo(199.2, 0);
  });

  it("returns null outside the table instead of extrapolating", () => {
    const n2 = getFluid("N2");
    expect(n2.satP(40e5)).toBeNull(); // supercritical
    expect(n2.vapor(100, 10e5)).toBeNull(); // subcooled
    expect(n2.satT(50)).toBeNull();
  });

  it("satT inverts satP", () => {
    const n2 = getFluid("N2");
    const s = n2.satP(12e5)!;
    expect(n2.satT(s.T)!.p / 12e5).toBeCloseTo(1, 3);
  });
});

import { DEFAULT_CONSTANTS, runSelfTest, dataManifest } from "@/lib/sizing";

describe("self-test and manifest", () => {
  it("in-app self-test passes", () => {
    const rows = runSelfTest(DEFAULT_CONSTANTS);
    expect(rows.every((r) => r.pass)).toBe(true);
  });
  it("manifest hashes are stable 8-hex strings", () => {
    for (const r of dataManifest(DEFAULT_CONSTANTS)) expect(r.hash).toMatch(/^[0-9a-f]{8}$/);
  });
});
