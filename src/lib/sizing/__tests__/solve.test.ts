import { describe, expect, it } from "vitest";
import {
  bargToPa,
  caseWith,
  cToK,
  DEFAULT_CONSTANTS,
  getFluid,
  kToC,
  solve,
  type ConstantSet,
  type SizingCase,
} from "@/lib/sizing";

const run = (patch: Partial<SizingCase> = {}, set: ConstantSet = DEFAULT_CONSTANTS) => {
  const cs = caseWith(patch);
  return solve(cs, set, getFluid(cs.medium));
};
const rule = (r: ReturnType<typeof run>, id: string) => r.rules.find((x) => x.id === id)!;

describe("solve — main finding for Czech plants", () => {
  it("at −15 °C a CS line with −20 °C limit cannot be protected by the AAE alone (R03)", () => {
    const r = run({ TambDesign: cToK(-15) });
    expect(rule(r, "R03").pass).toBe(false);
    expect(rule(r, "R03").level).toBe("NOGO");
    expect(r.verdict.level).toBe("NOGO");
    expect(r.verdict.sentence.startsWith("R03")).toBe(true);
    expect(r.capacity.label).toContain("DOHŘÍVAČ");
    expect(r.heater.Qdesign).toBeGreaterThan(0);
  });

  it("with a trim heater the capacity verdict passes, LTPS stays mandatory", () => {
    const r = run({ TambDesign: cToK(-15), trimHeater: true });
    expect(rule(r, "R03").level).toBe("GO");
    expect(rule(r, "R01").pass).toBe(true);
    expect(rule(r, "R02").pass).toBe(true);
    expect(r.protection.ltpsRequired).toBe(true);
    // 1000 Nm³/h N₂ lifted by ~13 K → order of 5 kW (podklad: 20 K ≈ 7 kW)
    expect(r.heater.Qdesign! / 1000).toBeGreaterThan(2);
    expect(r.heater.Qdesign! / 1000).toBeLessThan(15);
  });

  it("holding T_limit + 5 K at −12 °C needs ~2–3× a catalogue-sized unit (podklad: cca 3×)", () => {
    const r = run({ TambDesign: cToK(-12) });
    expect(rule(r, "R03").pass).toBe(true);
    expect(r.ratioVsCatalogue!).toBeGreaterThan(2);
  });

  it("warm design: GO for capacity", () => {
    const r = run({ TambDesign: cToK(5) });
    expect(r.capacity.label).toBe("KAPACITA OK");
    expect(r.verdict.level).toBe("GO");
    expect(kToC(r.tout.worst.value!)).toBeGreaterThanOrEqual(-15 - 1e-6);
  });
});

describe("solve — sizing consistency", () => {
  it("sized unit meets R01 at the worst corner and the N×H table rounds up", () => {
    const r = run({ TambDesign: cToK(0) });
    expect(r.unit!.L).toBeGreaterThanOrEqual(r.Lreq.value!);
    expect(r.tout.worst.value!).toBeGreaterThanOrEqual(r.Ttarget - 1e-6);
    for (const row of r.nxh) {
      expect(row.N * row.H).toBeGreaterThanOrEqual(r.Lreq.value! - 1e-9);
      expect(row.reserve).toBeGreaterThanOrEqual(0);
    }
  });

  it("verification (B) of the sized unit reproduces its outlet temperature", () => {
    const a = run({ TambDesign: cToK(0) });
    const b = run({ mode: "B", TambDesign: cToK(0), N: a.unit!.N, H: a.unit!.H });
    expect(b.tout.worst.value!).toBeCloseTo(a.tout.worst.value!, 6);
    expect(b.mDotMax.value!).toBeGreaterThanOrEqual(caseWith({}).mDot - 1e-9);
  });

  it("more tubes → warmer outlet; longer run → colder outlet", () => {
    const small = run({ mode: "B", N: 40 });
    const big = run({ mode: "B", N: 60 });
    expect(big.tout.nominal.value!).toBeGreaterThan(small.tout.nominal.value!);
    const t8 = run({ mode: "B", N: 50, tEvent: 8 * 3600 });
    const t16 = run({ mode: "B", N: 50, tEvent: 16 * 3600 });
    expect(t16.tout.nominal.value!).toBeLessThan(t8.tout.nominal.value!);
  });

  it("catalogue equivalent: the unit rated Q at +20 °C, 8 h reaches exactly T_amb − 15 K", () => {
    const b = run({ mode: "B", N: 50, H: 6, finDiameter: 0.152 });
    const q = b.catalogueN2.value!;
    const atCat = run({
      mode: "B",
      N: 50,
      H: 6,
      finDiameter: 0.152,
      mDot: q,
      TambDesign: cToK(20),
      RH: 0.7,
      pLine: bargToPa(10),
      pTank: bargToPa(10),
      tEvent: 8 * 3600,
    });
    expect(kToC(atCat.tout.nominal.value!)).toBeCloseTo(5, 1);
  });

  it("T_amb,crit returns the ambient where worst-corner T_out = target", () => {
    const b = run({ mode: "B", N: 50, H: 6 });
    const at = run({ mode: "B", N: 50, H: 6, TambDesign: b.TambCrit.value! });
    expect(at.tout.worst.value!).toBeCloseTo(at.Ttarget, 1);
  });
});

