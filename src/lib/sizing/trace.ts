import type { TraceStep } from "./types";

/**
 * Protocol recorder: every solver step writes its equation, substituted values,
 * result and source, so the printed protocol cannot disagree with the code.
 */
export class Trace {
  readonly steps: TraceStep[] = [];

  add(
    title: string,
    result: string,
    opts: Omit<TraceStep, "n" | "title" | "result"> = {},
  ): void {
    this.steps.push({ n: this.steps.length + 1, title, result, ...opts });
  }
}

/** A trace that records nothing (for inner what-if evaluations). */
export class NullTrace extends Trace {
  override add(): void {}
}
