"use client";

import {
  fmt,
  fmtC,
  fmtValC,
  getFluid,
  kgsToNm3h,
  kToC,
  STATUS_LABEL,
  type Level,
  type SizingResult,
  type Val,
} from "@/lib/sizing";
import { cn } from "@/lib/utils";
import {
  ChartFrame,
  HBarChart,
  Legend,
  LineChart,
  NxHChart,
  SeriesTable,
  type LineSeries,
} from "./charts";
import { InfoIcon, LEVEL_BG, LEVEL_TEXT, LevelIcon } from "./controls";
import type { UiState } from "./state";

const C = (k: number) => kToC(k);
const tC = (x: number) => `${fmt(x, 0)}`;

function Kpi({
  label,
  value,
  unit,
  sub,
  level,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: React.ReactNode;
  level?: Level;
}) {
  return (
    <div className="grid content-start gap-1 rounded-xl border border-border/60 border-l-4 border-l-emerald-500/70 bg-card/40 p-3">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {level ? <LevelIcon level={level} className="size-3.5" /> : null}
        {label}
      </span>
      <span className="font-mono text-xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </span>
      {sub ? <span className="text-[11px] leading-snug text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

function Section({ title, children, tone = "out" }: { title: string; children: React.ReactNode; tone?: "out" | "mid" | "warn" }) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-xl border border-border/60 border-l-4 bg-card/30 p-3 print:break-inside-avoid",
        tone === "out" && "border-l-emerald-500/60",
        tone === "mid" && "border-l-orange-500/60",
        tone === "warn" && "border-l-red-500/60",
      )}
    >
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function levelOfT(v: Val, r: SizingResult): Level {
  if (v.value === null) return "NOGO";
  if (v.value < r.Tlimit) return "NOGO";
  if (v.value < r.Ttarget) return "WARNING";
  return "GO";
}

export function VerdictCards({ r }: { r: SizingResult }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className={cn("flex items-start gap-2 rounded-xl border p-3", LEVEL_BG[r.capacity.level])}>
        <LevelIcon level={r.capacity.level} className="mt-0.5 size-5" />
        <div className="grid gap-0.5">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">Verdikt Kapacita</span>
          <span className={cn("font-semibold", LEVEL_TEXT[r.capacity.level])}>{r.capacity.label}</span>
          <span className="text-[11px] text-muted-foreground">Stačí odpařovač při návrhových podmínkách s rezervou? (R01–R04)</span>
        </div>
      </div>
      <div className={cn("flex items-start gap-2 rounded-xl border p-3", r.protection.ltpsRequired ? LEVEL_BG.WARNING : LEVEL_BG.GO)}>
        <LevelIcon level={r.protection.ltpsRequired ? "WARNING" : "GO"} className="mt-0.5 size-5" />
        <div className="grid gap-0.5">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">Verdikt Ochrana</span>
          <span className={cn("font-semibold", r.protection.ltpsRequired ? LEVEL_TEXT.WARNING : LEVEL_TEXT.GO)}>{r.protection.label}</span>
          <span className="text-[11px] text-muted-foreground">Samotné dimenzování nikdy nečiní CS potrubí bezpečným. (R08, R10)</span>
        </div>
      </div>
    </div>
  );
}

