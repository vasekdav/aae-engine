import { KELVIN, P_ATM_BAR, VELOCITY_NEAR } from "../constants";
import { fmt } from "../format";
import { pipeArea_m2, velocityLimit, vGas } from "../math/velocity";
import { buildProtocol } from "../protocol";
import { verdictFromChecks } from "../safety";
import type {
  CalcResult,
  MediumProps,
  ModelParams,
  ProcessInputs,
  SafetyCheck,
} from "../types";

export function runVelocity(
  medium: MediumProps,
  inputs: ProcessInputs,
  model: ModelParams,
): CalcResult {
  const { Q, Pgas, Dgas, Tgas, Tmin } = inputs;
  const vg = vGas(Q, Pgas, Tgas, Dgas);
  const vlim = velocityLimit(medium.o2, Pgas, model);
  const Pabs = Pgas + P_ATM_BAR;
  const Vact_m3h =
    Q * (P_ATM_BAR / Pabs) * ((Tgas + KELVIN) / KELVIN);
  const area_cm2 = pipeArea_m2(Dgas) * 1e4;

  const checks: SafetyCheck[] = [];

  if (Tgas < Tmin) {
    checks.push({
      level: "NOGO",
      message: `T_gas ${fmt(Tgas)} °C < T_min ${fmt(Tmin)} °C`,
    });
  }

  if (vg > vlim) {
    checks.push({
      level: medium.o2 ? "NOGO" : "WARNING",
      message: `v ${fmt(vg)} > limit ${fmt(vlim)} m/s${medium.o2 ? " (impingement O₂ dle EIGA Doc 13)" : ""}`,
    });
  } else if (vg > VELOCITY_NEAR * vlim) {
    checks.push({
      level: "WARNING",
      message: "rychlost blízko limitu",
    });
  }

  const verdict = verdictFromChecks(checks);
  const title = "RYCHLOST — samostatný check potrubí";
  const reserve = (1 - vg / vlim) * 100;

  const result: CalcResult = {
    medium: medium.id,
    mode: "VELOCITY",
    title,
    mediumName: medium.name,
    verdict,
    kpis: [
      {
        label: "v skutečná",
        value: fmt(vg),
        unit: "m/s",
        tone: vg > vlim ? "bad" : vg > VELOCITY_NEAR * vlim ? "warn" : "ok",
      },
      {
        label: "v limit",
        value: fmt(vlim),
        unit: `m/s ${medium.o2 ? "(EIGA 13, CS)" : "(inerty)"}`,
      },
      {
        label: "Rezerva",
        value: `${fmt(reserve, 0)} %`,
        unit: "do limitu",
        tone: vg > VELOCITY_NEAR * vlim ? "warn" : "ok",
      },
    ],
    derivation: [
      {
        n: 1,
        text: "Objemový tok při P,T = Q·(1,013/P_abs)·(T/273,15)",
        value: `${fmt(Vact_m3h, 1)} m³/h`,
      },
      {
        n: 2,
        text: `Průřez potrubí DN${fmt(Dgas, 0)}`,
        value: `${fmt(area_cm2, 1)} cm²`,
      },
      {
        n: 3,
        text: "v = V̇ / A",
        value: `${fmt(vg)} m/s`,
      },
      {
        n: 4,
        text: medium.o2
          ? "Limit: min(30; p·v konst / P_abs)"
          : "Limit inerty",
        value: `${fmt(vlim)} m/s`,
      },
    ],
    checks: [],
    protocol: "",
    intermediates: {
      vg,
      vlim,
      Vact_m3h,
      area_cm2,
      reserve,
      Pabs,
    },
  };

  result.protocol = buildProtocol({
    mode: "VELOCITY",
    medium,
    model,
    verdict,
    bodyLines: [
      `Vstupy: Q=${Q} Nm³/h · P_gas=${Pgas} bar g · T_gas=${Tgas} °C · D_gas=${Dgas} mm`,
      `VÝSLEDEK: v=${fmt(vg)} m/s · limit=${fmt(vlim)} m/s`,
    ],
  });

  return result;
}
