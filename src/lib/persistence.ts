import type { Building, Furniture, Layout, Opening, Palette, ProjectRoom, Room, RoomContents, RoomStructure, Wall } from "../types";
import { CATALOG, ROOM_LIMITS } from "./catalog";
import { clamp, normalizeDeg } from "./geometry";
import { OPENING_CATALOG, WALLS } from "./openings";
import { DEFAULT_PALETTE, isHexColor, PALETTE_COLORS } from "./palettes";
import { sanitizeFurnitureColors } from "./furnitureColors";
import { furnitureLabel, openingLabel } from "../i18n/names";

export const STORAGE_KEY = "room-atelier:layout:v2";
export const LEGACY_STORAGE_KEY = "room-atelier:layout:v1";

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
  if (typeof id !== "string" || !id || typeof type !== "string" || !Object.hasOwn(CATALOG, type)) return null;
  if (!Array.isArray(position) || position.length !== 3 || !position.every(isNum)) return null;
  if (!isNum(rotation) || !isObject(dimensions)) return null;
  const { width, height, depth } = dimensions;
  if (!isNum(width) || !isNum(height) || !isNum(depth)) return null;

  const entry = CATALOG[type as Furniture["type"]];
  const colors = sanitizeFurnitureColors(raw.colors);
  return {
    id,
    type: entry.type,
    ...(colors ? { colors } : {}),
    name: typeof name === "string" && name.trim() ? name : furnitureLabel(entry.type, "en"),
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
  const { id, type, name, wall, offset, width, height, elevation, hinge, opensAway } = raw;
  if (typeof id !== "string" || !id || typeof type !== "string" || !Object.hasOwn(OPENING_CATALOG, type)) return null;
  if (typeof wall !== "string" || !WALLS.includes(wall as Wall)) return null;
  if (!isNum(offset) || !isNum(width) || !isNum(height) || !isNum(elevation)) return null;

  const entry = OPENING_CATALOG[type as Opening["type"]];
  return {
    id,
    type: entry.type,
    name: typeof name === "string" && name.trim() ? name : openingLabel(entry.type, "en"),
    wall: wall as Wall,
    offset,
    width: clamp(width, entry.min.width, entry.max.width),
    height: clamp(height, entry.min.height, entry.max.height),
    elevation: entry.type === "door" ? 0 : Math.max(0, elevation),
    hinge: hinge === "end" ? "end" : "start",
    ...(entry.type === "door" && opensAway === true ? { opensAway: true } : {}),
  };
}

/** Keep every valid "#rrggbb" color; fall back to the default for anything missing or malformed. */
function parsePalette(raw: unknown): Palette {
  if (!isObject(raw)) return DEFAULT_PALETTE;
  const palette: Palette = { ...DEFAULT_PALETTE, id: typeof raw.id === "string" ? raw.id : "custom" };
  for (const key of PALETTE_COLORS) {
    const value = raw[key];
    if (isHexColor(value)) palette[key] = value.toLowerCase();
  }
  return palette;
}

/**
 * Validate untrusted JSON (localStorage can be edited by hand, or written by an
 * older version of the app). Returns null if the payload is unusable; drops
 * individual furniture entries that are malformed.
 */
function parseContents(raw: Record<string, unknown>): RoomContents | null {
  const room = parseRoom(raw.room);
  if (!room || !Array.isArray(raw.furniture)) return null;
  const furniture = raw.furniture.map(parseFurniture).filter((f): f is Furniture => f !== null);
  // `openings` arrived after the first release, so it's optional in saved data.
  const openings = Array.isArray(raw.openings)
    ? raw.openings.map(parseOpening).filter((o): o is Opening => o !== null)
    : [];
  return { room, furniture, openings, palette: parsePalette(raw.palette) };
}

export const ELEVATION_LIMIT = 20;
const ROOM_KINDS = ["indoor", "garden", "courtyard"] as const;
const ROOF_TYPES = ["none", "hip"] as const;

/** Only non-default values are kept, so plain rooms save exactly as before. */
/** Valid, distinct sides in wall order; undefined when none are open. */
export function normalizeOpenWalls(raw: unknown): Wall[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const open = WALLS.filter((w) => raw.includes(w));
  return open.length ? open : undefined;
}

