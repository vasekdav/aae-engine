"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  APP_VERSION,
  DEFAULT_CONSTANTS,
  dataFingerprint,
  fmt,
  fmtC,
  fmtValC,
  getFluid,
  getMaterial,
  getPreset,
  kgsToNm3h,
  solve,
  type MediumId,
  type Mode,
  type SizingCase,
  type SizingResult,
} from "@/lib/sizing";
import { cn } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";
import { AmbientChart, ResultsView, RulesTable, TimeChart, VerdictCards } from "./results-view";
import { AboutView, AssumptionsView, ProtocolView } from "./doc-views";
import { LEVEL_BG, LEVEL_TEXT, LevelIcon, Segmented } from "./controls";
import { InputsPanel } from "./inputs-panel";
import { DEFAULT_UI, pipeIdMm, pLinePa, SERVICE_LABEL, toCase, type Source, type UiState } from "./state";

const MODES: { value: Mode; label: string; title: string }[] = [
  { value: "A", label: "A · Dimenzování", title: "Průtok + podmínky → kW, počet × výška trubek, katalogový typ" },
  { value: "B", label: "B · Ověření", title: "Známá jednotka → max. průtok a T_out" },
  { value: "C", label: "C · Bezpečnostní profil", title: "T_out po hodinách, podle T_amb a průtoku, zóna NO-GO" },
  { value: "D", label: "D · Porovnání umístění", title: "Stejné zadání pro všechny instalační varianty" },
];

const MEDIA: { value: MediumId; label: string }[] = [
  { value: "N2", label: "LIN · N₂" },
  { value: "O2", label: "LOX · O₂" },
  { value: "Ar", label: "LAr · Ar" },
];

const DEBOUNCE_MS = 150;

export function SizingApp() {
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);
  const [src, setSrc] = useState<Partial<Record<keyof UiState, Source>>>({});
  const [tab, setTab] = useState("results");

  const update = (patch: Partial<UiState>, source: Source = "USER") => {
    setUi((s) => ({ ...s, ...patch }));
    setSrc((s) => {
      const next = { ...s };
      for (const k of Object.keys(patch) as (keyof UiState)[]) next[k] = source;
      return next;
    });
  };

  const cs = useMemo(() => toCase(ui), [ui]);
  const [settled, setSettled] = useState<SizingCase>(cs);
  useEffect(() => {
    const id = setTimeout(() => setSettled(cs), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [cs]);
  const stale = settled !== cs;
  const r = useMemo(() => solve(settled, DEFAULT_CONSTANTS, getFluid(settled.medium)), [settled]);
  const fingerprint = useMemo(() => dataFingerprint(DEFAULT_CONSTANTS), []);

  return (
    <div className="sizing-root">
      <div className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 overflow-x-auto">
            <Segmented
              ariaLabel="Režim"
              size="md"
              value={ui.mode}
              onChange={(m) => update({ mode: m })}
              options={[
                ...MODES,
                { value: "E" as Mode, label: "E · Kalibrace z terénu", title: "Fáze 2", disabled: true },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Segmented
              ariaLabel="Médium"
              size="md"
              value={ui.medium}
              onChange={(m) => update({ medium: m })}
              options={MEDIA}
            />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer /> Tisk / PDF
            </Button>
          </div>
        </div>

        <VerdictBar r={r} stale={stale} />

        <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(320px,400px)_1fr] lg:px-8">
          <aside className="grid content-start gap-2" aria-label="Případ a vstupy">
            <h2 className="text-sm font-semibold">Případ a vstupy</h2>
            <InputsPanel ui={ui} src={src} update={update} />
          </aside>
          <main className={cn("min-w-0 transition-opacity", stale && "opacity-50")} aria-busy={stale}>
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
              <TabsList variant="line" className="flex-wrap">
                <TabsTrigger value="results">Výsledky</TabsTrigger>
                <TabsTrigger value="protocol">Výpočetní protokol</TabsTrigger>
                <TabsTrigger value="assumptions">Předpoklady a konstanty</TabsTrigger>
                <TabsTrigger value="about">O aplikaci</TabsTrigger>
              </TabsList>
              <TabsContent value="results" className="pt-2">
                <ResultsView r={r} ui={ui} />
              </TabsContent>
              <TabsContent value="protocol" className="pt-2">
                <ProtocolView r={r} />
              </TabsContent>
              <TabsContent value="assumptions" className="pt-2">
                <AssumptionsView />
              </TabsContent>
              <TabsContent value="about" className="pt-2">
                <AboutView fingerprint={fingerprint} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      <PrintReport r={r} ui={ui} fingerprint={fingerprint} />
    </div>
  );
}

/** Fixed verdict strip — cannot be hidden or dismissed. */
function VerdictBar({ r, stale }: { r: SizingResult; stale: boolean }) {
  const v = r.verdict;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-14 z-40 flex items-start gap-3 border-b px-4 py-2 backdrop-blur-md sm:top-16 sm:px-6 lg:px-8",
        LEVEL_BG[v.level],
      )}
    >
      <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-sm font-bold", LEVEL_TEXT[v.level], LEVEL_BG[v.level])}>
        <LevelIcon level={v.level} />
        {v.label}
      </span>
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-foreground/90 sm:text-[13px]">{v.sentence}</p>
      <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
        {stale ? <Loader2 className="size-3 animate-spin" /> : null}
        {r.protection.label}
      </span>
    </div>
  );
}

