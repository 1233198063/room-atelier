import { DoubleSide, MeshBasicMaterial, MeshStandardMaterial } from "three";
import type { FurnitureColors, Palette } from "../types";
import { CERAMIC_COLOR, PLANT_COLORS, STONE_COLOR } from "../lib/furnitureColors";

/**
 * Material templates. RoomProvider clones one set per room, so furniture
 * within a room shares materials while each room keeps its own palette.
 */
export const MATERIALS = {
  oak: new MeshStandardMaterial({ color: "#d9b88f", roughness: 0.62 }),
  oakDark: new MeshStandardMaterial({ color: "#a98257", roughness: 0.7 }),
  linen: new MeshStandardMaterial({ color: "#f3eee5", roughness: 0.95 }),
  duvet: new MeshStandardMaterial({ color: "#ebe3d6", roughness: 1 }),
  throw: new MeshStandardMaterial({ color: "#b88b72", roughness: 1 }),
  cushion: new MeshStandardMaterial({ color: "#d9cbb6", roughness: 0.95 }),
  brass: new MeshStandardMaterial({ color: "#b8955c", roughness: 0.35, metalness: 0.75 }),
  wall: new MeshStandardMaterial({ color: "#f4efe7", roughness: 0.95 }),
  /** In plan view walls are drawn solid and dark, like the poché of an architectural drawing. */
  wallPlan: new MeshStandardMaterial({ color: "#6e6255", roughness: 1 }),
  // Plants: faceted (flat-shaded) leaves read as deliberate low-poly, not cheap spheres.
  leaf: new MeshStandardMaterial({ color: PLANT_COLORS.leaves, roughness: 0.85, flatShading: true }),
  leafDark: new MeshStandardMaterial({ color: "#5f7d51", roughness: 0.85, flatShading: true }),
  terracotta: new MeshStandardMaterial({ color: PLANT_COLORS.pot, roughness: 0.9 }),
  soil: new MeshStandardMaterial({ color: "#5b4636", roughness: 1 }),
  stone: new MeshStandardMaterial({ color: STONE_COLOR, roughness: 0.85 }),
  /** Same stone with a slab pattern; the Paving model attaches the texture on first use. */
  paving: new MeshStandardMaterial({ color: STONE_COLOR, roughness: 0.9 }),
  /** Glazed porcelain and white enamel: toilets, basins, tubs, appliance bodies. */
  ceramic: new MeshStandardMaterial({ color: CERAMIC_COLOR, roughness: 0.28 }),
  /** The inside of a basin or tub: the same glaze a little in shadow. */
  ceramicShade: new MeshStandardMaterial({ color: "#d6d3cc", roughness: 0.3 }),
  /** Brushed stainless steel: sinks, taps, shower posts. Fixed, like real fittings. */
  steel: new MeshStandardMaterial({ color: "#c9ccce", roughness: 0.3, metalness: 0.85 }),
  /** A switched-off screen and a ceramic hob: dark glass with a soft reflection. */
  blackGlass: new MeshStandardMaterial({ color: "#16181b", roughness: 0.12, metalness: 0.4 }),
  /** Wrought iron: balusters and screen casings. */
  iron: new MeshStandardMaterial({ color: "#2f2a26", roughness: 0.55, metalness: 0.4 }),
  /** Lamp shades glow from inside; the shade color tints the glow. */
  shade: new MeshStandardMaterial({ color: "#f6ead5", roughness: 0.9, emissive: "#ffd9a0", emissiveIntensity: 0.55, side: DoubleSide }),
  /** Painted door casing — a warm white a shade off the walls. */
  trim: new MeshStandardMaterial({ color: "#efe8dc", roughness: 0.6 }),
  glass: new MeshStandardMaterial({
    color: "#d6e6ef",
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
};

export function cloneMaterials(): typeof MATERIALS {
  return Object.fromEntries(Object.entries(MATERIALS).map(([key, material]) => [key, material.clone()])) as typeof MATERIALS;
}

/**
 * Push a palette into a room's materials. Because its meshes reference
 * these same material objects, one `color.set()` recolors that room —
 * no React re-render, no new geometry.
 */
export function applyPalette(p: Palette, materials = MATERIALS) {
  materials.wall.color.set(p.wall);
  materials.oak.color.set(p.wood);
  materials.oakDark.color.set(p.woodDark);
  materials.linen.color.set(p.fabric);
  materials.duvet.color.set(p.fabric).multiplyScalar(0.96);
  materials.cushion.color.set(p.fabric).lerp(materials.oak.color, 0.35);
  materials.throw.color.set(p.accent);
  materials.brass.color.set(p.metal);
  materials.shade.color.set(p.fabric).lerp(MATERIALS.shade.color, 0.6);
}

/** Reapply inherited colors first, so clearing an override never leaves an old tint behind. */
export function applyFurnitureColors(palette: Palette, colors: FurnitureColors, materials: typeof MATERIALS) {
  applyPalette({ ...palette, ...colors }, materials);
  // A chosen cushion color is exact; the default keeps the room's original fabric/wood mix.
  if (colors.fabric) materials.cushion.color.set(colors.fabric);
  materials.terracotta.color.set(colors.pot ?? PLANT_COLORS.pot);
  materials.stone.color.set(colors.stone ?? STONE_COLOR);
  materials.ceramic.color.set(colors.ceramic ?? CERAMIC_COLOR);
  if (colors.ceramic) materials.ceramicShade.color.copy(materials.ceramic.color).multiplyScalar(0.86);
  else materials.ceramicShade.color.copy(MATERIALS.ceramicShade.color);
  materials.paving.color.copy(materials.stone.color);
  if (colors.fabric) materials.shade.color.set(colors.fabric);
  materials.leaf.color.set(colors.leaves ?? PLANT_COLORS.leaves);
  if (colors.leaves) materials.leafDark.color.set(colors.leaves).multiplyScalar(0.72);
  else materials.leafDark.color.copy(MATERIALS.leafDark.color);
}

/** Invisible but still hit by raycasts — used as an easy-to-click target for openings. */
export const HIT_MATERIAL = new MeshBasicMaterial({ visible: false });

/** UI accent used for selection and dimension lines — a cool "drafting ink" blue that reads against warm wood. */
export const ACCENT = "#2f62c9";
export const ACCENT_SOFT = "#7d9be0";
export const INK_MUTED = "#8a7e70";
/** Layout-check warnings: a warm amber, so problems stand out without looking like an error dialog. */
export const WARN = "#d48a1c";
