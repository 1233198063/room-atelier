import { create } from "zustand";
import { getLang, getLengthUnit, nameKey, t, type Lang } from "../i18n";
import type { LengthUnit } from "../lib/units";
import { CATALOG, ROOM_LIMITS } from "../lib/catalog";
import { sanitizeFurnitureColors } from "../lib/furnitureColors";
import { plantPositionOnSurface } from "../lib/plantPlacement";
import {
  alignedPosition,
  clamp,
  clampElevation,
  clampToRoom,
  findFreeSpot,
  footprintHalfExtents,
  normalizeDeg,
  roundMm,
} from "../lib/geometry";
import { checkLayout, checkPalette, type Issue } from "../lib/layoutChecks";
import { constrainOpening, findOpeningSpot, OPENING_CATALOG } from "../lib/openings";
import { PALETTE_PRESETS } from "../lib/palettes";
import { hiddenWhileEditing, isOutdoor, joinPlacement, moveRigidly, projectBounds, roomBounds, roomElevation, roomKind, rotateRoomsTogether,
  type JoinAlign } from "../lib/rooms";
import { WALL_T } from "../lib/openings";
import { ELEVATION_LIMIT, loadLayout, normalizeOpenWalls, parseLayout } from "../lib/persistence";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import type {
  Building,
  Dimensions,
  EditorMode,
  Furniture,
  FurnitureColors,
  FurnitureType,
  Layout,
  Opening,
  OpeningType,
  Palette,
  PaletteColor,
  Room,
  RoomContents,
  RoomTemplate,
  ProjectRoom,
  ProjectTemplate,
  RoomDisplay,
  RoomKind,
  RoofType,
  ViewMode,
  Wall,
  WallView,
} from "../types";

/**
 * The editor store is the ONLY place room, furniture and opening data live.
 *
 * The 3D scene and the properties panel both read from here and write back
 * through actions — neither keeps its own copy. Dragging a chair in the
 * canvas and typing a coordinate in the panel are the same operation:
 * `updateFurniture(id, { position })`. The scene simply re-renders.
 */

export interface Snapshot {
  rooms: ProjectRoom[];
  buildings: Building[];
  activeRoomId: string;
}
export type RoomPatch = Partial<Pick<ProjectRoom, "name" | "position" | "rotation" | "elevation" | "kind" | "roof" | "openWalls">>;

export type FurniturePatch = Partial<Pick<Furniture, "name" | "position" | "rotation" | "colors">> & {
  dimensions?: Partial<Dimensions>;
};

export type OpeningPatch = Partial<Omit<Opening, "id" | "type">>;

export type JoinConnection = "wall" | "door" | "open";

/** One wall of a room against one wall of another (see joinPlacement). */
export interface JoinSpec {
  roomId: string;
  wall: Wall;
  targetId: string;
  targetWall: Wall;
  align: JoinAlign;
  /** Along the target wall, from the chosen alignment, in meters. */
  offset: number;
  /** Walls back to back; a door cut through both; or no wall between them (the walls must line up end to end). */
  connection: JoinConnection;
  doorWidth?: number;
  /** Rooms that move with `roomId`, keeping their places relative to it (they include it). */
  together?: string[];
}

/** A door needs this much of the shared wall beyond its width, half at each side. */
export const JOIN_DOOR_MARGIN = 0.1;

export interface FurniturePreset {
  name?: string;
  dimensions?: Dimensions;
  elevation?: number;
  colors?: FurnitureColors;
}

export interface UpdateOptions {
  /** Record an undo step (default true). Gestures pass false and record once at the end. */
  history?: boolean;
  /** Consecutive updates with the same key within 1 s merge into one undo step (e.g. arrow-key nudges). */
  coalesceKey?: string;
}

export type SaveStatus = "saved" | "unsaved" | "error";

export interface EditorState {
  projectName: string;
  rooms: ProjectRoom[];
  /** Named groups of rooms; a room belongs to at most one (ProjectRoom.buildingId). Never empty ones. */
  buildings: Building[];
  /** Rooms ticked in the sidebar for batch actions, in list order. Not saved and not undone. */
  checkedRoomIds: string[];
  activeRoomId: string;
  roomDisplay: RoomDisplay;
  wallView: WallView;
  /** Id of the selected furniture piece or opening (ids are unique across both). */
  selectedId: string | null;
  /** Transient hover feedback while a plant is being placed; never saved or added to history. */
  plantDropTargetId: string | null;

  mode: EditorMode;
  view: ViewMode;
  /** Grid snapping step in meters; 0 disables snapping. */
  snapStep: number;
  autoRotate: boolean;
  /** Incremented to ask the camera rig to frame the room again. */
  cameraResetToken: number;