function PrintReport({ r, ui, fingerprint }: { r: SizingResult; ui: UiState; fingerprint: string }) {
  const [printedAt, setPrintedAt] = useState("");
  useEffect(() => {
    const onBefore = () => setPrintedAt(new Date().toLocaleString("cs-CZ"));
    window.addEventListener("beforeprint", onBefore);
    return () => window.removeEventListener("beforeprint", onBefore);
  }, []);
  const rhoN = getFluid(ui.medium).rhoN;
  const mode = MODES.find((m) => m.value === ui.mode)!;
  const mat = getMaterial(ui.material);
  const inputs: [string, string][] = [
    ["Režim", mode.label],
    ["Médium", MEDIA.find((m) => m.value === ui.medium)!.label],
    ["Návrhový průtok", `${fmt(kgsToNm3h(r.intermediates.mDesign ?? 0, rhoN), 0)} Nm³/h (špička ${fmt(ui.flow, 0)} ${ui.flowUnit === "Nm3h" ? "Nm³/h" : "kg/h"})`],
    ["T_amb,design / min,bezp", `${fmtC(r.TambDesignEff)} / ${fmtC(r.TambMinSafetyEff)} (inverze ${fmt(ui.inversionK, 0)} K)`],
    ["RH / léto", `${fmt(ui.RH, 0)} % / ${fmt(ui.TambSummer, 0)} °C`],
    ["T_limit", `${fmtC(r.Tlimit)} ${r.TlimitOverridden ? "PŘEPSÁNO" : `(${mat.label})`} · rezerva ${fmt(ui.margin, 0)} K`],
    ["Provoz", `${SERVICE_LABEL[ui.service]} · t = ${fmt(ui.tEvent, 1)} h`],
    ["Tlak potrubí / zásobník", `${fmt(pLinePa(ui) / 1e5, 3)} bar(a) / ${fmt(ui.pTank, 3)} bar(a)`],
    ["Potrubí ID", `${fmt(pipeIdMm(ui), 1)} mm`],
    ["Umístění", `${getPreset(ui.location.preset).label} · odtok ${ui.location.drain}`],
    ["Jednotka", r.unit ? `${r.unit.N} × ${fmt(r.unit.H, 1)} m, Ø${fmt(r.unit.finD * 1000, 0)} mm, ${DEFAULT_CONSTANTS.series[ui.series].label}` : "—"],
  ];
  const outputs: [string, string][] = [
    ["Výkon Q̇", r.duty ? `${fmt(r.duty.total / 1000, 1)} kW (kapalina ${fmt(r.duty.liquid / 1000, 1)} · var ${fmt(r.duty.boil / 1000, 1)} · přehřátí ${fmt(r.duty.superheat / 1000, 1)})` : "—"],
    ["T_out po t (nominál / roh)", `${fmtValC(r.tout.nominal)} / ${fmtValC(r.tout.worst)}`],
    ["T_amb,crit", r.TambCrit.value === null ? "—" : `${fmtC(r.TambCrit.value)}${r.hoursBelowCrit !== null ? ` (≈ ${fmt(r.hoursBelowCrit, 0)} h/rok)` : ""}`],
    ["Katalogový ekvivalent", r.catalogueN2.value === null ? "—" : `${fmt(kgsToNm3h(r.catalogueN2.value, getFluid("N2").rhoN), 0)} Nm³/h N₂ (+20 °C, 8 h, 15 K)`],
    ["Dohřívač Q_trim", r.heater.required ? `${fmt((r.heater.Qdesign ?? 0) / 1000, 1)} kW (min. bezp. ${fmt((r.heater.QminSafety ?? 0) / 1000, 1)} kW)` : "nepotřebný"],
    ["LTPS", `${r.protection.label} · alarm ${fmtC(r.ltps.alarm, 0)} · vypnutí ${fmtC(r.ltps.trip, 0)}`],
    ["Rychlost plynu", `léto ${fmt(r.velocity.summer?.v ?? null, 1)} / studený ${fmt(r.velocity.cold?.v ?? null, 1)} m/s (limit ${fmt(r.velocity.limit, 1)})`],
  ];
  return (
    <div className="hidden text-[10.5px] leading-snug text-black print:block">
      <table className="w-full">
        <thead>
          <tr>
            <td>
              <div className={cn("mb-2 flex items-start gap-2 rounded border-2 px-2 py-1", r.verdict.level === "GO" ? "border-green-700" : r.verdict.level === "WARNING" ? "border-amber-600" : "border-red-700")}>
                <span className="font-mono text-sm font-bold">
                  {r.verdict.level === "GO" ? "✅" : r.verdict.level === "WARNING" ? "⚠️" : "❌"} {r.verdict.label}
                </span>
                <span className="flex-1">{r.verdict.sentence}</span>
                <span className="font-semibold whitespace-nowrap">{r.protection.label}</span>
              </div>
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-3 border-t border-black/40 pt-1 text-[9px]">
                <span>
                  AAE Sizing {APP_VERSION} · otisk dat {fingerprint} · {printedAt || "—"} · Předběžný návrh, ověřit dle výrobce
                </span>
                <span>Zpracoval: {ui.processedBy || "________________"}</span>
                <span>Ověřil: {ui.checkedBy || "________________"}</span>
              </div>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="grid gap-3">
              <header>
                <h1 className="text-base font-bold">AAE Sizing — {mode.label}</h1>
                <p>{ui.project || "Projekt / závod: ________________"}</p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                <KeyTable title="Vstupy" rows={inputs} />
                <KeyTable title="Výsledky" rows={outputs} />
              </div>
              <VerdictCards r={r} />
              <section>
                <h2 className="mb-1 font-bold">Pravidla verdiktu</h2>
                <RulesTable r={r} />
              </section>
              <div className="grid grid-cols-2 gap-3">
                <TimeChart r={r} />
                <AmbientChart r={r} />
              </div>
              <section className="break-before-page">
                <h2 className="mb-1 font-bold">Výpočetní protokol</h2>
                <ol className="grid gap-1">
                  {r.trace.map((s) => (
                    <li key={s.n} className="break-inside-avoid border-b border-black/15 pb-1">
                      <b>
                        {s.n}. {s.title}
                      </b>
                      {s.eq ? <div className="font-mono text-[9.5px]">{s.eq}</div> : null}
                      {s.subst ? <div>{s.subst}</div> : null}
                      <div className="font-mono">→ {s.result}</div>
                      {s.source ? <div className="text-[9px] text-black/60">Zdroj: {s.source}</div> : null}
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h2 className="mb-1 font-bold">LTPS, PSV a dispozice</h2>
                <ul className="ml-4 list-disc">
                  {[...r.ltps.items, r.psv.note, ...r.sitingChecks].map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </section>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function KeyTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section>
      <h2 className="mb-1 font-bold">{title}</h2>
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-black/15 align-top">
              <td className="pr-2 whitespace-nowrap text-black/70">{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