describe("solve — rules", () => {
  it("R04: undersized unit → liquid breakthrough, NO-GO", () => {
    const r = run({ mode: "B", N: 5, H: 3 });
    expect(r.tout.nominal.status).toBe("BREAKTHROUGH");
    expect(rule(r, "R04").level).toBe("NOGO");
    expect(r.capacity.label).toBe("PRŮNIK KAPALINY");
  });

  it("R05: pressure above PS 40 bar → NO-GO", () => {
    const r = run({ medium: "O2", pLine: bargToPa(42) });
    expect(rule(r, "R05").level).toBe("NOGO");
  });

  it("R06: run time beyond LeadVap validity caps the verdict at WARNING", () => {
    const r = run({ TambDesign: cToK(10), tEvent: 20 * 3600 });
    expect(rule(r, "R06").pass).toBe(false);
    expect(r.verdict.level).not.toBe("GO");
  });

  it("R07: pit / enclosed room / blocked drain → NO-GO", () => {
    for (const preset of ["PIT", "ROOM", "WALL_TOUCH", "ROOF_LOW"]) {
      const r = run({ location: { ...caseWith({}).location, preset } });
      expect(rule(r, "R07").level).toBe("NOGO");
    }
    const r = run({ location: { ...caseWith({}).location, drain: "BLOCKED" } });
    expect(rule(r, "R07").level).toBe("NOGO");
  });

  it("R07: dead-end courtyard → WARNING and colder air than free field", () => {
    const free = run({ TambDesign: cToK(0) });
    const court = run({ TambDesign: cToK(0), location: { ...caseWith({}).location, preset: "ALLEY_DEAD" } });
    expect(rule(court, "R07").level).toBe("WARNING");
    expect(court.intermediates.TairNom!).toBeLessThan(free.intermediates.TairNom!);
    expect(court.unit!.N).toBeGreaterThan(free.unit!.N);
  });

  it("R08: CS between vaporizer and shutoff → NO-GO", () => {
    expect(rule(run({ csBeforeShutoff: true }), "R08").level).toBe("NOGO");
  });

  it("R09: T_limit override without justification → INVALID; with it → PŘEPSÁNO", () => {
    const bad = run({ TlimitOverride: { T: cToK(-30), reason: "" } });
    expect(bad.verdict.level).toBe("INVALID");
    const ok = run({ TlimitOverride: { T: cToK(-30), reason: "atest 3.1 rázová zkouška −40 °C" } });
    expect(rule(ok, "R09").pass).toBe(true);
    expect(ok.TlimitOverridden).toBe(true);
    expect(ok.Tlimit).toBeCloseTo(cToK(-30));
  });

  it("R10: CS with T_limit above T_amb,min − 5 K → LTPS mandatory; stainless → not", () => {
    expect(run({}).protection.ltpsRequired).toBe(true);
    expect(run({ material: "SS" }).protection.ltpsRequired).toBe(false);
  });

  it("supercritical line pressure → OUT_OF_TABLE, never a number", () => {
    const r = run({ pLine: bargToPa(35) });
    expect(r.status).toBe("OUT_OF_TABLE");
    expect(r.verdict.level).toBe("INVALID");
    expect(r.tout.nominal.value).toBeNull();
  });

  it("O₂: velocity limit follows EIGA impingement curve", () => {
    const r = run({ medium: "O2", pipeID: 0.02 });
    expect(r.velocity.o2).toBe(true);
    expect(rule(r, "VEL").level).toBe("NOGO");
  });

  it("double counting in the constant set → INVALID", () => {
    const set: ConstantSet = structuredClone(DEFAULT_CONSTANTS);
    set.items.WIND_SENS = { ...set.items.WIND_SENS, factor: "WIND", covers: set.items.U_BASE.covers };
    const r = run({}, set);
    expect(rule(r, "DATA").level).toBe("INVALID");
    expect(r.verdict.level).toBe("INVALID");
  });
});

describe("solve — modes and outputs", () => {
  it("C: heatmap and time profile", () => {
    const r = run({ mode: "C" });
    expect(r.charts.heatmap!.cells.length).toBe(11);
    expect(r.charts.time.nominal.length).toBe(33);
    expect(r.charts.along!.points.length).toBeGreaterThan(10);
  });

  it("D: every preset compared, NO-GO presets flagged", () => {
    const r = run({ mode: "D", TambDesign: cToK(0) });
    expect(r.locations!.length).toBe(15);
    expect(r.locations!.find((l) => l.presetId === "PIT")!.level).toBe("NOGO");
    const free = r.locations!.find((l) => l.presetId === "FREE")!;
    const court = r.locations!.find((l) => l.presetId === "ALLEY_DEAD")!;
    expect(court.Nreq!).toBeGreaterThan(free.Nreq!);
  });

  it("protocol is generated from the computation and never says SAFE", () => {
    const r = run({ mode: "C" });
    expect(r.trace.length).toBeGreaterThan(10);
    const text = JSON.stringify(r.trace) + JSON.stringify(r.rules) + r.verdict.sentence;
    expect(text).not.toMatch(/\bSAFE\b/i);
    expect(text).not.toMatch(/NaN/);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(run({ mode: "D" }))).toBe(JSON.stringify(run({ mode: "D" })));
  });

  it("all media solve", () => {
    for (const medium of ["N2", "O2", "Ar"] as const) {
      const r = run({ medium, TambDesign: cToK(0) });
      expect(r.unit).not.toBeNull();
      expect(r.duty!.total).toBeGreaterThan(0);
    }
  });
});
