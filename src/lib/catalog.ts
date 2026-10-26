import type { Dimensions, FurnitureType } from "../types";

export interface CatalogEntry {
  type: FurnitureType;
  label: string;
  description: string;
  defaults: Dimensions;
  /** Allowed size range per axis, in meters. */
  min: Dimensions;
  max: Dimensions;
}

export const CATALOG: Record<FurnitureType, CatalogEntry> = {
  bookcase: {
    type: "bookcase", label: "Bookcase", description: "Open shelves with books and lower drawers",
    defaults: { width: 1.2, depth: 0.4, height: 2.4 },
    min: { width: 0.5, depth: 0.25, height: 0.5 }, max: { width: 3, depth: 0.8, height: 3.5 },
  },
  worktable: {
    type: "worktable", label: "Craft table", description: "Solid wood worktable with journals and drawing tools",
    defaults: { width: 2.4, depth: 1.1, height: 0.78 },
    min: { width: 0.9, depth: 0.45, height: 0.55 }, max: { width: 3.5, depth: 1.6, height: 1.1 },
  },
  armchair: {
    type: "armchair", label: "Armchair", description: "Upholstered reading chair with a loose cushion",
    defaults: { width: 0.85, depth: 0.85, height: 1.05 },
    min: { width: 0.65, depth: 0.65, height: 0.8 }, max: { width: 1.3, depth: 1.2, height: 1.4 },
  },
  ottoman: {
    type: "ottoman", label: "Ottoman", description: "Upholstered footstool on wooden feet",
    defaults: { width: 0.65, depth: 0.5, height: 0.4 },
    min: { width: 0.35, depth: 0.3, height: 0.2 }, max: { width: 1.2, depth: 1, height: 0.6 },
  },
  rug: {
    type: "rug", label: "Patterned rug", description: "Woven rug with a border and floral medallions",
    defaults: { width: 2.6, depth: 3.5, height: 0.012 },
    min: { width: 0.5, depth: 0.5, height: 0.005 }, max: { width: 8, depth: 10, height: 0.03 },
  },
  curtains: {
    type: "curtains", label: "Curtains", description: "Open pleated curtain panels and a metal rod",
    defaults: { width: 2.8, depth: 0.16, height: 2.5 },
    min: { width: 1, depth: 0.08, height: 0.8 }, max: { width: 5, depth: 0.3, height: 4 },
  },
  bed: {
    type: "bed",
    label: "Bed",
    description: "Platform bed with headboard",
    defaults: { width: 1.6, depth: 2.05, height: 0.95 },
    min: { width: 0.8, depth: 1.6, height: 0.5 },
    max: { width: 2.4, depth: 2.4, height: 1.6 },
  },
  desk: {
    type: "desk",
    label: "Desk",
    description: "Writing desk with drawer",
    defaults: { width: 1.2, depth: 0.6, height: 0.75 },
    min: { width: 0.6, depth: 0.4, height: 0.5 },
    max: { width: 3.0, depth: 1.2, height: 1.2 },
  },
  chair: {
    type: "chair",
    label: "Chair",
    description: "Dining / desk chair",
    defaults: { width: 0.48, depth: 0.52, height: 0.85 },
    min: { width: 0.35, depth: 0.35, height: 0.6 },
    max: { width: 0.9, depth: 0.9, height: 1.3 },
  },
  cabinet: {
    type: "cabinet",
    label: "Cabinet",
    description: "Wardrobe, sideboard or nightstand",
    defaults: { width: 0.9, depth: 0.45, height: 1.6 },
    min: { width: 0.3, depth: 0.25, height: 0.3 },
    max: { width: 3.0, depth: 0.8, height: 2.6 },
  },
  dresser: {
    type: "dresser",
    label: "Dresser",
    description: "Low chest of drawers on legs",
    defaults: { width: 1.2, depth: 0.48, height: 0.8 },
    min: { width: 0.5, depth: 0.35, height: 0.5 },
    max: { width: 2.4, depth: 0.7, height: 1.3 },
  },
  plant: {
    type: "plant",
    label: "Plant",
    description: "Potted plant — on the floor or on a surface",
    defaults: { width: 0.5, depth: 0.5, height: 1.2 },
    min: { width: 0.12, depth: 0.12, height: 0.12 },
    max: { width: 1.6, depth: 1.6, height: 2.6 },
  },
};

export const FURNITURE_TYPES = Object.keys(CATALOG) as FurnitureType[];

/** Library cards for the "Plants" section: one type, two starting sizes. */
export const PLANT_PRESETS: { key: string; label: string; dimensions: Dimensions }[] = [
  { key: "floor", label: "Floor plant", dimensions: CATALOG.plant.defaults },
  { key: "small", label: "Small plant", dimensions: { width: 0.22, depth: 0.22, height: 0.32 } },
];

/**
 * Furniture whose top you can put a small plant on. Dragging a plant over one
 * of these lifts it onto the top when the pot fits and there is room below the ceiling.
 */
export const SURFACE_TYPES: FurnitureType[] = ["desk", "dresser", "cabinet", "worktable", "bookcase"];
export const WORKTABLE_TOOL_HEIGHT = 0.16;

/** Pieces people routinely shift around; layout checks don't treat them as fixed obstacles. */
export const MOVABLE_TYPES: FurnitureType[] = ["chair", "plant", "ottoman"];

/** Flat floor coverings and window dressings do not block circulation. */
export const DECOR_TYPES: FurnitureType[] = ["rug", "curtains"];

export const ROOM_LIMITS = {
  min: { width: 1.5, depth: 1.5, height: 2.0 },
  max: { width: 20, depth: 20, height: 5 },
} as const;
