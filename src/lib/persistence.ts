import type { Furniture, Layout, Opening, Room, Wall } from "../types";
import { CATALOG, ROOM_LIMITS } from "./catalog";
import { clamp, normalizeDeg } from "./geometry";
import { OPENING_CATALOG, WALLS } from "./openings";

export const STORAGE_KEY = "room-atelier:layout:v1";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parseRoom(raw: unknown): Room | null {
  if (!isObject(raw) || !isNum(raw.width) || !isNum(raw.depth) || !isNum(raw.height)) return null;
  const { min, max } = ROOM_LIMITS;
  return {
    width: clamp(raw.width, min.width, max.width),
    depth: clamp(raw.depth, min.depth, max.depth),
    height: clamp(raw.height, min.height, max.height),
  };
}

function parseFurniture(raw: unknown): Furniture | null {
  if (!isObject(raw)) return null;
  const { id, type, name, position, rotation, dimensions } = raw;
  if (typeof id !== "string" || typeof type !== "string" || !(type in CATALOG)) return null;
  if (!Array.isArray(position) || position.length !== 3 || !position.every(isNum)) return null;
  if (!isNum(rotation) || !isObject(dimensions)) return null;
  const { width, height, depth } = dimensions;
  if (!isNum(width) || !isNum(height) || !isNum(depth)) return null;

  const entry = CATALOG[type as Furniture["type"]];
  return {
    id,
    type: entry.type,
    name: typeof name === "string" && name.trim() ? name : entry.label,
    position: [position[0], position[1], position[2]],
    rotation: normalizeDeg(rotation),
    dimensions: {
      width: clamp(width, entry.min.width, entry.max.width),
      height: clamp(height, entry.min.height, entry.max.height),
      depth: clamp(depth, entry.min.depth, entry.max.depth),
    },
  };
}

function parseOpening(raw: unknown): Opening | null {
  if (!isObject(raw)) return null;
  const { id, type, name, wall, offset, width, height, elevation, hinge } = raw;
  if (typeof id !== "string" || typeof type !== "string" || !(type in OPENING_CATALOG)) return null;
  if (typeof wall !== "string" || !WALLS.includes(wall as Wall)) return null;
  if (!isNum(offset) || !isNum(width) || !isNum(height) || !isNum(elevation)) return null;

  const entry = OPENING_CATALOG[type as Opening["type"]];
  return {
    id,
    type: entry.type,
    name: typeof name === "string" && name.trim() ? name : entry.label,
    wall: wall as Wall,
    offset,
    width: clamp(width, entry.min.width, entry.max.width),
    height: clamp(height, entry.min.height, entry.max.height),
    elevation: entry.type === "door" ? 0 : Math.max(0, elevation),
    hinge: hinge === "end" ? "end" : "start",
  };
}

/**
 * Validate untrusted JSON (localStorage can be edited by hand, or written by an
 * older version of the app). Returns null if the payload is unusable; drops
 * individual furniture entries that are malformed.
 */
export function parseLayout(raw: unknown): Layout | null {
  if (!isObject(raw) || raw.version !== 1) return null;
  const room = parseRoom(raw.room);
  if (!room || !Array.isArray(raw.furniture)) return null;
  const furniture = raw.furniture.map(parseFurniture).filter((f): f is Furniture => f !== null);
  // `openings` arrived after the first release, so it's optional in saved data.
  const openings = Array.isArray(raw.openings)
    ? raw.openings.map(parseOpening).filter((o): o is Opening => o !== null)
    : [];
  const projectName =
    typeof raw.projectName === "string" && raw.projectName.trim() ? raw.projectName : "Untitled room";
  return { version: 1, projectName, room, furniture, openings };
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // e.g. storage disabled by privacy settings
  }
}

export function loadLayout(): Layout | null {
  try {
    const text = storage()?.getItem(STORAGE_KEY);
    return text ? parseLayout(JSON.parse(text)) : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused the write (quota, private mode…). */
export function saveLayout(layout: Layout): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(layout));
    return true;
  } catch {
    return false;
  }
}
