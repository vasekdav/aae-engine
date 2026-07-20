"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: React.ReactNode;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

export function Field({
  id,
  label,
  hint,
  value,
  onChange,
  step = 1,
  min,
  max,
  className,
}: FieldProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        value={Number.isFinite(value) ? String(value) : ""}
        step={step}
        min={min}
        max={max}
        onValueChange={(raw) => onChange(parseFloat(raw))}
        className="h-9 font-mono tabular-nums"
      />
      {hint ? (
        <p className="text-[11px] leading-snug text-muted-foreground/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
