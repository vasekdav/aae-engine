import { calibrate, workbookSpecific } from "./model/air";
import { Tube } from "./model/zones";
import { type ConstantSet, CLIMATE, LOCATIONS, MATERIALS, validateConstantSet } from "./constants";
import { getFluid, PROPS_TABLES } from "./props";
import ref from "./data/reference-vectors.json";
import type { MediumId } from "./types";

/** Version of the sizing application (shown in the report stamp). */
export const APP_VERSION = "1.0.0-mvp";

/** FNV-1a 32-bit hash of a JSON document — data fingerprint for the audit stamp. */
export function hashJson(data: unknown): string {
  const s = JSON.stringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export interface DataManifestRow {
  name: string;
  version: string;
  source: string;
  hash: string;
}

export function dataManifest(set: ConstantSet): DataManifestRow[] {
  return [
    { name: "Konstanty a kalibrace", version: set.version, source: "constants.json", hash: hashJson(set) },
    { name: "Umístění", version: LOCATIONS.version, source: "locations.json", hash: hashJson(LOCATIONS) },
    { name: "Materiály", version: MATERIALS.version, source: "materials.json", hash: hashJson(MATERIALS) },
    { name: "Klima", version: CLIMATE.version, source: "climate.json", hash: hashJson(CLIMATE) },
    ...(Object.keys(PROPS_TABLES) as MediumId[]).map((id) => ({
      name: `Vlastnosti ${id}`,
      version: PROPS_TABLES[id].version,
      source: PROPS_TABLES[id].source,
      hash: hashJson(PROPS_TABLES[id]),
    })),
  ];
}

/** Combined fingerprint of all data sets. */
export function dataFingerprint(set: ConstantSet): string {
  return hashJson(dataManifest(set).map((r) => r.hash));
}

export interface SelfTestRow {
  id: string;
  pass: boolean;
  detail: string;
}

/**
 * In-app self-test: the zone model against the independent Python/CoolProp
 * reference vectors (scripts/reference/zone_model.py) and the calibration.
 */
export function runSelfTest(set: ConstantSet): SelfTestRow[] {
  const rows: SelfTestRow[] = [];
  const conflicts = validateConstantSet(set);
  rows.push({
    id: "Sada konstant",
    pass: conflicts.length === 0,
    detail: conflicts.length ? conflicts.join("; ") : "žádné dvojí započtení",
  });
  for (const v of ref.vectors) {
    const tube = new Tube(getFluid(v.medium as MediumId), v.pLine, v.pTank, v.Tair);
    const lam = tube.lambdaTo(v.Tout).value;
    const dev = lam === null ? Infinity : lam / v.lam - 1;
    rows.push({
      id: v.id,
      pass: Math.abs(dev) < 0.005,
      detail: `Λ odchylka ${(dev * 100).toFixed(3)} % (limit 0,5 %)`,
    });
  }
  const cal = calibrate(set);
  const devC = cal.C / ref.calibrationC - 1;
  rows.push({
    id: "Kalibrace C",
    pass: Math.abs(devC) < 0.003,
    detail: `C = ${cal.C.toFixed(4)} (reference ${ref.calibrationC.toFixed(4)})`,
  });
  const wb = workbookSpecific("N2", cal.pRef, cal.TairRef, cal.ToutRef);
  rows.push({
    id: "Ukotvení na sešit",
    pass: wb !== null && Math.abs((cal.C * wb) / cal.lamRef - 1) < 1e-9,
    detail: "zónová plocha = plocha sešitu v katalogovém bodě",
  });
  return rows;
}
