import type { Dimensions, FurnitureType } from "../types";

export interface CatalogEntry {
  type: FurnitureType;
  defaults: Dimensions;
  /** Allowed size range per axis, in meters. */
  min: Dimensions;
  max: Dimensions;
}

export const CATALOG: Record<FurnitureType, CatalogEntry> = {
  cornerSofa: {
    type: "cornerSofa",
    defaults: { width: 2.8, depth: 1.6, height: 0.82 },
    min: { width: 1.8, depth: 1.2, height: 0.6 }, max: { width: 4.5, depth: 2.6, height: 1.1 },
  },
  roundTable: {
    type: "roundTable",
    defaults: { width: 1.2, depth: 1.2, height: 0.75 },
    min: { width: 0.5, depth: 0.5, height: 0.4 }, max: { width: 2.2, depth: 2.2, height: 1.1 },
  },
  tv: {
    type: "tv",
    defaults: { width: 1.45, depth: 0.06, height: 0.84 },
    min: { width: 0.5, depth: 0.03, height: 0.3 }, max: { width: 3.2, depth: 0.2, height: 1.8 },
  },
  officeChair: {
    type: "officeChair",
    defaults: { width: 0.62, depth: 0.62, height: 1.1 },
    min: { width: 0.45, depth: 0.45, height: 0.8 }, max: { width: 0.85, depth: 0.85, height: 1.4 },
  },
  fridge: {
    type: "fridge",
    defaults: { width: 0.7, depth: 0.7, height: 1.8 },
    min: { width: 0.45, depth: 0.5, height: 0.8 }, max: { width: 1.2, depth: 0.85, height: 2.1 },
  },
  washer: {
    type: "washer",
    defaults: { width: 0.6, depth: 0.6, height: 0.85 },
    min: { width: 0.4, depth: 0.4, height: 0.6 }, max: { width: 0.8, depth: 0.8, height: 1.2 },
  },
  kitchenCounter: {
    type: "kitchenCounter",
    defaults: { width: 2.4, depth: 0.6, height: 0.85 },
    min: { width: 0.6, depth: 0.45, height: 0.7 }, max: { width: 5, depth: 0.8, height: 1 },
  },
  range: {
    type: "range",
    defaults: { width: 0.76, depth: 0.66, height: 0.97 },
    min: { width: 0.5, depth: 0.55, height: 0.85 }, max: { width: 1.25, depth: 0.8, height: 1.05 },
  },
  wallCabinet: {
    type: "wallCabinet",
    defaults: { width: 0.8, depth: 0.33, height: 0.76 },
    min: { width: 0.3, depth: 0.25, height: 0.3 }, max: { width: 3, depth: 0.65, height: 1.2 },
  },
  dishwasher: {
    type: "dishwasher",
    defaults: { width: 0.6, depth: 0.62, height: 0.91 },
    min: { width: 0.45, depth: 0.55, height: 0.8 }, max: { width: 0.65, depth: 0.7, height: 0.95 },
  },
  microwave: {
    type: "microwave",
    defaults: { width: 0.76, depth: 0.4, height: 0.42 },
    min: { width: 0.4, depth: 0.3, height: 0.25 }, max: { width: 0.8, depth: 0.5, height: 0.5 },
  },
  toilet: {
    type: "toilet",
    defaults: { width: 0.4, depth: 0.7, height: 0.78 },
    min: { width: 0.33, depth: 0.5, height: 0.6 }, max: { width: 0.6, depth: 0.85, height: 1.1 },
  },
  vanity: {
    type: "vanity",
    defaults: { width: 0.8, depth: 0.5, height: 0.85 },
    min: { width: 0.4, depth: 0.35, height: 0.6 }, max: { width: 2, depth: 0.65, height: 1 },
  },
  bathtub: {
    type: "bathtub",
    defaults: { width: 1.7, depth: 0.75, height: 0.58 },
    min: { width: 1.1, depth: 0.6, height: 0.4 }, max: { width: 2.2, depth: 1.3, height: 0.8 },
  },
  shower: {
    type: "shower",
    defaults: { width: 0.9, depth: 0.9, height: 2 },
    min: { width: 0.7, depth: 0.7, height: 1.8 }, max: { width: 1.8, depth: 1.4, height: 2.4 },
  },
  sofa: {
    type: "sofa",
    defaults: { width: 2.6, depth: 1, height: 0.82 },
    min: { width: 1.2, depth: 0.75, height: 0.6 }, max: { width: 4.5, depth: 1.3, height: 1.1 },
  },
  table: {
    type: "table",
    defaults: { width: 1.8, depth: 0.9, height: 0.75 },
    min: { width: 0.4, depth: 0.4, height: 0.3 }, max: { width: 4, depth: 1.6, height: 1.1 },
  },
  lamp: {
    type: "lamp",
    defaults: { width: 0.45, depth: 0.45, height: 1.6 },
    min: { width: 0.15, depth: 0.15, height: 0.25 }, max: { width: 0.8, depth: 0.8, height: 2.2 },
  },
  easel: {
    type: "easel",
    defaults: { width: 0.7, depth: 0.6, height: 1.8 },
    min: { width: 0.4, depth: 0.35, height: 1 }, max: { width: 1.4, depth: 1, height: 2.4 },
  },
  screen: {
    type: "screen",
    defaults: { width: 3.2, depth: 0.08, height: 1.9 },
    min: { width: 1, depth: 0.04, height: 0.6 }, max: { width: 5, depth: 0.2, height: 3 },
  },
  artwork: {
    type: "artwork",
    defaults: { width: 0.6, depth: 0.04, height: 0.75 },
    min: { width: 0.2, depth: 0.02, height: 0.2 }, max: { width: 2.5, depth: 0.1, height: 2 },
  },
  gallery: {
    type: "gallery",
    defaults: { width: 6, depth: 1.6, height: 4 },
    min: { width: 1.5, depth: 0.9, height: 2.6 }, max: { width: 20, depth: 4, height: 6.5 },
  },
  spiralStair: {
    type: "spiralStair",
    defaults: { width: 2.2, depth: 2.2, height: 3 },
    min: { width: 1.4, depth: 1.4, height: 2 }, max: { width: 3.5, depth: 3.5, height: 6 },
  },
  stairs: {
    type: "stairs",
    defaults: { width: 1.2, depth: 3.6, height: 2 },
    min: { width: 0.8, depth: 0.6, height: 0.3 }, max: { width: 4, depth: 14, height: 7 },
  },
  tree: {
    type: "tree",
    defaults: { width: 3, depth: 3, height: 4.5 },
    min: { width: 0.6, depth: 0.6, height: 1.5 }, max: { width: 12, depth: 12, height: 14 },
  },
  shrub: {
    type: "shrub",
    defaults: { width: 1.2, depth: 0.8, height: 0.7 },
    min: { width: 0.3, depth: 0.3, height: 0.2 }, max: { width: 12, depth: 4, height: 3 },
  },
  paving: {
    type: "paving",
    defaults: { width: 3, depth: 2, height: 0.03 },
    min: { width: 0.5, depth: 0.5, height: 0.01 }, max: { width: 40, depth: 40, height: 0.15 },
  },
  bookcase: {
    type: "bookcase",
    defaults: { width: 1.2, depth: 0.4, height: 2.4 },
    min: { width: 0.5, depth: 0.25, height: 0.5 }, max: { width: 3, depth: 0.8, height: 3.5 },
  },
  worktable: {
    type: "worktable",
    defaults: { width: 2.4, depth: 1.1, height: 0.78 },
    min: { width: 0.9, depth: 0.45, height: 0.55 }, max: { width: 3.5, depth: 1.6, height: 1.1 },
  },
  armchair: {
    type: "armchair",
    defaults: { width: 0.85, depth: 0.85, height: 1.05 },
    min: { width: 0.65, depth: 0.65, height: 0.8 }, max: { width: 1.3, depth: 1.2, height: 1.4 },
  },
  ottoman: {
    type: "ottoman",
    defaults: { width: 0.65, depth: 0.5, height: 0.4 },
    min: { width: 0.35, depth: 0.3, height: 0.2 }, max: { width: 1.2, depth: 1, height: 0.6 },
  },
  rug: {
    type: "rug",
    defaults: { width: 2.6, depth: 3.5, height: 0.012 },
    min: { width: 0.5, depth: 0.5, height: 0.005 }, max: { width: 8, depth: 10, height: 0.03 },
  },
  curtains: {
    type: "curtains",
    defaults: { width: 2.8, depth: 0.16, height: 2.5 },
    min: { width: 1, depth: 0.08, height: 0.8 }, max: { width: 5, depth: 0.3, height: 4 },
  },
  bed: {
    type: "bed",
    defaults: { width: 1.6, depth: 2.05, height: 0.95 },
    min: { width: 0.8, depth: 1.6, height: 0.5 },
    max: { width: 2.4, depth: 2.4, height: 1.6 },
  },
  desk: {
    type: "desk",
    defaults: { width: 1.2, depth: 0.6, height: 0.75 },
    min: { width: 0.6, depth: 0.4, height: 0.5 },
    max: { width: 3.0, depth: 1.2, height: 1.2 },
  },
  chair: {
    type: "chair",
    defaults: { width: 0.48, depth: 0.52, height: 0.85 },
    min: { width: 0.35, depth: 0.35, height: 0.6 },
    max: { width: 0.9, depth: 0.9, height: 1.3 },
  },
  cabinet: {
    type: "cabinet",
    defaults: { width: 0.9, depth: 0.45, height: 1.6 },
    min: { width: 0.3, depth: 0.25, height: 0.3 },
    max: { width: 3.0, depth: 0.8, height: 2.6 },
  },
  dresser: {
    type: "dresser",
    defaults: { width: 1.2, depth: 0.48, height: 0.8 },
    min: { width: 0.5, depth: 0.35, height: 0.5 },
    max: { width: 2.4, depth: 0.7, height: 1.3 },
  },
  plant: {
    type: "plant",
    defaults: { width: 0.5, depth: 0.5, height: 1.2 },
    min: { width: 0.12, depth: 0.12, height: 0.12 },
    max: { width: 1.6, depth: 1.6, height: 2.6 },
  },
};

