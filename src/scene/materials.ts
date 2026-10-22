import { MeshBasicMaterial, MeshStandardMaterial } from "three";

/**
 * Materials are shared module-level instances: every chair leg in the scene
 * uses the same `oak` material, so the GPU compiles one shader instead of
 * one per mesh.
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

/** Invisible but still hit by raycasts — used as an easy-to-click target for openings. */
export const HIT_MATERIAL = new MeshBasicMaterial({ visible: false });

/** UI accent used for selection and dimension lines — a cool "drafting ink" blue that reads against warm wood. */
export const ACCENT = "#2f62c9";
export const ACCENT_SOFT = "#7d9be0";
export const INK_MUTED = "#8a7e70";
