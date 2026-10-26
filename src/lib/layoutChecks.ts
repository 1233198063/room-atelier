import type { Furniture, Opening, Palette, Room } from "../types";
import { DECOR_TYPES, MOVABLE_TYPES } from "./catalog";
import { degToRad, footprintCorners, furnitureSurfaceHeight, toCm } from "./geometry";
import { openingSpan, wallToWorld } from "./openings";
import { contrast, glazingRatio, luminance, PALETTE_RULES } from "./palettes";
import { polygonsOverlap, rayToPolygon, rayToRoomEdge, type Pt } from "./polygon";

/**
 * Layout checks: a "linter" for rooms.
 *
 * Plain rules with real numbers — no AI. Each rule looks at the same data the
 * scene renders from and reports problems it can measure: things that don't
 * fit (warnings) and things that would be more comfortable (tips).
 */

export type IssueSeverity = "warning" | "tip";

export interface Issue {
  /** Stable key, e.g. "overlap:a:b". */
  key: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  /** Ids of the furniture/openings involved, the one to move first. */
  targets: string[];
}

/** Rules of thumb, in meters. */
export const RULES = {
  /** In front of a desk, to pull a chair out and sit. */
  seatSpace: 0.7,
  /** In front of drawers or cabinet doors, to open them and stand. */
  openingSpace: 0.6,
  /** Beside a bed, to walk and get in comfortably. */
  bedSide: 0.6,
  /** Less than this beside a bed and that side is unusable. */
  bedSideMin: 0.3,
  /** Desks and plants farther than this from every window miss out on daylight. */
  daylight: 2.5,
  /** How far in front of a window furniture counts as "in front of it". */
  windowZone: 0.35,
} as const;

const fmt = (m: number) => `${Math.max(0, Math.round(toCm(m)))} cm`;
const bottom = (f: Furniture) => f.position[1];
const top = (f: Furniture) => f.position[1] + f.dimensions.height;
const isMovable = (f: Furniture) => MOVABLE_TYPES.includes(f.type);
const standsOnFloor = (f: Furniture) => bottom(f) < 0.3;
const verticallyOverlap = (a: Furniture, b: Furniture) =>
  bottom(a) < top(b) - 0.005 && bottom(b) < top(a) - 0.005;

/** A point in the piece's own frame (x: side to side, z: back to front) → world floor point. */
function localToWorld(f: Furniture, lx: number, lz: number): Pt {
  const r = degToRad(f.rotation);
  return [
    f.position[0] + lx * Math.cos(r) + lz * Math.sin(r),
    f.position[2] - lx * Math.sin(r) + lz * Math.cos(r),
  ];
}

function localDir(f: Furniture, lx: number, lz: number): Pt {
  const r = degToRad(f.rotation);
  return [lx * Math.cos(r) + lz * Math.sin(r), -lx * Math.sin(r) + lz * Math.cos(r)];
}

/**
 * Free space outward from one side of a piece: cast rays from points spread
 * along that side and keep the shortest hit — a wall, or a fixed piece of
 * furniture. `span` picks which stretch of the side to sample (0 = start, 1 = end).
 */
function clearance(
  f: Furniture,
  side: "front" | "left" | "right",
  room: Room,
  obstacles: Furniture[],
  span: [number, number] = [0.15, 0.85],
): { distance: number; blocker: Furniture | null } {
  const { width: w, depth: d } = f.dimensions;
  const fractions = [span[0], (span[0] + span[1]) / 2, span[1]];
  const eps = 0.001;
  const samples = fractions.map((k) => {
    if (side === "front") return { o: localToWorld(f, -w / 2 + k * w, d / 2 + eps), dir: localDir(f, 0, 1) };
    const sx = side === "left" ? -1 : 1;
    return { o: localToWorld(f, sx * (w / 2 + eps), -d / 2 + k * d), dir: localDir(f, sx, 0) };
  });
  const polys = obstacles.map((o) => ({ piece: o, poly: footprintCorners(o) }));

  let distance = Infinity;
  let blocker: Furniture | null = null;
  for (const { o, dir } of samples) {
    let t = rayToRoomEdge(o, dir, room.width, room.depth);
    let hit: Furniture | null = null;
    for (const { piece, poly } of polys) {
      const tp = rayToPolygon(o, dir, poly);
      if (tp < t) {
        t = tp;
        hit = piece;
      }
    }
    if (t < distance) {
      distance = t;
      blocker = hit;
    }
  }
  return { distance, blocker };
}

/** Fixed, floor-standing pieces other than `f` — what actually gets in the way. */
const fixedObstacles = (f: Furniture, all: Furniture[]) =>
  all.filter((o) => o.id !== f.id && !isMovable(o) && standsOnFloor(o));

