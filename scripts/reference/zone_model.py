"""Independent reference for the AAE zone model (CoolProp directly, no tables).

Run:  python3 scripts/reference/zone_model.py
Writes src/lib/sizing/__tests__/reference-vectors.json, consumed by the
Vitest suite and the in-app self-test.

The model definition is the same as src/lib/sizing/model/zones.ts:
  Λ(T_out) = ∫ dh / (T_air − T)   from saturated liquid at p_tank,
  liquid zone along the saturated-liquid curve (compressed-liquid correction
  neglected), boiling at T_sat(p_line), superheat at p_line.
The integration here is independent: dense trapezoid in T with CoolProp
enthalpies at every node, no property tables, no log-grid tricks.
"""

import json
import math
import os

import CoolProp.CoolProp as CP

FLUIDS = {"N2": "Nitrogen", "O2": "Oxygen", "Ar": "Argon"}
P_ATM = 101325.0
OUT = os.path.join(
    os.path.dirname(__file__), "..", "..", "src", "lib", "sizing", "data", "reference-vectors.json"
)


def lam_to(fluid, p_line, p_tank, t_air, t_out, n=20000):
    tsat = CP.PropsSI("T", "P", p_line, "Q", 0, fluid)
    t_in = min(CP.PropsSI("T", "P", p_tank, "Q", 0, fluid), tsat)
    h_in = CP.PropsSI("H", "P", p_tank, "Q", 0, fluid)
    hl = CP.PropsSI("H", "P", p_line, "Q", 0, fluid)
    hv = CP.PropsSI("H", "P", p_line, "Q", 1, fluid)
    lam = 0.0
    # liquid
    if h_in < hl and tsat > t_in:
        m = 2000
        prev_t, prev_h = t_in, h_in
        for k in range(1, m + 1):
            t = t_in + (tsat - t_in) * k / m
            h = hl if k == m else CP.PropsSI("H", "T", t, "Q", 0, fluid)
            lam += (h - prev_h) / (t_air - 0.5 * (t + prev_t))
            prev_t, prev_h = t, h
    lam_liq = lam
    lam += (hv - max(h_in, hl)) / (t_air - tsat)
    lam_vap = lam
    # superheat: trapezoid in T with dh/dT from finite differences of h
    # (graded mesh: denser towards T_out)
    prev_t, prev_h = tsat, hv
    for k in range(1, n + 1):
        u = k / n
        t = tsat + (t_out - tsat) * (1 - (1 - u) ** 2)
        h = CP.PropsSI("H", "T", t, "P", p_line, fluid)
        d1 = t_air - prev_t
        d2 = t_air - t
        lm = d1 if abs(d1 - d2) < 1e-12 else (d1 - d2) / math.log(d1 / d2)
        lam += (h - prev_h) / lm
        prev_t, prev_h = t, h
    return {"tsat": tsat, "t_in": t_in, "lam_liq": lam_liq, "lam_vap": lam_vap, "lam": lam}


def workbook_specific(medium, p_line, t_air, t_out):
    """Δh/LMTD of the L40 workbook (NAVRH C30/C50) — constants from src/lib/aae/media.ts."""
    media = {
        "N2": dict(tb=-195.8, L=199, cp=1.041, M=28.013),
        "O2": dict(tb=-183.0, L=213, cp=0.918, M=31.999),
        "Ar": dict(tb=-185.9, L=161, cp=0.52, M=39.948),
    }[medium]
    tb = media["tb"] + 273.15
    inv = 1 / tb - (8.314 * math.log((p_line / 1e5) / 1.01325)) / (media["M"] / 1000 * media["L"] * 1000)
    ts = 1 / inv - 273.15
    d1 = (t_air - 273.15) - ts
    d2 = (t_air - 273.15) - (t_out - 273.15)
    lmtd = d1 if abs(d1 - d2) < 1e-3 else (d1 - d2) / math.log(d1 / d2)
    dh = (media["L"] + media["cp"] * (t_out - 273.15 - ts)) * 1000
    return dh / lmtd


CASES = [
    # id, medium, p_line [bar a], p_tank [bar a], T_air [°C], T_out [°C]
    ("N2_ref", "N2", 11.01325, 11.01325, 20, 5),
    ("N2_design", "N2", 11.01325, 1.01325, -15, -30),
    ("N2_warm", "N2", 6.0, 1.01325, 10, 0),
    ("N2_hp", "N2", 25.0, 3.0, -5, -12),
    ("O2_design", "O2", 9.0, 1.01325, -12, -20),
    ("O2_hp", "O2", 40.0, 5.0, 0, -10),
    ("Ar_design", "Ar", 12.0, 1.01325, -15, -25),
    ("Ar_low", "Ar", 2.0, 1.2, 5, -5),
]


def main():
    vectors = []
    for cid, medium, pl, pt, ta, to in CASES:
        fluid = FLUIDS[medium]
        r = lam_to(fluid, pl * 1e5, pt * 1e5, ta + 273.15, to + 273.15)
        vectors.append(
            {
                "id": cid,
                "medium": medium,
                "pLine": pl * 1e5,
                "pTank": pt * 1e5,
                "Tair": ta + 273.15,
                "Tout": to + 273.15,
                "Tsat": r["tsat"],
                "lamLiq": r["lam_liq"],
                "lamVap": r["lam_vap"],
                "lam": r["lam"],
                "rhoOut": CP.PropsSI("D", "T", to + 273.15, "P", pl * 1e5, fluid),
            }
        )
        print(cid, {k: round(v, 3) for k, v in r.items()})
    ref = next(v for v in vectors if v["id"] == "N2_ref")
    cal = ref["lam"] / workbook_specific("N2", ref["pLine"], ref["Tair"], ref["Tout"])
    print("C_cal =", cal)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(
            {
                "generator": "scripts/reference/zone_model.py",
                "coolprop": CP.get_global_param_string("version"),
                "calibrationC": cal,
                "vectors": vectors,
            },
            f,
            indent=1,
        )


if __name__ == "__main__":
    main()
