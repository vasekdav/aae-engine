# AAE ENGINE v.2

Návrh a bezpečnostní verifikace ambient-air odpařovačů (N₂ / O₂ / Ar).

Port of the standalone `AAE_Engine_v.2.html` calculator into a **Next.js** app with **shadcn/ui**, a pure TypeScript calculation core, and unit tests — ready for Vercel.

## Features

| Mode | Purpose |
|------|---------|
| **NÁVRH (SIZING)** | Q → required tube count N |
| **KAPACITA (CAPACITY)** | N → Q_max / actual T_out |
| **RYCHLOST (VELOCITY)** | Pipe velocity vs. EIGA / inert limits |

- Media: N₂, O₂, Ar  
- Model: L40 calibration (`U_base`, `k_U`, `η_fin`) + frost SF(t) × SF_RH  
- Safety: CS brittle limit, O₂ advisory, impingement (EIGA Doc 13), capacity margin  
- Protocol export (clipboard text)

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript  
- **Tailwind CSS v4** · **shadcn/ui**  
- **Vitest** for the pure math core  
- Deploy target: **Vercel** (zero config)

## Architecture

```
src/
  lib/aae/           # Pure calculation engine (no React)
    math/            # frost, thermo, velocity, solvers, crosscheck
    modes/           # SIZING | CAPACITY | VELOCITY
    calculate.ts     # single entry: calculate(request)
    __tests__/       # unit tests — foundation for math verification
  components/
    calculator/      # UI shell over the engine
    ui/              # shadcn primitives
  app/               # Next.js routes
```

Math and UI are intentionally separated so equations can be verified later without touching the interface.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # run math unit tests
pnpm build        # production build (Vercel uses this)
```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab.
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `pnpm build` · Output: default Next.js.

No env vars required for the calculator itself.

## Math verification (next step)

The engine ports the v.2 HTML formulas 1:1. Planned verification work:

1. Golden tests vs. known manufacturer L40 points  
2. Clausius–Clapeyron / LMTD / velocity formulas vs. standards  
3. Document assumptions in `docs/` once verified  

Run `pnpm test` after any math change.

## License / disclaimer

Předběžný návrh — finální dimenzování ověřit dle výrobce a projektových standardů.
Standards referenced: CGA P-56 · EIGA Doc 133 · EIGA Doc 13 / CGA G-4.4 · ASME B31.3.
