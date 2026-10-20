"""Generate thermophysical property tables for the AAE sizing core.

Run:  python3 scripts/props/generate_props.py
Needs: CoolProp (pip install CoolProp)

Output: src/lib/sizing/data/props-<medium>.json

Layout (SI: K, Pa, J/kg, J/(kg·K), kg/m³):
  sat  — saturation curve on an ln(p) grid: T, h_l, h_v, rho_l, rho_v
  vap  — superheated vapour rows at fixed pressures, tabulated against
         superheat dT = T − T_sat(p_row): h, cp, rho
Interpolating the vapour grid in (dT, ln p) keeps every row's first point
exactly on the saturation curve, so cells never straddle the phase boundary.
Supercritical pressures are deliberately not tabulated (the core returns
OUT_OF_TABLE there).
"""

import json
import math
import os

import CoolProp
import CoolProp.CoolProp as CP

MEDIA = {"N2": "Nitrogen", "O2": "Oxygen", "Ar": "Argon"}
P_MIN = 0.9e5  # Pa(a)
P_MAX_FRAC = 0.95  # of p_crit
N_SAT = 90
N_ROWS = 36
P_N = 101325.0  # normal conditions (0 °C, 1.01325 bar)
T_N = 273.15

# Superheat grid [K]: fine near saturation where cp is steep.
DT = (
    [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12.5, 15, 17.5, 20, 25, 30, 35, 40, 45, 50]
    + list(range(60, 301, 10))
)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "src", "lib", "sizing", "data")


def r(x, sig=7):
    return float(f"{x:.{sig}g}")


def build(medium_id, fluid):
    pc = CP.PropsSI("pcrit", fluid)
    tc = CP.PropsSI("Tcrit", fluid)
    p_max = P_MAX_FRAC * pc
    lnp = [math.log(P_MIN) + i * (math.log(p_max) - math.log(P_MIN)) / (N_SAT - 1) for i in range(N_SAT)]
    sat = {"lnp": [], "T": [], "hl": [], "hv": [], "rhol": [], "rhov": []}
    for lp in lnp:
        p = math.exp(lp)
        sat["lnp"].append(r(lp, 9))
        sat["T"].append(r(CP.PropsSI("T", "P", p, "Q", 0, fluid)))
        sat["hl"].append(r(CP.PropsSI("H", "P", p, "Q", 0, fluid)))
        sat["hv"].append(r(CP.PropsSI("H", "P", p, "Q", 1, fluid)))
        sat["rhol"].append(r(CP.PropsSI("D", "P", p, "Q", 0, fluid)))
        sat["rhov"].append(r(CP.PropsSI("D", "P", p, "Q", 1, fluid)))

    rows_lnp = [math.log(P_MIN) + i * (math.log(p_max) - math.log(P_MIN)) / (N_ROWS - 1) for i in range(N_ROWS)]
    vap = {"lnp": [r(x, 9) for x in rows_lnp], "dT": DT, "h": [], "cp": [], "rho": []}
    for lp in rows_lnp:
        p = math.exp(lp)
        ts = CP.PropsSI("T", "P", p, "Q", 1, fluid)
        hrow, cprow, rhorow = [], [], []
        for dt in DT:
            if dt == 0:
                h = CP.PropsSI("H", "P", p, "Q", 1, fluid)
                cp = CP.PropsSI("C", "P", p, "Q", 1, fluid)
                rho = CP.PropsSI("D", "P", p, "Q", 1, fluid)
            else:
                h = CP.PropsSI("H", "P", p, "T", ts + dt, fluid)
                cp = CP.PropsSI("C", "P", p, "T", ts + dt, fluid)
                rho = CP.PropsSI("D", "P", p, "T", ts + dt, fluid)
            hrow.append(r(h))
            cprow.append(r(cp, 6))
            rhorow.append(r(rho, 6))
        vap["h"].append(hrow)
        vap["cp"].append(cprow)
        vap["rho"].append(rhorow)

    return {
        "medium": medium_id,
        "fluid": fluid,
        "version": "1.0.0",
        "source": f"CoolProp {CoolProp.__version__} (HEOS, PropsSI)",
        "units": "SI: K, Pa, J/kg, J/(kg·K), kg/m³",
        "M": r(CP.PropsSI("molar_mass", fluid)),
        "Tc": r(tc),
        "pc": r(pc),
        "pMin": P_MIN,
        "pMax": r(p_max),
        "rhoN": r(CP.PropsSI("D", "P", P_N, "T", T_N, fluid)),
        "sat": sat,
        "vap": vap,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for mid, fluid in MEDIA.items():
        data = build(mid, fluid)
        path = os.path.join(OUT_DIR, f"props-{mid.lower()}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        print(path, os.path.getsize(path), "B")


if __name__ == "__main__":
    main()
