import { describe, expect, it } from "vitest";
import { calibrate, DEFAULT_CONSTANTS, getFluid, Tube } from "@/lib/sizing";
import type { MediumId } from "@/lib/sizing";
import ref from "../data/reference-vectors.json";

/**
 * Independent check: TS zone model (tables + log-grid march) vs the Python
 * reference (CoolProp direct, dense trapezoid) — scripts/reference/zone_model.py.
 */
describe("zone model vs Python/CoolProp reference", () => {
  for (const v of ref.vectors) {
    it(`${v.id}: Λ(T_out) within 0,5 %`, () => {
      const tube = new Tube(getFluid(v.medium as MediumId), v.pLine, v.pTank, v.Tair);
      expect(tube.status).toBe("OK");
      expect(tube.Tsat).toBeCloseTo(v.Tsat, 1);
      expect(tube.lamLiq).toBeCloseTo(v.lamLiq, -1);
      expect(Math.abs(tube.lamVapor / v.lamVap - 1)).toBeLessThan(0.005);
      const lam = tube.lambdaTo(v.Tout).value!;
      expect(Math.abs(lam / v.lam - 1)).toBeLessThan(0.005);
    });

    it(`${v.id}: T_out inverse within 0,2 K`, () => {
      const tube = new Tube(getFluid(v.medium as MediumId), v.pLine, v.pTank, v.Tair);
      const T = tube.toutAt(v.lam).value!;
      expect(Math.abs(T - v.Tout)).toBeLessThan(0.2);
    });

    it(`${v.id}: gas density within 0,5 %`, () => {
      const rho = getFluid(v.medium as MediumId).vapor(v.Tout, v.pLine)!.rho;
      expect(Math.abs(rho / v.rhoOut - 1)).toBeLessThan(0.005);
    });
  }

  it("calibration factor C matches the reference", () => {
    const cal = calibrate(DEFAULT_CONSTANTS);
    expect(Math.abs(cal.C / ref.calibrationC - 1)).toBeLessThan(0.003);
  });
});
