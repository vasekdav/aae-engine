import { Card, CardContent } from "@/components/ui/card";
import type { KpiItem } from "@/lib/aae";
import { cn } from "@/lib/utils";

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((kpi) => (
        <Card key={kpi.label} size="sm" className="shadow-none">
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p
              className={cn(
                "font-mono text-xl font-semibold tracking-tight tabular-nums",
                kpi.tone === "ok" && "text-emerald-600 dark:text-emerald-400",
                kpi.tone === "warn" && "text-amber-600 dark:text-amber-400",
                kpi.tone === "bad" && "text-destructive",
              )}
            >
              {kpi.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{kpi.unit}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
