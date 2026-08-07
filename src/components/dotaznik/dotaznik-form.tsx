"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import logo from "@/app/(dotaznik)/finidr-logo.jpg";
import {
  ENDPOINT_URL,
  NARODNOST_OPTIONS,
  OBUV_OPTIONS,
  POJISTOVNA_JINA,
  POJISTOVNA_OPTIONS,
  PREDVOLBA_OPTIONS,
  RODINNY_STAV_OPTIONS,
  TRICKO_OPTIONS,
  VZDELANI_OPTIONS,
} from "@/lib/dotaznik/constants";
import {
  LANGS,
  translations,
  type Lang,
  type Translation,
} from "@/lib/dotaznik/translations";
import {
  EMPTY_FILES,
  EMPTY_VALUES,
  emailsMatch,
  normalizeValues,
  showDokladVzdelani,
  showNarodnostJina,
  showPojistovna,
  showPojistovnaFoto,
  showPrvniZamestnani,
  validateDotaznik,
  type AnoNe,
  type DotaznikFiles,
  type DotaznikValues,
} from "@/lib/dotaznik/validation";

type Phase = "form" | "recap" | "success";

const LANG_LABELS: Record<Lang, string> = { cs: "CZ", pl: "PL", en: "EN" };

export function DotaznikForm() {
  const [lang, setLang] = useState<Lang>("cs");
  const [phase, setPhase] = useState<Phase>("form");
  const [values, setValues] = useState<DotaznikValues>(EMPTY_VALUES);
  const [files, setFiles] = useState<DotaznikFiles>(EMPTY_FILES);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const email2Ref = useRef<HTMLInputElement>(null);
  const gdprRef = useRef<HTMLInputElement>(null);
  const pravdivostRef = useRef<HTMLInputElement>(null);

  const dict = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict.page_title;
  }, [lang, dict]);

  const patch = (p: Partial<DotaznikValues>) =>
    setValues((v) => normalizeValues({ ...v, ...p }));

  const setFile =
    (name: keyof DotaznikFiles) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFiles((f) => ({ ...f, [name]: e.target.files?.[0] ?? null }));

  // Live email check: a mismatch is reported once the user typed something
  // into the confirmation field; fixing it clears the highlight immediately.
  const emailMismatchLive =
    values.email2.trim() !== "" && !emailsMatch(values);
  const email2Invalid =
    emailMismatchLive || (invalid.has("email2") && values.email2.trim() === "");

  const fieldClass = (name: string, extra?: string) =>
    "field" +
    (extra ? ` ${extra}` : "") +
    (invalid.has(name) ? " invalid" : "");

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const result = validateDotaznik(values, files);
    setInvalid(result.invalid);

    if (!result.valid) {
      setFormError(
        result.emailMismatch ? dict.msg_email_mismatch : dict.msg_invalid,
      );
      // Wait for React to paint the .invalid highlights before scrolling.
      setTimeout(() => {
        if (result.emailMismatch) {
          email2Ref.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          email2Ref.current?.focus({ preventScroll: true });
          return;
        }
        const firstInvalid = document.querySelector(".field.invalid");
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
          firstInvalid
            .querySelector<HTMLElement>("input, select")
            ?.focus({ preventScroll: true });
        } else {
          // Unchecked mandatory consents have no .field wrapper.
          const missing = !values.gdpr ? gdprRef.current : pravdivostRef.current;
          missing?.scrollIntoView({ behavior: "smooth", block: "center" });
          missing?.focus({ preventScroll: true });
        }
      }, 0);
      return;
    }

    setPhase("recap");
    setRecapError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setPhase("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Localized display value of a select stored as a translation key. */
  const optLabel = (key: string): string =>
    key !== "" ? String(dict[key as keyof Translation]) : "";

  const pojistovnaLabel = (v: string): string =>
    v === POJISTOVNA_JINA ? dict.opt_jina : v;

  async function handleConfirm() {
    setRecapError(null);

    if (!ENDPOINT_URL) {
      setRecapError(dict.msg_no_endpoint);
      return;
    }

    // FormData (not JSON) because the form carries file attachments. Field
    // names and value formats match the original standalone form so the same
    // backend keeps working; localized selects submit their display text.
    const data = new FormData();
    data.append("titul_pred", values.titul_pred);
    data.append("titul_za", values.titul_za);
    data.append("jmeno", values.jmeno);
    data.append("prijmeni", values.prijmeni);
    data.append("rodne_prijmeni", values.rodne_prijmeni);
    data.append("rodne_cislo", values.rodne_cislo);
    data.append("rodinny_stav", optLabel(values.rodinny_stav));
    data.append("vzdelani", optLabel(values.vzdelani));
    data.append("narodnost", values.narodnost);
    data.append("narodnost_jina", values.narodnost_jina);
    if (values.prvni_zamestnani !== "") {
      data.append("prvni_zamestnani", values.prvni_zamestnani);
    }
    data.append("predvolba", values.predvolba);
    data.append("telefon", `${values.predvolba} ${values.telefon.trim()}`);
    data.append("email", values.email);
    data.append("email2", values.email2);
    data.append("ulice", values.ulice);
    data.append("cislo_popisne", values.cislo_popisne);
    data.append("mesto", values.mesto);
    data.append("psc", values.psc);
    data.append("k_ulice", values.k_ulice);
    data.append("k_cislo_popisne", values.k_cislo_popisne);
    data.append("k_mesto", values.k_mesto);
    data.append("k_psc", values.k_psc);
    if (values.srazky !== "") data.append("srazky", values.srazky);
    data.append("pojistovna", pojistovnaLabel(values.pojistovna));
    data.append("ucet", values.ucet);
    if (values.obed !== "") data.append("obed", values.obed);
    data.append("velikost_tricko", values.velikost_tricko);
    data.append("velikost_obuv", values.velikost_obuv);
    if (values.gdpr) data.append("gdpr", "on");
    if (values.pravdivost) data.append("pravdivost", "on");
    if (values.souhlas_zverejneni) data.append("souhlas_zverejneni", "on");
    if (files.op_predni) data.append("op_predni", files.op_predni);
    if (files.op_zadni) data.append("op_zadni", files.op_zadni);
    if (showDokladVzdelani(values) && files.doklad_vzdelani) {
      data.append("doklad_vzdelani", files.doklad_vzdelani);
    }
    if (files.zapoctovy_list) {
      data.append("zapoctovy_list", files.zapoctovy_list);
    }
    if (showPojistovnaFoto(values) && files.pojistovna_foto) {
      data.append("pojistovna_foto", files.pojistovna_foto);
    }
    data.append("jazyk_dotazniku", lang);
    // FormSubmit control fields (ignored by other backends): email subject,
    // table-formatted body, no captcha interstitial.
    data.append(
      "_subject",
      `Nástupní dotazník – ${values.jmeno.trim()} ${values.prijmeni.trim()}`,
    );
    data.append("_template", "table");
    data.append("_captcha", "false");

    setSubmitting(true);
    try {
      // Content-Type is intentionally not set — the browser adds the
      // multipart boundary itself.
      const res = await fetch(ENDPOINT_URL, { method: "POST", body: data });
      if (!res.ok) throw new Error("Server error");
      setPhase("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setRecapError(dict.msg_submit_error);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Recap rows -------------------------------------------------------

  interface RecapRow {
    label: string;
    value: string;
  }
  interface RecapGroup {
    heading: string;
    rows: RecapRow[];
  }

  function buildRecap(): RecapGroup[] {
    const anoNe = (v: AnoNe | boolean): string =>
      (typeof v === "boolean" ? v : v === "ano") ? dict.opt_ano : dict.opt_ne;
    const fileName = (f: File | null): string => (f ? f.name : "");
    const korr = (label: string) => `${dict.sub_korespondencni} – ${label}`;

    const personal: RecapRow[] = [
      { label: dict.lbl_titul_pred, value: values.titul_pred.trim() },
      { label: dict.lbl_jmeno, value: values.jmeno.trim() },
      { label: dict.lbl_prijmeni, value: values.prijmeni.trim() },
      { label: dict.lbl_titul_za, value: values.titul_za.trim() },
      { label: dict.lbl_rodne_prijmeni, value: values.rodne_prijmeni.trim() },
      { label: dict.lbl_rodne_cislo, value: values.rodne_cislo.trim() },
      { label: dict.lbl_rodinny_stav, value: optLabel(values.rodinny_stav) },
      { label: dict.lbl_vzdelani, value: optLabel(values.vzdelani) },
      {
        label: dict.lbl_narodnost,
        value: optLabel(
          NARODNOST_OPTIONS.find((o) => o.value === values.narodnost)?.label ??
            "",
        ),
      },
    ];
    if (showNarodnostJina(values)) {
      personal.push({
        label: dict.lbl_narodnost_jina,
        value: values.narodnost_jina.trim(),
      });
    }
    if (showPrvniZamestnani(values)) {
      personal.push({
        label: dict.lbl_prvni_zamestnani,
        value:
          values.prvni_zamestnani === ""
            ? ""
            : anoNe(values.prvni_zamestnani),
      });
    }

    const contact: RecapRow[] = [
      {
        label: dict.lbl_telefon,
        value: `${values.predvolba} ${values.telefon.trim()}`.trim(),
      },
      { label: dict.lbl_email, value: values.email.trim() },
      { label: dict.lbl_ulice, value: values.ulice.trim() },
      { label: dict.lbl_cislo_popisne, value: values.cislo_popisne.trim() },
      { label: dict.lbl_mesto, value: values.mesto.trim() },
      { label: dict.lbl_psc, value: values.psc.trim() },
      { label: korr(dict.lbl_ulice), value: values.k_ulice.trim() },
      {
        label: korr(dict.lbl_cislo_popisne),
        value: values.k_cislo_popisne.trim(),
      },
      { label: korr(dict.lbl_mesto), value: values.k_mesto.trim() },
      { label: korr(dict.lbl_psc), value: values.k_psc.trim() },
    ];

    const documents: RecapRow[] = [
      { label: dict.lbl_op_predni, value: fileName(files.op_predni) },
      { label: dict.lbl_op_zadni, value: fileName(files.op_zadni) },
    ];
    if (showDokladVzdelani(values)) {
      documents.push({
        label: dict.lbl_doklad_vzdelani,
        value: fileName(files.doklad_vzdelani),
      });
    }
    documents.push({
      label: dict.lbl_zapoctovy_list,
      value: fileName(files.zapoctovy_list),
    });

    const financial: RecapRow[] = [
      {
        label: dict.lbl_srazky,
        value: values.srazky === "" ? "" : anoNe(values.srazky),
      },
    ];
    if (showPojistovna(values)) {
      financial.push({
        label: dict.lbl_pojistovna,
        value: pojistovnaLabel(values.pojistovna),
      });
    }
    if (showPojistovnaFoto(values)) {
      financial.push({
        label: dict.lbl_pojistovna_foto,
        value: fileName(files.pojistovna_foto),
      });
    }
    financial.push({ label: dict.lbl_ucet, value: values.ucet.trim() });

    return [
      { heading: dict.sec_personal, rows: personal },
      { heading: dict.sec_contact, rows: contact },
      { heading: dict.sec_documents, rows: documents },
      { heading: dict.sec_financial, rows: financial },
      {
        heading: dict.sec_first_day,
        rows: [
          {
            label: dict.lbl_obed,
            value: values.obed === "" ? "" : anoNe(values.obed),
          },
        ],
      },
      {
        heading: dict.sec_equipment,
        rows: [
          { label: dict.lbl_tricko, value: values.velikost_tricko },
          { label: dict.lbl_obuv, value: values.velikost_obuv },
        ],
      },
      {
        heading: dict.sec_consents,
        rows: [
          { label: dict.lbl_gdpr, value: anoNe(values.gdpr) },
          { label: dict.lbl_pravdivost, value: anoNe(values.pravdivost) },
          {
            label: dict.lbl_souhlas_zverejneni,
            value: anoNe(values.souhlas_zverejneni),
          },
        ],
      },
    ];
  }

  // --- Render -----------------------------------------------------------

  return (
    <>
      <header>
        <div className="inner">
          <div className="top-row">
            <div className="logo-row">
              <Image
                className="logo-img"
                src={logo}
                alt="FINIDR, s.r.o. logo"
                priority
              />
            </div>
            <div className="lang-switch">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={l === lang ? "active" : undefined}
                  onClick={() => setLang(l)}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <h1>{dict.h1}</h1>
          <p>{dict.intro}</p>
        </div>
      </header>

      <main>
        {phase === "form" && (
          <form onSubmit={handleReview} noValidate>
            <div className="card">
              <h2>{dict.sec_personal}</h2>
              <div className="row">
                <div className="field">
                  <label htmlFor="titul_pred">
                    {dict.lbl_titul_pred}{" "}
                    <span className="opt">{dict.opt_nepovinne}</span>
                  </label>
                  <input
                    type="text"
                    id="titul_pred"
                    placeholder="Ing., Bc., Mgr., …"
                    value={values.titul_pred}
                    onChange={(e) => patch({ titul_pred: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="titul_za">
                    {dict.lbl_titul_za}{" "}
                    <span className="opt">{dict.opt_nepovinne}</span>
                  </label>
                  <input
                    type="text"
                    id="titul_za"
                    placeholder="Ph.D., DiS., MBA, …"
                    value={values.titul_za}
                    onChange={(e) => patch({ titul_za: e.target.value })}
                  />
                </div>
              </div>
              <div className="row">
                <div className={fieldClass("jmeno")}>
                  <label htmlFor="jmeno">{dict.lbl_jmeno}</label>
                  <input
                    type="text"
                    id="jmeno"
                    required
                    value={values.jmeno}
                    onChange={(e) => patch({ jmeno: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_jmeno}</div>
                </div>
                <div className={fieldClass("prijmeni")}>
                  <label htmlFor="prijmeni">{dict.lbl_prijmeni}</label>
                  <input
                    type="text"
                    id="prijmeni"
                    required
                    value={values.prijmeni}
                    onChange={(e) => patch({ prijmeni: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_prijmeni}</div>
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="rodne_prijmeni">
                    {dict.lbl_rodne_prijmeni}{" "}
                    <span className="opt">{dict.opt_pokud_se_lisi}</span>
                  </label>
                  <input
                    type="text"
                    id="rodne_prijmeni"
                    value={values.rodne_prijmeni}
                    onChange={(e) => patch({ rodne_prijmeni: e.target.value })}
                  />
                </div>
                <div className={fieldClass("rodne_cislo")}>
                  <label htmlFor="rodne_cislo">{dict.lbl_rodne_cislo}</label>
                  <input
                    type="text"
                    id="rodne_cislo"
                    placeholder="000000/0000"
                    required
                    value={values.rodne_cislo}
                    onChange={(e) => patch({ rodne_cislo: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_rodne_cislo}</div>
                </div>
              </div>
              <div className="row">
                <div className={fieldClass("rodinny_stav")}>
                  <label htmlFor="rodinny_stav">{dict.lbl_rodinny_stav}</label>
                  <select
                    id="rodinny_stav"
                    required
                    value={values.rodinny_stav}
                    onChange={(e) => patch({ rodinny_stav: e.target.value })}
                  >
                    <option value="">{dict.opt_vyberte}</option>
                    {RODINNY_STAV_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {optLabel(key)}
                      </option>
                    ))}
                  </select>
                  <div className="error-msg">{dict.err_rodinny_stav}</div>
                </div>
                <div className={fieldClass("vzdelani")}>
                  <label htmlFor="vzdelani">{dict.lbl_vzdelani}</label>
                  <select
                    id="vzdelani"
                    required
                    value={values.vzdelani}
                    onChange={(e) => patch({ vzdelani: e.target.value })}
                  >
                    <option value="">{dict.opt_vyberte}</option>
                    {VZDELANI_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {optLabel(key)}
                      </option>
                    ))}
                  </select>
                  <div className="error-msg">{dict.err_vzdelani}</div>
                </div>
              </div>
              <div className="row">
                <div className={fieldClass("narodnost")}>
                  <label htmlFor="narodnost">{dict.lbl_narodnost}</label>
                  <select
                    id="narodnost"
                    required
                    value={values.narodnost}
                    onChange={(e) => patch({ narodnost: e.target.value })}
                  >
                    <option value="">{dict.opt_vyberte}</option>
                    {NARODNOST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {optLabel(o.label)}
                      </option>
                    ))}
                  </select>
                  <div className="error-msg">{dict.err_narodnost}</div>
                </div>
                {showNarodnostJina(values) && (
                  <div className={fieldClass("narodnost_jina")}>
                    <label htmlFor="narodnost_jina">
                      {dict.lbl_narodnost_jina}
                    </label>
                    <input
                      type="text"
                      id="narodnost_jina"
                      value={values.narodnost_jina}
                      onChange={(e) =>
                        patch({ narodnost_jina: e.target.value })
                      }
                    />
                    <div className="error-msg">{dict.err_narodnost_jina}</div>
                  </div>
                )}
              </div>
              {showPrvniZamestnani(values) && (
                <div className={fieldClass("prvni_zamestnani", "full")}>
                  <label>{dict.lbl_prvni_zamestnani}</label>
                  <div className="radio-group">
                    {(["ano", "ne"] as const).map((v) => (
                      <label key={v}>
                        <input
                          type="radio"
                          name="prvni_zamestnani"
                          value={v}
                          checked={values.prvni_zamestnani === v}
                          onChange={() => patch({ prvni_zamestnani: v })}
                        />{" "}
                        <span>{v === "ano" ? dict.opt_ano : dict.opt_ne}</span>
                      </label>
                    ))}
                  </div>
                  <div className="error-msg">{dict.err_choice}</div>
                </div>
              )}
            </div>

            <div className="card">
              <h2>{dict.sec_contact}</h2>
              <div className={fieldClass("telefon", "full")}>
                <label htmlFor="telefon">{dict.lbl_telefon}</label>
                <div className="phone-row">
                  <select
                    id="predvolba"
                    value={values.predvolba}
                    onChange={(e) => patch({ predvolba: e.target.value })}
                  >
                    {PREDVOLBA_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    id="telefon"
                    placeholder="000 000 000"
                    required
                    value={values.telefon}
                    onChange={(e) => patch({ telefon: e.target.value })}
                  />
                </div>
                <div className="error-msg">{dict.err_telefon}</div>
              </div>
              <div className="row">
                <div className={fieldClass("email")}>
                  <label htmlFor="email">{dict.lbl_email}</label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    required
                    value={values.email}
                    onChange={(e) => patch({ email: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_email}</div>
                </div>
                <div className={"field" + (email2Invalid ? " invalid" : "")}>
                  <label htmlFor="email2">{dict.lbl_email2}</label>
                  <input
                    type="email"
                    id="email2"
                    autoComplete="off"
                    required
                    ref={email2Ref}
                    value={values.email2}
                    onChange={(e) => patch({ email2: e.target.value })}
                    onPaste={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                  />
                  <div className="error-msg">{dict.err_email2}</div>
                </div>
              </div>
              <p className="hint" style={{ marginTop: -6 }}>
                {dict.hint_email2}
              </p>

              <h3 className="sub">{dict.sub_trvale_bydliste}</h3>
              <div className="row">
                <div className={fieldClass("ulice")}>
                  <label htmlFor="ulice">{dict.lbl_ulice}</label>
                  <input
                    type="text"
                    id="ulice"
                    required
                    value={values.ulice}
                    onChange={(e) => patch({ ulice: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_ulice}</div>
                </div>
                <div className={fieldClass("cislo_popisne")}>
                  <label htmlFor="cislo_popisne">
                    {dict.lbl_cislo_popisne}
                  </label>
                  <input
                    type="text"
                    id="cislo_popisne"
                    required
                    value={values.cislo_popisne}
                    onChange={(e) => patch({ cislo_popisne: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_cislo_popisne}</div>
                </div>
              </div>
              <div className="row">
                <div className={fieldClass("mesto")}>
                  <label htmlFor="mesto">{dict.lbl_mesto}</label>
                  <input
                    type="text"
                    id="mesto"
                    required
                    value={values.mesto}
                    onChange={(e) => patch({ mesto: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_mesto}</div>
                </div>
                <div className={fieldClass("psc")}>
                  <label htmlFor="psc">{dict.lbl_psc}</label>
                  <input
                    type="text"
                    id="psc"
                    placeholder="000 00"
                    required
                    value={values.psc}
                    onChange={(e) => patch({ psc: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_psc}</div>
                </div>
              </div>

              <h3 className="sub tight">
                {dict.sub_korespondencni}{" "}
                <span className="opt">
                  {dict.opt_adresa_korespondencni_hint}
                </span>
              </h3>
              <div className="row">
                <div className="field">
                  <label htmlFor="k_ulice">{dict.lbl_ulice}</label>
                  <input
                    type="text"
                    id="k_ulice"
                    value={values.k_ulice}
                    onChange={(e) => patch({ k_ulice: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="k_cislo_popisne">
                    {dict.lbl_cislo_popisne}
                  </label>
                  <input
                    type="text"
                    id="k_cislo_popisne"
                    value={values.k_cislo_popisne}
                    onChange={(e) =>
                      patch({ k_cislo_popisne: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor="k_mesto">{dict.lbl_mesto}</label>
                  <input
                    type="text"
                    id="k_mesto"
                    value={values.k_mesto}
                    onChange={(e) => patch({ k_mesto: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="k_psc">{dict.lbl_psc}</label>
                  <input
                    type="text"
                    id="k_psc"
                    placeholder="000 00"
                    value={values.k_psc}
                    onChange={(e) => patch({ k_psc: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2>{dict.sec_documents}</h2>
              <p className="hint">{dict.documents_hint}</p>
              <div className="row">
                <div className={fieldClass("op_predni")}>
                  <label htmlFor="op_predni">{dict.lbl_op_predni}</label>
                  <input
                    type="file"
                    id="op_predni"
                    accept="image/*,.pdf"
                    capture="environment"
                    required
                    onChange={setFile("op_predni")}
                  />
                  <div className="error-msg">{dict.err_op_predni}</div>
                </div>
                <div className={fieldClass("op_zadni")}>
                  <label htmlFor="op_zadni">{dict.lbl_op_zadni}</label>
                  <input
                    type="file"
                    id="op_zadni"
                    accept="image/*,.pdf"
                    capture="environment"
                    required
                    onChange={setFile("op_zadni")}
                  />
                  <div className="error-msg">{dict.err_op_zadni}</div>
                </div>
              </div>
              {showDokladVzdelani(values) && (
                <div className={fieldClass("doklad_vzdelani", "full")}>
                  <label htmlFor="doklad_vzdelani">
                    {dict.lbl_doklad_vzdelani}{" "}
                    <span className="opt">{dict.opt_doklad_vzdelani_hint}</span>
                  </label>
                  <input
                    type="file"
                    id="doklad_vzdelani"
                    accept="image/*,.pdf"
                    onChange={setFile("doklad_vzdelani")}
                  />
                  <div className="error-msg">{dict.err_doklad_vzdelani}</div>
                </div>
              )}
              <div className="field full">
                <label htmlFor="zapoctovy_list">
                  {dict.lbl_zapoctovy_list}{" "}
                  <span className="opt">{dict.opt_nepovinne}</span>
                </label>
                <input
                  type="file"
                  id="zapoctovy_list"
                  accept="image/*,.pdf"
                  onChange={setFile("zapoctovy_list")}
                />
              </div>
            </div>

            <div className="card">
              <h2>{dict.sec_deductions}</h2>
              <div className={fieldClass("srazky", "full")}>
                <label>{dict.lbl_srazky}</label>
                <div className="radio-group">
                  {(["ano", "ne"] as const).map((v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="srazky"
                        value={v}
                        checked={values.srazky === v}
                        onChange={() => patch({ srazky: v })}
                      />{" "}
                      <span>{v === "ano" ? dict.opt_ano : dict.opt_ne}</span>
                    </label>
                  ))}
                </div>
                <div className="error-msg">{dict.err_choice}</div>
              </div>
            </div>

            <div className="card">
              <h2>{dict.sec_financial}</h2>
              <div className="row">
                {showPojistovna(values) && (
                  <div className={fieldClass("pojistovna")}>
                    <label htmlFor="pojistovna">{dict.lbl_pojistovna}</label>
                    <select
                      id="pojistovna"
                      required
                      value={values.pojistovna}
                      onChange={(e) => patch({ pojistovna: e.target.value })}
                    >
                      <option value="">{dict.opt_vyberte}</option>
                      {POJISTOVNA_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value={POJISTOVNA_JINA}>{dict.opt_jina}</option>
                    </select>
                    <div className="error-msg">{dict.err_pojistovna}</div>
                  </div>
                )}
                <div className={fieldClass("ucet")}>
                  <label htmlFor="ucet">
                    {dict.lbl_ucet}{" "}
                    <span className="opt">{dict.opt_ucet_hint}</span>
                  </label>
                  <input
                    type="text"
                    id="ucet"
                    placeholder="123456789/0100"
                    required
                    value={values.ucet}
                    onChange={(e) => patch({ ucet: e.target.value })}
                  />
                  <div className="error-msg">{dict.err_ucet}</div>
                </div>
              </div>
              {showPojistovnaFoto(values) && (
                <div className={fieldClass("pojistovna_foto", "full")}>
                  <label htmlFor="pojistovna_foto">
                    {dict.lbl_pojistovna_foto}
                  </label>
                  <input
                    type="file"
                    id="pojistovna_foto"
                    accept="image/*,.pdf"
                    capture="environment"
                    onChange={setFile("pojistovna_foto")}
                  />
                  <div className="error-msg">{dict.err_pojistovna_foto}</div>
                </div>
              )}
              {!showPojistovna(values) && (
                <p className="hint" style={{ marginBottom: 0 }}>
                  {dict.hint_pojistovna_nevyplnovat}
                </p>
              )}
            </div>

            <div className="card">
              <h2>{dict.sec_first_day}</h2>
              <div className={fieldClass("obed", "full")}>
                <label>{dict.lbl_obed}</label>
                <p className="hint" style={{ marginTop: -6 }}>
                  {dict.hint_obed}
                </p>
                <div className="radio-group">
                  {(["ano", "ne"] as const).map((v) => (
                    <label key={v}>
                      <input
                        type="radio"
                        name="obed"
                        value={v}
                        checked={values.obed === v}
                        onChange={() => patch({ obed: v })}
                      />{" "}
                      <span>{v === "ano" ? dict.opt_ano : dict.opt_ne}</span>
                    </label>
                  ))}
                </div>
                <div className="error-msg">{dict.err_choice}</div>
              </div>
            </div>

            <div className="card">
              <h2>{dict.sec_equipment}</h2>
              <div className="row">
                <div className={fieldClass("velikost_tricko")}>
                  <label htmlFor="velikost_tricko">{dict.lbl_tricko}</label>
                  <select
                    id="velikost_tricko"
                    required
                    value={values.velikost_tricko}
                    onChange={(e) =>
                      patch({ velikost_tricko: e.target.value })
                    }
                  >
                    <option value="">{dict.opt_vyberte}</option>
                    {TRICKO_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="error-msg">{dict.err_tricko}</div>
                </div>
                <div className={fieldClass("velikost_obuv")}>
                  <label htmlFor="velikost_obuv">
                    {dict.lbl_obuv} <span className="opt">(EU)</span>
                  </label>
                  <select
                    id="velikost_obuv"
                    required
                    value={values.velikost_obuv}
                    onChange={(e) => patch({ velikost_obuv: e.target.value })}
                  >
                    <option value="">{dict.opt_vyberte}</option>
                    {OBUV_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="error-msg">{dict.err_obuv}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>{dict.sec_consents}</h2>
              <div className="box">{dict.gdpr_box}</div>
              <div className="consent">
                <input
                  type="checkbox"
                  id="gdpr"
                  required
                  ref={gdprRef}
                  checked={values.gdpr}
                  onChange={(e) => patch({ gdpr: e.target.checked })}
                />
                <label htmlFor="gdpr" className="consent-label">
                  {dict.lbl_gdpr}
                </label>
              </div>
              <div className="consent">
                <input
                  type="checkbox"
                  id="pravdivost"
                  required
                  ref={pravdivostRef}
                  checked={values.pravdivost}
                  onChange={(e) => patch({ pravdivost: e.target.checked })}
                />
                <label htmlFor="pravdivost" className="consent-label">
                  {dict.lbl_pravdivost}
                </label>
              </div>

              <div className="box">
                {dict.publish_intro}
                <ul>
                  {dict.publish_items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="consent">
                <input
                  type="checkbox"
                  id="souhlas_zverejneni"
                  checked={values.souhlas_zverejneni}
                  onChange={(e) =>
                    patch({ souhlas_zverejneni: e.target.checked })
                  }
                />
                <label htmlFor="souhlas_zverejneni" className="consent-label">
                  {dict.lbl_souhlas_zverejneni}{" "}
                  <span className="opt">{dict.opt_souhlas_zverejneni_hint}</span>
                </label>
              </div>
            </div>

            <button type="submit">{dict.btn_review}</button>
            {formError && <div className="status err">{formError}</div>}
          </form>
        )}

        {phase === "recap" && (
          <div>
            <div className="card">
              <h2>{dict.recap_title}</h2>
              <p className="hint">{dict.recap_intro}</p>
              <div className="recap-note">{dict.recap_note}</div>
              <div>
                {buildRecap().map((group) => (
                  <div className="recap-group" key={group.heading}>
                    <h3>{group.heading}</h3>
                    <table className="recap-table">
                      <tbody>
                        {group.rows.map((row, i) => (
                          <tr key={`${row.label}-${i}`}>
                            <td className="k">{row.label}</td>
                            <td className={row.value === "" ? "v empty" : "v"}>
                              {row.value === "" ? dict.recap_empty : row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
            <div className="recap-buttons">
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={handleBack}
              >
                {dict.btn_back}
              </button>
              <button type="button" disabled={submitting} onClick={handleConfirm}>
                {submitting ? dict.btn_submitting : dict.btn_confirm_send}
              </button>
            </div>
            {recapError && <div className="status err">{recapError}</div>}
          </div>
        )}

        {phase === "success" && (
          <div className="card success-screen">
            <h2>{dict.success_title}</h2>
            <p>{dict.success_text}</p>
          </div>
        )}
      </main>

      <footer>{dict.footer_text}</footer>
    </>
  );
}
