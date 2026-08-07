import { describe, expect, it } from "vitest";
import {
  type DotaznikFiles,
  type DotaznikValues,
  EMPTY_FILES,
  EMPTY_VALUES,
  emailsMatch,
  showDokladVzdelani,
  showNarodnostJina,
  showPojistovna,
  showPojistovnaFoto,
  showPrvniZamestnani,
  validateDotaznik,
  validateRodneCislo,
} from "../validation";

// vitest runs in a node environment where File may be missing; the logic only
// checks presence, so a plain object stands in for an attached file.
const fakeFile = { name: "doklad.jpg" } as unknown as File;

function filledValues(overrides: Partial<DotaznikValues> = {}): DotaznikValues {
  return {
    ...EMPTY_VALUES,
    jmeno: "Jan",
    prijmeni: "Novák",
    rodne_cislo: "900101/1234",
    rodinny_stav: "opt_svobodny",
    vzdelani: "opt_stredni",
    narodnost: "CZ",
    telefon: "777123456",
    email: "jan@example.com",
    email2: "jan@example.com",
    ulice: "Lipová",
    cislo_popisne: "12",
    mesto: "Český Těšín",
    psc: "737 01",
    srazky: "ne",
    pojistovna: "111 – Všeobecná zdravotní pojišťovna (VZP)",
    ucet: "123456789/0100",
    obed: "ano",
    velikost_tricko: "L",
    velikost_obuv: "43",
    gdpr: true,
    pravdivost: true,
    ...overrides,
  };
}

function filledFiles(overrides: Partial<DotaznikFiles> = {}): DotaznikFiles {
  return {
    ...EMPTY_FILES,
    op_predni: fakeFile,
    op_zadni: fakeFile,
    doklad_vzdelani: fakeFile,
    ...overrides,
  };
}

describe("validateRodneCislo", () => {
  it("accepts 000000/0000 and 000000/000", () => {
    expect(validateRodneCislo("900101/1234")).toBe(true);
    expect(validateRodneCislo("450612/123")).toBe(true);
  });

  it("accepts the form without a slash", () => {
    expect(validateRodneCislo("9001011234")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(validateRodneCislo("")).toBe(false);
    expect(validateRodneCislo("90101/1234")).toBe(false);
    expect(validateRodneCislo("abc")).toBe(false);
  });
});

describe("conditional visibility", () => {
  it("asks about first CZ employment only for foreigners", () => {
    expect(showPrvniZamestnani(filledValues({ narodnost: "CZ" }))).toBe(false);
    expect(showPrvniZamestnani(filledValues({ narodnost: "PL" }))).toBe(true);
    expect(showPrvniZamestnani(filledValues({ narodnost: "" }))).toBe(false);
  });

  it("shows the free-text citizenship field only for OTHER", () => {
    expect(showNarodnostJina(filledValues({ narodnost: "OTHER" }))).toBe(true);
    expect(showNarodnostJina(filledValues({ narodnost: "UA" }))).toBe(false);
  });

  it("hides insurance for a foreigner who already worked in CZ", () => {
    const v = filledValues({ narodnost: "SK", prvni_zamestnani: "ne" });
    expect(showPojistovna(v)).toBe(false);
    expect(showPojistovnaFoto(v)).toBe(false);
  });

  it("requires an insurance card photo for a foreigner's first CZ job", () => {
    const v = filledValues({ narodnost: "SK", prvni_zamestnani: "ano" });
    expect(showPojistovna(v)).toBe(true);
    expect(showPojistovnaFoto(v)).toBe(true);
  });

  it("does not require proof of education for primary education", () => {
    expect(showDokladVzdelani(filledValues({ vzdelani: "opt_zakladni" }))).toBe(
      false,
    );
    expect(showDokladVzdelani(filledValues({ vzdelani: "" }))).toBe(false);
    expect(showDokladVzdelani(filledValues({ vzdelani: "opt_vyucen" }))).toBe(
      true,
    );
  });
});

describe("emailsMatch", () => {
  it("ignores case and surrounding whitespace", () => {
    const v = filledValues({ email: "Jan@Example.com ", email2: "jan@example.com" });
    expect(emailsMatch(v)).toBe(true);
  });
});

describe("validateDotaznik", () => {
  it("passes a fully filled Czech applicant", () => {
    const res = validateDotaznik(filledValues(), filledFiles());
    expect(res.valid).toBe(true);
    expect(res.invalid.size).toBe(0);
    expect(res.emailMismatch).toBe(false);
  });

  it("flags every missing required field on an empty form", () => {
    const res = validateDotaznik(EMPTY_VALUES, EMPTY_FILES);
    expect(res.valid).toBe(false);
    for (const name of ["jmeno", "prijmeni", "rodne_cislo", "op_predni", "gdpr"]) {
      expect(res.invalid.has(name)).toBe(true);
    }
  });

  it("reports an email mismatch", () => {
    const res = validateDotaznik(
      filledValues({ email2: "jiny@example.com" }),
      filledFiles(),
    );
    expect(res.valid).toBe(false);
    expect(res.emailMismatch).toBe(true);
    expect(res.invalid.has("email2")).toBe(true);
  });

  it("requires the first-employment answer and card photo for foreigners", () => {
    const values = filledValues({ narodnost: "UA" });
    let res = validateDotaznik(values, filledFiles());
    expect(res.invalid.has("prvni_zamestnani")).toBe(true);

    res = validateDotaznik(
      { ...values, prvni_zamestnani: "ano" },
      filledFiles(),
    );
    expect(res.invalid.has("pojistovna_foto")).toBe(true);
    expect(
      validateDotaznik(
        { ...values, prvni_zamestnani: "ano" },
        filledFiles({ pojistovna_foto: fakeFile }),
      ).valid,
    ).toBe(true);
  });

  it("drops the insurance requirement for a foreigner who worked in CZ", () => {
    const res = validateDotaznik(
      filledValues({ narodnost: "PL", prvni_zamestnani: "ne", pojistovna: "" }),
      filledFiles(),
    );
    expect(res.valid).toBe(true);
  });

  it("does not require proof of education for primary education", () => {
    const res = validateDotaznik(
      filledValues({ vzdelani: "opt_zakladni" }),
      filledFiles({ doklad_vzdelani: null }),
    );
    expect(res.valid).toBe(true);
  });
});
