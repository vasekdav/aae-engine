# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

AAE Engine v.2 — design and safety verification calculator for cryogenic ambient-air vaporizers (N₂ / O₂ / Ar). A Next.js 16 port of the standalone `AAE_Engine_v.2.html` Excel-style workbook, calibrated against the Linde L40 vaporizer. The UI is in **Czech**; code, comments, and commit messages are in English.

## Commands

Package manager is **pnpm** (Node 20+; CI uses Node 22 + pnpm 10).

```bash
pnpm install          # install dependencies
pnpm dev              # dev server at http://localhost:3000
pnpm test             # run all unit tests once (vitest run)
pnpm test:watch       # Vitest watch mode
pnpm lint             # ESLint (eslint-config-next + typescript)
pnpm build            # production build
```

Run a single test file:

```bash
pnpm vitest run src/lib/aae/__tests__/thermo.test.ts
```

Always run `pnpm test` after any change under `src/lib/aae/` — the engine ports the workbook formulas 1:1 and tests guard that behavior.

## Architecture

The hard rule of this codebase: **math and UI are strictly separated**. `src/lib/aae/` is a pure TypeScript calculation engine with no React/DOM imports, so formulas can be unit-tested and verified against standards without touching components.

### Calculation engine (`src/lib/aae/`)

Single entry point: `calculate(request)` in `calculate.ts`. It merges `request.inputs`/`request.model` over `DEFAULT_INPUTS`/`DEFAULT_MODEL` (the L40 calibration in `constants.ts`), resolves the medium via `media.ts`, and dispatches on mode:

- `modes/sizing.ts` — SIZING (Návrh): required flow Q → tube count N
- `modes/capacity.ts` — CAPACITY (Kapacita): installed N → Q_max and actual T_out (bisection solvers in `math/solvers.ts`)
- `modes/velocity.ts` — VELOCITY (Rychlost): pipeline velocity check vs. EIGA/inert limits

Each mode composes pure functions from `math/` (`thermo.ts` LMTD/T_sat/U_eff, `frost.ts` PF(t) × SF_RH performance factors, `velocity.ts`, `crosscheck.ts` two-zone baseline), builds a list of `SafetyCheck`s, and aggregates them with `verdictFromChecks()` in `safety.ts` — worst level wins (NOGO > WARNING > GO).

Every mode returns a `CalcResult` (`types.ts`) containing:

- `verdict` — GO / WARNING / NO-GO with reasons
- `kpis`, `derivation`, `checks` — display-ready rows (values pre-formatted via `format.ts`)
- `protocol` — plain-text export built by `protocol.ts`
- `intermediates` — raw numbers for tests/verification; `null` means "not computable" (the workbook's "NELZE" / "—" state, e.g. tube count when LMTD is impossible)

`index.ts` is the barrel: import everything from `@/lib/aae` (path alias `@/*` → `./src/*`). It also re-exports the individual math functions specifically so tests and verification notebooks can target them directly.

Tests live in `src/lib/aae/__tests__/` (Vitest, `environment: "node"`).

### UI (`src/app/`, `src/components/`)

Next.js App Router with a single page. `components/calculator/` holds the client components; `components/ui/` is shadcn/ui (style `base-nova`, built on `@base-ui/react`, Tailwind CSS v4, lucide icons — add primitives via the shadcn CLI, config in `components.json`).

State flow: medium and mode selection live in `medium-context.tsx` (a React context rendered in the page chrome — header/footer — not inside the calculator card). `calculator.tsx` owns `ProcessInputs`/`ModelParams` state and calls `calculate()` in a `useMemo` on every change; there is no submit button, no server round-trip, and no API routes. Czech UI labels and mode/medium metadata (`MEDIA_OPTIONS`, `MODE_OPTIONS`) also live in `medium-context.tsx`.

## Domain conventions

- Units follow the workbook: flows in Nm³/h, pressures in **bar gauge** at the API boundary (converted to absolute via `PabsFromGauge`), temperatures in °C, diameters in mm. Field names mirror the workbook (`Q`, `H`, `Ninst`, `Tamb`, `RH`, `Pliq`, `Pgas`, …) — keep them, don't rename to camelCase prose.
- Comments in `constants.ts`/`types.ts` reference workbook cells (e.g. "MODEL C5"); preserve these traceability notes when editing.
- Oxygen is special-cased (`MediumProps.o2`): EIGA Doc 13 / CGA G-4.4 impingement velocity limits and an O₂ outlet-temperature advisory.
- `NaN` from `lmtd()` signals an infeasible temperature program; downstream code converts it to `null` intermediates and "NELZE" display values rather than throwing.

## CI / deployment

`.github/workflows/deploy.yml`: every push to `main` and every PR runs **lint → test → build**, then deploys via Vercel CLI (production on `main`, preview + PR comment for PRs). No app environment variables are needed for the calculator.