  past: Snapshot[];
  future: Snapshot[];

  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  setProjectName: (name: string) => void;
  addRoom: (template?: RoomTemplate) => string;
  /** Add a group of rooms beside the existing ones, keeping their relative placement; selects the first. */
  /** Add a group of rooms, keeping their relative placement; with `replace`, they take the place of all current rooms. */
  addProject: (template: ProjectTemplate, opts?: { replace?: boolean }) => void;
  selectRoom: (id: string) => void;
  updateRoom: (id: string, patch: RoomPatch, opts?: UpdateOptions) => void;
  removeRoom: (id: string) => void;
  /** Delete several rooms in one undo step; at least one room always stays. */
  removeRooms: (ids: string[]) => void;
  setCheckedRooms: (ids: string[]) => void;
  /**
   * Put rooms in one building: the first building any of them is already in
   * (so others join it, and other buildings merge into it), or a new one.
   * Returns the building's id.
   */
  groupRooms: (ids: string[]) => string | null;
  /** Take rooms out of their buildings; the rooms stay where they are. */
  ungroupRooms: (ids: string[]) => void;
  renameBuilding: (id: string, name: string) => void;
  /** Move rooms by the same offset, so they keep their places relative to each other. */
  moveRooms: (ids: string[], delta: [number, number], opts?: UpdateOptions) => void;
  /** Turn rooms together about the center of their combined footprint (one room turns in place). */
  rotateRooms: (ids: string[], degrees: number) => void;
  setRoomDisplay: (display: RoomDisplay) => void;
  /** Show one building on its own, editing one of its rooms. */
  showBuilding: (id: string) => void;
  setWallView: (view: WallView) => void;
  /** Join one room's wall to another's, connecting them as asked, in one undo step. False when it can't be done. */
  joinRooms: (spec: JoinSpec) => boolean;
  /** Place a room against a side of another; `together` moves those rooms with it (they include `id`). */
  attachRoom: (id: string, targetId: string, side: Wall, together?: string[]) => void;
  setRoom: (patch: Partial<Room>, opts?: UpdateOptions) => void;
  /** Add a piece at a free spot; `preset` overrides the catalog's default name, size and elevation. */
  addFurniture: (type: FurnitureType, preset?: FurniturePreset) => string;
  updateFurniture: (id: string, patch: FurniturePatch, opts?: UpdateOptions) => void;
  setFurnitureColors: (id: string, colors: FurnitureColors, opts?: UpdateOptions) => void;
  resetFurnitureColors: (id: string) => void;
  placePlantOnSurface: (id: string, surfaceId: string | null) => boolean;
  setPlantDropTarget: (id: string | null) => void;
  alignFurniture: (id: string, target: Wall | "centerX" | "centerZ") => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => void;
  clearFurniture: () => void;
  addOpening: (type: OpeningType) => string;
  updateOpening: (id: string, patch: OpeningPatch, opts?: UpdateOptions) => void;
  removeOpening: (id: string) => void;
  duplicateOpening: (id: string) => void;
  /** Delete / duplicate whatever is selected, furniture or opening. */
  removeSelection: () => void;
  duplicateSelection: () => void;
  /** Switch to one of PALETTE_PRESETS. */
  applyPalette: (presetId: string) => void;
  /** Change individual colors; the palette becomes "custom". */
  setPaletteColors: (patch: Partial<Record<PaletteColor, string>>, opts?: UpdateOptions) => void;
  loadSample: () => void;
  /** Replace the document with one saved by another tab, keeping this tab's room and selection when they still exist. */
  adoptLayout: (layout: Layout) => void;
  select: (id: string | null) => void;

  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;

  setMode: (mode: EditorMode) => void;
  setView: (view: ViewMode) => void;
  setSnapStep: (step: number) => void;
  setAutoRotate: (on: boolean) => void;
  resetCamera: () => void;

