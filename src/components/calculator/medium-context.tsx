"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalcMode, MediumId } from "@/lib/aae";

export const MEDIA_OPTIONS: {
  id: MediumId;
  /** Compact formula label (header button group). */
  label: string;
  /** Czech display name for page chrome. */
  name: string;
}[] = [
  { id: "N2", label: "N₂", name: "Dusík" },
  { id: "O2", label: "O₂", name: "Kyslík" },
  { id: "Ar", label: "Ar", name: "Argon" },
];

export const MODE_OPTIONS: {
  id: CalcMode;
  label: string;
  description: string;
}[] = [
  { id: "SIZING", label: "Návrh", description: "Q → N trubek" },
  { id: "CAPACITY", label: "Kapacita", description: "N → Q_max / T_out" },
  { id: "VELOCITY", label: "Rychlost", description: "Check potrubí" },
];

export function getMediumMeta(id: MediumId) {
  const opt = MEDIA_OPTIONS.find((m) => m.id === id);
  if (!opt) {
    throw new Error(`Unknown medium: ${id}`);
  }
  return opt;
}

export function getModeMeta(id: CalcMode) {
  const opt = MODE_OPTIONS.find((m) => m.id === id);
  if (!opt) {
    throw new Error(`Unknown mode: ${id}`);
  }
  return opt;
}

type MediumContextValue = {
  medium: MediumId;
  setMedium: (id: MediumId) => void;
  mode: CalcMode;
  setMode: (mode: CalcMode) => void;
};

const MediumContext = createContext<MediumContextValue | null>(null);

export function MediumProvider({ children }: { children: ReactNode }) {
  const [medium, setMediumState] = useState<MediumId>("N2");
  const [mode, setModeState] = useState<CalcMode>("SIZING");

  const setMedium = useCallback((id: MediumId) => {
    setMediumState(id);
  }, []);

  const setMode = useCallback((next: CalcMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(
    () => ({ medium, setMedium, mode, setMode }),
    [medium, setMedium, mode, setMode],
  );

  return (
    <MediumContext.Provider value={value}>{children}</MediumContext.Provider>
  );
}

export function useMedium() {
  const ctx = useContext(MediumContext);
  if (!ctx) {
    throw new Error("useMedium must be used within MediumProvider");
  }
  return ctx;
}
