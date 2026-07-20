"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  calculate,
  DEFAULT_INPUTS,
  DEFAULT_MODEL,
  type CalcMode,
  type ModelParams,
  type ProcessInputs,
} from "@/lib/aae";
import { cn } from "@/lib/utils";
import { ChevronDown, Settings2 } from "lucide-react";
import { Field } from "./field";
import { KpiGrid } from "./kpi-grid";
import {
  getMediumMeta,
  getModeMeta,
  MODE_OPTIONS,
  useMedium,
} from "./medium-context";
import { ProtocolPanel } from "./protocol-panel";
import { Stamp } from "./stamp";
import { StepsList } from "./steps-list";

function showField(mode: CalcMode, modes: CalcMode[]): boolean {
  return modes.includes(mode);
}

export function Calculator() {
  const { medium, mode, setMode } = useMedium();
  const [inputs, setInputs] = useState<ProcessInputs>({ ...DEFAULT_INPUTS });
  const [model, setModel] = useState<ModelParams>({ ...DEFAULT_MODEL });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const result = useMemo(
    () => calculate({ medium, mode, inputs, model }),
    [medium, mode, inputs, model],
  );

  function setInput<K extends keyof ProcessInputs>(key: K, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function setModelField<K extends keyof ModelParams>(key: K, value: number) {
    setModel((prev) => ({ ...prev, [key]: value }));
  }

  const modeMeta = getModeMeta(mode);
  const mediumMeta = getMediumMeta(medium);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Page intro — medium identity left, calc mode action right */}
      <header className="mb-6 border-b border-border/60 pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Médium
            </p>
            <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
              <span>{mediumMeta.name}</span>
              <Badge
                variant="secondary"
                className="h-7 rounded-md px-2.5 font-mono text-sm font-semibold tracking-tight"
              >
                {mediumMeta.label}
              </Badge>
              {medium === "O2" ? (
                <Badge
                  variant="outline"
                  className="h-7 rounded-md border-amber-500/35 bg-amber-500/8 px-2 text-xs font-medium text-amber-800 dark:text-amber-400"
                >
                  O₂ service
                </Badge>
              ) : null}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Návrh a bezpečnostní verifikace ambient-air odpařovačů
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Režim výpočtu
            </p>
            <ButtonGroup aria-label="Režim výpočtu">
              {MODE_OPTIONS.map((m) => {
                const selected = mode === m.id;
                return (
                  <Button
                    key={m.id}
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    title={m.description}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </ButtonGroup>
            <p className="text-[11px] text-muted-foreground sm:text-right">
              {modeMeta.description}
            </p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,24rem)_1fr]">
        {/* Inputs — process params; mode is page-header action */}
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <CardTitle>Vstupy</CardTitle>
            <CardDescription>
              Procesní parametry · {modeMeta.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {showField(mode, ["SIZING", "CAPACITY", "VELOCITY"]) && (
                <Field
                  id="Q"
                  label={
                    <>
                      Q <span className="font-normal">[Nm³/h]</span>
                    </>
                  }
                  value={inputs.Q}
                  step={10}
                  onChange={(v) => setInput("Q", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="H"
                  label={
                    <>
                      H <span className="font-normal">[m]</span>
                    </>
                  }
                  value={inputs.H}
                  step={0.1}
                  onChange={(v) => setInput("H", v)}
                />
              )}
              {showField(mode, ["CAPACITY"]) && (
                <Field
                  id="Ninst"
                  label={
                    <>
                      N <span className="font-normal">[ks]</span>
                    </>
                  }
                  value={inputs.Ninst}
                  step={1}
                  onChange={(v) => setInput("Ninst", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="t"
                  label={
                    <>
                      t <span className="font-normal">[h]</span>
                    </>
                  }
                  hint="Provoz před odtáním (1–30 h)"
                  value={inputs.t}
                  step={0.5}
                  onChange={(v) => setInput("t", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="Tamb"
                  label={
                    <>
                      T_amb <span className="font-normal">[°C]</span>
                    </>
                  }
                  value={inputs.Tamb}
                  step={1}
                  onChange={(v) => setInput("Tamb", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="RH"
                  label={
                    <>
                      RH <span className="font-normal">[%]</span>
                    </>
                  }
                  hint="Korekce námrazy"
                  value={inputs.RH}
                  step={5}
                  min={0}
                  max={100}
                  onChange={(v) => setInput("RH", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY", "VELOCITY"]) && (
                <Field
                  id="Pgas"
                  label={
                    <>
                      P_gas <span className="font-normal">[bar g]</span>
                    </>
                  }
                  value={inputs.Pgas}
                  step={0.5}
                  onChange={(v) => setInput("Pgas", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="Dliq"
                  label={
                    <>
                      D_liq <span className="font-normal">[mm]</span>
                    </>
                  }
                  value={inputs.Dliq}
                  step={1}
                  onChange={(v) => setInput("Dliq", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY", "VELOCITY"]) && (
                <Field
                  id="Dgas"
                  label={
                    <>
                      D_gas <span className="font-normal">[mm]</span>
                    </>
                  }
                  value={inputs.Dgas}
                  step={1}
                  onChange={(v) => setInput("Dgas", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY"]) && (
                <Field
                  id="Tout"
                  label={
                    <>
                      T_out <span className="font-normal">[°C]</span>
                    </>
                  }
                  hint="≥ T_min + rezerva"
                  value={inputs.Tout}
                  step={1}
                  onChange={(v) => setInput("Tout", v)}
                />
              )}
              {showField(mode, ["VELOCITY"]) && (
                <Field
                  id="Tgas"
                  label={
                    <>
                      T_gas <span className="font-normal">[°C]</span>
                    </>
                  }
                  value={inputs.Tgas}
                  step={1}
                  onChange={(v) => setInput("Tgas", v)}
                />
              )}
              {showField(mode, ["SIZING", "CAPACITY", "VELOCITY"]) && (
                <Field
                  id="Tmin"
                  label={
                    <>
                      T_min <span className="font-normal">[°C]</span>
                    </>
                  }
                  hint="Limit křehkého lomu CS"
                  value={inputs.Tmin}
                  step={1}
                  onChange={(v) => setInput("Tmin", v)}
                />
              )}
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "w-full justify-between px-2",
                )}
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="size-4" />
                  Pokročilé — model L40
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4">
                  <Field
                    id="Ubase"
                    label="U_base [W/m²K]"
                    hint="U při 0 °C"
                    value={model.Ubase}
                    step={0.1}
                    onChange={(v) => setModelField("Ubase", v)}
                  />
                  <Field
                    id="Uk"
                    label="k_U [1/K]"
                    hint="U_eff = U·(1+k·T_amb)"
                    value={model.Uk}
                    step={0.001}
                    onChange={(v) => setModelField("Uk", v)}
                  />
                  <Field
                    id="finEta"
                    label="η_fin [–]"
                    hint="Účinnost 12-fin žebra"
                    value={model.finEta}
                    step={0.01}
                    onChange={(v) => setModelField("finEta", v)}
                  />
                  <Field
                    id="vInert"
                    label="v_lim inerty [m/s]"
                    value={model.vInert}
                    step={1}
                    onChange={(v) => setModelField("vInert", v)}
                  />
                  <Field
                    id="vLiqLim"
                    label="v_lim kapalina [m/s]"
                    value={model.vLiqLim}
                    step={0.1}
                    onChange={(v) => setModelField("vLiqLim", v)}
                  />
                  <Field
                    id="pfA"
                    label="PF a [–]"
                    hint="PF(t)=a·e^(b·t)+c"
                    value={model.pfA}
                    step={0.01}
                    onChange={(v) => setModelField("pfA", v)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="shadow-none">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Výsledek</CardTitle>
                <CardDescription>
                  {modeMeta.label}
                  {" — "}
                  {result.title.replace(/^NÁVRH — |^KAPACITA — |^RYCHLOST — /, "")}
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-normal">
                {result.mediumName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Stamp verdict={result.verdict} />
            <KpiGrid items={result.kpis} />
            <Separator />
            <StepsList title="Odvození" steps={result.derivation} />
            {result.checks.length > 0 ? (
              <StepsList title="Bezpečnostní kontroly" steps={result.checks} />
            ) : null}
            <Separator />
            <ProtocolPanel protocol={result.protocol} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