  markSaved: (at: number) => void;
  markSaveError: () => void;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1000;

// ── Helpers ──────────────────────────────────────────────────────────────

function makeId(): string {
  // crypto.randomUUID is unavailable on plain-http origins (e.g. a LAN IP), so keep a fallback.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Names compare across languages, so a new "椅子" next to "Chair" becomes "椅子 2". */
function uniqueName(base: string, existing: { name: string }[]): string {
  const names = new Set(existing.map((f) => nameKey(f.name)));
  if (!names.has(nameKey(base))) return base;
  let n = 2;
  while (names.has(nameKey(`${base} ${n}`))) n++;
  return `${base} ${n}`;
}

/** Enforce the invariants every piece of furniture must satisfy. */
export function constrainFurniture(f: Furniture, room: Room): Furniture {
  const { min, max } = CATALOG[f.type];
  const dimensions: Dimensions = {
    width: roundMm(clamp(f.dimensions.width, min.width, max.width)),
    height: roundMm(clamp(f.dimensions.height, min.height, max.height)),
    depth: roundMm(clamp(f.dimensions.depth, min.depth, max.depth)),
  };
  const rotation = normalizeDeg(f.rotation);
  const [x, z] = clampToRoom(f.position[0], f.position[2], dimensions, rotation, room);
  const y = clampElevation(f.position[1], dimensions, room);
  const { colors: rawColors, ...rest } = f;
  const colors = sanitizeFurnitureColors(rawColors);
  return { ...rest, ...(colors ? { colors } : {}), dimensions, rotation, position: [roundMm(x), roundMm(y), roundMm(z)] };
}

function constrainRoom(room: Room): Room {
  const { min, max } = ROOM_LIMITS;
  return {
    width: roundMm(clamp(room.width, min.width, max.width)),
    depth: roundMm(clamp(room.depth, min.depth, max.depth)),
    height: roundMm(clamp(room.height, min.height, max.height)),
  };
}

const ROOM_KINDS: RoomKind[] = ["indoor", "garden", "courtyard"];
const ROOF_TYPES: RoofType[] = ["none", "hip"];

/** A new room with fresh ids, built from a template (or empty). The caller places it. */
function roomFromTemplate(template: RoomTemplate | undefined, existing: ProjectRoom[], palette: Palette): ProjectRoom {
  const room = constrainRoom(template?.room ?? { width: 4, depth: 3, height: 2.6 });
  const elevation = template?.elevation ? roundMm(clamp(template.elevation, -ELEVATION_LIMIT, ELEVATION_LIMIT)) : 0;
  return {
    id: makeId(), name: uniqueName(template?.name ?? t().defaults.room, existing),
    position: [0, 0], rotation: 0,
    ...(elevation ? { elevation } : {}),
    ...(template?.kind && template.kind !== "indoor" ? { kind: template.kind } : {}),
    ...(template?.roof && template.roof !== "none" ? { roof: template.roof } : {}),
    ...(normalizeOpenWalls(template?.openWalls) ? { openWalls: normalizeOpenWalls(template?.openWalls) } : {}),
    room,
    furniture: (template?.furniture ?? []).map((f) => constrainFurniture({ ...f, id: makeId() }, room)),
    openings: (template?.openings ?? []).map((o) => constrainOpening({ ...o, id: makeId() }, room)),
    palette: { ...(template?.palette ?? palette) },
  };
}

export const selectActiveRoom = (s: Pick<EditorState, "rooms" | "activeRoomId">): ProjectRoom =>
  s.rooms.find((r) => r.id === s.activeRoomId) ?? s.rooms[0];

/** Buildings some room still belongs to; empty ones go. */
function pruneBuildings(rooms: ProjectRoom[], buildings: Building[]): Building[] {
  const used = new Set(rooms.map((r) => r.buildingId));
  const kept = buildings.filter((b) => used.has(b.id));
  return kept.length === buildings.length ? buildings : kept;
}

/** Identity of what the view shows; when it changes, the camera reframes. */
const shownKey = (s: Parameters<typeof selectShownRooms>[0]) => selectShownRooms(s).map((r) => r.id).join();

/** Ticked ids that still name a room, in list order. */
function pruneChecked(rooms: ProjectRoom[], ids: string[]): string[] {
  const kept = rooms.filter((r) => ids.includes(r.id)).map((r) => r.id);
  return kept.length === ids.length && kept.every((id, i) => id === ids[i]) ? ids : kept;
}

function constrainLayout(layout: Layout): Layout {
  return { ...layout, rooms: layout.rooms.map((r) => {
    const room = constrainRoom(r.room);
    return { ...r, room, furniture: r.furniture.map((f) => constrainFurniture(f, room)),
      openings: r.openings.map((o) => constrainOpening(o, room)) };
  }) };
}

function initialLayout(): Layout {
  return constrainLayout(loadLayout() ?? parseLayout(SAMPLE_LAYOUT)!);
}

// History bookkeeping that doesn't need to trigger renders lives outside the store.
let gestureStart: Snapshot | null = null;
let lastCoalesce: { key: string; at: number } | null = null;

// ── Store ────────────────────────────────────────────────────────────────

const initial = initialLayout();

export const useEditor = create<EditorState>()((setState, get) => {
  const active = () => selectActiveRoom(get());
  // Content edits and history are committed atomically to the active room.
  const set = (patch: Partial<EditorState> & Partial<RoomContents>) => {
    const { room, furniture, openings, palette, ...editorPatch } = patch;
    if (room !== undefined || furniture !== undefined || openings !== undefined || palette !== undefined) {
      editorPatch.rooms = get().rooms.map((r) => r.id === get().activeRoomId ? {
        ...r, room: room ?? r.room, furniture: furniture ?? r.furniture,
        openings: openings ?? r.openings, palette: palette ?? r.palette,
      } : r);
    }
    setState(editorPatch);
  };
  const snapshot = (): Snapshot => ({ rooms: get().rooms, buildings: get().buildings, activeRoomId: get().activeRoomId });

  /** Push the current document onto the undo stack (call BEFORE mutating). */
  const record = (coalesceKey?: string): Partial<Pick<EditorState, "past" | "future">> => {
    const now = Date.now();
    if (coalesceKey && lastCoalesce?.key === coalesceKey && now - lastCoalesce.at < COALESCE_MS) {
      lastCoalesce.at = now;
      return {};
    }
    lastCoalesce = coalesceKey ? { key: coalesceKey, at: now } : null;
    return { past: [...get().past, snapshot()].slice(-HISTORY_LIMIT), future: [] };
  };

  const restore = (s: Snapshot) => {
    const restored = selectActiveRoom(s);
    const stillExists = [...restored.furniture, ...restored.openings].some((item) => item.id === get().selectedId);
    return { ...s, selectedId: stillExists ? get().selectedId : null, checkedRoomIds: pruneChecked(s.rooms, get().checkedRoomIds),
      cameraResetToken: get().cameraResetToken + 1 };
  };

  return {
    projectName: initial.projectName,
    rooms: initial.rooms,
    buildings: initial.buildings ?? [],
    checkedRoomIds: [],
    activeRoomId: initial.activeRoomId,
    roomDisplay: initial.roomDisplay,
    wallView: initial.wallView ?? "cutaway",
    selectedId: null,
    plantDropTargetId: null,

    mode: "edit",
    view: "perspective",
    snapStep: 0.05,
    autoRotate: false,
    cameraResetToken: 0,

    past: [],
    future: [],

    saveStatus: "saved",
    lastSavedAt: null,

    setProjectName: (name) => set({ projectName: name.trim() || t().defaults.project }),

    addRoom: (template) => {
      const bounds = projectBounds(get().rooms);
      const next = roomFromTemplate(template, get().rooms, active().palette);
      next.position = [roundMm(bounds.maxX + WALL_T), roundMm(bounds.minZ + WALL_T)];
      set({ ...record(), rooms: [...get().rooms, next], activeRoomId: next.id, selectedId: null,
        cameraResetToken: get().cameraResetToken + 1 });
      return next.id;
    },

    addProject: (template, opts = {}) => {
      if (!template.rooms.length) return;
      const palette = active().palette;
      const group = projectBounds(template.rooms.map((r, i) => ({ ...r, id: String(i), palette: r.palette ?? palette })));
      const kept = opts.replace ? [] : get().rooms;
      const keptBuildings = opts.replace ? [] : get().buildings;
      const building: Building = { id: makeId(), name: uniqueName(template.name.trim() || t().defaults.building, keptBuildings) };
      // Leave a 2 m gap to the right of what's already there, aligned with its back edge.
      const existing = projectBounds(kept);
      const [dx, dz] = kept.length ? [existing.maxX + 2 - group.minX, existing.minZ - group.minZ] : [-group.minX, -group.minZ];
      const rooms = [...kept];
      for (const t of template.rooms) {
        const next = roomFromTemplate(t, rooms, palette);
        next.position = [roundMm(t.position[0] + dx), roundMm(t.position[1] + dz)];
        next.rotation = normalizeDeg(t.rotation);
        next.buildingId = building.id;
        rooms.push(next);
      }
      const first = rooms[kept.length];
      set({ ...record(), rooms, buildings: [...keptBuildings, building], checkedRoomIds: pruneChecked(rooms, get().checkedRoomIds),
        activeRoomId: first.id, roomDisplay: "building", selectedId: null, cameraResetToken: get().cameraResetToken + 1 });
    },

    selectRoom: (id) => {
      const next = get().rooms.find((r) => r.id === id);
      if (!next) return;
      const changed = get().activeRoomId !== id;
      // Reframe when the view now shows something else: another room alone, another building, or one more room.
      const reframe = changed && shownKey(get()) !== shownKey({ ...get(), activeRoomId: id });
      if (gestureStart) get().endGesture();
      lastCoalesce = null;
      set({ activeRoomId: id, selectedId: null, cameraResetToken: get().cameraResetToken + (reframe ? 1 : 0) });
    },

    updateRoom: (id, patch, opts = {}) => {
      const current = get().rooms.find((r) => r.id === id);
      if (!current) return;
      const next: ProjectRoom = { ...current, ...patch,
        name: patch.name?.trim() || current.name,
        position: patch.position ? patch.position.map((v, i) => Number.isFinite(v)
          ? roundMm(clamp(v, -1000, 1000)) : current.position[i]) as [number, number] : current.position,
        rotation: patch.rotation !== undefined && Number.isFinite(patch.rotation) ? normalizeDeg(patch.rotation) : current.rotation,
      };
      // Defaults are stored as absent, matching what a reload produces.
      const elevation = patch.elevation !== undefined && Number.isFinite(patch.elevation)
        ? roundMm(clamp(patch.elevation, -ELEVATION_LIMIT, ELEVATION_LIMIT)) : roomElevation(current);
      const kind: RoomKind = patch.kind && ROOM_KINDS.includes(patch.kind) ? patch.kind : roomKind(current);
      const roof: RoofType = patch.roof && ROOF_TYPES.includes(patch.roof) ? patch.roof : current.roof ?? "none";
      const openWalls = normalizeOpenWalls("openWalls" in patch ? patch.openWalls : current.openWalls);
      delete next.elevation; delete next.kind; delete next.roof; delete next.openWalls;
      if (elevation !== 0) next.elevation = elevation;
      if (kind !== "indoor") next.kind = kind;
      if (roof !== "none") next.roof = roof;
      if (openWalls) next.openWalls = openWalls;
      if (JSON.stringify(current) === JSON.stringify(next)) return;
      set({ ...(opts.history === false ? {} : record(opts.coalesceKey)),
        rooms: get().rooms.map((r) => r.id === id ? next : r) });
    },

    removeRoom: (id) => get().removeRooms([id]),

    removeRooms: (ids) => {
      const rooms = get().rooms.filter((r) => !ids.includes(r.id));
      if (!rooms.length || rooms.length === get().rooms.length) return;
      const activeRoomId = rooms.some((r) => r.id === get().activeRoomId) ? get().activeRoomId : rooms[0].id;
      set({ ...record(), rooms, buildings: pruneBuildings(rooms, get().buildings), checkedRoomIds: pruneChecked(rooms, get().checkedRoomIds),
        activeRoomId, selectedId: activeRoomId === get().activeRoomId ? get().selectedId : null,
        cameraResetToken: get().cameraResetToken + 1 });
    },

    setCheckedRooms: (ids) => {
      const checkedRoomIds = pruneChecked(get().rooms, [...new Set(ids)]);
      const reframe = shownKey(get()) !== shownKey({ ...get(), checkedRoomIds });
      set({ checkedRoomIds, cameraResetToken: get().cameraResetToken + (reframe ? 1 : 0) });
    },

    groupRooms: (ids) => {
      const members = get().rooms.filter((r) => ids.includes(r.id));
      if (!members.length) return null;
      const existing = members.map((r) => get().buildings.find((b) => b.id === r.buildingId)).find((b) => b !== undefined);
      const building: Building = existing ?? { id: makeId(), name: uniqueName(t().defaults.building, get().buildings) };
      if (members.every((r) => r.buildingId === building.id)) return building.id;
      const rooms = get().rooms.map((r) => ids.includes(r.id) ? { ...r, buildingId: building.id } : r);
      const buildings = existing ? get().buildings : [...get().buildings, building];
      set({ ...record(), rooms, buildings: pruneBuildings(rooms, buildings) });
      return building.id;
    },

    ungroupRooms: (ids) => {
      if (!get().rooms.some((r) => ids.includes(r.id) && r.buildingId)) return;
      const rooms = get().rooms.map((r) => {
        if (!ids.includes(r.id) || !r.buildingId) return r;
        const { buildingId: _, ...rest } = r;
        return rest;
      });
      set({ ...record(), rooms, buildings: pruneBuildings(rooms, get().buildings) });
    },

    renameBuilding: (id, name) => {
      const current = get().buildings.find((b) => b.id === id);
      const trimmed = name.trim();
      if (!current || !trimmed || trimmed === current.name) return;
      set({ ...record(), buildings: get().buildings.map((b) => b.id === id ? { ...b, name: trimmed } : b) });
    },

    moveRooms: (ids, [dx, dz], opts = {}) => {
      if ((!dx && !dz) || !get().rooms.some((r) => ids.includes(r.id))) return;
      const rooms = get().rooms.map((r) => ids.includes(r.id) ? { ...r,
        position: [roundMm(clamp(r.position[0] + dx, -1000, 1000)), roundMm(clamp(r.position[1] + dz, -1000, 1000))] as [number, number] } : r);
      set({ ...(opts.history === false ? {} : record(opts.coalesceKey)), rooms });
    },

    rotateRooms: (ids, degrees) => {
      const members = get().rooms.filter((r) => ids.includes(r.id));
      if (!members.length || !Number.isFinite(degrees)) return;
      if (members.length === 1) {
        get().updateRoom(members[0].id, { rotation: members[0].rotation + degrees });
        return;
      }
      const turned = new Map(rotateRoomsTogether(members, degrees).map((r) => [r.id, r]));
      const rooms = get().rooms.map((r) => {
        const next = turned.get(r.id);
        return next ? { ...r, position: next.position, rotation: normalizeDeg(next.rotation) } : r;
      });
      set({ ...record(), rooms, cameraResetToken: get().cameraResetToken + 1 });
    },

    setRoomDisplay: (roomDisplay) => {
      if (gestureStart) get().endGesture();
      // Looking at the ticked rooms: edit one of them rather than show another room beside them.
      const { rooms, checkedRoomIds, activeRoomId } = get();
      const ticked = roomDisplay === "checked" && !checkedRoomIds.includes(activeRoomId)
        ? rooms.find((r) => checkedRoomIds.includes(r.id)) : undefined;
      if (ticked) lastCoalesce = null;
      set({ roomDisplay, ...(ticked ? { activeRoomId: ticked.id, selectedId: null } : {}),
        cameraResetToken: get().cameraResetToken + 1 });
    },

    showBuilding: (id) => {
      const members = get().rooms.filter((r) => r.buildingId === id);
      if (!members.length) return;
      if (gestureStart) get().endGesture();
      lastCoalesce = null;
      const keep = members.some((r) => r.id === get().activeRoomId);
      set({ activeRoomId: keep ? get().activeRoomId : members[0].id, selectedId: keep ? get().selectedId : null,
        roomDisplay: "building", cameraResetToken: get().cameraResetToken + 1 });
    },

    setWallView: (wallView) => set({ wallView }),

    joinRooms: (spec) => {
      const moving = get().rooms.find((r) => r.id === spec.roomId);
      const target = get().rooms.find((r) => r.id === spec.targetId);
      const unit = spec.together?.includes(spec.roomId) ? spec.together : [spec.roomId];
      if (!moving || !target || unit.includes(target.id) || !Number.isFinite(spec.offset)) return false;
      const open = spec.connection === "open";
      const join = joinPlacement(moving, spec.wall, target, spec.targetWall, spec.align, spec.offset, open ? 0 : 2 * WALL_T);
      const shared = join.shared[1] - join.shared[0];
      const door = OPENING_CATALOG.door;
      const doorWidth = roundMm(Math.min(spec.doorWidth ?? door.defaults.width, shared - JOIN_DOOR_MARGIN, door.max.width));
      if ((open && !join.flush) || (spec.connection === "door" && doorWidth < door.min.width)) return false;

      const placed = new Map(moveRigidly(get().rooms.filter((r) => unit.includes(r.id)), moving, join).map((p) => [p.id, p]));
      let rooms = get().rooms.map((r) => {
        const p = placed.get(r.id);
        return p ? { ...r, position: p.position, rotation: p.rotation } : r;
      });
      const edit = (id: string, change: (r: ProjectRoom) => ProjectRoom) => { rooms = rooms.map((r) => r.id === id ? change(r) : r); };
      const setOpen = (wall: Wall, isOpen: boolean) => (r: ProjectRoom): ProjectRoom => {
        const { openWalls: current, ...rest } = r;
        const openWalls = normalizeOpenWalls(isOpen ? [...(current ?? []), wall] : (current ?? []).filter((w) => w !== wall));
        return openWalls ? { ...rest, openWalls } : rest;
      };
      if (open) {
        edit(moving.id, setOpen(spec.wall, true));
        edit(target.id, setOpen(spec.targetWall, true));
      } else {
        // The moving wall now stands against the target; if the two were joined open before, close both again.
        edit(moving.id, setOpen(spec.wall, false));
        if (moving.openWalls?.includes(spec.wall) && target.openWalls?.includes(spec.targetWall)) edit(target.id, setOpen(spec.targetWall, false));
      }
      if (spec.connection === "door") {
        // One door, cut through both walls in the middle of their shared part, hinged on the same jamb.
        const center = (join.shared[0] + join.shared[1]) / 2;
        const along = join.alongMoving(center), jamb = join.alongMoving(center - doorWidth / 2);
        const height = Math.min(door.defaults.height, moving.room.height, target.room.height);
        const label = t().openings.door.label;
        const cut = (wall: Wall, offset: number, hinge: Opening["hinge"]) => (r: ProjectRoom): ProjectRoom => ({ ...r,
          openings: [...r.openings, constrainOpening({ id: makeId(), type: "door", name: uniqueName(label, r.openings), wall, offset,
            width: doorWidth, height, elevation: 0, hinge }, r.room)] });
        edit(target.id, cut(spec.targetWall, center, "start"));
        edit(moving.id, cut(spec.wall, along, jamb < along ? "start" : "end"));
      }
      set({ ...record(), rooms, cameraResetToken: get().cameraResetToken + 1 });
      return true;
    },

    attachRoom: (id, targetId, side, together = [id]) => {
      const ids = together.includes(id) ? together : [id];
      const moving = get().rooms.filter((r) => ids.includes(r.id));
      const target = get().rooms.find((r) => r.id === targetId);
      if (!moving.length || !target || ids.includes(targetId)) return;
      const b = projectBounds(moving), t = roomBounds(target, true);
      const dx = side === "left" ? t.minX - b.maxX : side === "right" ? t.maxX - b.minX : t.minX - b.minX;
      const dz = side === "back" ? t.minZ - b.maxZ : side === "front" ? t.maxZ - b.minZ : t.minZ - b.minZ;
      get().moveRooms(ids, [dx, dz]);
      get().resetCamera();
    },

    setRoom: (patch, opts = {}) => {
      const room = constrainRoom({ ...active().room, ...patch });
      if (JSON.stringify(room) === JSON.stringify(active().room)) return;
      set({
        ...(opts.history === false ? {} : record(opts.coalesceKey)),
        room,
        // Shrinking the room pulls furniture and openings back inside; undo restores the old positions.
        furniture: active().furniture.map((f) => constrainFurniture(f, room)),
        openings: active().openings.map((o) => constrainOpening(o, room)),
      });
    },

    addFurniture: (type, preset = {}) => {
      const { room, furniture } = active();
      const entry = CATALOG[type];
      const dimensions = { ...(preset.dimensions ?? entry.defaults) };
      const label = t().furniture[type].label;
      const [x, z] = findFreeSpot(dimensions, room, furniture);
      const piece = constrainFurniture(
        {
          id: makeId(),
          type,
          name: uniqueName(preset.name ?? label, furniture),
          position: [x, preset.elevation ?? 0, z],
          rotation: 0,
          dimensions,
          ...(preset.colors ? { colors: preset.colors } : {}),
        },
        room,
      );
      set({ ...record(), furniture: [...furniture, piece], selectedId: piece.id });
      return piece.id;
    },

    updateFurniture: (id, patch, opts = {}) => {
      const { room, furniture } = active();
      const current = furniture.find((f) => f.id === id);
      if (!current) return;
      const next = constrainFurniture(
        {
          ...current,
          ...patch,
          dimensions: { ...current.dimensions, ...patch.dimensions },
        },
        room,
      );
      const changed = JSON.stringify(next) !== JSON.stringify(current);
      if (!changed) return;
      set({
        ...(opts.history === false ? {} : record(opts.coalesceKey)),
        furniture: furniture.map((f) => (f.id === id ? next : f)),
      });
    },

    setFurnitureColors: (id, patch, opts = {}) => {
      const current = active().furniture.find((f) => f.id === id);
      const valid = sanitizeFurnitureColors(patch);
      if (!current || !valid) return;
      get().updateFurniture(id, { colors: { ...current.colors, ...valid } }, opts);
    },

    resetFurnitureColors: (id) => get().updateFurniture(id, { colors: undefined }),

    placePlantOnSurface: (id, surfaceId) => {
      const { furniture, room } = active();
      const plant = furniture.find((f) => f.id === id);
      if (!plant || plant.type !== "plant") return false;
      if (surfaceId === null) {
        if (plant.position[1] === 0) return true;
        // Lowering in place would hide the pot inside its cabinet; use an open floor spot.
        const { hx, hz } = footprintHalfExtents(plant.dimensions, plant.rotation);
        const [x, z] = findFreeSpot({ ...plant.dimensions, width: hx * 2, depth: hz * 2 }, room,
          furniture.filter((f) => f.id !== id));
        get().updateFurniture(id, { position: [x, 0, z] });
        return true;
      }
      const surface = furniture.find((f) => f.id === surfaceId);
      if (!surface) return false;
      const position = plantPositionOnSurface(plant, surface, room, [surface.position[0], surface.position[2]]);
      if (!position) return false;
      get().updateFurniture(id, { position });
      return true;
    },

    setPlantDropTarget: (plantDropTargetId) => {
      if (get().plantDropTargetId !== plantDropTargetId) set({ plantDropTargetId });
    },

    alignFurniture: (id, target) => {
      const f = active().furniture.find((p) => p.id === id);
      if (!f) return;
      const [x, z] = alignedPosition(f, active().room, target);
      get().updateFurniture(id, { position: [x, f.position[1], z] });
    },

    removeFurniture: (id) => {
      const { furniture } = active();
      const { selectedId } = get();
      if (!furniture.some((f) => f.id === id)) return;
      set({
        ...record(),
        furniture: furniture.filter((f) => f.id !== id),
        selectedId: selectedId === id ? null : selectedId,
      });
    },

    duplicateFurniture: (id) => {
      const { furniture, room } = active();
      const src = furniture.find((f) => f.id === id);
      if (!src) return;
      const copy = constrainFurniture(
        {
          ...src,
          id: makeId(),
          name: uniqueName(src.name.replace(/ \d+$/, ""), furniture),
          position: [src.position[0] + 0.2, src.position[1], src.position[2] + 0.2],
          dimensions: { ...src.dimensions },
        },
        room,
      );
      set({ ...record(), furniture: [...furniture, copy], selectedId: copy.id });
    },

    clearFurniture: () => {
      if (active().furniture.length === 0) return;
      set({ ...record(), furniture: [], selectedId: null });
    },

    addOpening: (type) => {
      const { room, openings } = active();
      const { defaults } = OPENING_CATALOG[type];
      const label = t().openings[type].label;
      const { wall, offset } = findOpeningSpot(type, defaults.width, room, openings);
      const opening = constrainOpening(
        { id: makeId(), type, name: uniqueName(label, openings), wall, offset, ...defaults, hinge: "start" },
        room,
      );
      set({ ...record(), openings: [...openings, opening], selectedId: opening.id });
      return opening.id;
    },

    updateOpening: (id, patch, opts = {}) => {
      const { room, openings } = active();
      const current = openings.find((o) => o.id === id);
      if (!current) return;
      const next = constrainOpening({ ...current, ...patch }, room);
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      set({
        ...(opts.history === false ? {} : record(opts.coalesceKey)),
        openings: openings.map((o) => (o.id === id ? next : o)),
      });
    },

    removeOpening: (id) => {
      const { openings } = active();
      const { selectedId } = get();
      if (!openings.some((o) => o.id === id)) return;
      set({
        ...record(),
        openings: openings.filter((o) => o.id !== id),
        selectedId: selectedId === id ? null : selectedId,
      });
    },

    duplicateOpening: (id) => {
      const { openings, room } = active();
      const src = openings.find((o) => o.id === id);
      if (!src) return;
      const { wall, offset } = findOpeningSpot(src.type, src.width, room, openings, src.wall);
      const copy = constrainOpening(
        { ...src, id: makeId(), name: uniqueName(src.name.replace(/ \d+$/, ""), openings), wall, offset },
        room,
      );
      set({ ...record(), openings: [...openings, copy], selectedId: copy.id });
    },

    removeSelection: () => {
      const { selectedId } = get();
      const { furniture } = active();
      if (!selectedId) return;
      if (furniture.some((f) => f.id === selectedId)) get().removeFurniture(selectedId);
      else get().removeOpening(selectedId);
    },

    duplicateSelection: () => {
      const { selectedId } = get();
      const { furniture } = active();
      if (!selectedId) return;
      if (furniture.some((f) => f.id === selectedId)) get().duplicateFurniture(selectedId);
      else get().duplicateOpening(selectedId);
    },

    applyPalette: (presetId) => {
      const preset = PALETTE_PRESETS.find((p) => p.palette.id === presetId);
      if (!preset || preset.palette === active().palette) return;
      set({ ...record(), palette: preset.palette });
    },

    setPaletteColors: (patch, opts = {}) => {
      const current = active().palette;
      const next: Palette = { ...current, ...patch, id: "custom" };
      if (JSON.stringify(next) === JSON.stringify(current)) return;
      set({ ...(opts.history === false ? {} : record(opts.coalesceKey)), palette: next });
    },

    loadSample: () => {
      set({
        ...record(),
        room: SAMPLE_LAYOUT.room,
        furniture: SAMPLE_LAYOUT.furniture.map((f) => ({ ...f, id: makeId() })),
        openings: SAMPLE_LAYOUT.openings.map((o) => ({ ...o, id: makeId() })),
        palette: SAMPLE_LAYOUT.palette,
        selectedId: null,
        cameraResetToken: get().cameraResetToken + 1,
      });
    },

    adoptLayout: (layout) => {
      const { projectName, rooms, buildings = [] } = constrainLayout(layout);
      const activeRoomId = rooms.some((r) => r.id === get().activeRoomId) ? get().activeRoomId : layout.activeRoomId;
      const current = selectActiveRoom({ rooms, activeRoomId });
      const stillExists = [...current.furniture, ...current.openings].some((item) => item.id === get().selectedId);
      gestureStart = null;
      lastCoalesce = null;
      // The undo stack holds this tab's stale copies; undoing into one would overwrite the other tab's work.
      set({ projectName, rooms, buildings, activeRoomId, selectedId: stillExists ? get().selectedId : null,
        checkedRoomIds: pruneChecked(rooms, get().checkedRoomIds), past: [], future: [] });
    },

    select: (id) => set({ selectedId: id }),

    beginGesture: () => {
      gestureStart = snapshot();
    },

    endGesture: () => {
      const start = gestureStart;
      gestureStart = null;
      lastCoalesce = null;
      if (!start) return;
      const { rooms, past } = get();
      const unchanged = start.rooms === rooms;
      if (unchanged) return; // nothing moved
      set({ past: [...past, start].slice(-HISTORY_LIMIT), future: [] });
    },

    undo: () => {
      const { past, future } = get();
      const prev = past.at(-1);
      if (!prev) return;
      lastCoalesce = null;
      set({ ...restore(prev), past: past.slice(0, -1), future: [snapshot(), ...future] });
    },

    redo: () => {
      const { past, future } = get();
      const next = future[0];
      if (!next) return;
      lastCoalesce = null;
      set({ ...restore(next), past: [...past, snapshot()], future: future.slice(1) });
    },

    setMode: (mode) => set({ mode }),
    setView: (view) => set({ view }),
    setSnapStep: (snapStep) => set({ snapStep }),
    setAutoRotate: (autoRotate) => set({ autoRotate }),
    resetCamera: () => set({ cameraResetToken: get().cameraResetToken + 1 }),

    markSaved: (at) => set({ saveStatus: "saved", lastSavedAt: at }),
    markSaveError: () => set({ saveStatus: "error" }),
  };
});

/** Plain-data view of the document, as persisted. */
export function selectLayout(s: EditorState): Layout {
  return { version: 2, projectName: s.projectName, rooms: s.rooms, activeRoomId: s.activeRoomId,
    // Ticks aren't saved, so showing the ticked rooms comes back as the room being edited.
    roomDisplay: s.roomDisplay === "checked" ? "single" : s.roomDisplay, ...(s.wallView === "exterior" ? { wallView: s.wallView } : {}),
    ...(s.buildings.length ? { buildings: s.buildings } : {}) };
}

/**
 * Rooms the scene draws, each placed where it's drawn. A single room sits at
 * the origin; the combined view places rooms at their level, minus any that
 * would hide the room being edited.
 */
export function selectVisibleRooms(s: Pick<EditorState, "rooms" | "activeRoomId" | "roomDisplay" | "checkedRoomIds" | "mode">): ProjectRoom[] {
  const active = selectActiveRoom(s);
  if (!selectCombined(s)) return [{ ...active, position: [0, 0], rotation: 0, elevation: 0 }];
  const pool = selectShownRooms(s);
  const hidden = s.mode === "edit" ? hiddenWhileEditing(pool, active) : new Set<string>();
  return pool.filter((r) => !hidden.has(r.id));
}

/**
 * Rooms are drawn in place, as a group: every room, the ticked rooms, or the
 * selected room's building. A room in no building shows alone, as in the
 * single-room view, and so does the room being edited when no other is ticked.
 */
export const selectCombined = (s: Pick<EditorState, "rooms" | "activeRoomId" | "roomDisplay" | "checkedRoomIds">) =>
  s.roomDisplay === "all" || (s.roomDisplay === "building" && selectActiveRoom(s).buildingId !== undefined)
  || (s.roomDisplay === "checked" && s.checkedRoomIds.some((id) => id !== selectActiveRoom(s).id));

/**
 * The rooms the current view is about (before any step aside while editing):
 * all, the ticked rooms and the one being edited, one building, or one room.
 */
export function selectShownRooms(s: Pick<EditorState, "rooms" | "activeRoomId" | "roomDisplay" | "checkedRoomIds">): ProjectRoom[] {
  if (s.roomDisplay === "all") return s.rooms;
  const active = selectActiveRoom(s);
  if (s.roomDisplay === "checked") return s.rooms.filter((r) => r === active || s.checkedRoomIds.includes(r.id));
  return s.roomDisplay === "building" && active.buildingId ? s.rooms.filter((r) => r.buildingId === active.buildingId) : [active];
}

/**
 * The rooms that move with room `id`: every ticked room when it is one of two
 * or more ticked, otherwise just itself.
 */
export function movingUnit(s: Pick<EditorState, "checkedRoomIds">, id: string): string[] {
  return s.checkedRoomIds.length > 1 && s.checkedRoomIds.includes(id) ? s.checkedRoomIds : [id];
}

export const selectSelected = (s: EditorState) =>
  selectActiveRoom(s).furniture.find((f) => f.id === s.selectedId) ?? null;

/** Visible world bounds, including room rotations and negative positions. */
export function selectSceneBounds(s: EditorState) {
  const visible = selectVisibleRooms(s);
  const b = projectBounds(visible);
  const minY = Math.min(0, ...visible.map(roomElevation));
  const maxY = Math.max(...visible.map((r) => roomElevation(r) + (roomKind(r) === "garden" ? 0 : r.room.height)));
  return { ...b, width: b.maxX - b.minX, depth: b.maxZ - b.minZ, minY, maxY, height: maxY - minY };
}

export const selectSelectedOpening = (s: EditorState) =>
  selectActiveRoom(s).openings.find((o) => o.id === s.selectedId) ?? null;

/**
 * Layout check results for the current document, worded in `lang` with lengths
 * in `unit`. Memoized on the document's object identities (one cache per
 * language and unit), so every
 * component can call this freely and the rules only re-run when something
 * actually changed (e.g. once per drag step).
 */
const issueCache = new Map<string, { snapshot: RoomContents; outdoor: boolean; issues: Issue[] }>();
export function selectIssues(state: EditorState, lang: Lang = getLang(), unit: LengthUnit = getLengthUnit()): Issue[] {
  const s = selectActiveRoom(state);
  const cacheKey = `${lang}:${unit}`;
  const cached = issueCache.get(cacheKey);
  const c = cached?.snapshot;
  const outdoor = isOutdoor(s);
  if (c && c.room === s.room && c.furniture === s.furniture && c.openings === s.openings && c.palette === s.palette
    && cached!.outdoor === outdoor) {
    return cached!.issues;
  }
  const issues = [...checkLayout(s.room, s.furniture, s.openings, { outdoor, lang, unit }),
    ...checkPalette(s.palette, s.room, s.openings, { outdoor, lang })];
  issueCache.set(cacheKey, { snapshot: { room: s.room, furniture: s.furniture, openings: s.openings, palette: s.palette }, outdoor, issues });
  return issues;
}
