import { MODEL_LINE, STANDARDS_LINE } from "./constants";
import type { CalcMode, MediumProps, ModelParams, Verdict } from "./types";

export function buildProtocol(args: {
  mode: CalcMode;
  medium: MediumProps;
  model: ModelParams;
  bodyLines: string[];
  verdict: Verdict;
}): string {
  const modeLabel =
    args.mode === "SIZING"
      ? "NÁVRH (SIZING)"
      : args.mode === "CAPACITY"
        ? "KAPACITA"
        : "RYCHLOST";

  return [
    "PROTOKOL — AAE ENGINE v.2",
    `Datum: ${new Date().toLocaleString("cs-CZ")}`,
    `Standardy: ${STANDARDS_LINE}`,
    `Model: U_eff=max(2; U_free·f_U), U_free=max(4; U_base·(1+k·T_amb)) (U_base=${args.model.Ubase} W/m²K, k=${args.model.Uk}/K), f_U=(v_lok/v_ref)^0,6, LMTD(T_air), SF_total = SF(t)·SF_RH, η_fin=${args.model.finEta}`,
    "————————————————————————————————",
    `REŽIM: ${modeLabel}`,
    `Médium: ${args.medium.name}`,
    ...args.bodyLines,
    `VERDIKT: ${args.verdict.label} — ${args.verdict.why}`,
    "————————————————————————————————",
    "Pozn.: předběžný návrh; finální dimenzování ověřit dle výrobce. T_out < −20 °C (uhlíková ocel) = nepřípustné.",
    `Kalibrace: ${MODEL_LINE}`,
  ].join("\n");
}
