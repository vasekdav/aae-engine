import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/lib/aae";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const CONFIG = {
  GO: {
    icon: CheckCircle2,
    badge: "default" as const,
    className:
      "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  WARNING: {
    icon: AlertTriangle,
    badge: "secondary" as const,
    className:
      "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-400",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  NOGO: {
    icon: XCircle,
    badge: "destructive" as const,
    className: "",
    iconClass: "",
  },
} as const;

export function Stamp({ verdict }: { verdict: Verdict }) {
  const cfg = CONFIG[verdict.level];
  const Icon = cfg.icon;
  const isNogo = verdict.level === "NOGO";

  return (
    <Alert
      variant={isNogo ? "destructive" : "default"}
      className={cn("px-3.5 py-3", !isNogo && cfg.className)}
    >
      <Icon className={cn("size-5", cfg.iconClass)} />
      <AlertTitle className="flex items-center gap-2">
        <span className="font-semibold tracking-wide">{verdict.label}</span>
        <Badge
          variant={cfg.badge}
          className={cn(
            "h-5 font-mono text-[10px]",
            verdict.level === "GO" &&
              "bg-emerald-600 text-white dark:bg-emerald-500",
            verdict.level === "WARNING" &&
              "bg-amber-500/20 text-amber-800 dark:text-amber-300",
          )}
        >
          {verdict.level}
        </Badge>
      </AlertTitle>
      <AlertDescription className={cn(isNogo && "text-destructive/90")}>
        {verdict.why}
      </AlertDescription>
    </Alert>
  );
}
