import {
  O2_ADVISORY_TOUT,
  TMIN_MARGIN_WARN_K,
  T_RUN_VALID_MAX_H,
  T_RUN_VALID_MIN_H,
  VELOCITY_NEAR,
} from "../constants";
import { fmt } from "../format";
import { sfTotal } from "../math/frost";
import {
  approxCapacityFactor,
  isSiteClass,
  resolveSiteAir,
  SITE_CLASS_LABELS,
} from "../math/site-airflow";
import { qMax, toutActual } from "../math/solvers";
import {
  aFinPerMeter,
  finDiameterAuto,
  lmtd,
  PabsFromGauge,
  qTube,
  Tsat,
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

export function runCapacity(
  medium: MediumProps,
  inputs: ProcessInputs,
  model: ModelParams,
): CalcResult {
  const { Q, H, Ninst, t, Tamb, RH, Pliq, Pgas, Dliq, Dgas, Tout, Tmin, vAir } =
    inputs;
  const siteClass: SiteClass = isSiteClass(inputs.siteClass)
    ? inputs.siteClass
    : "FREE";
  const site = resolveSiteAir(Tamb, vAir, siteClass);
  const air = { fU: site.fU, TambAir: site.TambEff };
  const N = Ninst;
  const PabsLiq = PabsFromGauge(Pliq);
  const PabsGas = PabsFromGauge(Pgas);
  const Ts = Tsat(medium, PabsLiq); // KAPACITA C28–C30 — var při P_liq
  const sfTot = sfTotal(t, RH, model);
  const finMm = finDiameterAuto(Q);
  const afin = aFinPerMeter(finMm, model.finEta);
  const ta = toutActual(medium, model, afin, Q, N, H, Tamb, sfTot, Ts, air);
  const ToutFloor = Math.max(Tmin, Tout, Ts + 0.5);
  const qm = qMax(
    medium,
    model,
    afin,
    N,
    H,
    Tamb,
    sfTot,
    Ts,
    ToutFloor,
    air,
  );
  // KAPACITA C73 — kontrola rychlosti při min(T_out cíl; T_out při Q)
  const taForVel =
    ta !== null
      ? Math.min(Tout, ta)
      : Math.min(Tout, site.TambEff - 0.5, Tamb - 0.5);
  const vg = vGas(Q, Pgas, taForVel, Dgas);
  const vliq = vLiq(Q, medium.rhoN, medium.rhoLiq, Dliq);
  const vlim = velocityLimit(medium.o2, Pgas, model);
  const installedPower =
    ta !== null
      ? N * qTube(model, afin, H, Tamb, sfTot, ta, Ts, site.fU, site.TambEff)
      : null;
  const util = qm !== null && qm > 0 ? Q / qm : Infinity;
  const fCap = approxCapacityFactor(site, Ts, ToutFloor, lmtd);

  const checks: SafetyCheck[] = [];

  if (ta === null) {
    checks.push({
      level: "NOGO",
      message:
        site.TambEff <= Ts || Tamb <= Ts
          ? "T_air / T_amb ≤ T_sat — nulová hnací síla"
          : `instalovaná plocha nestačí na odpaření Q=${fmt(Q, 0)} (dvoufázový výstup)`,
    });
  } else if (ta < Tmin) {
    checks.push({
      level: "NOGO",
      message: `skutečná T_out ${fmt(ta)} °C < T_min ${fmt(Tmin)} °C při Q=${fmt(Q, 0)}`,
    });
  } else if (ta < Tmin + TMIN_MARGIN_WARN_K) {
    checks.push({
      level: "WARNING",
      message: `T_out jen ${fmt(ta - Tmin)} K nad T_min`,
    });
  }

  if (medium.o2 && ta !== null && ta < O2_ADVISORY_TOUT) {
    checks.push({
      level: "WARNING",
      message: "O₂ služba: T_out < −15 °C (advisory)",
    });
  }

  if (qm === null) {
    checks.push({
      level: "NOGO",
      message: "Q_max nelze spočítat — LMTD při cílovém T_out neexistuje",
    });
  } else if (Q > qm) {
    // KAPACITA E83 — poddimenzováno pro cílovou T_out (tvrdé NO-GO řeší
    // dvoufázový výstup / T_min výše)
    checks.push({
      level: "WARNING",
      message: `požadovaný Q ${fmt(Q, 0)} > Q_max ${fmt(qm, 0)} Nm³/h při cílové T_out — jednotka poddimenzovaná`,
    });
  }

  if (vg > vlim) {
    checks.push({
      level: medium.o2 ? "NOGO" : "WARNING",
      message: `v_gas ${fmt(vg)} > ${fmt(vlim)} m/s`,
    });
  }

  if (vliq > model.vLiqLim) {
    checks.push({
      level: "WARNING",
      message: `v_liq ${fmt(vliq, 2)} > ${fmt(model.vLiqLim)} m/s — riziko flashingu`,
    });
  }

  if (site.TambEff <= Ts || Tamb <= Ts) {
    checks.push({
      level: "NOGO",
      message: "T_air / T_amb ≤ T_sat — nulová hnací síla",
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
      message: `silný derating proudění (f_Q≈${fmt(fCap, 2)}) — kapacita výrazně pod free-field`,
    });
  }

  const verdict = verdictFromChecks(checks);
  const title = "KAPACITA — N → Q_max / T_out";

  const result: CalcResult = {
    medium: medium.id,
    mode: "CAPACITY",
    title,
    mediumName: medium.name,
    verdict,
    kpis: [
      {
        label: `Q_max (T_out ≥ ${fmt(ToutFloor)} °C)`,
        value: qm === null ? "NELZE" : fmt(qm, 0),
        unit: "Nm³/h",
        tone: qm === null || Q > qm ? "bad" : "ok",
      },
      {
        label: "Skutečná T_out při Q",
        value: ta === null ? "NELZE" : fmt(ta),
        unit: "°C",
        tone:
          ta === null
            ? "bad"
            : ta < Tmin
              ? "bad"
              : ta < Tmin + TMIN_MARGIN_WARN_K
                ? "warn"
                : "ok",
      },
      {
        label: "Instalovaný výkon",
        value: installedPower === null ? "—" : fmt(installedPower),
        unit: "kW",
      },
      {
        label: "Vytížení",
        value: qm === null ? "—" : `${fmt(util * 100, 0)} %`,
        unit: "Q / Q_max",
        tone: qm !== null && util > VELOCITY_NEAR ? "warn" : "ok",
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
        label: "v_gas",
        value: fmt(vg),
        unit: `m/s (lim ${fmt(vlim)})`,
        tone: vg > vlim ? "bad" : "ok",
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
        text: `Site: ${SITE_CLASS_LABELS[siteClass]} · v_air=${fmt(site.vAir, 1)} → v_lok=${fmt(site.vLocal, 2)} m/s · f_U=${fmt(site.fU, 3)} · T_air=${fmt(site.TambEff)} °C (φ=${fmt(site.phi, 2)})`,
        value:
          fCap === null
            ? `f_U ${fmt(site.fU, 3)}`
            : `f_U ${fmt(site.fU, 3)} · f_Q≈${fmt(fCap, 3)}`,
        tone: site.isFreeFieldRef ? "ok" : "warn",
      },
      {
        n: 3,
        text: `Bisekce energetické bilance → skutečná T_out při Q=${fmt(Q, 0)}`,
        value: ta === null ? "NELZE (dvoufázový)" : `${fmt(ta)} °C`,
      },
      {
        n: 4,
        text: `Q_max při T_out = ${fmt(ToutFloor)} °C (A_eff·U_eff·LMTD s f_U a T_air)`,
        value: qm === null ? "NELZE" : `${fmt(qm, 0)} Nm³/h`,
      },
      {
        n: 5,
        text: `SF_total (t=${fmt(t)} h, RH=${fmt(RH, 0)} %); Ø žebra auto ${fmt(finMm, 0)} mm`,
        value: `SF ${fmt(sfTot, 3)} · a_fin ${fmt(afin, 3)} m²/m`,
      },
    ],
    checks: [
      {
        n: "✓",
        text: "T_out vs. T_min",
        value:
          ta === null
            ? `NELZE / ${fmt(Tmin)} °C`
            : `${fmt(ta)} / ${fmt(Tmin)} °C`,
        tone:
          ta === null
            ? "bad"
            : ta < Tmin
              ? "bad"
              : ta < Tmin + TMIN_MARGIN_WARN_K
                ? "warn"
                : "ok",
      },
      {
        n: "✓",
        text: "Q vs. Q_max",
        value:
          qm === null
            ? `${fmt(Q, 0)} / NELZE`
            : `${fmt(Q, 0)} / ${fmt(qm, 0)}`,
        tone: qm === null ? "bad" : Q > qm ? "warn" : "ok",
      },
      {
        n: "✓",
        text: "Rychlost plynu",
        value: `${fmt(vg)} / ${fmt(vlim)} m/s`,
        tone: vg > vlim ? "bad" : "ok",
      },
      {
        n: "✓",
        text: "Rychlost kapaliny vs. vodítko",
        value: `${fmt(vliq, 2)} / ${fmt(model.vLiqLim)} m/s`,
        tone: vliq > model.vLiqLim ? "warn" : "ok",
      },
      {
        n: "✓",
        text: "Rozsah frost křivky (1–30 h)",
        value: `${fmt(t)} h`,
        tone:
          t > T_RUN_VALID_MAX_H || t < T_RUN_VALID_MIN_H ? "warn" : "ok",
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
      sfTotal: sfTot,
      finMm,
      afin,
      ta,
      qm,
      vg,
      vliq,
      vlim,
      installedPower,
      util: Number.isFinite(util) ? util : null,
      PabsLiq,
      PabsGas,
      N,
      vAir: site.vAir,
      vLocal: site.vLocal,
      fU: site.fU,
      phi: site.phi,
      TambEff: site.TambEff,
      fCap,
    },
  };

  result.protocol = buildProtocol({
    mode: "CAPACITY",
    medium,
    model,
    verdict,
    bodyLines: [
      `Vstupy: N=${N} ks · Q=${Q} Nm³/h · H=${H} m · t=${t} h · T_amb=${Tamb} °C · RH=${RH} % · P_liq=${Pliq} bar g · P_gas=${Pgas} bar g · D_liq/D_gas=${Dliq}/${Dgas} mm · v_air=${fmt(site.vAir, 1)} m/s · site=${siteClass}`,
      `Site: v_lok=${fmt(site.vLocal, 2)} m/s · f_U=${fmt(site.fU, 3)} · T_air=${fmt(site.TambEff)} °C (φ=${fmt(site.phi, 2)})`,
      `VÝSLEDEK: Q_max=${qm === null ? "NELZE" : `${fmt(qm, 0)} Nm³/h`} · skutečná T_out=${ta === null ? "NELZE" : `${fmt(ta)} °C`} · vytížení ${qm === null ? "—" : `${fmt(util * 100, 0)} %`}`,
      "Pozn. site airflow: engineering estimate (Lisowski/Rogié/Gunter); free-field EN rating jen při FREE + v_ref.",
    ],
  });

  return result;
}
