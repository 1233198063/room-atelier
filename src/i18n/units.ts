import { create } from "zustand";
import { formatArea, formatLength, formatRange, formatSize, lengthValue, LENGTH_UNITS, type LengthUnit } from "../lib/units";

/**
 * The length unit the interface shows. Like the language, a viewer
 * preference: its own store and localStorage key, never part of the document.
 */
export const UNIT_KEY = "room-atelier:unit";

const isUnit = (v: unknown): v is LengthUnit => LENGTH_UNITS.includes(v as LengthUnit);

function savedUnit(): LengthUnit {
  try {
    const saved = globalThis.localStorage?.getItem(UNIT_KEY);
    if (isUnit(saved)) return saved;
    if (saved === "in") return "ft"; // inches alone became feet and inches
  } catch {
    // Storage can be blocked; centimeters it is.
  }
  return "cm";
}

export const useUnits = create<{ unit: LengthUnit }>()(() => ({ unit: savedUnit() }));

export const getLengthUnit = (): LengthUnit => useUnits.getState().unit;
export const useLengthUnit = (): LengthUnit => useUnits((s) => s.unit);

export function setLengthUnit(unit: LengthUnit) {
  if (unit === getLengthUnit()) return;
  useUnits.setState({ unit });
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    // Still switches for this visit.
  }
}

/** Length formatters bound to the current unit; components re-render when it changes. */
export function useLength() {
  const unit = useLengthUnit();
  return {
    unit,
    /** Bare number, e.g. "210". */
    value: (m: number) => lengthValue(m, unit),
    /** Bare number for small labels: whole inches, meters to 0.01. */
    short: (m: number) => lengthValue(m, unit, true),
    /** With the unit, e.g. "210 cm". */
    format: (m: number) => formatLength(m, unit),
    size: (a: number, b: number) => formatSize(a, b, unit),
    range: (min: number, max: number) => formatRange(min, max, unit),
    /** Floor area, e.g. "15.1 m²" or "162 ft²". */
    area: (m2: number) => formatArea(m2, unit),
  };
}

/** Follow unit switches made in other tabs. */
export function followUnitInOtherTabs() {
  window.addEventListener("storage", (e) => {
    if (e.key === UNIT_KEY && isUnit(e.newValue) && e.newValue !== getLengthUnit()) useUnits.setState({ unit: e.newValue });
  });
}
