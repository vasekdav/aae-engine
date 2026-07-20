import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL } from "../constants";
import { getMedium } from "../media";
import { sfTotal } from "../math/frost";
import {
  aFinPerMeter,
  finDiameterAuto,
  lmtd,
  PabsFromGauge,
  qReq,
  qTube,
  Tsat,
  uEffective,
} from "../math/thermo";

const N2 = getMedium("N2");

describe("thermo", () => {
  it("PabsFromGauge adds atmosphere", () => {
    expect(PabsFromGauge(5)).toBeCloseTo(6.01325);
  });

  it("Tsat at atmospheric is near normal boiling point", () => {
    const Ts = Tsat(N2, 1.01325);
    expect(Ts).toBeCloseTo(N2.tb, 0);
  });

  it("Tsat rises with pressure", () => {
    const TsAtm = Tsat(N2, 1.01325);
    const TsPress = Tsat(N2, 6.01325);
    expect(TsPress).toBeGreaterThan(TsAtm);
  });

  it("lmtd degenerates when dT1 ≈ dT2", () => {
    const L = lmtd(20, 0, 0);
    expect(L).toBeCloseTo(20);
  });

  it("lmtd returns NaN when duty is impossible", () => {
    expect(Number.isNaN(lmtd(-50, 0, -10))).toBe(true);
  });

  it("qReq positive for superheat above Tsat", () => {
    const Ts = Tsat(N2, 6.01325);
    const qr = qReq(N2, 1000, -10, Ts);
    expect(qr).toBeGreaterThan(0);
  });

  it("finDiameterAuto steps by flow", () => {
    expect(finDiameterAuto(100)).toBe(80);
    expect(finDiameterAuto(300)).toBe(127);
    expect(finDiameterAuto(800)).toBe(152);
    expect(finDiameterAuto(1500)).toBe(200);
  });

  it("qTube matches U_eff·A·LMTD/SF model structure", () => {
    const Ts = Tsat(N2, 6.01325);
    const afin = aFinPerMeter(152, DEFAULT_MODEL.finEta);
    const sfTot = sfTotal(8, 80, DEFAULT_MODEL);
    const qt = qTube(DEFAULT_MODEL, afin, 5, 0, sfTot, -10, Ts);
    const L = lmtd(0, Ts, -10);
    const expected =
      (uEffective(0, DEFAULT_MODEL) * afin * 5 * L) / sfTot / 1000;
    expect(qt).toBeCloseTo(expected, 10);
    expect(qt).toBeGreaterThan(0);
  });
});
