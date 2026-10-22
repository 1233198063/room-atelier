/**
 * Core data model.
 *
 * Units: all lengths are in METERS (1 Three.js unit = 1 m). The UI shows
 * centimeters, converting at the edge (see lib/geometry.ts).
 *
 * Coordinate system (right-handed, Y up — the Three.js default):
 *
 *        back wall (z = 0)
 *     ┌──────────────────────┐
 *     │(0,0)          (W,0)  │      x → right
 *     │                      │      z → toward the viewer ("front")
 *     │(0,D)          (W,D)  │      y → up
 *     └──────────────────────┘
 *        front wall (z = D)
 *
 * The room's back-left floor corner sits at the origin, so a furniture
 * position reads like a tape-measure: "120 cm from the left wall".
 */

export type FurnitureType = "bed" | "desk" | "chair" | "cabinet" | "dresser" | "plant";

export type Vec3 = [number, number, number];

export interface Dimensions {
  /** Size along the furniture's local X axis (side to side). */
  width: number;
  /** Size along Y (floor to top). */
  height: number;
  /** Size along the furniture's local Z axis (back to front). */
  depth: number;
}

export interface Furniture {
  id: string;
  type: FurnitureType;
  name: string;
  /** x/z = center of the footprint on the floor, y = elevation of the bottom. */
  position: Vec3;
  /** Rotation around the vertical (Y) axis, in degrees, normalized to [0, 360). */
  rotation: number;
  dimensions: Dimensions;
}

export interface Room {
  width: number; // along X
  depth: number; // along Z
  height: number; // along Y
}

export type Wall = "left" | "right" | "back" | "front";

export type OpeningType = "door" | "window";

/**
 * A door or window cut into one of the walls.
 *
 * `offset` is the center of the opening measured along its wall, in the same
 * coordinates as furniture: an X value on the back/front walls, a Z value on
 * the left/right walls.
 */
export interface Opening {
  id: string;
  type: OpeningType;
  name: string;
  wall: Wall;
  offset: number;
  width: number;
  height: number;
  /** Height of the bottom edge above the floor (the sill). Always 0 for doors. */
  elevation: number;
  /** Doors only: which jamb the hinges are on — the low-coordinate end of the wall or the high one. */
  hinge: "start" | "end";
}

/**
 * The room's color scheme. Every value is a "#rrggbb" hex color; each one
 * drives a family of materials in the scene (all wood frames, all handles…).
 */
export interface Palette {
  /** Preset this palette came from, or "custom" once any color is edited. */
  id: string;
  wall: string;
  floor: string;
  /** Main furniture wood: tops, fronts, frames. */
  wood: string;
  /** Carcasses, legs and plinths. */
  woodDark: string;
  /** Bedding and cushions. */
  fabric: string;
  /** The 10% color: throws, small soft accents. */
  accent: string;
  /** Handles and hardware. */
  metal: string;
}

export type PaletteColor = Exclude<keyof Palette, "id">;

/** What we persist to localStorage. Versioned so the format can evolve. */
export interface Layout {
  version: 1;
  projectName: string;
  room: Room;
  furniture: Furniture[];
  /** Added after the first release; older saves without it load with no openings. */
  openings: Opening[];
  /** Added later still; older saves load with the default palette. */
  palette: Palette;
}

export type ViewMode = "perspective" | "top";
export type EditorMode = "edit" | "preview";
