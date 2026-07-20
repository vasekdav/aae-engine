import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL } from "../constants";
import {
  performanceFactor,
  sfRH,
  sfTime,
  sfTotal,
} from "../math/frost";

describe("frost safety factors", () => {
  it("performanceFactor at default 8 h is between 0 and 1+", () => {
    const pf = performanceFactor(8, DEFAULT_MODEL);
    expect(pf).toBeGreaterThan(0.5);
    expect(pf).toBeLessThan(1.5);
  });

  it("sfTime = max(1, 1/PF)", () => {
    const pf = performanceFactor(8, DEFAULT_MODEL);
    const sf = sfTime(8, DEFAULT_MODEL);
    expect(sf).toBeCloseTo(Math.max(1, 1 / pf), 10);
  });

  it("sfRH is 1 up to 70 % and ramps to 1.15 at 100 %", () => {
    expect(sfRH(60)).toBeCloseTo(1);
    expect(sfRH(70)).toBeCloseTo(1);
    expect(sfRH(100)).toBeCloseTo(1.15);
    expect(sfRH(85)).toBeCloseTo(1 + (0.15 * 15) / 30);
  });

  it("sfTotal multiplies time and RH factors", () => {
    const expected = sfTime(8, DEFAULT_MODEL) * sfRH(80);
    expect(sfTotal(8, 80, DEFAULT_MODEL)).toBeCloseTo(expected, 10);
  });
});