export const FURNITURE_TYPES = Object.keys(CATALOG) as FurnitureType[];

/**
 * A library card: a model at a common real-world size. `id` names the card
 * in i18n (`presets`); cards without a name there use the model's label.
 */
export interface LibraryPreset {
  id: string;
  type: FurnitureType;
  /** Defaults to the model's catalog size. */
  dimensions?: Dimensions;
  /** Wall-hung pieces start at a typical height. */
  elevation?: number;
}

export type LibraryCategory = "living" | "dining" | "bedroom" | "study" | "kitchen" | "bathroom" | "plants" | "structure" | "garden";

const p = (id: string, type: FurnitureType, size?: [w: number, d: number, h: number], elevation?: number): LibraryPreset => ({
  id, type, ...(size ? { dimensions: { width: size[0], depth: size[1], height: size[2] } } : {}), ...(elevation ? { elevation } : {}),
});

/** The library, by room. Sizes are common retail sizes (mainland China), in meters. */
export const LIBRARY: { id: LibraryCategory; presets: LibraryPreset[] }[] = [
  { id: "living", presets: [
    p("sofa3", "sofa", [2.1, 0.9, 0.82]), p("sofa2", "sofa", [1.6, 0.88, 0.8]), p("cornerSofa", "cornerSofa"),
    p("armchair", "armchair"), p("coffeeTable", "table", [1.2, 0.6, 0.42]), p("sideTable", "cabinet", [0.45, 0.45, 0.55]),
    p("tvStand", "dresser", [2, 0.4, 0.5]), p("tv65", "tv", undefined, 0.85), p("floorLamp", "lamp"),
    p("rug", "rug", [2, 3, 0.012]), p("ottoman", "ottoman"), p("bookcase", "bookcase"), p("curtains", "curtains"),
    p("artwork", "artwork", undefined, 1.3), p("screen", "screen", undefined, 0.9),
  ] },
  { id: "dining", presets: [
    p("dining4", "table", [1.4, 0.8, 0.75]), p("dining6", "table", [1.8, 0.9, 0.75]), p("roundTable", "roundTable"),
    p("diningChair", "chair", [0.45, 0.52, 0.85]), p("sideboard", "dresser", [1.4, 0.45, 0.85]),
  ] },
  { id: "bedroom", presets: [
    p("bed18", "bed", [1.86, 2.12, 1]), p("bed15", "bed", [1.56, 2.1, 1]), p("bed12", "bed", [1.26, 2.05, 0.9]),
    p("nightstand", "cabinet", [0.45, 0.4, 0.5]), p("wardrobe", "cabinet", [1.6, 0.6, 2.2]), p("dresser", "dresser"),
    p("dressingTable", "desk", [1, 0.45, 0.75]),
  ] },
  { id: "study", presets: [
    p("desk", "desk"), p("officeChair", "officeChair"), p("worktable", "worktable"), p("tableLamp", "lamp", [0.3, 0.3, 0.45]),
    p("easel", "easel"),
  ] },
  { id: "kitchen", presets: [
    p("kitchenCounter", "kitchenCounter"), p("wallCabinet", "wallCabinet", undefined, 1.45), p("range", "range"),
    p("dishwasher", "dishwasher"), p("microwave", "microwave", undefined, 1.45),
    p("fridge", "fridge", [0.6, 0.65, 1.75]), p("fridgeWide", "fridge", [0.9, 0.7, 1.8]),
    p("island", "table", [2, 1, 0.92]), p("barStool", "chair", [0.42, 0.45, 0.95]),
  ] },
  { id: "bathroom", presets: [
    p("toilet", "toilet"), p("vanity", "vanity"), p("shower", "shower"), p("bathtub", "bathtub"), p("washer", "washer"),
  ] },
  { id: "plants", presets: [
    p("floorPlant", "plant"), p("smallPlant", "plant", [0.22, 0.22, 0.32]),
  ] },
  { id: "structure", presets: [p("gallery", "gallery"), p("spiralStair", "spiralStair"), p("stairs", "stairs")] },
  { id: "garden", presets: [p("tree", "tree"), p("shrub", "shrub"), p("paving", "paving")] },
];

