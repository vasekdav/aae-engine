// Onboarding questionnaire — option lists and submission endpoint.
// Option values are stable keys; display labels come from translations.ts
// (`opt_*` keys). Literal option lists (insurance companies, sizes, phone
// prefixes) are shown as-is in every language, matching the original form.

import type { Translation } from "./translations";

// The form posts multipart/form-data (attachments included) to this endpoint,
// e.g. a deployed Google Apps Script web app that forwards the data to HR.
// Configure via env so the URL is not hard-coded in the repository.
export const ENDPOINT_URL =
  process.env.NEXT_PUBLIC_DOTAZNIK_ENDPOINT_URL ?? "";

export type OptionKey = keyof Translation;

export const RODINNY_STAV_OPTIONS: OptionKey[] = [
  "opt_svobodny",
  "opt_zenaty",
  "opt_rozvedeny",
  "opt_vdovec",
  "opt_partnerstvi",
];

// Order matters: the first option ("opt_zakladni") does not require a proof
// of education, mirroring the original form's `selectedIndex <= 1` rule.
export const VZDELANI_OPTIONS: OptionKey[] = [
  "opt_zakladni",
  "opt_vyucen",
  "opt_stredni",
  "opt_vyssi_odborne",
  "opt_bakalarske",
  "opt_magisterske",
  "opt_doktorske",
];

export const NARODNOST_OPTIONS: { value: string; label: OptionKey }[] = [
  { value: "CZ", label: "opt_nar_cz" },
  { value: "SK", label: "opt_nar_sk" },
  { value: "PL", label: "opt_nar_pl" },
  { value: "UA", label: "opt_nar_ua" },
  { value: "PH", label: "opt_nar_ph" },
  { value: "OTHER", label: "opt_nar_jina" },
];

// Czech public health insurance companies (code – name); shown verbatim.
export const POJISTOVNA_OPTIONS: string[] = [
  "111 – Všeobecná zdravotní pojišťovna (VZP)",
  "201 – Vojenská zdravotní pojišťovna",
  "205 – Česká průmyslová zdravotní pojišťovna",
  "207 – Oborová zdravotní pojišťovna (OZP)",
  "209 – Zaměstnanecká pojišťovna Škoda",
  "211 – Zdravotní pojišťovna ministerstva vnitra (ZP MV ČR)",
  "213 – Revírní bratrská pokladna (RBP)",
];
// Sentinel value for the localized "Other" insurance option.
export const POJISTOVNA_JINA = "jina";

export const PREDVOLBA_OPTIONS = [
  { value: "+420", label: "+420 (CZ)" },
  { value: "+48", label: "+48 (PL)" },
];

export const TRICKO_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export const OBUV_OPTIONS = [
  "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48",
];
