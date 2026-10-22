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
};

export const FURNITURE_TYPES = Object.keys(CATALOG) as FurnitureType[];

export const ROOM_LIMITS = {
  min: { width: 1.5, depth: 1.5, height: 2.0 },
  max: { width: 20, depth: 20, height: 5 },
} as const;
