import type { SafetyCheck, Verdict, VerdictLevel } from "./types";

export function verdictFromChecks(checks: SafetyCheck[]): Verdict {
  const bad = checks.filter((c) => c.level === "NOGO");
  const warn = checks.filter((c) => c.level === "WARNING");

  if (bad.length) {
    return {
      level: "NOGO",
      label: "NO-GO",
      why: bad.map((c) => c.message).join(" · "),
    };
  }
  if (warn.length) {
    return {
      level: "WARNING",
      label: "WARNING",
      why: warn.map((c) => c.message).join(" · "),
    };
  }
  return {
    level: "GO",
    label: "GO",
    why: "Všechny bezpečnostní i kapacitní kontroly splněny.",
  };
}

export function worstLevel(levels: VerdictLevel[]): VerdictLevel {
  if (levels.includes("NOGO")) return "NOGO";
  if (levels.includes("WARNING")) return "WARNING";
  return "GO";
}