/** The floor area a door sweeps when it opens: a quarter circle from the hinge. */
function doorSwing(o: Opening, room: Room): Pt[] {
  const [a0, a1] = openingSpan(o);
  const hinge = o.hinge === "start" ? a0 : a1;
  const dir = o.hinge === "start" ? 1 : -1;
  const r = (a1 - a0) * 0.97;
  const pts: Pt[] = [wallToWorld(o.wall, hinge, 0.005, room)];
  for (let i = 0; i <= 8; i++) {
    const θ = (i / 8) * (Math.PI / 2);
    pts.push(wallToWorld(o.wall, hinge + dir * r * Math.cos(θ), 0.005 + r * Math.sin(θ), room));
  }
  return pts;
}

/** The strip of floor just in front of a window. */
function windowZone(o: Opening, room: Room): Pt[] {
  const [a0, a1] = openingSpan(o);
  return [
    wallToWorld(o.wall, a0 + 0.02, 0, room),
    wallToWorld(o.wall, a1 - 0.02, 0, room),
    wallToWorld(o.wall, a1 - 0.02, RULES.windowZone, room),
    wallToWorld(o.wall, a0 + 0.02, RULES.windowZone, room),
  ];
}

export function checkLayout(room: Room, furniture: Furniture[], openings: Opening[]): Issue[] {
  furniture = furniture.filter((f) => !DECOR_TYPES.includes(f.type));
  const issues: Issue[] = [];
  const polys = new Map(furniture.map((f) => [f.id, footprintCorners(f)]));
  const poly = (f: Furniture) => polys.get(f.id)!;

  // ── Overlaps ──────────────────────────────────────────────────────────
  for (let i = 0; i < furniture.length; i++) {
    for (let j = i + 1; j < furniture.length; j++) {
      const a = furniture[i];
      const b = furniture[j];
      const types = new Set([a.type, b.type]);
      if (types.has("chair") && (types.has("desk") || types.has("worktable"))) continue; // chairs tuck under tables
      if (types.has("plant") && types.has("worktable")) {
        const plant = a.type === "plant" ? a : b, table = a.type === "worktable" ? a : b;
        if (bottom(plant) >= furnitureSurfaceHeight(table) - 0.005) continue;
      }
      if (!verticallyOverlap(a, b) || !polygonsOverlap(poly(a), poly(b))) continue;
      issues.push({
        key: `overlap:${a.id}:${b.id}`,
        severity: "warning",
        title: `${a.name} and ${b.name} overlap`,
        detail: "Two pieces can't share the same floor space — move one of them.",
        targets: [b.id, a.id],
      });
    }
  }

  // ── Doors and windows ─────────────────────────────────────────────────
  for (const o of openings) {
    if (o.type === "door") {
      const swing = doorSwing(o, room);
      for (const f of furniture) {
        if (bottom(f) >= o.height || !polygonsOverlap(swing, poly(f))) continue;
        issues.push({
          key: `door-swing:${o.id}:${f.id}`,
          severity: "warning",
          title: `${f.name} blocks ${o.name}`,
          detail: `The door needs a clear ${fmt(o.width)} quarter-circle on the floor to swing open.`,
          targets: [f.id, o.id],
        });
      }
    } else {
      const zone = windowZone(o, room);
      for (const f of furniture) {
        if (f.type === "plant") continue; // a plant by the window is the point
        if (top(f) <= o.elevation + 0.1 || bottom(f) >= o.elevation + o.height) continue;
        if (!polygonsOverlap(zone, poly(f))) continue;
        issues.push({
          key: `window-blocked:${o.id}:${f.id}`,
          severity: "warning",
          title: `${f.name} blocks ${o.name}`,
          detail: `It stands ${fmt(top(f))} tall in front of a window with a ${fmt(o.elevation)} sill.`,
          targets: [f.id, o.id],
        });
      }
    }
  }

  // ── Space to use each piece ───────────────────────────────────────────
  for (const f of furniture) {
    if (!standsOnFloor(f)) continue;
    const obstacles = fixedObstacles(f, furniture);

    if (f.type === "desk") {
      const { distance, blocker } = clearance(f, "front", room, obstacles);
      if (distance < RULES.seatSpace) {
        issues.push({
          key: `seat-space:${f.id}`,
          severity: "warning",
          title: `Tight seat at ${f.name}`,
          detail: `Pulling out a chair needs about ${fmt(RULES.seatSpace)}; there's ${fmt(distance)} before ${blocker ? blocker.name : "the wall"}.`,
          targets: blocker ? [f.id, blocker.id] : [f.id],
        });
      }
    }

    if (f.type === "dresser" || f.type === "cabinet") {
      const { distance, blocker } = clearance(f, "front", room, obstacles, [0.1, 0.9]);
      if (distance < RULES.openingSpace) {
        const fronts = f.type === "cabinet" && f.dimensions.height > 1 ? "doors" : "drawers";
        const facesWall = !blocker && distance < 0.05;
        issues.push({
          key: `opening-space:${f.id}`,
          severity: "warning",
          title: facesWall ? `${f.name} faces the wall` : `${f.name} can't open fully`,
          detail: facesWall
            ? `Its ${fronts} are against the wall — rotate it 180°.`
            : `Its ${fronts} need about ${fmt(RULES.openingSpace)} in front; there's ${fmt(distance)} before ${blocker ? blocker.name : "the wall"}.`,
          targets: blocker ? [f.id, blocker.id] : [f.id],
        });
      }
    }

    if (f.type === "bed") {
      // Measure along the middle of the long sides — nightstands by the headboard are expected.
      const left = clearance(f, "left", room, obstacles, [0.3, 0.9]);
      const right = clearance(f, "right", room, obstacles, [0.3, 0.9]);
      const [tight, roomy] = left.distance <= right.distance ? [left, right] : [right, left];
      const double = f.dimensions.width >= 1.2;
      if (roomy.distance < RULES.bedSideMin) {
        issues.push({
          key: `bed-access:${f.id}`,
          severity: "warning",
          title: `${f.name} is hard to get into`,
          detail: `Both long sides are boxed in (${fmt(left.distance)} and ${fmt(right.distance)} free).`,
          targets: [f.id],
        });
      } else if ((double ? tight.distance : roomy.distance) < RULES.bedSide) {
        const side = double ? tight : roomy;
        issues.push({
          key: `bed-access:${f.id}`,
          severity: "tip",
          title: `Tight side of ${f.name}`,
          detail: double
            ? `One side has ${fmt(side.distance)} free — ${fmt(RULES.bedSide)} or more on both sides makes a double bed easy to share.`
            : `The open side has ${fmt(side.distance)} — ${fmt(RULES.bedSide)} or more is comfortable.`,
          targets: side.blocker ? [f.id, side.blocker.id] : [f.id],
        });
      }
    }
  }

  // ── Daylight ──────────────────────────────────────────────────────────
  const windows = openings.filter((o) => o.type === "window");
  if (windows.length === 0) {
    if (furniture.length > 0) {
      issues.push({
        key: "no-window",
        severity: "tip",
        title: "No windows yet",
        detail: "Add a window from the library — daylight decides where the desk and plants should go.",
        targets: [],
      });
    }
  } else {
    const lights = windows.map((o) => wallToWorld(o.wall, o.offset, 0, room));
    for (const f of furniture) {
      if (f.type !== "desk" && f.type !== "plant") continue;
      const d = Math.min(...lights.map(([x, z]) => Math.hypot(x - f.position[0], z - f.position[2])));
      if (d <= RULES.daylight) continue;
      issues.push({
        key: `daylight:${f.id}`,
        severity: "tip",
        title: f.type === "desk" ? `${f.name} is far from daylight` : `${f.name} is far from a window`,
        detail:
          f.type === "desk"
            ? `The nearest window is ${fmt(d)} away. Desks work best near a window, with light from the side.`
            : `It's ${fmt(d)} from the nearest window. Most houseplants want bright, indirect light within about ${fmt(RULES.daylight)}.`,
        targets: [f.id],
      });
    }
  }

  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warning" ? -1 : 1));
}

