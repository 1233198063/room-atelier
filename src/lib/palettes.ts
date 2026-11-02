import { MESSAGES, type Lang } from "../i18n/messages";
import type { Opening, Palette, PaletteColor, Room } from "../types";
import { formatArea, type LengthUnit } from "./units";

/** Names and descriptions (why each combination works) are in i18n, by palette id. */
export interface PalettePreset {
  palette: Palette;
}

const preset = (id: string, colors: Omit<Palette, "id">): PalettePreset => ({ palette: { id, ...colors } });

export const PALETTE_PRESETS: PalettePreset[] = [
  preset("warm-oak", {
    wall: "#f4efe7",
    floor: "#efd9b8",
    wood: "#d9b88f",
    woodDark: "#a98257",
    fabric: "#f3eee5",
    accent: "#b88b72",
    metal: "#b8955c",
  }),
  preset("nordic", {
    wall: "#f5f5f2",
    floor: "#ece3d5",
    wood: "#e6d4b6",
    woodDark: "#c4ab86",
    fabric: "#eff0ec",
    accent: "#8ea2b4",
    metal: "#c4c2bc",
  }),
  preset("japandi", {
    wall: "#ebe5da",
    floor: "#dcc6a4",
    wood: "#cdab80",
    woodDark: "#5a4a3d",
    fabric: "#e6ded1",
    accent: "#7e8c6e",
    metal: "#3b3632",
  }),
  preset("mid-century", {
    wall: "#f2e9d9",
    floor: "#caa078",
    wood: "#a8744a",
    woodDark: "#6f4a30",
    fabric: "#efe6d6",
    accent: "#d29a3c",
    metal: "#b8955c",
  }),
  preset("plaster-clay", {
    wall: "#efdccb",
    floor: "#e2c7a4",
    wood: "#d2ad80",
    woodDark: "#93704e",
    fabric: "#f3ebe1",
    accent: "#b4614a",
    metal: "#ad8a57",
  }),
];

export const DEFAULT_PALETTE: Palette = PALETTE_PRESETS[0].palette;

/** The palette's color roles, in the order the style panel lists them. */
export const PALETTE_COLORS: PaletteColor[] = ["wall", "floor", "wood", "woodDark", "fabric", "accent", "metal"];

// ── Color math ───────────────────────────────────────────────────────────

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** WCAG relative luminance of a "#rrggbb" color, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two colors: 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Suggestions ──────────────────────────────────────────────────────────

/** Rules of thumb behind the suggestions. */
export const PALETTE_RULES = {
  /** Below this floor area (m²) a room counts as small. */
  smallRoom: 12,
  /** Window glass area as a share of floor area: <10% is dim, ≥20% is bright. */
  dimGlazing: 0.1,
  brightGlazing: 0.2,
} as const;

export function glazingRatio(room: Room, openings: Opening[]): number {
  const glass = openings.filter((o) => o.type === "window").reduce((sum, o) => sum + o.width * o.height, 0);
  return glass / (room.width * room.depth);
}

/**
 * Which presets suit this room, and why. Based on two facts the editor
 * already knows: floor area and how much window there is.
 */
export function suggestPalettes(room: Room, openings: Opening[], lang: Lang = "en", unit: LengthUnit = "cm"): Map<string, string> {
  const reasons = MESSAGES[lang].style.reasons;
  const area = room.width * room.depth;
  const glazing = glazingRatio(room, openings);
  const pct = Math.floor(glazing * 100); // round down, so 19.8% never reads as the 20% threshold

  if (glazing < PALETTE_RULES.dimGlazing) {
    const why = reasons.dim(pct);
    return new Map([
      ["nordic", why],
      ["warm-oak", why],
    ]);
  }
  if (area < PALETTE_RULES.smallRoom) {
    const why = reasons.compact(formatArea(area, unit));
    return new Map([
      ["nordic", why],
      ["warm-oak", why],
    ]);
  }
  if (glazing >= PALETTE_RULES.brightGlazing) {
    const why = reasons.bright(pct);
    return new Map([
      ["mid-century", why],
      ["japandi", why],
      ["plaster-clay", why],
    ]);
  }
  const why = reasons.balanced(pct);
  return new Map([
    ["warm-oak", why],
    ["plaster-clay", why],
  ]);
}
