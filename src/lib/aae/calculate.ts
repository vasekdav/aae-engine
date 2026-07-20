import { DEFAULT_INPUTS, DEFAULT_MODEL } from "./constants";
import { getMedium } from "./media";
import { runCapacity } from "./modes/capacity";
import { runSizing } from "./modes/sizing";
import { runVelocity } from "./modes/velocity";
import type {
  CalcMode,
  CalcRequest,
  CalcResult,
  MediumId,
  ModelParams,
  ProcessInputs,
} from "./types";

/**
 * Main entry: pure calculation for AAE Engine.
 * No DOM, no React — safe to unit-test and later verify against standards.
 */
export function calculate(request: CalcRequest): CalcResult {
  const medium = getMedium(request.medium);
  const inputs = { ...DEFAULT_INPUTS, ...request.inputs };
  const model = { ...DEFAULT_MODEL, ...request.model };

  switch (request.mode) {
    case "SIZING":
      return runSizing(medium, inputs, model);
    case "CAPACITY":
      return runCapacity(medium, inputs, model);
    case "VELOCITY":
      return runVelocity(medium, inputs, model);
    default: {
      const _exhaustive: never = request.mode;
      throw new Error(`Unknown mode: ${_exhaustive}`);
    }
  }
}

/** Convenience helper with partial overrides. */
export function calculateDefaults(overrides?: {
  medium?: MediumId;
  mode?: CalcMode;
  inputs?: Partial<ProcessInputs>;
  model?: Partial<ModelParams>;
}): CalcResult {
  return calculate({
    medium: overrides?.medium ?? "N2",
    mode: overrides?.mode ?? "SIZING",
    inputs: { ...DEFAULT_INPUTS, ...overrides?.inputs },
    model: { ...DEFAULT_MODEL, ...overrides?.model },
  });
}
