import type { ColorPart } from "../i18n/messages";
import type { Furniture, FurnitureColor, FurnitureColors, FurnitureType, Palette } from "../types";
import { isHexColor } from "./palettes";

export const PLANT_COLORS = { pot: "#c47f5b", leaves: "#7f9c69" } as const;
/** Travertine: steps, paving and stone tabletops. Not part of the room palette. */
export const STONE_COLOR = "#e2d5c0";
/** White porcelain and enamel: sanitaryware and appliances. Not part of the room palette. */
export const CERAMIC_COLOR = "#f2f0eb";
const COLOR_KEYS: FurnitureColor[] = ["wood", "woodDark", "fabric", "accent", "metal", "pot", "leaves", "stone", "ceramic"];

/** A color role of one model, and the part of it the role paints (named in i18n). */
interface ColorField {
  key: FurnitureColor;
  part: ColorPart;
}

const WOOD_FIELDS: ColorField[] = [{ key: "wood", part: "body" }, { key: "woodDark", part: "legsBase" }];
const HARDWARE: ColorField = { key: "metal", part: "hardware" };
const FIELDS: Record<FurnitureType, ColorField[]> = {
  bookcase: [...WOOD_FIELDS, HARDWARE, { key: "accent", part: "bookCovers" }],
  worktable: [...WOOD_FIELDS, HARDWARE, { key: "accent", part: "journals" }],
  armchair: [{ key: "fabric", part: "upholstery" }, { key: "accent", part: "cushion" }, { key: "woodDark", part: "feet" }],
  ottoman: [{ key: "fabric", part: "upholstery" }, { key: "woodDark", part: "feet" }],
  rug: [{ key: "fabric", part: "ground" }, { key: "accent", part: "pattern" }],
  curtains: [{ key: "fabric", part: "panels" }, { key: "accent", part: "pattern" }, HARDWARE],
  bed: [...WOOD_FIELDS, { key: "fabric", part: "bedding" }, { key: "accent", part: "throw" }],
  desk: [...WOOD_FIELDS, HARDWARE],
  chair: [...WOOD_FIELDS, { key: "fabric", part: "cushion" }],
  cabinet: [...WOOD_FIELDS, HARDWARE],
  dresser: [...WOOD_FIELDS, HARDWARE],
  plant: [{ key: "pot", part: "pot" }, { key: "leaves", part: "leaves" }, { key: "woodDark", part: "trunk" }],
  sofa: [{ key: "fabric", part: "upholstery" }, { key: "accent", part: "pillows" }, { key: "woodDark", part: "feet" }],
  table: [{ key: "wood", part: "top" }, { key: "woodDark", part: "legs" }],
  lamp: [{ key: "fabric", part: "shade" }, { key: "metal", part: "stand" }],
  easel: [{ key: "wood", part: "easel" }],
  screen: [{ key: "metal", part: "casing" }],
  artwork: [{ key: "wood", part: "frame" }],
  gallery: [{ key: "wood", part: "deckEdge" }, { key: "metal", part: "handrail" }],
  spiralStair: [{ key: "wood", part: "treads" }, { key: "metal", part: "handrail" }],
  stairs: [{ key: "stone", part: "steps" }],
  tree: [{ key: "leaves", part: "canopy" }, { key: "woodDark", part: "trunk" }],
  shrub: [{ key: "leaves", part: "foliage" }, { key: "accent", part: "flowers" }],
  paving: [{ key: "stone", part: "stone" }],
  cornerSofa: [{ key: "fabric", part: "upholstery" }, { key: "accent", part: "pillows" }, { key: "woodDark", part: "feet" }],
  roundTable: [{ key: "wood", part: "top" }, { key: "woodDark", part: "legsBase" }],
  tv: [],
  officeChair: [{ key: "fabric", part: "upholstery" }, { key: "woodDark", part: "legsBase" }],
  fridge: [{ key: "ceramic", part: "body" }, HARDWARE],
  washer: [{ key: "ceramic", part: "body" }],
  kitchenCounter: [{ key: "wood", part: "fronts" }, { key: "stone", part: "countertop" }, { key: "woodDark", part: "legsBase" }, HARDWARE],
  range: [],
  wallCabinet: [{ key: "wood", part: "fronts" }, { key: "woodDark", part: "body" }, HARDWARE],
  dishwasher: [{ key: "ceramic", part: "body" }, { key: "stone", part: "countertop" }],
  microwave: [{ key: "ceramic", part: "body" }],
  toilet: [{ key: "ceramic", part: "porcelain" }],
  vanity: [{ key: "wood", part: "fronts" }, { key: "ceramic", part: "basin" }, HARDWARE],
  bathtub: [{ key: "ceramic", part: "porcelain" }],
  shower: [{ key: "ceramic", part: "tray" }, { key: "metal", part: "metalFrame" }],
};

/** Below this height a table is a coffee table with a stone top and plinth. */
export const COFFEE_TABLE_MAX_H = 0.55;

export function furnitureColorFields(f: Furniture): ColorField[] {
  if (f.type === "plant" && f.dimensions.height < 0.7) return FIELDS.plant.filter((field) => field.key !== "woodDark");
  if (f.type === "table" && f.dimensions.height < COFFEE_TABLE_MAX_H) return [{ key: "stone", part: "topBase" }];
  return FIELDS[f.type];
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
  const fallback = key === "pot" || key === "leaves" ? PLANT_COLORS[key] : key === "stone" ? STONE_COLOR
    : key === "ceramic" ? CERAMIC_COLOR : palette[key];
  return f.colors?.[key] ?? fallback;
}

/** Brushed stainless: a range's top in the small plan. Fixed, like the model. */
const STEEL_COLOR = "#c9ccce";

/** Give a piece's footprint its visible top color in the small plan. */
export function furniturePlanColor(f: Furniture, palette: Palette): string {
  if (f.type === "range") return STEEL_COLOR;
  const fabricTypes: FurnitureType[] = ["bed", "chair", "armchair", "ottoman", "rug", "curtains", "sofa", "cornerSofa", "lamp", "officeChair"];
  const stoneTypes: FurnitureType[] = ["stairs", "paving", "kitchenCounter", "dishwasher"];
  const ceramicTypes: FurnitureType[] = ["fridge", "washer", "toilet", "bathtub", "shower", "microwave"];
  const key = f.type === "plant" || f.type === "tree" || f.type === "shrub" ? "leaves"
    : stoneTypes.includes(f.type) || (f.type === "table" && f.dimensions.height < COFFEE_TABLE_MAX_H) ? "stone"
    : ceramicTypes.includes(f.type) ? "ceramic"
    : f.type === "tv" ? "metal"
    : fabricTypes.includes(f.type) ? "fabric" : "wood";
  return furnitureColor(f, palette, key);
}
