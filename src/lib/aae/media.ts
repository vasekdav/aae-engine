import type { MediumId, MediumProps } from "./types";

/**
 * Cryogenic media table (FLUID DATA sheet; more precise NIST constants kept).
 * Units documented on MediumProps.
 */
export const MEDIA: Record<MediumId, MediumProps> = {
  N2: {
    id: "N2",
    name: "DUSÍK N₂",
    tb: -195.8,
    L: 199,
    rhoN: 1.2504,
    cp: 1.041,
    M: 28.013,
    rhoLiq: 807,
    pc: 33.96,
    o2: false,
  },
  O2: {
    id: "O2",
    name: "KYSLÍK O₂",
    tb: -183.0,
    L: 213,
    rhoN: 1.429,
    cp: 0.918,
    M: 31.999,
    rhoLiq: 1141,
    pc: 50.43,
    o2: true,
  },
  Ar: {
    id: "Ar",
    name: "ARGON Ar",
    tb: -185.9,
    L: 161,
    rhoN: 1.7839,
    cp: 0.52,
    M: 39.948,
    rhoLiq: 1394,
    pc: 48.63,
    o2: false,
  },
};

export function getMedium(id: MediumId): MediumProps {
  return MEDIA[id];
}
