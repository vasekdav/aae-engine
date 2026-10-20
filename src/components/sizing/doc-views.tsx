"use client";

import {
  APP_VERSION,
  CLIMATE,
  DEFAULT_CONSTANTS,
  dataManifest,
  fmt,
  LOCATIONS,
  MATERIALS,
  runSelfTest,
  type ConstEntry,
  type SizingResult,
} from "@/lib/sizing";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { LevelIcon } from "./controls";

const TONE: Record<string, string> = {
  ok: "border-l-emerald-500/60",
  warn: "border-l-amber-500/70",
  bad: "border-l-red-500/70",
  info: "border-l-orange-500/50",
};

export function ProtocolView({ r }: { r: SizingResult }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        Protokol se generuje přímo z výpočtu — každý krok zapisuje rovnici, dosazené hodnoty, výsledek a zdroj. Platnost modelu: profil L40, T_amb −30…+50 °C,
        t ≤ 16 h (LeadVap) / 70 h (FairVap), podkritický tlak; faktory umístění jsou ASSUMED do nahrazení měřením.
      </p>
      <ol className="grid gap-2">
        {r.trace.map((s) => (
          <li
            key={s.n}
            className={cn(
              "grid gap-1 rounded-lg border border-border/50 border-l-4 bg-card/30 p-2.5 text-xs print:break-inside-avoid",
              TONE[s.tone ?? "info"],
            )}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-muted-foreground">{String(s.n).padStart(2, "0")}</span>
              <span className="font-medium text-foreground">{s.title}</span>
            </div>
            {s.eq ? <div className="font-mono text-[11px] text-orange-200/90">{s.eq}</div> : null}
            {s.subst ? <div className="text-[11px] text-muted-foreground">{s.subst}</div> : null}
            <div className="font-mono text-[12px] text-emerald-200">→ {s.result}</div>
            {s.source ? <div className="text-[10px] text-muted-foreground/70">Zdroj: {s.source}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

const STATUS_CLS: Record<string, string> = {
  STANDARD: "text-sky-300",
  CATALOGUE: "text-violet-300",
  CALIBRATED: "text-emerald-300",
  ASSUMED: "text-amber-300",
  OVERRIDE: "text-red-300",
};

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-1 pr-3 font-normal whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/30 align-top">
              {r.map((c, j) => (
                <td key={j} className="py-1 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AssumptionsView() {
  const items = Object.entries(DEFAULT_CONSTANTS.items) as [string, ConstEntry][];
  return (
    <div className="grid gap-4">
      <p className="text-xs text-muted-foreground">
        Jen pro čtení. Každá konstanta má rodný list: hodnota, jednotka, stav (STANDARD / CATALOGUE / CALIBRATED / ASSUMED / OVERRIDE), zdroj, rozsah
        platnosti a jev, který pokrývá. Jádro odmítne sadu, kde dva faktory pokrývají stejný jev.
      </p>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Kalibrace a konstanty (v{DEFAULT_CONSTANTS.version})</h3>
        <Table
          head={["ID", "Hodnota", "Stav", "Pokrývá jev", "Zdroj", "Platnost"]}
          rows={items.map(([id, e]) => [
            <span key="id" className="font-mono">{id}</span>,
            <span key="v" className="font-mono whitespace-nowrap">
              {fmt(e.value, Math.abs(e.value) < 1 ? 4 : 2)} {e.unit}
            </span>,
            <span key="s" className={STATUS_CLS[e.status]}>{e.status}</span>,
            e.covers ?? "—",
            e.source,
            e.validity,
          ])}
        />
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Řady odpařovačů</h3>
        <Table
          head={["Řada", "PS [bar]", "Platnost t [h]", "Kalibrace L40", "Stav"]}
          rows={Object.values(DEFAULT_CONSTANTS.series).map((s) => [
            s.label,
            fmt(s.PS_barg, 0),
            fmt(s.tValid_h, 0),
            s.calibrated ? "ano" : "ne (R06)",
            <span key="s" className={STATUS_CLS[s.status]}>{s.status}</span>,
          ])}
        />
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Umístění (v{LOCATIONS.version}, {LOCATIONS.status})</h3>
        <Table
          head={["Varianta", "f_loc", "ΔT_recirc 8 h [K]", "Roste s t", "Dopad"]}
          rows={LOCATIONS.presets.map((p) => [
            p.label,
            fmt(p.fLoc, 2),
            p.dT8 === null ? "—" : `${fmt(p.dT8, 0)}${p.perExtraRowK ? ` + ${p.perExtraRowK}/řada` : ""}`,
            p.grows ? "√(t/8)" : "—",
            p.impact === "NOGO" ? `NO-GO — ${p.reason}` : p.impact === "WARNING" ? `WARNING — ${p.reason}` : p.impact === "PARAMETRIC" ? "parametrický model (R06)" : "—",
          ])}
        />
        <p className="text-[11px] text-muted-foreground">{LOCATIONS.source}</p>
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Materiály (v{MATERIALS.version})</h3>
        <Table
          head={["Materiál", "T_limit [°C]", "Citlivý na nízkou T", "Stav", "Poznámka"]}
          rows={MATERIALS.items.map((m) => [m.label, fmt(m.Tlimit_C, 0), m.lowTempSensitive ? "ano (R10)" : "ne", <span key="s" className={STATUS_CLS[m.status]}>{m.status}</span>, m.note])}
        />
        <p className="text-[11px] text-muted-foreground">{MATERIALS.source}</p>
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Klima (v{CLIMATE.version}, {CLIMATE.status})</h3>
        <Table
          head={["Lokalita", "θe [°C]", "T_amb,design", "T_amb,min,bezp", "Prům. roční T", "Inverze"]}
          rows={CLIMATE.sites.map((s) => [
            s.label,
            fmt(s.thetaE, 0),
            fmt(s.thetaE - CLIMATE.hourlyOffsetK, 0),
            fmt(s.thetaE - CLIMATE.safetyOffsetK, 0),
            fmt(s.mean, 1),
            s.inversionK ? `+${s.inversionK} K` : "—",
          ])}
        />
        <p className="text-[11px] text-muted-foreground">{CLIMATE.source}</p>
      </section>
    </div>
  );
}

const CHANGELOG = [
  {
    v: "1.0.0-mvp",
    items: [
      "Režimy A Dimenzování, B Ověření, C Bezpečnostní profil, D Porovnání umístění",
      "Třízónový model (ohřev kapaliny / var / přehřátí) s vlastnostmi z CoolProp, ukotvený na kalibraci L40",
      "Pravidla R01–R10, verdikty Kapacita / Ochrana, dohřívač Q_trim, T_amb,crit, specifikace LTPS",
      "Parametrický model umístění (f_loc, ΔT_recirc) s 15 předvolbami",
      "Protokol generovaný z výpočtu, tisk A4 s razítkem a kolonkami Zpracoval / Ověřil",
      "Nezávislá kontrola: referenční výpočet v Pythonu (CoolProp přímo), self-test v aplikaci",
    ],
  },
];

export function AboutView({ fingerprint }: { fingerprint: string }) {
  const manifest = useMemo(() => dataManifest(DEFAULT_CONSTANTS), []);
  const tests = useMemo(() => runSelfTest(DEFAULT_CONSTANTS), []);
  const allPass = tests.every((t) => t.pass);
  return (
    <div className="grid gap-4 text-xs">
      <section className="grid gap-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Verze</h3>
        <p>
          AAE Sizing <span className="font-mono">{APP_VERSION}</span> · otisk dat <span className="font-mono">{fingerprint}</span>
        </p>
        <p className="text-muted-foreground">
          Předběžný návrh a bezpečnostní screening. Nenahrazuje software výrobce ani projektové posouzení; aplikace nikdy nevydává prohlášení o bezpečnosti
          — pouze verdikty GO / WARNING / NO-GO a požadované ochranné vrstvy.
        </p>
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Data a hashe</h3>
        <Table head={["Sada", "Verze", "Zdroj", "FNV-1a"]} rows={manifest.map((m) => [m.name, m.version, m.source, <span key="h" className="font-mono">{m.hash}</span>])} />
      </section>
      <section className="grid gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          Self-test <LevelIcon level={allPass ? "GO" : "NOGO"} className="size-3.5" /> {allPass ? "vše prošlo" : "SELHAL"}
        </h3>
        <Table
          head={["Test", "Výsledek", "Detail"]}
          rows={tests.map((t) => [t.id, <LevelIcon key="l" level={t.pass ? "GO" : "NOGO"} className="size-3.5" />, t.detail])}
        />
        <p className="text-[11px] text-muted-foreground">
          Referenční vektory: scripts/reference/zone_model.py (CoolProp přímo, hustá integrace) — nezávislé na tabulkách a integrátoru aplikace.
        </p>
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">Changelog</h3>
        {CHANGELOG.map((c) => (
          <div key={c.v}>
            <p className="font-mono">{c.v}</p>
            <ul className="ml-4 list-disc text-muted-foreground">
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
