import {
  O2_ADVISORY_TOUT,
  TMIN_MARGIN_WARN_K,
  VELOCITY_NEAR,
} from "../constants";
import { fmt } from "../format";
import { sfTotal } from "../math/frost";
import { qMax, toutActual } from "../math/solvers";
import {
  aFinPerMeter,
  finDiameterAuto,
  PabsFromGauge,
  qTube,
  Tsat,
} from "../math/thermo";
import { velocityLimit, vGas } from "../math/velocity";
import { buildProtocol } from "../protocol";
import { verdictFromChecks } from "../safety";
import type {
  CalcResult,
  MediumProps,
  ModelParams,
  ProcessInputs,
  SafetyCheck,
} from "../types";

export function runCapacity(
  medium: MediumProps,
  inputs: ProcessInputs,
  model: ModelParams,
): CalcResult {
  const { Q, H, Ninst, t, Tamb, RH, Pgas, Dgas, Tout, Tmin } = inputs;
  const N = Ninst;
  const Pabs = PabsFromGauge(Pgas);
  const Ts = Tsat(medium, Pabs);
  const sfTot = sfTotal(t, RH, model);
  const finMm = finDiameterAuto(Q);
  const afin = aFinPerMeter(finMm, model.finEta);
  const ta = toutActual(medium, model, afin, Q, N, H, Tamb, sfTot, Ts);
  const ToutFloor = Math.max(Tmin, Tout, Ts + 0.5);
  const qm = qMax(medium, model, afin, N, H, Tamb, sfTot, Ts, ToutFloor);
  const taForVel = ta ?? Math.min(Tout, Tamb - 0.5);
  const vg = vGas(Q, Pgas, taForVel, Dgas);
  const vlim = velocityLimit(medium.o2, Pgas, model);
  const installedPower =
    ta !== null
      ? N * qTube(model, afin, H, Tamb, sfTot, ta, Ts)
      : null;
  const util = qm !== null && qm > 0 ? Q / qm : Infinity;

  const checks: SafetyCheck[] = [];

  if (ta === null) {
    checks.push({
      level: "NOGO",
      message:
        Tamb <= Ts
          ? "T_amb ≤ T_sat — nulová hnací síla"
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
    checks.push({
      level: "NOGO",
      message: `požadovaný Q ${fmt(Q, 0)} > Q_max ${fmt(qm, 0)} Nm³/h`,
    });
  } else if (Q > VELOCITY_NEAR * qm) {
    checks.push({
      level: "WARNING",
      message: `Q na ${fmt(util * 100, 0)} % Q_max`,
    });
  }

  if (vg > vlim) {
    checks.push({
      level: medium.o2 ? "NOGO" : "WARNING",
      message: `v_gas ${fmt(vg)} > ${fmt(vlim)} m/s`,
    });
  }

  if (Tamb <= Ts) {
    checks.push({
      level: "NOGO",
      message: "T_amb ≤ T_sat — nulová hnací síla",
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
        label: "v_gas",
        value: fmt(vg),
        unit: `m/s (lim ${fmt(vlim)})`,
        tone: vg > vlim ? "bad" : "ok",
      },
    ],
    derivation: [
      {
        n: 1,
        text: `T_sat(P) při ${fmt(Pabs, 2)} bar a`,
        value: `${fmt(Ts)} °C`,
      },
      {
        n: 2,
        text: `Bisekce energetické bilance → skutečná T_out při Q=${fmt(Q, 0)}`,
        value: ta === null ? "NELZE (dvoufázový)" : `${fmt(ta)} °C`,
      },
      {
        n: 3,
        text: `Q_max při T_out = ${fmt(ToutFloor)} °C (A_eff·U_eff·LMTD)`,
        value: qm === null ? "NELZE" : `${fmt(qm, 0)} Nm³/h`,
      },
      {
        n: 4,
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
        tone:
          qm === null
            ? "bad"
            : Q > qm
              ? "bad"
              : Q > VELOCITY_NEAR * qm
                ? "warn"
                : "ok",
      },
      {
        n: "✓",
        text: "Rychlost plynu",
        value: `${fmt(vg)} / ${fmt(vlim)} m/s`,
        tone: vg > vlim ? "bad" : "ok",
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
      vlim,
      installedPower,
      util: Number.isFinite(util) ? util : null,
      Pabs,
      N,
    },
  };

  result.protocol = buildProtocol({
    mode: "CAPACITY",
    medium,
    model,
    verdict,
    bodyLines: [
      `Vstupy: N=${N} ks · Q=${Q} Nm³/h · H=${H} m · t=${t} h · T_amb=${Tamb} °C · RH=${RH} % · P_gas=${Pgas} bar g`,
      `VÝSLEDEK: Q_max=${qm === null ? "NELZE" : `${fmt(qm, 0)} Nm³/h`} · skutečná T_out=${ta === null ? "NELZE" : `${fmt(ta)} °C`} · vytížení ${qm === null ? "—" : `${fmt(util * 100, 0)} %`}`,
    ],
  });

  return result;
}
