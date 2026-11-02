/**
 * Display units for lengths. Data is always meters (see types.ts); the
 * interface shows lengths in the viewer's chosen unit and reads typed values
 * back from it. Everything is held to 1 mm, like the data.
 *
 * "ft" is feet and inches together, written the way plans write them: 12' 1".
 */
export type LengthUnit = "mm" | "cm" | "m" | "ft";

export const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "ft"];

/** How each unit is named in menus and tags. */
export const UNIT_LABELS: Record<LengthUnit, string> = { mm: "mm", cm: "cm", m: "m", ft: "ft-in" };

const MM_PER_UNIT: Record<LengthUnit, number> = { mm: 1, cm: 10, m: 1000, ft: 304.8 };

/** Meters → a number in `unit` (decimal feet for "ft"), from the length rounded to the millimeter. */
export const toUnit = (m: number, unit: LengthUnit) => Math.round(m * 1000) / MM_PER_UNIT[unit];

/** A number in `unit` → meters. */
export const fromUnit = (v: number, unit: LengthUnit) => (v * MM_PER_UNIT[unit]) / 1000;

/** Whole feet and the inches left over (to `step`), carrying 12" into a foot. */
export function splitFeet(m: number, step = 0.1): [feet: number, inches: number] {
  const total = Math.round(Math.abs(Math.round(m * 1000)) / 25.4 / step) * step;
  let feet = Math.floor(total / 12 + 1e-9);
  let inches = Math.round((total - feet * 12) / step) * step;
  if (inches >= 12 - 1e-9) { feet += 1; inches -= 12; }
  return [feet, Number(inches.toFixed(1))];
}

/**
 * Feet and inches as plans write them: 3.683 m → 12' 1". Inches to 0.1, or
 * whole with `wholeInches`; lengths under a foot are inches alone (8").
 */
export function feetInches(m: number, wholeInches = false): string {
  const [feet, inches] = splitFeet(m, wholeInches ? 1 : 0.1);
  const sign = m < 0 && (feet || inches) ? "-" : "";
  return feet ? `${sign}${feet}' ${inches}"` : `${sign}${inches}"`;
}

/**
 * A length as a bare number: whole millimeters, centimeters to 0.1, meters
 * to 0.001 (each about a millimeter), without trailing zeros; feet and inches
 * carry their own marks. `compact` is for small labels: meters to 0.01 and
 * whole inches.
 */
export function lengthValue(m: number, unit: LengthUnit, compact = false): string {
  if (unit === "ft") return feetInches(m, compact);
  const v = toUnit(m, unit);
  if (unit === "mm") return String(Math.round(v));
  if (unit === "cm") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  return String(Number(v.toFixed(compact ? 2 : 3)));
}

/** A length with its unit, e.g. "2100 mm", "210 cm", "2.1 m", 6' 10.7". */
export const formatLength = (m: number, unit: LengthUnit) => (unit === "ft" ? feetInches(m) : `${lengthValue(m, unit)} ${unit}`);

/** Two lengths sharing one unit, e.g. "420 × 360 cm", 13' 9.4" × 11' 9.7". */
export const formatSize = (a: number, b: number, unit: LengthUnit) =>
  unit === "ft" ? `${feetInches(a)} × ${feetInches(b)}` : `${lengthValue(a, unit)} × ${lengthValue(b, unit)} ${unit}`;

/** A range sharing one unit, e.g. "50–240 cm". */
export const formatRange = (min: number, max: number, unit: LengthUnit) =>
  unit === "ft" ? `${feetInches(min)}–${feetInches(max)}` : `${lengthValue(min, unit)}–${lengthValue(max, unit)} ${unit}`;

/** Floor area: square meters, or whole square feet alongside feet and inches. */
export const formatArea = (m2: number, unit: LengthUnit) =>
  unit === "ft" ? `${Math.round(m2 * 10.7639)} ft²` : `${m2.toFixed(1)} m²`;

/** Arrow-key nudges: 1 cm (Shift: 10 cm), or 1 in (Shift: 10 in). */
export const nudgeSteps = (unit: LengthUnit): [small: number, large: number] => (unit === "ft" ? [0.0254, 0.254] : [0.01, 0.1]);

/** Grid snapping choices: 1, 5 and 10 cm, or ½, 1 and 6 in. */
export const snapSteps = (unit: LengthUnit): number[] => (unit === "ft" ? [0.0127, 0.0254, 0.1524] : [0.01, 0.05, 0.1]);

const UNIT_TO_CM: Record<string, number> = { mm: 0.1, cm: 1, m: 100, in: 2.54, ft: 30.48 };

/**
 * Parse what the user typed. Accepts unit suffixes and simple sums, like a CAD
 * command line: "120", "1.2m", "450mm", "120+35", "2m-15cm", "90°", and feet
 * and inches: "36in", "36\"", "5'6\"", "5'6''", "5'6", "5ft 6in". Curly and
 * full-width quotes from a Chinese keyboard count too. Lengths come back in
 * centimeters; a bare number is read in `plain`, the unit on show — feet for
 * feet-and-inches, where "12 1" is 12' 1".
 */
export function parseFieldInput(text: string, unit: "length" | "°", plain: LengthUnit = "cm"): number | null {
  const spaced = plain === "ft" ? text.trim().replace(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/, "$1ft$2in") : text;
  const cleaned = spaced.trim().toLowerCase().replace(/,/g, ".")
    .replace(/inches|inch/g, "in").replace(/feet|foot/g, "ft")
    .replace(/[“”″＂"]|[‘’′＇']{2}/g, "in") // a double mark, or two single ones, is inches
    .replace(/[‘’′＇']/g, "ft") // a single mark is feet
    .replace(/\s+/g, "")
    .replace(/ft([\d.]+)(?=$|[+-])/g, "ft$1in") // 5'6 → 5ft6in: a bare number right after feet is inches
    .replace(/ft(?=[\d.])/g, "ft+"); // 5ft6in → 5ft+6in
  if (!cleaned) return null;
  const terms = cleaned.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join("") !== cleaned) return null;
  let total = 0;
  for (const term of terms) {
    const m = term.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(mm|cm|m|in|ft|°|deg)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    const suffix = m[2];
    if (unit === "length") {
      if (suffix === "°" || suffix === "deg") return null;
      total += n * UNIT_TO_CM[suffix ?? plain];
    } else {
      if (suffix && suffix !== "°" && suffix !== "deg") return null;
      total += n;
    }
  }
  return Number.isFinite(total) ? total : null;
}
