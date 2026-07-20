import {
  CROSSCHECK_MAX,
  CROSSCHECK_MIN,
  O2_ADVISORY_TOUT,
  PCRIT_FRACTION_WARN,
  T_RUN_VALID_MAX_H,
  T_RUN_VALID_MIN_H,
  TMIN_MARGIN_WARN_K,
  VELOCITY_NEAR,
} from "../constants";
import { fmt } from "../format";
import { twoZoneBaseline } from "../math/crosscheck";
import { performanceFactor, sfRH, sfTime, sfTotal } from "../math/frost";
import {
  approxCapacityFactor,
  isSiteClass,
  resolveSiteAir,
  SITE_CLASS_LABELS,
} from "../math/site-airflow";
import {
  aFinPerMeter,
  finDiameterAuto,
  lmtd,
  PabsFromGauge,
  qReq,
  Tsat,
  uEffective,
} from "../math/thermo";
import { velocityLimit, vGas, vLiq } from "../math/velocity";
import { buildProtocol } from "../protocol";
import { verdictFromChecks } from "../safety";
import type {
  CalcResult,
  MediumProps,
  ModelParams,
  ProcessInputs,
  SafetyCheck,
  SiteClass,
} from "../types";

export function runSizing(
  medium: MediumProps,
  inputs: ProcessInputs,
  model: ModelParams,
): CalcResult {
  const { Q, H, t, Tamb, RH, Pliq, Pgas, Dliq, Dgas, Tout, Tmin, vAir } =
    inputs;
  const siteClass: SiteClass = isSiteClass(inputs.siteClass)
    ? inputs.siteClass
    : "FREE";
  const site = resolveSiteAir(Tamb, vAir, siteClass);
  const PabsLiq = PabsFromGauge(Pliq);
  const PabsGas = PabsFromGauge(Pgas);
  const Ts = Tsat(medium, PabsLiq);
  const mDot = (Q * medium.rhoN) / 3600; // kg/s
  const qr = qReq(medium, Q, Tout, Ts); // kW
  const L = lmtd(site.TambEff, Ts, Tout); // NaN = "NELZE" (uses effective air T)
  const Ueff = uEffective(Tamb, model, site.fU);
  const pf = performanceFactor(t, model);
  const sf = sfTime(t, model);
  const sfrh = sfRH(RH);
  const sfTot = sfTotal(t, RH, model);
  const finMm = finDiameterAuto(Q);
  const afin = aFinPerMeter(finMm, model.finEta);
  const aTube = afin * H;
  const fCap = approxCapacityFactor(site, Ts, Tout, lmtd);

  const feasible = Number.isFinite(L) && Tout > Ts;
  const aDesign = Number.isFinite(L)
    ? ((qr * 1000) / (Ueff * L)) * sfTot
    : null;
  const Nexact = aDesign !== null ? aDesign / aTube : null;
  const N = feasible && Nexact !== null ? Math.max(1, Math.ceil(Nexact)) : null;
  const reserve =
    N !== null && aDesign !== null ? (N * aTube) / aDesign - 1 : null;

  const baseline = twoZoneBaseline(medium, model, mDot, Tamb, t, Tout, Ts);
  const ratio =
    baseline !== null && aDesign !== null
      ? baseline.aBaseline / aDesign
      : null;

  const vg = vGas(Q, Pgas, Tout, Dgas);
  const vliq = vLiq(Q, medium.rhoN, medium.rhoLiq, Dliq);
  const vlim = velocityLimit(medium.o2, Pgas, model);

  const checks: SafetyCheck[] = [];

  if (Tout < Tmin) {
    checks.push({
      level: "NOGO",
      message: `T_out ${fmt(Tout)} °C < T_min ${fmt(Tmin)} °C (křehký lom CS)`,
    });
  } else if (Tout - Tmin < TMIN_MARGIN_WARN_K) {
    checks.push({
      level: "WARNING",
      message: `T_out jen ${fmt(Tout - Tmin)} K nad T_min`,
    });
  }

  if (medium.o2 && Tout < O2_ADVISORY_TOUT) {
    checks.push({
      level: "WARNING",
      message: "O₂ služba: T_out < −15 °C (advisory)",
    });
  }

  if (Tout <= Ts) {
    checks.push({
      level: "NOGO",
      message: `T_out ${fmt(Tout)} °C ≤ T_boil(P_liq) ${fmt(Ts)} °C — kryokapalina ve výstupním potrubí`,
    });
  }

  if (!Number.isFinite(L)) {
    checks.push({
      level: "NOGO",
      message: "T_amb ≤ T_sat nebo T_amb ≤ T_out — přenos tepla nemožný (LMTD NELZE)",
    });
  }

  if (PabsLiq > PCRIT_FRACTION_WARN * medium.pc) {
    checks.push({
      level: "WARNING",
      message: `P_liq ${fmt(PabsLiq, 2)} bar a > 0,8·P_crit — CC extrapoluje (ověř NIST)`,
    });
  }

  if (vg > vlim) {
    checks.push({
      level: medium.o2 ? "NOGO" : "WARNING",
      message: `v_gas ${fmt(vg)} > limit ${fmt(vlim)} m/s${medium.o2 ? " (impingement O₂)" : ""}`,
    });
  } else if (vg > VELOCITY_NEAR * vlim) {
    checks.push({
      level: "WARNING",
      message: `v_gas ${fmt(vg)} m/s blízko limitu ${fmt(vlim)}`,
    });
  }

  if (vliq > model.vLiqLim) {
    checks.push({
      level: "WARNING",
      message: `v_liq ${fmt(vliq, 2)} > ${fmt(model.vLiqLim)} m/s — riziko flashingu`,
    });
  }

  if (ratio !== null && (ratio < CROSSCHECK_MIN || ratio > CROSSCHECK_MAX)) {
    checks.push({
      level: "WARNING",
      message: `cross-check mimo koridor ${fmt(CROSSCHECK_MIN)}–${fmt(CROSSCHECK_MAX)} (poměr ${fmt(ratio, 2)})`,
    });
  }

  if (t > T_RUN_VALID_MAX_H) {
    checks.push({
      level: "WARNING",
      message: `t ${fmt(t, 0)} h > ${T_RUN_VALID_MAX_H} h — extrapolace frost křivky`,
    });
  } else if (t < T_RUN_VALID_MIN_H) {
    checks.push({
      level: "WARNING",
      message: `t ${fmt(t, 1)} h < ${T_RUN_VALID_MIN_H} h — mimo validovaný rozsah křivky (1–30 h)`,
    });
  }

  if (!site.isFreeFieldRef) {
    const fStr =
      fCap !== null ? `f_Q≈${fmt(fCap, 2)}` : `f_U=${fmt(site.fU, 2)}`;
    checks.push({
      level: "WARNING",
      message: `umístění „${SITE_CLASS_LABELS[siteClass]}“ · v_air=${fmt(site.vAir, 1)} m/s → v_lok=${fmt(site.vLocal, 2)} m/s · ${fStr} (odhad, ne free-field rating)`,
    });
  }
  if (fCap !== null && fCap < 0.7) {
    checks.push({
      level: "WARNING",
      message: `silný derating proudění (f_Q≈${fmt(fCap, 2)}) — zvažte přesun / vyšší H·N nebo site CFD`,
    });
  }

  const verdict = verdictFromChecks(checks);
  const title = "NÁVRH — Q → počet trubek";

  const result: CalcResult = {
    medium: medium.id,
    mode: "SIZING",
    title,
    mediumName: medium.name,
    verdict,
    kpis: [
      {
        label: "Počet trubek N",
        value: N === null ? "NELZE" : String(N),
        unit: "ks",
        tone: N === null ? "bad" : verdict.level === "GO" ? "ok" : "neutral",
      },
      { label: "Q_req", value: fmt(qr), unit: "kW" },
      {
        label: "LMTD",
        value: Number.isFinite(L) ? fmt(L) : "NELZE",
        unit: "K",
      },
      {
        label: "U_eff / SF_total",
        value: `${fmt(Ueff)} / ${fmt(sfTot, 2)}`,
        unit: "W/m²K / –",
      },
      {
        label: "v_air / v_lok",
        value: `${fmt(site.vAir, 1)} / ${fmt(site.vLocal, 2)}`,
        unit: "m/s",
        tone: site.isFreeFieldRef ? "ok" : "warn",
      },
      {
        label: "f_U · f_Q (site)",
        value:
          fCap === null
            ? `${fmt(site.fU, 2)} / —`
            : `${fmt(site.fU, 2)} / ${fmt(fCap, 2)}`,
        unit: "–",
        tone:
          fCap !== null && fCap < 0.7
            ? "warn"
            : site.isFreeFieldRef
              ? "ok"
              : "neutral",
      },
      {
        label: "A_design",
        value: aDesign === null ? "NELZE" : fmt(aDesign),
        unit: "m²",
      },
      {
        label: "Ø žebra (auto) / a_fin",
        value: `${fmt(finMm, 0)} / ${fmt(afin, 3)}`,
        unit: "mm / m²/m",
      },
      {
        label: "Rezerva zaokrouhlením",
        value: reserve === null ? "—" : `${fmt(reserve * 100)} %`,
        unit: "N·A_tube / A_design",
        tone: "neutral",
      },
      {
        label: "v_gas",
        value: fmt(vg),
        unit: `m/s (lim ${fmt(vlim)})`,
        tone: vg > vlim ? "bad" : vg > VELOCITY_NEAR * vlim ? "warn" : "ok",
      },
      {
        label: "v_liq",
        value: fmt(vliq, 2),
        unit: `m/s (lim ${fmt(model.vLiqLim)})`,
        tone: vliq > model.vLiqLim ? "warn" : "ok",
      },
    ],
    derivation: [
      {
        n: 1,
        text: `T_boil(P_liq) Clausius-Clapeyron při ${fmt(PabsLiq, 2)} bar a`,
        value: `${fmt(Ts)} °C`,
      },
      {
        n: 2,
        text: "Hmotnostní tok ṁ = Q·ρ_N/3600",
        value: `${fmt(mDot, 4)} kg/s`,
      },
      {
        n: 3,
        text: "Q̇ = ṁ·(L + cp·ΔT_ohřev)",
        value: `${fmt(qr)} kW`,
      },
      {
        n: 4,
        text: `LMTD ze T_air_eff=${fmt(site.TambEff)} °C (φ=${fmt(site.phi, 2)}; ΔT₁=${fmt(site.TambEff - Ts)} K, ΔT₂=${fmt(site.TambEff - Tout)} K)`,
        value: Number.isFinite(L) ? `${fmt(L)} K` : "NELZE",
      },
      {
        n: 5,
        text: `Site: ${SITE_CLASS_LABELS[siteClass]} · v_air=${fmt(site.vAir, 1)} → v_lok=${fmt(site.vLocal, 2)} m/s · f_U=(v/v_ref)^0,6=${fmt(site.fU, 3)}`,
        value:
          fCap === null
            ? `f_U ${fmt(site.fU, 3)}`
            : `f_U ${fmt(site.fU, 3)} · f_Q≈${fmt(fCap, 3)}`,
        tone: site.isFreeFieldRef ? "ok" : "warn",
      },
      {
        n: 6,
        text: `U_eff = max(2; U_free·f_U); U_free=max(4; U_base·(1+k·T_amb)); PF(t)=${fmt(pf, 3)} → SF=${fmt(sf, 2)}, SF_RH=${fmt(sfrh, 2)}`,
        value: `U_eff ${fmt(Ueff)} W/m²K · SF_total ${fmt(sfTot, 3)}`,
      },
      {
        n: 7,
        text: `Ø žebra auto dle Q → ${fmt(finMm, 0)} mm; a_fin = 12·2·((Ø/2−12,7)/1000)·η`,
        value: `a_fin ${fmt(afin, 3)} m²/m · A_tube ${fmt(aTube, 2)} m²`,
      },
      {
        n: 8,
        text: "A_design = Q̇/(U_eff·LMTD)·SF_total; N = ⌈A_design/A_tube⌉",
        value:
          aDesign === null || N === null
            ? "NELZE"
            : `${fmt(aDesign)} m² → ${N} ks`,
      },
      {
        n: 9,
        text: "Cross-check dvouzónový NTU-ε baseline (free-field U, bez site derate)",
        value:
          baseline === null || ratio === null
            ? "NELZE"
            : `A ${fmt(baseline.aBaseline)} m² · poměr ${fmt(ratio, 2)}`,
        tone:
          ratio !== null && (ratio < CROSSCHECK_MIN || ratio > CROSSCHECK_MAX)
            ? "warn"
            : "ok",
      },
    ],
    checks: [
      {
        n: "✓",
        text: "T_out vs. T_min (CS)",
        value: `${fmt(Tout)} / ${fmt(Tmin)} °C`,
        tone:
          Tout < Tmin
            ? "bad"
            : Tout - Tmin < TMIN_MARGIN_WARN_K
              ? "warn"
              : "ok",
      },
      {
        n: "✓",
        text: "Fázový stav výstupu (T_out > T_boil)",
        value: `${fmt(Tout)} / ${fmt(Ts)} °C`,
        tone: Tout > Ts ? "ok" : "bad",
      },
      {
        n: "✓",
        text: `Rychlost plynu vs. limit ${medium.o2 ? "CGA G-4.4 (O₂)" : "20 m/s inerty"}`,
        value: `${fmt(vg)} / ${fmt(vlim)} m/s`,
        tone: vg > vlim ? "bad" : vg > VELOCITY_NEAR * vlim ? "warn" : "ok",
      },
      {
        n: "✓",
        text: "Rychlost kapaliny vs. vodítko",
        value: `${fmt(vliq, 2)} / ${fmt(model.vLiqLim)} m/s`,
        tone: vliq > model.vLiqLim ? "warn" : "ok",
      },
      {
        n: "✓",
        text: "Cross-check koridor 0,8–1,6",
        value: ratio === null ? "—" : fmt(ratio, 2),
        tone:
          ratio === null
            ? "bad"
            : ratio < CROSSCHECK_MIN || ratio > CROSSCHECK_MAX
              ? "warn"
              : "ok",
      },
      {
        n: "✓",
        text: `Proudění vzduchu (${SITE_CLASS_LABELS[siteClass]})`,
        value: `v_lok ${fmt(site.vLocal, 2)} m/s · f_U ${fmt(site.fU, 2)}`,
        tone: site.isFreeFieldRef
          ? "ok"
          : fCap !== null && fCap < 0.7
            ? "warn"
            : "warn",
      },
    ],
    protocol: "",
    intermediates: {
      Ts,
      PabsLiq,
      PabsGas,
      mDot,
      qr,
      lmtd: Number.isFinite(L) ? L : null,
      Ueff,
      pf,
      sf,
      sfrh,
      sfTotal: sfTot,
      finMm,
      afin,
      aTube,
      aDesign,
      Nexact,
      N,
      reserve,
      aBaseline: baseline?.aBaseline ?? null,
      ratio,
      vg,
      vliq,
      vlim,
      vAir: site.vAir,
      vLocal: site.vLocal,
      fU: site.fU,
      phi: site.phi,
      TambEff: site.TambEff,
      fCap,
    },
  };

  result.protocol = buildProtocol({
    mode: "SIZING",
    medium,
    model,
    verdict,
    bodyLines: [
      `Vstupy: Q=${Q} Nm³/h · H=${H} m · t=${t} h · T_amb=${Tamb} °C · RH=${RH} % · P_liq=${Pliq} bar g · P_gas=${Pgas} bar g · D_liq/D_gas=${Dliq}/${Dgas} mm · T_out cíl=${Tout} °C · v_air=${fmt(site.vAir, 1)} m/s · site=${siteClass}`,
      `T_boil(P_liq)=${fmt(Ts)} °C · Q̇=${fmt(qr)} kW · U_eff=${fmt(Ueff)} W/m²K (f_U=${fmt(site.fU, 3)}) · SF_total=${fmt(sfTot, 3)} · LMTD(T_air=${fmt(site.TambEff)})=${Number.isFinite(L) ? fmt(L) : "NELZE"} K · v_lok=${fmt(site.vLocal, 2)} m/s`,
      N === null || aDesign === null
        ? "VÝSLEDEK: NELZE — přenos tepla fyzikálně nemožný"
        : `VÝSLEDEK: N = ${N} trubek × ${H} m, Ø žebra ${finMm} mm (A_design = ${fmt(aDesign)} m²; rezerva +${fmt((reserve ?? 0) * 100)} %) · v_gas ${fmt(vg)} m/s (limit ${fmt(vlim)})`,
      "Pozn. site airflow: engineering estimate (Lisowski/Rogié/Gunter); free-field EN rating jen při FREE + v_ref.",
    ],
  });

  return result;
}
