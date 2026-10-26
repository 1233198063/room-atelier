import type { Furniture, FurnitureColor, FurnitureColors, FurnitureType, Palette } from "../types";
import { isHexColor } from "./palettes";

export const PLANT_COLORS = { pot: "#c47f5b", leaves: "#7f9c69" } as const;
const COLOR_KEYS: FurnitureColor[] = ["wood", "woodDark", "fabric", "accent", "metal", "pot", "leaves"];

interface ColorField {
  key: FurnitureColor;
  label: string;
}

const WOOD_FIELDS: ColorField[] = [{ key: "wood", label: "Body" }, { key: "woodDark", label: "Legs / base" }];
const HARDWARE: ColorField = { key: "metal", label: "Hardware" };
const FIELDS: Record<FurnitureType, ColorField[]> = {
  bookcase: [...WOOD_FIELDS, HARDWARE, { key: "accent", label: "Book covers" }],
  worktable: [...WOOD_FIELDS, HARDWARE, { key: "accent", label: "Journals" }],
  armchair: [{ key: "fabric", label: "Upholstery" }, { key: "accent", label: "Cushion" }, { key: "woodDark", label: "Feet" }],
  ottoman: [{ key: "fabric", label: "Upholstery" }, { key: "woodDark", label: "Feet" }],
  rug: [{ key: "fabric", label: "Ground" }, { key: "accent", label: "Pattern" }],
  curtains: [{ key: "fabric", label: "Panels" }, { key: "accent", label: "Pattern" }, HARDWARE],
  bed: [...WOOD_FIELDS, { key: "fabric", label: "Bedding" }, { key: "accent", label: "Throw" }],
  desk: [...WOOD_FIELDS, HARDWARE],
  chair: [...WOOD_FIELDS, { key: "fabric", label: "Cushion" }],
  cabinet: [...WOOD_FIELDS, HARDWARE],
  dresser: [...WOOD_FIELDS, HARDWARE],
  plant: [{ key: "pot", label: "Pot" }, { key: "leaves", label: "Leaves" }, { key: "woodDark", label: "Trunk" }],
};

export function furnitureColorFields(f: Furniture): ColorField[] {
  return f.type === "plant" && f.dimensions.height < 0.7
    ? FIELDS.plant.filter((field) => field.key !== "woodDark") : FIELDS[f.type];
}

/** Used by both save validation and store updates; never retain malformed colors or unknown roles. */
export function sanitizeFurnitureColors(raw: unknown): FurnitureColors | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const colors: FurnitureColors = {};
  for (const key of COLOR_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (Object.hasOwn(raw, key) && isHexColor(value)) colors[key] = value.toLowerCase();
  }
  return Object.keys(colors).length ? colors : undefined;
}

export function furnitureColor(f: Furniture, palette: Palette, key: FurnitureColor): string {
  return f.colors?.[key] ?? (key === "pot" || key === "leaves" ? PLANT_COLORS[key] : palette[key]);
}

/** Give a piece's footprint its visible top color in the small plan. */
export function furniturePlanColor(f: Furniture, palette: Palette): string {
  const fabricTypes: FurnitureType[] = ["bed", "chair", "armchair", "ottoman", "rug", "curtains"];
  const key = f.type === "plant" ? "leaves" : fabricTypes.includes(f.type) ? "fabric" : "wood";
  return furnitureColor(f, palette, key);
}
