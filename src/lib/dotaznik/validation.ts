// Onboarding questionnaire — pure form logic (no React/DOM imports).
// Ported 1:1 from the original standalone HTML form so behavior can be
// unit-tested: conditional visibility (citizenship → first employment →
// health insurance), required-field validation and the birth-number format.

export type AnoNe = "ano" | "ne" | "";

/** Text/choice values keyed by the submitted field names of the original form. */
export interface DotaznikValues {
  titul_pred: string;
  titul_za: string;
  jmeno: string;
  prijmeni: string;
  rodne_prijmeni: string;
  rodne_cislo: string;
  /** Stable option key from RODINNY_STAV_OPTIONS ("" = not selected). */
  rodinny_stav: string;
  /** Stable option key from VZDELANI_OPTIONS ("" = not selected). */
  vzdelani: string;
  /** Country code (CZ/SK/PL/UA/PH/OTHER) or "". */
  narodnost: string;
  narodnost_jina: string;
  prvni_zamestnani: AnoNe;
  predvolba: string;
  telefon: string;
  email: string;
  email2: string;
  ulice: string;
  cislo_popisne: string;
  mesto: string;
  psc: string;
  k_ulice: string;
  k_cislo_popisne: string;
  k_mesto: string;
  k_psc: string;
  srazky: AnoNe;
  /** Insurance company literal, POJISTOVNA_JINA sentinel, or "". */
  pojistovna: string;
  ucet: string;
  obed: AnoNe;
  velikost_tricko: string;
  velikost_obuv: string;
  gdpr: boolean;
  pravdivost: boolean;
  souhlas_zverejneni: boolean;
}

/** Attached files keyed by the submitted field names of the original form. */
export interface DotaznikFiles {
  op_predni: File | null;
  op_zadni: File | null;
  doklad_vzdelani: File | null;
  zapoctovy_list: File | null;
  pojistovna_foto: File | null;
}

export const EMPTY_VALUES: DotaznikValues = {
  titul_pred: "",
  titul_za: "",
  jmeno: "",
  prijmeni: "",
  rodne_prijmeni: "",
  rodne_cislo: "",
  rodinny_stav: "",
  vzdelani: "",
  narodnost: "",
  narodnost_jina: "",
  prvni_zamestnani: "",
  predvolba: "+420",
  telefon: "",
  email: "",
  email2: "",
  ulice: "",
  cislo_popisne: "",
  mesto: "",
  psc: "",
  k_ulice: "",
  k_cislo_popisne: "",
  k_mesto: "",
  k_psc: "",
  srazky: "",
  pojistovna: "",
  ucet: "",
  obed: "",
  velikost_tricko: "",
  velikost_obuv: "",
  gdpr: false,
  pravdivost: false,
  souhlas_zverejneni: false,
};

export const EMPTY_FILES: DotaznikFiles = {
  op_predni: null,
  op_zadni: null,
  doklad_vzdelani: null,
  zapoctovy_list: null,
  pojistovna_foto: null,
};

/** Birth number: 6 digits, optional slash, 3–4 digits (e.g. 000000/0000). */
export function validateRodneCislo(v: string): boolean {
  return /^\d{6}\/?\d{3,4}$/.test(v.trim());
}

export function emailsMatch(values: DotaznikValues): boolean {
  return (
    values.email.trim().toLowerCase() === values.email2.trim().toLowerCase()
  );
}

export function isForeigner(values: DotaznikValues): boolean {
  return values.narodnost !== "" && values.narodnost !== "CZ";
}

/** "Other" citizenship → free-text field is shown and required. */
export function showNarodnostJina(values: DotaznikValues): boolean {
  return values.narodnost === "OTHER";
}

/** "First employment in CZ?" is asked only for foreigners. */
export function showPrvniZamestnani(values: DotaznikValues): boolean {
  return isForeigner(values);
}

/**
 * Insurance company field:
 * - Czech citizen: always fills it in (no card photo needed).
 * - Foreigner, first employment in CZ: fills it in + uploads a card photo.
 * - Foreigner who already worked in CZ: does not fill it in (HR completes it).
 */
export function showPojistovna(values: DotaznikValues): boolean {
  return !(isForeigner(values) && values.prvni_zamestnani === "ne");
}

export function showPojistovnaFoto(values: DotaznikValues): boolean {
  return isForeigner(values) && values.prvni_zamestnani === "ano";
}

/** Proof of education is not required for primary education. */
export function showDokladVzdelani(values: DotaznikValues): boolean {
  return values.vzdelani !== "" && values.vzdelani !== "opt_zakladni";
}

/**
 * Clears values of fields that became hidden by a conditional rule, mirroring
 * the original form (hiding "other citizenship" wipes its text, hiding the
 * first-employment question unchecks it, hiding insurance clears the select).
 */
export function normalizeValues(values: DotaznikValues): DotaznikValues {
  const next = { ...values };
  if (!showNarodnostJina(next)) next.narodnost_jina = "";
  if (!showPrvniZamestnani(next)) next.prvni_zamestnani = "";
  if (!showPojistovna(next)) next.pojistovna = "";
  return next;
}

export interface ValidationResult {
  valid: boolean;
  /** Field names (original element ids) that failed validation. */
  invalid: Set<string>;
  emailMismatch: boolean;
}

export function validateDotaznik(
  values: DotaznikValues,
  files: DotaznikFiles,
): ValidationResult {
  const invalid = new Set<string>();
  const req = (name: keyof DotaznikValues) => {
    if (values[name] === "") invalid.add(name);
  };

  req("jmeno");
  req("prijmeni");
  req("rodinny_stav");
  req("vzdelani");
  req("narodnost");
  req("telefon");
  req("email");
  req("email2");
  req("ulice");
  req("cislo_popisne");
  req("mesto");
  req("psc");
  req("ucet");
  req("velikost_tricko");
  req("velikost_obuv");
  req("srazky");
  req("obed");

  if (!validateRodneCislo(values.rodne_cislo)) invalid.add("rodne_cislo");

  if (showNarodnostJina(values)) req("narodnost_jina");
  if (showPrvniZamestnani(values)) req("prvni_zamestnani");
  if (showPojistovna(values)) req("pojistovna");
  if (showPojistovnaFoto(values) && !files.pojistovna_foto) {
    invalid.add("pojistovna_foto");
  }

  if (!files.op_predni) invalid.add("op_predni");
  if (!files.op_zadni) invalid.add("op_zadni");
  if (showDokladVzdelani(values) && !files.doklad_vzdelani) {
    invalid.add("doklad_vzdelani");
  }

  const emailMismatch = !emailsMatch(values);
  if (emailMismatch) invalid.add("email2");

  if (!values.gdpr) invalid.add("gdpr");
  if (!values.pravdivost) invalid.add("pravdivost");

  return { valid: invalid.size === 0, invalid, emailMismatch };
}