/**
 * Furniture whose top you can put a small plant on. Dragging a plant over one
 * of these lifts it onto the top when the pot fits and there is room below the ceiling.
 */
export const SURFACE_TYPES: FurnitureType[] = ["desk", "dresser", "cabinet", "worktable", "bookcase", "table", "roundTable", "kitchenCounter"];
export const WORKTABLE_TOOL_HEIGHT = 0.16;
/** From this height a chair is a counter stool: a high seat, a low back and a footrest. */
export const COUNTER_STOOL_H = 0.95;

/** Pieces people routinely shift around; layout checks don't treat them as fixed obstacles. */
export const MOVABLE_TYPES: FurnitureType[] = ["chair", "officeChair", "plant", "ottoman", "lamp"];

/** Seats that tuck under a table or desk without counting as an overlap. */
export const SEAT_TYPES: FurnitureType[] = ["chair", "officeChair"];
export const TABLE_TYPES: FurnitureType[] = ["desk", "worktable", "table", "roundTable", "kitchenCounter"];

/**
 * Flat floor coverings, window dressings, wall-hung pieces, and walkways and
 * tree canopies people pass under do not block circulation.
 */
export const DECOR_TYPES: FurnitureType[] = ["rug", "curtains", "paving", "artwork", "screen", "tv", "gallery", "tree"];

/** Planting can grow into planting. */
export const GREENERY_TYPES: FurnitureType[] = ["plant", "shrub", "tree"];

/** Height of the gallery railing; its deck sits this far below the piece's top. */
export const GALLERY_RAIL = 1;

/** Small enough for a corridor or a WC from a floor plan; generous enough for a garden plot and a double-height library. */
export const ROOM_LIMITS = {
  min: { width: 0.6, depth: 0.6, height: 2.0 },
  max: { width: 60, depth: 60, height: 12 },
} as const;
