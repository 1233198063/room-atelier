import type { Material } from "three";
import { openingSpan, runsAlongX, WALL_T, wallToWorld } from "../lib/openings";
import type { Opening, Room, Wall } from "../types";
import { MATERIALS } from "./materials";

/**
 * A box in wall-local coordinates (see `wallToWorld`):
 *   a — along the wall, y — up from the floor, t — from the interior face into the room.
 * The wall body itself spans t ∈ [−WALL_T, 0].
 */
export interface WallBox {
  a0: number;
  a1: number;
  y0: number;
  y1: number;
  t0: number;
  t1: number;
}

export interface OpeningPart extends WallBox {
  material: Material;
  /** Hide entirely once the wall is cut below this part's top, instead of clipping it (a door leaf). */
  hideWhenCut?: boolean;
}

/** Turn a wall-local box into a world-space center and size for a unit cube mesh. */
export function boxTransform(wall: Wall, b: WallBox, room: Room) {
  const [x, z] = wallToWorld(wall, (b.a0 + b.a1) / 2, (b.t0 + b.t1) / 2, room);
  const along = b.a1 - b.a0;
  const thick = b.t1 - b.t0;
  return {
    position: [x, (b.y0 + b.y1) / 2, z] as [number, number, number],
    scale: (runsAlongX(wall) ? [along, b.y1 - b.y0, thick] : [thick, b.y1 - b.y0, along]) as [
      number,
      number,
      number,
    ],
  };
}

/** The opening's full volume through the wall — used for clicking and the selection outline. */
export function openingBounds(o: Opening): WallBox {
  const [a0, a1] = openingSpan(o);
  return { a0, a1, y0: o.elevation, y1: o.elevation + o.height, t0: -WALL_T, t1: 0.02 };
}

/** Frame, glass, leaf and hardware for one opening, as boxes in wall-local coordinates. */
export function openingParts(o: Opening, materials = MATERIALS): OpeningPart[] {
  const [a0, a1] = openingSpan(o);
  const y0 = o.elevation;
  const y1 = o.elevation + o.height;

  if (o.type === "window") {
    const f = 0.05; // frame member width
    const frame = { t0: -0.07, t1: -0.03, material: materials.oak };
    const parts: OpeningPart[] = [
      { a0, a1: a0 + f, y0, y1, ...frame },
      { a0: a1 - f, a1, y0, y1, ...frame },
      { a0: a0 + f, a1: a1 - f, y0: y1 - f, y1, ...frame },
      { a0: a0 + f, a1: a1 - f, y0, y1: y0 + f, ...frame },
      { a0: a0 + f, a1: a1 - f, y0: y0 + f, y1: y1 - f, t0: -0.053, t1: -0.047, material: materials.glass },
    ];
    if (o.width > 0.9) {
      const mid = (a0 + a1) / 2;
      parts.push({ a0: mid - f / 2, a1: mid + f / 2, y0: y0 + f, y1: y1 - f, ...frame });
    }
    // Interior sill board, sticking a few cm out into the room.
    if (y0 > 0.05) {
      parts.push({ a0: a0 - 0.04, a1: a1 + 0.04, y0: y0 - 0.03, y1: y0, t0: -0.04, t1: 0.05, material: materials.oak });
    }
    return parts;
  }

  // Door: casing lines the opening, the leaf sits closed near the interior face.
  const j = 0.045;
  const casing = { t0: -WALL_T, t1: 0.012, material: materials.trim };
  const handleA = o.hinge === "start" ? a1 - j - 0.08 : a0 + j + 0.08;
  return [
    { a0, a1: a0 + j, y0: 0, y1, ...casing },
    { a0: a1 - j, a1, y0: 0, y1, ...casing },
    { a0: a0 + j, a1: a1 - j, y0: y1 - j, y1, ...casing },
    {
      a0: a0 + j,
      a1: a1 - j,
      y0: 0.008,
      y1: y1 - j,
      t0: -0.05,
      t1: -0.01,
      material: materials.oak,
      hideWhenCut: true,
    },
    {
      a0: handleA - 0.065,
      a1: handleA + 0.065,
      y0: 1.0,
      y1: 1.02,
      t0: -0.01,
      t1: 0.035,
      material: materials.brass,
      hideWhenCut: true,
    },
  ];
}