/**
 * Color tips: rules about the palette in the context of this room. They're
 * tips, never warnings — taste is allowed to break rules.
 */
export function checkPalette(palette: Palette, room: Room, openings: Opening[]): Issue[] {
  const issues: Issue[] = [];
  const ratio = (a: string, b: string) => contrast(a, b).toFixed(2);

  if (contrast(palette.wall, palette.wood) < 1.2) {
    issues.push({
      key: "palette-blend",
      severity: "tip",
      title: "Furniture blends into the walls",
      detail: `Walls and wood are nearly the same lightness (contrast ${ratio(palette.wall, palette.wood)}:1). A deeper wood or a warmer wall adds depth.`,
      targets: [],
    });
  }

  const small = room.width * room.depth < PALETTE_RULES.smallRoom;
  const dim = glazingRatio(room, openings) < PALETTE_RULES.dimGlazing;
  if (luminance(palette.wall) < 0.4 && (small || dim)) {
    issues.push({
      key: "palette-dark-walls",
      severity: "tip",
      title: `Dark walls in a ${small ? "compact" : "dim"} room`,
      detail: "Dark walls absorb light and pull the room in. Fine for a cozy mood — otherwise try a lighter wall color.",
      targets: [],
    });
  }

  if (contrast(palette.accent, palette.fabric) < 1.25) {
    issues.push({
      key: "palette-accent",
      severity: "tip",
      title: "The accent color doesn't stand out",
      detail: `It's close to the textiles (contrast ${ratio(palette.accent, palette.fabric)}:1). An accent works best clearly lighter or darker than its surroundings.`,
      targets: [],
    });
  }
  return issues;
}
