"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Check, ClipboardCopy, FileText } from "lucide-react";

export function ProtocolPanel({ protocol }: { protocol: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(protocol);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <CollapsibleTrigger
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <FileText />
          {open ? "Skrýt protokol" : "Protokol"}
        </CollapsibleTrigger>
        {open ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void copy()}
          >
            {copied ? <Check /> : <ClipboardCopy />}
            {copied ? "Zkopírováno" : "Kopírovat"}
          </Button>
        ) : null}
      </div>
      <CollapsibleContent>
        <Textarea
          readOnly
          value={protocol}
          className="min-h-48 resize-y font-mono text-xs leading-relaxed"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
