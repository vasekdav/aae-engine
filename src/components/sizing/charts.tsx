"use client";

import { useId, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/sizing";
import { cn } from "@/lib/utils";

/**
 * Hand-rolled SVG charts (no chart dependency): one y-axis, thin 2px lines,
 * recessive grid, legend + direct labels, crosshair tooltip and a table view.
 * Colors come from CSS tokens on `.viz` (sizing.css) so print gets its own steps.
 */

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number | null }[];
  dash?: string;
}

export interface RefLine {
  value: number;
  label: string;
  color: string;
  dash?: string;
}

interface Box {
  w: number;
  h: number;
  l: number;
  r: number;
  t: number;
  b: number;
}

const BOX: Box = { w: 640, h: 280, l: 52, r: 16, t: 14, b: 36 };

function niceTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min - 1, min, min + 1];
  }
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

function domain(values: number[], pad = 0.06): [number, number] {
  const v = values.filter(Number.isFinite);
  if (!v.length) return [0, 1];
  let lo = Math.min(...v);
  let hi = Math.max(...v);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const p = (hi - lo) * pad;
  return [lo - p, hi + p];
}

export function Legend({ items }: { items: { label: string; color: string; dash?: string; kind?: "line" | "box" }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          {it.kind === "box" ? (
            <span className="inline-block size-2.5 rounded-[3px]" style={{ background: it.color }} />
          ) : (
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke={it.color} strokeWidth="2" strokeDasharray={it.dash} />
            </svg>
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function ChartFrame({
  title,
  subtitle,
  legend,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("viz grid gap-2 rounded-xl border border-border/60 bg-card/40 p-3 print:break-inside-avoid", className)}>
      <figcaption className="grid gap-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {subtitle ? <span className="text-[11px] text-muted-foreground">{subtitle}</span> : null}
      </figcaption>
      {legend}
      {children}
      {table ? (
        <details className="text-[11px] text-muted-foreground print:hidden">
          <summary className="cursor-pointer select-none">Tabulka hodnot</summary>
          <div className="mt-2 max-h-56 overflow-auto">{table}</div>
        </details>
      ) : null}
    </figure>
  );
}

export function LineChart({
  series,
  band,
  refLines = [],
  vLines = [],
  dangerBelow,
  xLabel,
  yLabel,
  xFmt = (x) => fmt(x, 0),
  yFmt = (y) => fmt(y, 0),
  xDomain,
  shadeX,
}: {
  series: LineSeries[];
  band?: { lower: { x: number; y: number | null }[]; upper: { x: number; y: number | null }[]; color: string; label: string };
  refLines?: RefLine[];
  vLines?: { value: number; label: string; color?: string }[];
  /** Shade the region below this y as NO-GO. */
  dangerBelow?: number;
  xLabel: string;
  yLabel: string;
  xFmt?: (x: number) => string;
  yFmt?: (y: number) => string;
  xDomain?: [number, number];
  /** Background bands along x (e.g. tube zones). */
  shadeX?: { from: number; to: number; color: string; label: string }[];
}) {
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const xs = series.flatMap((s) => s.points.map((p) => p.x));
  const ys = [
    ...series.flatMap((s) => s.points.map((p) => p.y ?? NaN)),
    ...(band ? [...band.lower, ...band.upper].map((p) => p.y ?? NaN) : []),
    ...refLines.map((r) => r.value),
  ];
  const [x0, x1] = xDomain ?? domain(xs, 0);
  const [y0, y1] = domain(ys);
  const { w, h, l, r, t, b } = BOX;
  const sx = (x: number) => l + ((x - x0) / (x1 - x0 || 1)) * (w - l - r);
  const sy = (y: number) => t + (1 - (y - y0) / (y1 - y0 || 1)) * (h - t - b);

  const path = (pts: { x: number; y: number | null }[]) => {
    let d = "";
    let pen = false;
    for (const p of pts) {
      if (p.y === null || !Number.isFinite(p.y)) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
      pen = true;
    }
    return d;
  };

  const bandPath = useMemo(() => {
    if (!band) return "";
    const up = band.upper.filter((p) => p.y !== null);
    const lo = band.lower.filter((p) => p.y !== null);
    if (!up.length || !lo.length) return "";
    return (
      up.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y!).toFixed(1)}`).join("") +
      [...lo].reverse().map((p) => `L${sx(p.x).toFixed(1)},${sy(p.y!).toFixed(1)}`).join("") +
      "Z"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, x0, x1, y0, y1]);

  const xt = niceTicks(x0, x1, 8);
  const yt = niceTicks(y0, y1, 6);
  const allX = series[0]?.points.map((p) => p.x) ?? [];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !allX.length) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const xv = x0 + ((px - l) / (w - l - r)) * (x1 - x0);
    let best = 0;
    for (let i = 1; i < allX.length; i++) if (Math.abs(allX[i] - xv) < Math.abs(allX[best] - xv)) best = i;
    setHover(best);
  };

  const hx = hover !== null ? allX[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`${yLabel} vs. ${xLabel}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={l} y={t} width={w - l - r} height={h - t - b} />
          </clipPath>
        </defs>
        {shadeX?.map((z) => (
          <rect
            key={z.label + z.from}
            x={sx(Math.max(x0, z.from))}
            y={t}
            width={Math.max(0, sx(Math.min(x1, z.to)) - sx(Math.max(x0, z.from)))}
            height={h - t - b}
            fill={z.color}
          />
        ))}
        {dangerBelow !== undefined && dangerBelow > y0 ? (
          <g clipPath={`url(#${clipId})`}>
            <rect x={l} y={sy(Math.min(dangerBelow, y1))} width={w - l - r} height={h - b - sy(Math.min(dangerBelow, y1))} fill="var(--zone-nogo)" />
            <text x={l + 6} y={h - b - 6} fontSize="10" fill="var(--crit)" fontWeight={600}>
              ❌ zóna NO-GO (pod T_limit)
            </text>
          </g>
        ) : null}
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={l} x2={w - r} y1={sy(v)} y2={sy(v)} stroke="var(--grid)" />
            <text x={l - 6} y={sy(v) + 3} fontSize="10" textAnchor="end" fill="var(--muted-ink)">
              {yFmt(v)}
            </text>
          </g>
        ))}
        {xt.map((v) => (
          <text key={`x${v}`} x={sx(v)} y={h - b + 14} fontSize="10" textAnchor="middle" fill="var(--muted-ink)">
            {xFmt(v)}
          </text>
        ))}
        <line x1={l} x2={w - r} y1={h - b} y2={h - b} stroke="var(--axis)" />
        <text x={(l + w - r) / 2} y={h - 4} fontSize="10" textAnchor="middle" fill="var(--muted-ink)">
          {xLabel}
        </text>
        <text x={12} y={(t + h - b) / 2} fontSize="10" textAnchor="middle" fill="var(--muted-ink)" transform={`rotate(-90 12 ${(t + h - b) / 2})`}>
          {yLabel}
        </text>
        <g clipPath={`url(#${clipId})`}>
          {bandPath ? <path d={bandPath} fill={band!.color} opacity={0.18} /> : null}
          {refLines.map((rl) => (
            <g key={rl.label}>
              <line x1={l} x2={w - r} y1={sy(rl.value)} y2={sy(rl.value)} stroke={rl.color} strokeWidth={1.5} strokeDasharray={rl.dash ?? "5 4"} />
              <text x={w - r - 4} y={sy(rl.value) - 4} fontSize="10" textAnchor="end" fill="var(--ink)">
                {rl.label}
              </text>
            </g>
          ))}
          {vLines.map((vl) => (
            <g key={vl.label}>
              <line x1={sx(vl.value)} x2={sx(vl.value)} y1={t} y2={h - b} stroke={vl.color ?? "var(--axis)"} strokeWidth={1.5} strokeDasharray="3 3" />
              <text x={sx(vl.value) + 4} y={t + 10} fontSize="10" fill="var(--ink)">
                {vl.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path key={s.id} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </g>
        {hx !== null ? (
          <g pointerEvents="none">
            <line x1={sx(hx)} x2={sx(hx)} y1={t} y2={h - b} stroke="var(--axis)" />
            {series.map((s) => {
              const p = s.points[hover!];
              return p && p.y !== null ? (
                <circle key={s.id} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ) : null;
            })}
          </g>
        ) : null}
      </svg>
      {hx !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-border bg-popover/95 px-2 py-1.5 text-[11px] shadow-md"
          style={{ left: `${Math.min(70, (sx(hx) / w) * 100 + 2)}%` }}
        >
          <div className="mb-1 font-medium text-foreground">
            {xLabel.split(" [")[0]}: {xFmt(hx)}
          </div>
          {series.map((s) => {
            const p = s.points[hover!];
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-foreground">{p && p.y !== null ? yFmt(p.y) : "—"}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SeriesTable({
  series,
  xLabel,
  xFmt,
  yFmt,
}: {
  series: LineSeries[];
  xLabel: string;
  xFmt: (x: number) => string;
  yFmt: (y: number) => string;
}) {
  const xs = series[0]?.points.map((p) => p.x) ?? [];
  return (
    <table className="w-full font-mono tabular-nums">
      <thead>
        <tr className="text-left">
          <th className="pr-3 font-normal">{xLabel}</th>
          {series.map((s) => (
            <th key={s.id} className="pr-3 font-normal">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {xs.map((x, i) => (
          <tr key={x}>
            <td className="pr-3">{xFmt(x)}</td>
            {series.map((s) => (
              <td key={s.id} className="pr-3 text-foreground">
                {s.points[i]?.y === null || s.points[i] === undefined ? "—" : yFmt(s.points[i].y!)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Horizontal bars with a value label per bar and reference lines. */
export function HBarChart({
  rows,
  refLines,
  valueLabel,
  fmtValue,
}: {
  rows: { id: string; label: string; value: number | null; color: string; tag: string }[];
  refLines: RefLine[];
  valueLabel: string;
  fmtValue: (v: number) => string;
}) {
  const vals = [...rows.map((r) => r.value ?? NaN), ...refLines.map((r) => r.value)];
  const [v0, v1] = domain(vals, 0.08);
  const rowH = 22;
  const l = 210;
  const r = 70;
  const w = 640;
  const t = 18;
  const h = t + rows.length * rowH + 22;
  const sx = (v: number) => l + ((v - v0) / (v1 - v0 || 1)) * (w - l - r);
  const ticks = niceTicks(v0, v1, 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={valueLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={sx(v)} x2={sx(v)} y1={t - 4} y2={h - 20} stroke="var(--grid)" />
          <text x={sx(v)} y={h - 6} fontSize="10" textAnchor="middle" fill="var(--muted-ink)">
            {fmtValue(v)}
          </text>
        </g>
      ))}
      {rows.map((row, i) => {
        const y = t + i * rowH;
        const x0 = sx(v0 + (v1 - v0) * 0);
        return (
          <g key={row.id}>
            <title>{`${row.label}: ${row.value === null ? row.tag : fmtValue(row.value)}`}</title>
            <text x={l - 8} y={y + 14} fontSize="10.5" textAnchor="end" fill="var(--ink)">
              {row.label.length > 34 ? row.label.slice(0, 33) + "…" : row.label}
            </text>
            {row.value !== null ? (
              <>
                <rect x={x0} y={y + 4} width={Math.max(2, sx(row.value) - x0)} height={rowH - 8} rx={3} fill={row.color} />
                <text x={sx(row.value) + 6} y={y + 14} fontSize="10" fill="var(--ink)">
                  {fmtValue(row.value)} {row.tag}
                </text>
              </>
            ) : (
              <text x={x0 + 4} y={y + 14} fontSize="10" fill="var(--crit)" fontWeight={600}>
                {row.tag}
              </text>
            )}
          </g>
        );
      })}
      {refLines.map((rl) => (
        <g key={rl.label}>
          <line x1={sx(rl.value)} x2={sx(rl.value)} y1={t - 4} y2={h - 20} stroke={rl.color} strokeWidth={1.5} strokeDasharray={rl.dash ?? "5 4"} />
          <text x={sx(rl.value) + 3} y={t - 6} fontSize="10" fill="var(--ink)">
            {rl.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Vertical bars for tube count per height, with the real reserve as direct label. */
export function NxHChart({
  rows,
  selectedH,
}: {
  rows: { H: number; N: number; reserve: number }[];
  selectedH: number;
}) {
  const w = 640;
  const h = 200;
  const l = 40;
  const r = 10;
  const t = 22;
  const b = 30;
  const maxN = Math.max(...rows.map((x) => x.N), 1);
  const bw = (w - l - r) / rows.length;
  const sy = (n: number) => t + (1 - n / (maxN * 1.1)) * (h - t - b);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Počet trubek vs. výška">
      {niceTicks(0, maxN * 1.1, 4).map((v) => (
        <g key={v}>
          <line x1={l} x2={w - r} y1={sy(v)} y2={sy(v)} stroke="var(--grid)" />
          <text x={l - 6} y={sy(v) + 3} fontSize="10" textAnchor="end" fill="var(--muted-ink)">
            {fmt(v, 0)}
          </text>
        </g>
      ))}
      {rows.map((row, i) => {
        const x = l + i * bw + bw * 0.2;
        const sel = Math.abs(row.H - selectedH) < 1e-9;
        return (
          <g key={row.H}>
            <title>{`H ${row.H} m: ${row.N} trubek, rezerva ${fmt(row.reserve * 100, 1)} %`}</title>
            <rect x={x} y={sy(row.N)} width={bw * 0.6} height={h - b - sy(row.N)} rx={4} fill={sel ? "var(--s1)" : "var(--s1-soft)"} />
            <text x={x + bw * 0.3} y={sy(row.N) - 12} fontSize="10.5" textAnchor="middle" fill="var(--ink)" fontWeight={600}>
              {row.N} ks
            </text>
            <text x={x + bw * 0.3} y={sy(row.N) - 2} fontSize="9.5" textAnchor="middle" fill="var(--muted-ink)">
              +{fmt(row.reserve * 100, 1)} %
            </text>
            <text x={x + bw * 0.3} y={h - b + 14} fontSize="10" textAnchor="middle" fill="var(--muted-ink)">
              {fmt(row.H, 0)} m
            </text>
          </g>
        );
      })}
    </svg>
  );
}
