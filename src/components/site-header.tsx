"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import {
  MEDIA_OPTIONS,
  useMedium,
} from "@/components/calculator/medium-context";
import { MODEL_LINE, STANDARDS_LINE } from "@/lib/aae";
import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  const { medium, setMedium } = useMedium();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Left — company logo + product name */}
        <div className="flex h-full min-w-0 items-center justify-start gap-3 sm:gap-4">
          <Link
            href="https://www.linde.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
            aria-label="The Linde Group — linde.com"
          >
            <Image
              src="/linde-logo.svg"
              alt="The Linde Group"
              width={140}
              height={48}
              priority
              className="h-7 w-auto sm:h-8 dark:brightness-0 dark:invert"
            />
          </Link>
          <Separator orientation="vertical" />
          <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
            Ambient Air Evaporator
          </p>
        </div>

        {/* Center — medium selector */}
        <div className="flex items-center justify-center">
          <ButtonGroup aria-label="Médium">
            {MEDIA_OPTIONS.map((m) => {
              const selected = medium === m.id;
              return (
                <Button
                  key={m.id}
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  onClick={() => setMedium(m.id)}
                >
                  {m.label}
                </Button>
              );
            })}
          </ButtonGroup>
        </div>

        {/* Right — version + design codes this engine implements */}
        <div className="flex min-w-0 items-center justify-end gap-2">
          <Badge
            variant="secondary"
            className="font-mono text-[10px] tracking-wide"
          >
            v.2
          </Badge>
          <div
            className="hidden max-w-[14rem] items-center gap-1.5 truncate text-muted-foreground md:flex"
            title={`${STANDARDS_LINE} · ${MODEL_LINE}`}
          >
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate text-[11px] font-medium">
              CGA · EIGA · ASME
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