export function RulesTable({ r }: { r: SizingResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
            <th className="py-1.5 pr-2 font-normal">ID</th>
            <th className="py-1.5 pr-2 font-normal">Stav</th>
            <th className="py-1.5 pr-2 font-normal">Pravidlo</th>
            <th className="py-1.5 font-normal">Vyhodnocení</th>
          </tr>
        </thead>
        <tbody>
          {r.rules.map((x) => {
            const lvl: Level = x.id === "R10" && !x.pass ? "WARNING" : x.level;
            return (
              <tr key={x.id} className="border-b border-border/30 align-top">
                <td className="py-1.5 pr-2 font-mono text-muted-foreground">{x.id}</td>
                <td className="py-1.5 pr-2">
                  <span className={cn("inline-flex items-center gap-1 font-medium whitespace-nowrap", LEVEL_TEXT[lvl])}>
                    <LevelIcon level={lvl} className="size-3.5" />
                    {x.id === "R10" ? (x.pass ? "OK" : "LTPS") : x.pass ? "OK" : x.level === "GO" ? "INFO" : x.level === "NOGO" ? "NO-GO" : x.level}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-foreground">{x.title}</td>
                <td className="py-1.5 text-muted-foreground">{x.detail}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TimeChart({ r }: { r: SizingResult }) {
  const ch = r.charts.time;
  const series: LineSeries[] = [
    { id: "nom", label: "Q_design, nominál", color: "var(--s1)", points: ch.nominal.map((p) => ({ x: p.x, y: p.y === null ? null : C(p.y) })) },
    { id: "worst", label: "1,2·Q, nejhorší roh", color: "var(--s2)", points: ch.worst.map((p) => ({ x: p.x, y: p.y === null ? null : C(p.y) })), dash: "6 3" },
    { id: "best", label: "0,8·Q, nejlepší roh", color: "var(--s3)", points: ch.best.map((p) => ({ x: p.x, y: p.y === null ? null : C(p.y) })), dash: "2 3" },
  ];
  return (
    <ChartFrame
      title="T_out v čase provozu"
      subtitle={`T_amb ${fmtC(r.TambDesignEff, 1)}; pásmo nejistoty 0,8–1,2·Q × rohy; t_op,max = ${ch.tOpMax === null ? "> 70 h" : `${fmt(ch.tOpMax, 1)} h`} (nejhorší roh pod cílem)`}
      legend={<Legend items={[...series.map((s) => ({ label: s.label, color: s.color, dash: s.dash })), { label: "T_limit", color: "var(--crit)", dash: "5 4" }, { label: "T_limit + rezerva", color: "var(--warn)", dash: "5 4" }]} />}
      table={<SeriesTable series={series} xLabel="t [h]" xFmt={(x) => fmt(x, 1)} yFmt={(y) => fmt(y, 1)} />}
    >
      <LineChart
        series={series}
        band={{ lower: series[1].points, upper: series[2].points, color: "var(--s1)", label: "pásmo" }}
        refLines={[
          { value: C(r.Tlimit), label: `T_limit ${fmtC(r.Tlimit, 0)}`, color: "var(--crit)" },
          { value: C(r.Ttarget), label: `cíl ${fmtC(r.Ttarget, 0)}`, color: "var(--warn)" },
        ]}
        vLines={ch.tOpMax !== null && ch.tOpMax <= 16 ? [{ value: ch.tOpMax, label: "t_op,max", color: "var(--warn)" }] : []}
        dangerBelow={C(r.Tlimit)}
        xLabel="Doba provozu t [h]"
        yLabel="T_out [°C]"
        xFmt={(x) => fmt(x, 0)}
        yFmt={(y) => fmt(y, 0)}
        xDomain={[0, 16]}
      />
    </ChartFrame>
  );
}

export function AmbientChart({ r }: { r: SizingResult }) {
  const ch = r.charts.ambient;
  const series: LineSeries[] = [
    { id: "nom", label: "nominál", color: "var(--s1)", points: ch.nominal.map((p) => ({ x: C(p.x), y: p.y === null ? null : C(p.y) })) },
    { id: "worst", label: "nejhorší roh", color: "var(--s2)", points: ch.worst.map((p) => ({ x: C(p.x), y: p.y === null ? null : C(p.y) })), dash: "6 3" },
  ];
  const vLines = [
    { value: C(r.TambDesignEff), label: "návrh", color: "var(--warn)" },
    { value: C(r.TambMinSafetyEff), label: "extrém", color: "var(--crit)" },
  ];
  if (r.TambCrit.value !== null && C(r.TambCrit.value) > -30 && C(r.TambCrit.value) < 40) {
    vLines.push({ value: C(r.TambCrit.value), label: "T_amb,crit", color: "var(--axis)" });
  }
  return (
    <ChartFrame
      title="T_out v závislosti na teplotě okolí"
      subtitle="Q_design, doba provozu dle zadání; svislé čáry: návrhová a extrémní teplota závodu, T_amb,crit"
      legend={<Legend items={[...series.map((s) => ({ label: s.label, color: s.color, dash: s.dash })), { label: "T_limit", color: "var(--crit)", dash: "5 4" }]} />}
      table={<SeriesTable series={series} xLabel="T_amb [°C]" xFmt={(x) => fmt(x, 1)} yFmt={(y) => fmt(y, 1)} />}
    >
      <LineChart
        series={series}
        refLines={[
          { value: C(r.Tlimit), label: `T_limit ${fmtC(r.Tlimit, 0)}`, color: "var(--crit)" },
          { value: C(r.Ttarget), label: "cíl", color: "var(--warn)" },
        ]}
        vLines={vLines}
        dangerBelow={C(r.Tlimit)}
        xLabel="T_amb [°C]"
        yLabel="T_out [°C]"
        xFmt={tC}
        yFmt={tC}
        xDomain={[-30, 40]}
      />
    </ChartFrame>
  );
}

export function AlongChart({ r }: { r: SizingResult }) {
  const a = r.charts.along;
  if (!a || a.points.length < 2) return null;
  const pts = a.points.map((p) => ({ x: p.L, y: C(p.T) }));
  const liqEnd = Math.max(0, ...a.points.filter((p) => p.zone === "liquid").map((p) => p.L));
  const boilPts = a.points.filter((p) => p.zone === "boil");
  const boilEnd = boilPts.length ? Math.max(...boilPts.map((p) => p.L)) : liqEnd;
  const series: LineSeries[] = [{ id: "T", label: "T tekutiny", color: "var(--s1)", points: pts }];
  return (
    <ChartFrame
      title="Teplota podél trubky"
      subtitle={a.breakthrough ? "❌ PRŮNIK KAPALINY — var nekončí uvnitř jednotky" : `ohřev kapaliny 0–${fmt(liqEnd, 0)} m · var do ${fmt(boilEnd, 0)} m · přehřátí do ${fmt(a.Ltotal, 0)} m (nominál)`}
      legend={
        <Legend
          items={[
            { label: "ohřev kapaliny", color: "var(--zone-liq)", kind: "box" },
            { label: "var", color: "var(--zone-boil)", kind: "box" },
            { label: "přehřátí", color: "var(--zone-sh)", kind: "box" },
          ]}
        />
      }
      table={<SeriesTable series={series} xLabel="L [m]" xFmt={(x) => fmt(x, 1)} yFmt={(y) => fmt(y, 1)} />}
    >
      <LineChart
        series={series}
        shadeX={[
          { from: 0, to: liqEnd, color: "var(--zone-liq)", label: "liq" },
          { from: liqEnd, to: boilEnd, color: "var(--zone-boil)", label: "boil" },
          { from: boilEnd, to: a.Ltotal, color: "var(--zone-sh)", label: "sh" },
        ]}
        refLines={[{ value: C(r.Tlimit), label: "T_limit", color: "var(--crit)" }]}
        xLabel="Délka trubky L [m]"
        yLabel="T [°C]"
        xFmt={(x) => fmt(x, 0)}
        yFmt={tC}
        xDomain={[0, a.Ltotal]}
      />
    </ChartFrame>
  );
}

function Heatmap({ r }: { r: SizingResult }) {
  const hm = r.charts.heatmap;
  if (!hm) return null;
  const qN = kgsToNm3h(r.intermediates.mDesign ?? 0, getFluid(r.medium).rhoN);
  const cls: Record<Level, string> = {
    GO: "bg-emerald-500/15 text-emerald-200",
    WARNING: "bg-amber-500/20 text-amber-100",
    NOGO: "bg-red-500/25 text-red-100",
    INVALID: "bg-red-500/25 text-red-100",
  };
  return (
    <ChartFrame
      title="Bezpečnostní profil: T_out (nejhorší roh) podle T_amb a průtoku"
      subtitle={`Doba provozu dle zadání; buňka = T_out [°C]; ✅ ≥ cíl ${fmtC(r.Ttarget, 0)} · ⚠️ mezi cílem a T_limit · ❌ pod T_limit nebo průnik`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-center font-mono text-[11px] tabular-nums">
          <thead>
            <tr>
              <th className="px-1 text-left font-normal text-muted-foreground">T_amb \ Q</th>
              {hm.qFactors.map((q) => (
                <th key={q} className="px-1 font-normal text-muted-foreground">
                  {fmt(q * 100, 0)} %<br />
                  <span className="text-[10px]">{fmt(q * qN, 0)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hm.TambC.map((t, i) => (
              <tr key={t}>
                <td className="px-1 text-left text-muted-foreground">{fmt(t, 0)} °C</td>
                {hm.cells[i].map((cell, j) => (
                  <td key={j} className={cn("rounded px-1 py-1", cls[cell.level])} title={cell.level}>
                    {cell.level === "GO" ? "✅" : cell.level === "WARNING" ? "⚠️" : "❌"} {cell.T === null ? STATUS_LABEL[cell.status].slice(0, 6) : fmt(C(cell.T), 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Sloupce: násobek Q_design (Nm³/h).</p>
    </ChartFrame>
  );
}

function LocationsCompare({ r }: { r: SizingResult }) {
  const rows = r.locations;
  if (!rows) return null;
  const color: Record<Level, string> = { GO: "var(--good)", WARNING: "var(--warn)", NOGO: "var(--crit)", INVALID: "var(--crit)" };
  return (
    <Section title="D — Porovnání umístění (stejné zadání)">
      <ChartFrame
        title="T_out v nejhorším případě podle umístění"
        subtitle="Referenční jednotka při návrhových podmínkách, nejhorší roh nejistoty; barva = verdikt (✅/⚠️/❌ v tabulce)"
      >
        <HBarChart
          rows={rows.map((x) => ({
            id: x.presetId,
            label: x.label,
            value: x.ToutWorst.value === null ? null : C(x.ToutWorst.value),
            color: color[x.level],
            tag: x.ToutWorst.value === null ? (x.impact === "NOGO" ? "❌ mimo model / NO-GO" : STATUS_LABEL[x.ToutWorst.status]) : x.level === "GO" ? "✅" : x.level === "WARNING" ? "⚠️" : "❌",
          }))}
          refLines={[
            { value: C(r.Tlimit), label: "T_limit", color: "var(--crit)" },
            { value: C(r.Ttarget), label: "cíl", color: "var(--warn)" },
          ]}
          valueLabel="T_out [°C]"
          fmtValue={(v) => fmt(v, 0)}
        />
      </ChartFrame>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
              <th className="py-1 pr-2 font-normal">Umístění</th>
              <th className="py-1 pr-2 font-normal">f_loc</th>
              <th className="py-1 pr-2 font-normal">ΔT_recirc</th>
              <th className="py-1 pr-2 font-normal">T_out roh</th>
              <th className="py-1 pr-2 font-normal">N při H</th>
              <th className="py-1 font-normal">Verdikt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.presetId} className="border-b border-border/30">
                <td className="py-1 pr-2">{x.label}</td>
                <td className="py-1 pr-2 font-mono">{fmt(x.fLoc, 2)}</td>
                <td className="py-1 pr-2 font-mono">{x.dTRecirc === null ? "—" : `${fmt(x.dTRecirc, 1)} K`}</td>
                <td className="py-1 pr-2 font-mono">{fmtValC(x.ToutWorst)}</td>
                <td className="py-1 pr-2 font-mono">{x.Nreq ?? "—"}</td>
                <td className="py-1">
                  <span className={cn("inline-flex items-center gap-1", LEVEL_TEXT[x.level])}>
                    <LevelIcon level={x.level} className="size-3.5" />
                    {x.level === "NOGO" ? "NO-GO" : x.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function ResultsView({ r, ui }: { r: SizingResult; ui: UiState }) {
  const rhoN = getFluid(r.medium).rhoN;
  const rhoN2 = getFluid("N2").rhoN;
  const flowTxt = (m: number | null) => (m === null ? "—" : `${fmt(kgsToNm3h(m, rhoN), 0)} Nm³/h`);
  const toutLevel = levelOfT(r.tout.worst, r);

  return (
    <div className="grid gap-3">
      <VerdictCards r={r} />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          label="Výkon odpařovače Q̇"
          value={r.duty ? fmt(r.duty.total / 1000, 1) : "—"}
          unit="kW"
          sub={
            r.duty
              ? `ohřev kap. ${fmt(r.duty.liquid / 1000, 1)} · var ${fmt(r.duty.boil / 1000, 1)} · přehřátí ${fmt(r.duty.superheat / 1000, 1)} kW (T_out ${fmtC(r.duty.Tout, 0)})`
              : undefined
          }
        />
        <Kpi
          label={ui.mode === "B" || (ui.mode !== "A" && ui.unitSource === "GIVEN") ? "Zadaná jednotka N × H" : "Navržená jednotka N × H"}
          value={r.unit ? `${r.unit.N} × ${fmt(r.unit.H, 1)}` : STATUS_LABEL[r.Lreq.status]}
          unit={r.unit ? "m" : undefined}
          sub={
            r.unit
              ? `${fmt(r.unit.L, 0)} m trubky Ø${fmt(r.unit.finD * 1000, 0)} mm${r.Lreq.value !== null ? ` · L_req ${fmt(r.Lreq.value, 0)} m` : ""}${r.ratioVsCatalogue !== null ? ` · ${fmt(r.ratioVsCatalogue, 2)}× katalogový návrh` : ""}`
              : r.Lreq.note
          }
        />
        <Kpi
          label={`T_out po ${fmt(ui.tEvent, 0)} h (nejhorší roh)`}
          value={fmtValC(r.tout.worst)}
          level={toutLevel}
          sub={`nominál ${fmtValC(r.tout.nominal)} · 1,2·Q ${fmtValC(r.tout.r02)} · cíl ${fmtC(r.Ttarget, 0)}`}
        />
        <Kpi
          label="Nejnižší T_amb, do které vyhoví"
          value={r.TambCrit.value === null ? STATUS_LABEL[r.TambCrit.status] : fmtC(r.TambCrit.value)}
          sub={r.hoursBelowCrit !== null ? `≈ ${fmt(r.hoursBelowCrit, 0)} h/rok pod ní (hrubý odhad)` : r.TambCrit.note}
        />
        <Kpi
          label="Katalogový ekvivalent (N₂, +20 °C, 8 h, 15 K)"
          value={r.catalogueN2.value === null ? "—" : fmt(kgsToNm3h(r.catalogueN2.value, rhoN2), 0)}
          unit="Nm³/h"
          sub="pro výběr typu L40 / FairVap: katalogový výkon ≥ této hodnoty"
        />
        {ui.mode === "B" ? (
          <Kpi label="Max. průtok (R01 + R02)" value={flowTxt(r.mDotMax.value)} sub={r.mDotMax.value === null ? r.mDotMax.note : `návrh ${flowTxt(r.intermediates.mDesign)}`} />
        ) : null}
        <Kpi
          label="Dohřívač Q_trim"
          value={r.heater.required ? fmt((r.heater.Qdesign ?? 0) / 1000, 1) : "0"}
          unit="kW"
          level={r.heater.required ? "WARNING" : "GO"}
          sub={r.heater.required ? `při T_amb,min,bezp ${fmt((r.heater.QminSafety ?? 0) / 1000, 1)} kW; LTPS zůstává povinná` : "nepotřebný při návrhu"}
        />
        <Kpi
          label="Rychlost plynu (léto / studený)"
          value={`${fmt(r.velocity.summer?.v ?? null, 1)} / ${fmt(r.velocity.cold?.v ?? null, 1)}`}
          unit="m/s"
          level={r.rules.find((x) => x.id === "VEL")!.level}
          sub={`limit ${fmt(r.velocity.limit, 1)} m/s${r.velocity.o2 ? " (O₂ EIGA Doc 13)" : " (inerty)"}`}
        />
      </div>

      <Section title="Pravidla verdiktu R01–R10">
        <RulesTable r={r} />
      </Section>

      {ui.mode === "C" ? <Heatmap r={r} /> : null}
      {ui.mode === "D" ? <LocationsCompare r={r} /> : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <TimeChart r={r} />
        <AmbientChart r={r} />
        {r.nxh.length ? (
          <ChartFrame title="Počet trubek vs. výška" subtitle="Skutečná rezerva po zaokrouhlení na celé trubky (L_req, nejhorší roh)">
            <NxHChart rows={r.nxh} selectedH={ui.H} />
            <table className="w-full font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="font-normal">H [m]</th>
                  <th className="font-normal">N [ks]</th>
                  <th className="font-normal">N·H [m]</th>
                  <th className="font-normal">rezerva</th>
                  <th className="font-normal">T_out roh</th>
                </tr>
              </thead>
              <tbody>
                {r.nxh.map((row) => (
                  <tr key={row.H}>
                    <td>{fmt(row.H, 0)}</td>
                    <td>{row.N}</td>
                    <td>{fmt(row.N * row.H, 0)}</td>
                    <td>+{fmt(row.reserve * 100, 1)} %</td>
                    <td>{fmtValC(row.ToutWorst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartFrame>
        ) : null}
        <AlongChart r={r} />
      </div>

      <Section title="Pásmo nejistoty T_out" tone="mid">
        <table className="w-full font-mono text-xs tabular-nums">
          <thead>
            <tr className="text-left text-[11px] text-muted-foreground">
              <th className="font-normal">Průtok</th>
              <th className="font-normal">nejlepší roh</th>
              <th className="font-normal">nominál</th>
              <th className="font-normal">nejhorší roh</th>
            </tr>
          </thead>
          <tbody>
            {r.band.map((b) => (
              <tr key={b.qf}>
                <td>{fmt(b.qf, 1)} × Q_design</td>
                <td>{fmtValC(b.best)}</td>
                <td>{fmtValC(b.nominal)}</td>
                <td className={LEVEL_TEXT[levelOfT(b.worst, r)]}>{fmtValC(b.worst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-muted-foreground">
          Rohy: U ±10 %, f_loc ±0,05, ΔT_recirc ±50 %. Citlivost na vítr 1 m/s (+18 % výkonu, jen informativně): T_out roh {fmtValC(r.tout.wind1ms)}.
        </p>
      </Section>

      <Section title="Nezávislá katalogová kontrola" tone="mid">
        <div className="flex items-start gap-2 text-xs">
          <InfoIcon />
          <p className="text-muted-foreground">
            Kalibrovaný model sešitu L40 (U·A·LMTD, konstantní L a c_p) by při návrhových podmínkách potřeboval{" "}
            <span className="font-mono text-foreground">{fmt(r.workbookRatio, 2)}×</span> plochy zónového modelu. V katalogovém bodě je poměr 1,00
            z definice (kalibrace C = {fmt(r.intermediates.C, 3)}). Poměr &gt; 1 při malém přístupu je očekávaný: LMTD přes celý výkon penalizuje i
            var, který ve skutečnosti probíhá při plném ΔT.
          </p>
        </div>
      </Section>

      <Section title="Povinné ochranné vrstvy — LTPS (MS-79511)" tone="warn">
        <ul className="grid gap-1.5 text-xs">
          <li className="flex items-start gap-2">
            <LevelIcon level={r.protection.ltpsRequired ? "WARNING" : "GO"} className="mt-0.5 size-3.5" />
            <span>
              <span className="font-medium text-foreground">{r.protection.label}</span> — {r.rules.find((x) => x.id === "R10")!.detail}
            </span>
          </li>
          {r.ltps.items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5" />
              <span>{it}</span>
            </li>
          ))}
          <li className="flex items-start gap-2 text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5" />
            <span>
              {r.psv.note}: min. <span className="font-mono text-foreground">{flowTxt(r.psv.minCapacity)}</span>
            </span>
          </li>
        </ul>
      </Section>

      <Section title="Kontroly dispozice" tone="mid">
        <ul className="grid gap-1.5 text-xs text-muted-foreground">
          {r.sitingChecks.map((s) => (
            <li key={s} className="flex items-start gap-2">
              <InfoIcon className="mt-0.5 size-3.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
