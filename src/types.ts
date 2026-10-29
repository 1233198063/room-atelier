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

export type FurnitureType = "bed" | "desk" | "chair" | "cabinet" | "dresser" | "plant"
  | "bookcase" | "worktable" | "armchair" | "ottoman" | "rug" | "curtains"
  | "sofa" | "table" | "lamp" | "easel" | "screen" | "artwork"
  | "gallery" | "spiralStair" | "stairs"
  | "tree" | "shrub" | "paving"
  | "cornerSofa" | "roundTable" | "tv" | "officeChair"
  | "fridge" | "washer" | "kitchenCounter"
  | "toilet" | "vanity" | "bathtub" | "shower";

export type FurnitureColor = "wood" | "woodDark" | "fabric" | "accent" | "metal" | "pot" | "leaves" | "stone" | "ceramic";
export type FurnitureColors = Partial<Record<FurnitureColor, string>>;

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
  /** Per-piece color overrides. Missing roles follow the room palette or model defaults. */
  colors?: FurnitureColors;
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
export interface LegacyLayout {
  version: 1;
  projectName: string;
  room: Room;
  furniture: Furniture[];
  /** Added after the first release; older saves without it load with no openings. */
  openings: Opening[];
  /** Added later still; older saves load with the default palette. */
  palette: Palette;
}

/** Contents use coordinates local to the room, independent of its placement. */
export interface RoomContents {
  room: Room;
  furniture: Furniture[];
  openings: Opening[];
  palette: Palette;
}

/**
 * - indoor: walls, floorboards, doors and windows
 * - garden: open ground with no walls; lawn cut away above any lower courtyard
 * - courtyard: retaining walls and stone paving, open to the sky
 */
export type RoomKind = "indoor" | "garden" | "courtyard";
export type RoofType = "none" | "hip";

/** Room-level structure. Optional so older saves load as plain indoor rooms at ground level. */
export interface RoomStructure {
  /** Floor level in the overall layout, in meters; negative is underground. */
  elevation?: number;
  kind?: RoomKind;
  roof?: RoofType;
  /** Sides with no wall, where the room flows into the next (open-plan living, dining and kitchen). */
  openWalls?: Wall[];
}

/** A furnished room that can be appended to a project without replacing its rooms. */
export interface RoomTemplate extends Omit<RoomContents, "palette">, RoomStructure {
  name: string;
  /** Without one, the room takes the palette of the room being edited. */
  palette?: Palette;
}

export interface ProjectRoom extends RoomContents, RoomStructure {
  id: string;
  name: string;
  /** World position of the room's local back-left corner, in meters (X, Z). */
  position: [number, number];
  /** Rotation around Y, in degrees. */
  rotation: number;
}

/** Several rooms added together, keeping their relative placement (a house and its garden). */
export interface ProjectTemplate {
  name: string;
  rooms: (RoomTemplate & Pick<ProjectRoom, "position" | "rotation">)[];
}

export type RoomDisplay = "single" | "all";
/** Together view: cut walls away like a dollhouse, or show other rooms closed with their roofs. */
export type WallView = "cutaway" | "exterior";

export interface Layout {
  version: 2;
  projectName: string;
  rooms: ProjectRoom[];
  activeRoomId: string;
  roomDisplay: RoomDisplay;
  /** Added with multi-level projects; older saves use the cutaway view. */
  wallView?: WallView;
}

export type ViewMode = "perspective" | "top";
export type EditorMode = "edit" | "preview";
