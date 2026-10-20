import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_VERSION } from "@/lib/sizing";
import { ArrowLeftRight } from "lucide-react";

export function SizingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md print:hidden">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight sm:text-base">AAE Sizing</p>
            <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
              Dimenzování a ochrana CS potrubí za vzdušným odpařovačem
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px] tracking-wide">
            {APP_VERSION}
          </Badge>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">AAE Engine v.2</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