export function parseStructure(raw: Record<string, unknown>): RoomStructure {
  const structure: RoomStructure = {};
  if (isNum(raw.elevation) && raw.elevation !== 0) structure.elevation = clamp(raw.elevation, -ELEVATION_LIMIT, ELEVATION_LIMIT);
  if (ROOM_KINDS.includes(raw.kind as never) && raw.kind !== "indoor") structure.kind = raw.kind as RoomStructure["kind"];
  if (ROOF_TYPES.includes(raw.roof as never) && raw.roof !== "none") structure.roof = raw.roof as RoomStructure["roof"];
  const openWalls = normalizeOpenWalls(raw.openWalls);
  if (openWalls) structure.openWalls = openWalls;
  return structure;
}

export function parseLayout(raw: unknown): Layout | null {
  if (!isObject(raw) || (raw.version !== 1 && raw.version !== 2)) return null;
  const projectName = typeof raw.projectName === "string" && raw.projectName.trim() ? raw.projectName : "Untitled room";
  let rooms: ProjectRoom[];
  if (raw.version === 1) {
    const contents = parseContents(raw);
    if (!contents) return null;
    rooms = [{ ...contents, id: "room-original", name: projectName, position: [0, 0], rotation: 0 }];
  } else {
    if (!Array.isArray(raw.rooms)) return null;
    const ids = new Set<string>();
    rooms = raw.rooms.flatMap((r): ProjectRoom[] => {
      if (!isObject(r) || typeof r.id !== "string" || !r.id || ids.has(r.id)) return [];
      const contents = parseContents(r);
      if (!contents) return [];
      ids.add(r.id);
      const position: [number, number] = Array.isArray(r.position) && r.position.length === 2 && r.position.every(isNum)
        ? [clamp(r.position[0], -1000, 1000), clamp(r.position[1], -1000, 1000)] : [0, 0];
      return [{ ...contents, ...parseStructure(r), id: r.id, name: typeof r.name === "string" && r.name.trim() ? r.name : "Room",
        position, rotation: isNum(r.rotation) ? normalizeDeg(r.rotation) : 0,
        ...(typeof r.buildingId === "string" ? { buildingId: r.buildingId } : {}) }];
    });
  }
  if (!rooms.length) return null;
  // Object IDs must be unique across rooms as well as furniture and openings.
  const seen = new Set<string>();
  rooms = rooms.map((r) => {
    const unique = <T extends { id: string }>(items: T[]) => items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return { ...r, furniture: unique(r.furniture), openings: unique(r.openings) };
  });
  const activeRoomId = typeof raw.activeRoomId === "string" && rooms.some((r) => r.id === raw.activeRoomId)
    ? raw.activeRoomId : rooms[0].id;
  const grouped = parseBuildings(raw.buildings, rooms);
  return { version: 2, projectName, rooms: grouped.rooms, activeRoomId, roomDisplay: raw.roomDisplay === "all" || raw.roomDisplay === "building" ? raw.roomDisplay : "single",
    ...(raw.wallView === "exterior" ? { wallView: "exterior" as const } : {}),
    ...(grouped.buildings.length ? { buildings: grouped.buildings } : {}) };
}

/**
 * Keep buildings with a usable id and name; rooms keep their building only
 * when it exists, and buildings no room points to are dropped.
 */
function parseBuildings(raw: unknown, rooms: ProjectRoom[]): { rooms: ProjectRoom[]; buildings: Building[] } {
  const listed = new Map<string, Building>();
  if (Array.isArray(raw)) {
    for (const b of raw) {
      if (!isObject(b) || typeof b.id !== "string" || !b.id || listed.has(b.id)) continue;
      listed.set(b.id, { id: b.id, name: typeof b.name === "string" && b.name.trim() ? b.name : "Building" });
    }
  }
  const checked = rooms.map((r): ProjectRoom => {
    const { buildingId, ...rest } = r as ProjectRoom & { buildingId?: unknown };
    return typeof buildingId === "string" && listed.has(buildingId) ? { ...rest, buildingId } : rest;
  });
  const used = new Set(checked.map((r) => r.buildingId));
  return { rooms: checked, buildings: [...listed.values()].filter((b) => used.has(b.id)) };
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
    const s = storage();
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      const text = s?.getItem(key);
      if (!text) continue;
      try {
        const parsed = parseLayout(JSON.parse(text));
        if (parsed) return parsed;
      } catch { /* Try the preserved legacy save if the new one is unusable. */ }
    }
    return null;
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
