/** Unit conversions used at the edges of the core (UI, protocol). */

export const KELVIN = 273.15;
/** Standard atmosphere [Pa]. */
export const P_ATM = 101325;
export const SECONDS_PER_HOUR = 3600;

export const cToK = (c: number): number => c + KELVIN;
export const kToC = (k: number): number => k - KELVIN;

export const barToPa = (bar: number): number => bar * 1e5;
export const paToBar = (pa: number): number => pa / 1e5;

/** bar(g) → Pa(a). */
export const bargToPa = (barg: number): number => barg * 1e5 + P_ATM;
/** Pa(a) → bar(g). */
export const paToBarg = (pa: number): number => (pa - P_ATM) / 1e5;

/** Normal flow [Nm³/h] (0 °C, 1,01325 bar) → mass flow [kg/s]. */
export const nm3hToKgs = (q: number, rhoN: number): number =>
  (q * rhoN) / SECONDS_PER_HOUR;
export const kgsToNm3h = (m: number, rhoN: number): number =>
  (m * SECONDS_PER_HOUR) / rhoN;

export const kghToKgs = (q: number): number => q / SECONDS_PER_HOUR;
export const kgsToKgh = (m: number): number => m * SECONDS_PER_HOUR;

export const hToS = (h: number): number => h * SECONDS_PER_HOUR;
export const sToH = (s: number): number => s / SECONDS_PER_HOUR;
