"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CLIMATE,
  DEFAULT_CONSTANTS,
  fmt,
  getMaterial,
  getPreset,
  getFluid,
  LOCATIONS,
  MATERIALS,
  type SeriesId,
} from "@/lib/sizing";
import { cn } from "@/lib/utils";
import { Check, Group, NumField, Segmented, Select, SourceTag } from "./controls";
import { Pictogram } from "./pictograms";
import {
  convertFlow,
  convertPressure,
  DN_OD,
  pipeIdMm,
  pLinePa,
  presetForSite,
  SERVICE_HOURS,
  SERVICE_LABEL,
  type Service,
  type Source,
  type UiState,
} from "./state";

export interface InputsProps {
  ui: UiState;
  src: Partial<Record<keyof UiState, Source>>;
  update: (patch: Partial<UiState>, source?: Source) => void;
}

export function InputsPanel({ ui, src, update }: InputsProps) {
  const tag = (k: keyof UiState): Source => src[k] ?? "DEFAULT";
  const set = <K extends keyof UiState>(k: K) => (v: UiState[K]) => update({ [k]: v } as Partial<UiState>);
  const rhoN = getFluid(ui.medium).rhoN;
  const pa = pLinePa(ui);
  const otherP = ui.pLineUnit === "g" ? `= ${fmt(pa / 1e5, 3)} bar(a)` : `= ${fmt((pa - 101325) / 1e5, 3)} bar(g)`;
  const flowOther =
    ui.flowUnit === "Nm3h" ? `= ${fmt(ui.flow * rhoN, 0)} kg/h` : `= ${fmt(ui.flow / rhoN, 0)} Nm³/h`;
  const preset = getPreset(ui.location.preset);
  const mat = getMaterial(ui.material);
  const showGiven = ui.mode === "B" || ((ui.mode === "C" || ui.mode === "D") && ui.unitSource === "GIVEN");
  const flowUnitLabel = ui.flowUnit === "Nm3h" ? "Nm³/h" : "kg/h";

  return (
    <div className="grid gap-3">
      <Group title="Průtok">
        <NumField
          id="flow"
          label={<>Návrhový průtok Q_N (špička) <span className="text-muted-foreground/70">· 0 °C, 1,01325 bar</span></>}
          unit={flowUnitLabel}
          value={ui.flow}
          onChange={set("flow")}
          min={0}
          slider={{ min: 50, max: ui.flowUnit === "Nm3h" ? 5000 : 6000, step: 10 }}
          source={tag("flow")}
          hint={flowOther}
          addon={
            <Segmented
              ariaLabel="Jednotka průtoku"
              value={ui.flowUnit}
              onChange={(u) =>
                update({
                  flowUnit: u,
                  flow: Number(convertFlow(ui.flow, ui.flowUnit, u, ui.medium).toFixed(2)),
                  orifice: Number(convertFlow(ui.orifice, ui.flowUnit, u, ui.medium).toFixed(2)),
                })
              }
              options={[
                { value: "Nm3h", label: "Nm³/h" },
                { value: "kgh", label: "kg/h" },
              ]}
            />
          }
        />
        <Check
          id="orificeOn"
          label="Max. věrohodný průtok omezený clonou / otevřeným PCV"
          checked={ui.orificeOn}
          onChange={set("orificeOn")}
          hint="CGA P-56 / EIGA Doc 133 — návrhový průtok = max(špička; clona)"
        />
        {ui.orificeOn ? (
          <NumField id="orifice" label="Průtok clonou Q_clona" unit={flowUnitLabel} value={ui.orifice} onChange={set("orifice")} source={tag("orifice")} />
        ) : null}
      </Group>

      <Group title="Klima a lokalita">
        <Select
          id="site"
          label="Závod / lokalita"
          value={ui.siteId}
          onChange={(v) => update(presetForSite(v), "PRESET")}
          options={CLIMATE.sites.map((s) => ({ value: s.id, label: `${s.label} (θe ${s.thetaE} °C)` }))}
          source={tag("siteId") === "DEFAULT" ? "DEFAULT" : "PRESET"}
          hint={`Návrh = θe − ${CLIMATE.hourlyOffsetK} K, min. bezp. = θe − ${CLIMATE.safetyOffsetK} K (ASSUMED — doplnit 50leté minimum ČHMÚ)`}
        />
        <NumField
          id="TambDesign"
          label="Návrhová teplota okolí T_amb,design"
          unit="°C"
          value={ui.TambDesign}
          onChange={set("TambDesign")}
          slider={{ min: -35, max: 25, step: 0.5 }}
          source={tag("TambDesign")}
          hint="Hodinové návrhové minimum — pro kapacitu"
        />
        <NumField
          id="TambMinSafety"
          label="Extrémní minimum T_amb,min,bezp"
          unit="°C"
          value={ui.TambMinSafety}
          onChange={set("TambMinSafety")}
          source={tag("TambMinSafety")}
          hint="50leté / rekordní minimum — pro rozhodnutí o ochraně (R10)"
        />
        <div className="grid grid-cols-3 gap-2">
          <NumField id="inversion" label="Inverze" unit="K" value={ui.inversionK} onChange={set("inversionK")} min={0} max={5} source={tag("inversionK")} />
          <NumField id="RH" label="RH" unit="%" value={ui.RH} onChange={set("RH")} min={0} max={100} source={tag("RH")} />
          <NumField id="TambSummer" label="Léto" unit="°C" value={ui.TambSummer} onChange={set("TambSummer")} source={tag("TambSummer")} />
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          Údolní poloha s inverzemi (např. Třinec): přičíst 3–5 K. Vítr a oslunění se do návrhu nezapočítávají.
        </p>
      </Group>

      <Group title="Materiál a limit">
        <Select
          id="material"
          label="Nejslabší navazující komponenta"
          value={ui.material}
          onChange={set("material")}
          options={MATERIALS.items.map((m) => ({ value: m.id, label: `${m.label} → ${m.Tlimit_C} °C` }))}
          source={tag("material")}
          hint={`${mat.note} (${mat.status})`}
        />
        <Check
          id="overrideOn"
          label={<>Jiná hodnota T_limit {ui.overrideOn ? <span className="ml-1 rounded bg-red-500/20 px-1 text-[10px] font-semibold text-red-300">PŘEPSÁNO</span> : null}</>}
          checked={ui.overrideOn}
          onChange={set("overrideOn")}
          hint="Vyžaduje písemné zdůvodnění, jinak je výpočet NEPLATNÝ (R09)"
        />
        {ui.overrideOn ? (
          <div className="grid gap-2 rounded-lg border border-red-500/40 bg-red-500/5 p-2">
            <NumField id="overrideT" label="T_limit (přepsáno)" unit="°C" value={ui.overrideT} onChange={set("overrideT")} source="USER" />
            <div className="grid gap-1">
              <Label htmlFor="overrideReason" className="text-xs text-muted-foreground">
                Zdůvodnění (atest, norma, číslo dokumentu)
              </Label>
              <Textarea
                id="overrideReason"
                value={ui.overrideReason}
                onChange={(e) => update({ overrideReason: e.target.value })}
                className="min-h-14 text-xs"
              />
            </div>
          </div>
        ) : null}
        <NumField
          id="margin"
          label="Bezpečnostní rezerva nad T_limit"
          unit="K"
          value={ui.margin}
          onChange={(v) => update({ margin: Math.max(DEFAULT_CONSTANTS.items.MARGIN_MIN.value, v) })}
          min={3}
          source={tag("margin")}
          hint="Nelze nastavit pod 3 K"
        />
      </Group>

      <Group title="Provoz a tlaky">
        <Select
          id="service"
          label="Typ služby"
          value={ui.service}
          onChange={(v) => {
            const s = v as Service;
            const hrs = SERVICE_HOURS[s];
            update(hrs === null ? { service: s } : { service: s, tEvent: hrs }, "PRESET");
          }}
          options={(Object.keys(SERVICE_LABEL) as Service[]).map((k) => ({ value: k, label: SERVICE_LABEL[k] }))}
          source={tag("service")}
        />
        <NumField
          id="tEvent"
          label="Doba nepřetržitého provozu t"
          unit="h"
          value={ui.tEvent}
          onChange={set("tEvent")}
          min={0}
          slider={{ min: 1, max: 72, step: 1 }}
          source={tag("tEvent")}
          hint={
            ui.TambDesign < 2
              ? "Při T_amb < +2 °C námraza neodtaje — zadejte kumulované hodiny od posledního úplného odtátí."
              : "Do odtátí / přepnutí na druhou jednotku"
          }
        />
        <NumField
          id="pLine"
          label="Tlak v potrubí (odpařovači)"
          unit={ui.pLineUnit === "g" ? "bar(g)" : "bar(a)"}
          value={ui.pLine}
          onChange={set("pLine")}
          source={tag("pLine")}
          hint={otherP}
          addon={
            <Segmented
              ariaLabel="Přetlak / absolutní tlak"
              value={ui.pLineUnit}
              onChange={(u) => update({ pLineUnit: u, pLine: Number(convertPressure(ui.pLine, ui.pLineUnit, u).toFixed(4)) })}
              options={[
                { value: "g", label: "g" },
                { value: "a", label: "a" },
              ]}
            />
          }
        />
        <NumField
          id="pTank"
          label="Tlak v zásobníku (stav kapaliny na vstupu)"
          unit="bar(a)"
          value={ui.pTank}
          onChange={set("pTank")}
          source={tag("pTank")}
          hint="Konzervativní default 1,013 bar(a) = nejstudenější kapalina; jiný při čerpadle"
        />
      </Group>

      <Group title="Potrubí za odpařovačem">
        <Segmented
          ariaLabel="Zadání průměru"
          value={ui.pipeMode}
          onChange={set("pipeMode")}
          options={[
            { value: "DN", label: "DN + tloušťka" },
            { value: "ID", label: "Vnitřní průměr" },
          ]}
        />
        {ui.pipeMode === "DN" ? (
          <div className="grid grid-cols-2 gap-2">
            <Select
              id="dn"
              label="DN"
              value={ui.dn}
              onChange={set("dn")}
              options={Object.entries(DN_OD).map(([k, od]) => ({ value: k, label: `${k} (Ø${fmt(od, 1)})` }))}
              source={tag("dn")}
            />
            <NumField id="wall" label="Tloušťka" unit="mm" value={ui.wall} onChange={set("wall")} source={tag("wall")} />
          </div>
        ) : (
          <NumField id="pipeID" label="Vnitřní průměr ID" unit="mm" value={ui.pipeID} onChange={set("pipeID")} source={tag("pipeID")} />
        )}
        <p className="text-[11px] text-muted-foreground">ID = {fmt(pipeIdMm(ui), 1)} mm</p>
      </Group>

      <Group title="Umístění" aside={<SourceTag source="ASSUMED" />}>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
          {LOCATIONS.presets.map((p) => {
            const sel = p.id === ui.location.preset;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={sel}
                title={`${p.label} — ${p.hint}`}
                onClick={() => update({ location: { ...ui.location, preset: p.id } }, "PRESET")}
                className={cn(
                  "grid justify-items-center gap-0.5 rounded-lg border p-1.5 text-center text-[10px] leading-tight transition-colors",
                  sel ? "border-amber-400/70 bg-amber-400/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                  p.impact === "NOGO" && "border-dashed",
                )}
              >
                <Pictogram name={p.pictogram} className="h-7 w-10" />
                <span>{p.label}</span>
                {p.impact === "NOGO" ? <span className="font-semibold text-red-400">❌ NO-GO</span> : p.impact === "WARNING" ? <span className="text-amber-400">⚠️</span> : null}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          <span className="text-foreground">{preset.label}</span> — {preset.hint}
          {preset.fLoc !== null ? ` · f_loc ${fmt(preset.fLoc, 2)} · ΔT_recirc(8 h) ${fmt(preset.dT8, 0)} K${preset.grows ? ", roste s t" : ""}` : ""}
        </p>
        {preset.perExtraRowK ? (
          <NumField
            id="extraRows"
            label="Další současně běžící řady"
            unit="řad"
            value={ui.location.extraRows}
            onChange={(v) => update({ location: { ...ui.location, extraRows: Math.max(0, Math.round(v)) } })}
            min={0}
          />
        ) : null}
        <Select
          id="drain"
          label="Odtok studeného vzduchu u paty"
          value={ui.location.drain}
          onChange={(v) => update({ location: { ...ui.location, drain: v as UiState["location"]["drain"] } })}
          options={[
            { value: "FREE", label: "Volný" },
            { value: "RESTRICTED", label: "Omezený (WARNING)" },
            { value: "BLOCKED", label: "Zablokovaný — sníh, obruba (NO-GO)" },
          ]}
        />
        {preset.impact === "PARAMETRIC" ? (
          <div className="grid grid-cols-3 gap-2">
            <NumField id="phi" label="φ volný obvod" value={ui.location.phi} onChange={(v) => update({ location: { ...ui.location, phi: v } })} step={0.05} source="ASSUMED" />
            <NumField id="gH" label="g/H odstup" value={ui.location.gH} onChange={(v) => update({ location: { ...ui.location, gH: v } })} step={0.05} source="ASSUMED" />
            <NumField
              id="rH"
              label="r/H střecha"
              value={ui.location.rH ?? NaN}
              onChange={(v) => update({ location: { ...ui.location, rH: Number.isFinite(v) ? v : null } })}
              step={0.1}
              source="ASSUMED"
              hint="prázdné = bez střechy"
            />
          </div>
        ) : null}
      </Group>

      <Group title="Jednotka">
        <div className="grid grid-cols-2 gap-2">
          <Select
            id="series"
            label="Řada"
            value={ui.series}
            onChange={(v) => update({ series: v as SeriesId })}
            options={(Object.keys(DEFAULT_CONSTANTS.series) as SeriesId[]).map((k) => ({ value: k, label: DEFAULT_CONSTANTS.series[k].label }))}
            source={tag("series")}
          />
          <Select
            id="profile"
            label="Profil žebra"
            value={ui.profile}
            onChange={set("profile")}
            options={[{ value: "AUTO", label: "Auto dle průtoku" }, ...DEFAULT_CONSTANTS.profiles.map((p) => ({ value: p.id, label: p.label }))]}
            source={tag("profile")}
          />
        </div>
        {ui.mode === "C" || ui.mode === "D" ? (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">Posuzovaná jednotka</span>
            <Segmented
              ariaLabel="Zdroj jednotky"
              value={ui.unitSource}
              onChange={set("unitSource")}
              options={[
                { value: "SIZED", label: "Navržená (A)" },
                { value: "GIVEN", label: "Zadaná N × H" },
              ]}
            />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <NumField
            id="H"
            label="Výška trubky H"
            unit="m"
            value={ui.H}
            onChange={set("H")}
            slider={{ min: 3, max: 8, step: 0.5 }}
            source={tag("H")}
            hint={showGiven ? undefined : "Aplikace přepočte počet trubek"}
          />
          {showGiven ? (
            <NumField id="N" label="Počet trubek N" unit="ks" value={ui.N} onChange={set("N")} min={1} source={tag("N")} />
          ) : null}
        </div>
      </Group>

      <Group title="Ochranné vrstvy">
        <Check
          id="trimHeater"
          label="Elektrický dohřívač za AAE je součástí návrhu"
          checked={ui.trimHeater}
          onChange={set("trimHeater")}
          hint="AAE se pak dimenzuje na přístup 15 K, zbytek dohřeje dohřívač; LTPS zůstává povinná"
        />
        <Check
          id="cs"
          label="Uhlíková ocel mezi odpařovačem a uzávěrem LTPS"
          checked={ui.csBeforeShutoff}
          onChange={set("csBeforeShutoff")}
          hint="R08 — nepřípustné, TE a uzávěr musí být na nerezu"
        />
      </Group>

      <Group title="Report">
        <div className="grid gap-2">
          <TextInput id="project" label="Projekt / závod" value={ui.project} onChange={(v) => update({ project: v })} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput id="processedBy" label="Zpracoval" value={ui.processedBy} onChange={(v) => update({ processedBy: v })} />
            <TextInput id="checkedBy" label="Ověřil" value={ui.checkedBy} onChange={(v) => update({ checkedBy: v })} />
          </div>
        </div>
      </Group>
    </div>
  );
}

function TextInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}
