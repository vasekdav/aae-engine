# AAE Engine v.2

**Ambient Air Evaporator** — design and safety verification for cryogenic ambient-air vaporizers (N₂ / O₂ / Ar).

Next.js port of the standalone `AAE_Engine_v.2.html` workbook: a pure TypeScript calculation core, a dark industrial UI (shadcn/ui), and unit tests. Ready for Vercel.

> **Předběžný návrh.** Finální dimenzování vždy ověřit dle výrobce a projektových standardů.

---

## What it does

Engineers use AAE Engine to size tube banks, check installed capacity, and verify pipeline velocities against industrial gas practice — with an explicit **GO / WARNING / NO-GO** verdict and a copyable protocol.

| Mode | Czech UI | Input → Output |
|------|----------|----------------|
| **SIZING** | NÁVRH | Required flow **Q** → tube count **N** |
| **CAPACITY** | KAPACITA | Installed **N** → **Q_max** and actual **T_out** |
| **VELOCITY** | RYCHLOST | Liquid / gas line velocity vs. EIGA / inert limits |

**Media:** nitrogen (N₂), oxygen (O₂), argon (Ar)

**Model:** Linde L40 calibration — `U_base`, temperature coefficient `k_U`, fin efficiency, frost performance curve **PF(t)** × humidity factor **SF_RH**

**Safety & checks:**

- Carbon-steel brittle limit (`T_min`) with margin band  
- O₂ outlet-temperature advisory  
- Impingement / velocity limits (EIGA Doc 13 / CGA G-4.4 for oxygen)  
- Capacity margin and two-zone cross-check corridor  
- Frost-curve validity window (1–30 h continuous run)

**Standards referenced:** CGA P-56 · EIGA Doc 133 · EIGA Doc 13 / CGA G-4.4 · ASME B31.3

---

## Quick start

**Requirements:** Node.js 20+, [pnpm](https://pnpm.io)

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | Description |
|---------|-------------|
| `pnpm dev` | Local development server |
| `pnpm test` | Unit tests (math core) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint |

No environment variables are required for the calculator.

---

## Architecture

Math and UI are separated on purpose: equations can be verified and golden-tested without touching React.

```
src/
  lib/aae/                 # Pure calculation engine (no React)
    calculate.ts           # Single entry: calculate(request)
    types.ts               # Domain contracts
    constants.ts           # Defaults, limits, standards line
    media.ts               # N₂ / O₂ / Ar properties
    safety.ts              # Verdict aggregation
    format.ts              # Display helpers
    math/
      thermo.ts            # LMTD, T_sat, U_eff, q_tube, …
      frost.ts             # PF(t), SF_RH, performance factor
      velocity.ts          # Pipe area, v_liq / v_gas, limits
      solvers.ts           # Q_max, T_out bisection
      crosscheck.ts        # Two-zone baseline
    modes/
      sizing.ts
      capacity.ts
      velocity.ts
    __tests__/             # Vitest unit tests
  components/
    calculator/            # Mode UI, KPIs, protocol, derivation
    ui/                    # shadcn primitives
  app/                     # Next.js App Router
```

### Programmatic API

```ts
import { calculate, calculateDefaults } from "@/lib/aae";

// Full request
const result = calculate({
  medium: "N2",
  mode: "SIZING",
  inputs: {
    Q: 1000,      // Nm³/h
    H: 5,         // m tube length
    t: 8,         // h run before defrost
    Tamb: 0,      // °C
    RH: 80,       // %
    Pliq: 12,     // bar g
    Pgas: 5,      // bar g
    Dliq: 80,     // mm
    Dgas: 80,     // mm
    Tout: -10,    // °C target outlet
    Tmin: -20,    // °C CS brittle limit
    Ninst: 50,    // used in CAPACITY
    Tgas: -10,    // used in VELOCITY
  },
  model: {
    /* optional; defaults = L40 calibration */
  },
});

// Partial overrides on workbook defaults
const quick = calculateDefaults({ medium: "O2", mode: "CAPACITY" });

// result.verdict  → { level: "GO" | "WARNING" | "NOGO", label, why }
// result.kpis     → headline numbers for the UI
// result.protocol → plain-text export for clipboard / reports
// result.intermediates → raw values for tests & verification
```

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui |
| Tests | Vitest |
| Deploy | Vercel (zero config) |

---

## Deploy to Vercel

1. Push this repo to GitHub (e.g. `vasekdav/aae-engine`).
2. Import the project in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected).
4. Install command: `pnpm install` · Build: `pnpm build`.

No secrets or env vars are required for the calculator itself.

---

## Math verification (roadmap)

The engine ports the v.2 HTML formulas 1:1. Planned verification:

1. Golden tests against known manufacturer L40 operating points  
2. Clausius–Clapeyron / LMTD / velocity formulas vs. standards  
3. Documented assumptions under `docs/` once verified  

Run `pnpm test` after any change under `src/lib/aae/`.

---

## Disclaimer & license

This tool supports **preliminary design and safety screening** only. It is not a substitute for manufacturer software, PE-stamped calculations, or project-specific codes and materials selection.

**Referenced practice documents** (for guidance, not as certified implementation):  
CGA P-56 · EIGA Doc 133 · EIGA Doc 13 / CGA G-4.4 · ASME B31.3

Private project — all rights reserved unless a `LICENSE` file is added.
