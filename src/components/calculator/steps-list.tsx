import { Badge } from "@/components/ui/badge";
import type { DerivationStep } from "@/lib/aae";
import { cn } from "@/lib/utils";

export function StepsList({
  title,
  steps,
}: {
  title: string;
  steps: DerivationStep[];
}) {
  if (!steps.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <ul className="divide-y divide-border rounded-lg border">
        {steps.map((step, i) => (
          <li
            key={`${step.n}-${i}`}
            className="flex items-start gap-3 px-3 py-2.5 text-sm"
          >
            <Badge
              variant="outline"
              className="mt-0.5 h-5 min-w-6 shrink-0 justify-center font-mono text-[10px]"
            >
              {step.n}
            </Badge>
            <div className="min-w-0 flex-1 text-muted-foreground">
              {step.text}
            </div>
            <div
              className={cn(
                "shrink-0 text-right font-mono text-xs tabular-nums sm:text-sm",
                step.tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                step.tone === "warn" && "text-amber-600 dark:text-amber-400",
                step.tone === "bad" && "text-destructive",
              )}
            >
              {step.value}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
