"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Level } from "@/lib/sizing";
import type { Source } from "./state";

const SOURCE_STYLE: Record<Source, string> = {
  USER: "border-sky-400/40 text-sky-300",
  DEFAULT: "border-border text-muted-foreground",
  PRESET: "border-violet-400/40 text-violet-300",
  ASSUMED: "border-amber-400/40 text-amber-300",
};

export function SourceTag({ source }: { source: Source }) {
  return (
    <span
      className={cn(
        "rounded border px-1 py-px font-mono text-[9px] leading-none tracking-wide",
        SOURCE_STYLE[source],
      )}
      title={
        source === "USER"
          ? "Zadáno uživatelem"
          : source === "PRESET"
            ? "Nastaveno předvolbou"
            : source === "ASSUMED"
              ? "Inženýrský odhad — do nahrazení měřením"
              : "Výchozí hodnota"
      }
    >
      {source}
    </span>
  );
}

/** Input group — yellow edge = inputs (workbook color convention). */
export function Group({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-border/60 border-l-4 border-l-amber-400/70 bg-card/40 p-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-amber-200/90 uppercase">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

const show = (v: number) => (Number.isFinite(v) ? String(Number(v.toFixed(4))) : "");
const parse = (t: string) => {
  const s = t.trim().replace(",", ".").replace("−", "-");
  return s === "" ? NaN : Number(s);
};

export function NumField({
  id,
  label,
  unit,
  value,
  onChange,
  step = 1,
  min,
  max,
  slider,
  source,
  hint,
  addon,
  disabled,
}: {
  id: string;
  label: React.ReactNode;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Exploration slider; the number field stays authoritative. */
  slider?: { min: number; max: number; step: number };
  source?: Source;
  hint?: React.ReactNode;
  addon?: React.ReactNode;
  disabled?: boolean;
}) {
  // Local draft keeps half-typed input ("−", "1.") while the parsed number drives the case.
  const [draft, setDraft] = useState(show(value));
  const [prev, setPrev] = useState(value);
  if (!Object.is(value, prev)) {
    setPrev(value);
    if (parse(draft) !== value) setDraft(show(value));
  }
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {source ? <SourceTag source={source} /> : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft}
            step={step}
            min={min}
            max={max}
            disabled={disabled}
            aria-invalid={!Number.isFinite(parse(draft)) || undefined}
            onValueChange={(raw) => {
              const text = String(raw);
              setDraft(text);
              const v = parse(text);
              if (Number.isFinite(v)) onChange(v);
            }}
            className="h-8 bg-amber-400/5 pr-14 font-mono text-sm tabular-nums"
          />
          {unit ? (
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </div>
        {addon}
      </div>
      {slider ? (
        <input
          type="range"
          aria-label={`${typeof label === "string" ? label : id} — posuvník`}
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={Number.isFinite(value) ? Math.min(slider.max, Math.max(slider.min, value)) : slider.min}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-1.5 w-full cursor-pointer accent-amber-400"
        />
      ) : null}
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function Select({
  id,
  label,
  value,
  onChange,
  options,
  source,
  hint,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  source?: Source;
  hint?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {source ? <SourceTag source={source} /> : null}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-input bg-amber-400/5 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-popover">
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export function Check({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-xs">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-3.5 accent-amber-400"
      />
      <span className="grid gap-0.5">
        <span className="text-foreground">{label}</span>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Small segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string; disabled?: boolean }[];
  ariaLabel: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex max-w-full shrink-0 flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={sel}
            title={o.title}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
              sel ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const LEVEL_ICON: Record<Level, typeof CheckCircle2> = {
  GO: CheckCircle2,
  WARNING: AlertTriangle,
  NOGO: XCircle,
  INVALID: XCircle,
};

export const LEVEL_TEXT: Record<Level, string> = {
  GO: "text-emerald-400",
  WARNING: "text-amber-400",
  NOGO: "text-red-400",
  INVALID: "text-red-400",
};

export const LEVEL_BG: Record<Level, string> = {
  GO: "bg-emerald-500/10 border-emerald-500/40",
  WARNING: "bg-amber-500/10 border-amber-500/40",
  NOGO: "bg-red-500/10 border-red-500/50",
  INVALID: "bg-red-500/15 border-red-500/60",
};

/** Status always carries icon + text, never color alone. */
export function LevelIcon({ level, className }: { level: Level; className?: string }) {
  const I = LEVEL_ICON[level];
  return <I className={cn("size-4 shrink-0", LEVEL_TEXT[level], className)} aria-label={level} />;
}

export function InfoIcon({ className }: { className?: string }) {
  return <Info className={cn("size-4 shrink-0 text-sky-400", className)} aria-label="info" />;
}
