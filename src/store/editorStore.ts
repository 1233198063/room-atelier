import { create } from "zustand";
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
import { projectBounds, roomBounds } from "../lib/rooms";
import { WALL_T } from "../lib/openings";
import { loadLayout, parseLayout } from "../lib/persistence";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import type {
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
  RoomDisplay,
  ViewMode,
  Wall,
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
  activeRoomId: string;
}
export type RoomPatch = Partial<Pick<ProjectRoom, "name" | "position" | "rotation">>;

export type FurniturePatch = Partial<Pick<Furniture, "name" | "position" | "rotation" | "colors">> & {
  dimensions?: Partial<Dimensions>;
};

export type OpeningPatch = Partial<Omit<Opening, "id" | "type">>;

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
  activeRoomId: string;
  roomDisplay: RoomDisplay;
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
  selectRoom: (id: string) => void;
  updateRoom: (id: string, patch: RoomPatch, opts?: UpdateOptions) => void;
  removeRoom: (id: string) => void;
  setRoomDisplay: (display: RoomDisplay) => void;
  attachRoom: (id: string, targetId: string, side: Wall) => void;
  setRoom: (patch: Partial<Room>, opts?: UpdateOptions) => void;
  /** Add a piece at a free spot; `preset` overrides the catalog's default name and size. */
  addFurniture: (type: FurnitureType, preset?: { name?: string; dimensions?: Dimensions }) => string;
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

function uniqueName(base: string, existing: { name: string }[]): string {
  const names = new Set(existing.map((f) => f.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
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

export const selectActiveRoom = (s: Pick<EditorState, "rooms" | "activeRoomId">): ProjectRoom =>
  s.rooms.find((r) => r.id === s.activeRoomId) ?? s.rooms[0];

function initialLayout(): Layout {
  const layout = loadLayout() ?? parseLayout(SAMPLE_LAYOUT)!;
  return { ...layout, rooms: layout.rooms.map((r) => {
    const room = constrainRoom(r.room);
    return { ...r, room, furniture: r.furniture.map((f) => constrainFurniture(f, room)),
      openings: r.openings.map((o) => constrainOpening(o, room)) };
  }) };
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
  const snapshot = (): Snapshot => ({ rooms: get().rooms, activeRoomId: get().activeRoomId });

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
    return { ...s, selectedId: stillExists ? get().selectedId : null,
      cameraResetToken: get().cameraResetToken + 1 };
  };

  return {
    projectName: initial.projectName,
    rooms: initial.rooms,
    activeRoomId: initial.activeRoomId,
    roomDisplay: initial.roomDisplay,
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

    setProjectName: (name) => set({ projectName: name.trim() || "Untitled room" }),

    addRoom: (template) => {
      const bounds = projectBounds(get().rooms);
      const id = makeId();
      const room = constrainRoom(template?.room ?? { width: 4, depth: 3, height: 2.6 });
      const next: ProjectRoom = {
        id, name: uniqueName(template?.name ?? "Room", get().rooms),
        position: [roundMm(bounds.maxX + WALL_T), roundMm(bounds.minZ + WALL_T)], rotation: 0,
        room,
        furniture: (template?.furniture ?? []).map((f) => constrainFurniture({ ...f, id: makeId() }, room)),
        openings: (template?.openings ?? []).map((o) => constrainOpening({ ...o, id: makeId() }, room)),
        palette: { ...(template?.palette ?? active().palette) },
      };
      set({ ...record(), rooms: [...get().rooms, next], activeRoomId: id, selectedId: null,
        cameraResetToken: get().cameraResetToken + 1 });
      return id;
    },

    selectRoom: (id) => {
      if (!get().rooms.some((r) => r.id === id)) return;
      const changed = get().activeRoomId !== id;
      if (gestureStart) get().endGesture();
      lastCoalesce = null;
      set({ activeRoomId: id, selectedId: null,
        cameraResetToken: get().cameraResetToken + (changed && get().roomDisplay === "single" ? 1 : 0) });
    },

    updateRoom: (id, patch, opts = {}) => {
      const current = get().rooms.find((r) => r.id === id);
      if (!current) return;
      const next = { ...current, ...patch,
        name: patch.name?.trim() || current.name,
        position: patch.position ? patch.position.map((v, i) => Number.isFinite(v)
          ? roundMm(clamp(v, -1000, 1000)) : current.position[i]) as [number, number] : current.position,
        rotation: patch.rotation !== undefined && Number.isFinite(patch.rotation) ? normalizeDeg(patch.rotation) : current.rotation,
      };
      if (JSON.stringify(current) === JSON.stringify(next)) return;
      set({ ...(opts.history === false ? {} : record(opts.coalesceKey)),
        rooms: get().rooms.map((r) => r.id === id ? next : r) });
    },

    removeRoom: (id) => {
      if (get().rooms.length <= 1 || !get().rooms.some((r) => r.id === id)) return;
      const rooms = get().rooms.filter((r) => r.id !== id);
      set({ ...record(), rooms, activeRoomId: get().activeRoomId === id ? rooms[0].id : get().activeRoomId,
        selectedId: null, cameraResetToken: get().cameraResetToken + 1 });
    },

    setRoomDisplay: (roomDisplay) => {
      if (gestureStart) get().endGesture();
      set({ roomDisplay, cameraResetToken: get().cameraResetToken + 1 });
    },

    attachRoom: (id, targetId, side) => {
      const moving = get().rooms.find((r) => r.id === id);
      const target = get().rooms.find((r) => r.id === targetId);
      if (!moving || !target || id === targetId) return;
      const b = roomBounds(moving, true), t = roomBounds(target, true);
      const dx = side === "left" ? t.minX - b.maxX : side === "right" ? t.maxX - b.minX : t.minX - b.minX;
      const dz = side === "back" ? t.minZ - b.maxZ : side === "front" ? t.maxZ - b.minZ : t.minZ - b.minZ;
      get().updateRoom(id, { position: [moving.position[0] + dx, moving.position[1] + dz] });
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
      const [x, z] = findFreeSpot(dimensions, room, furniture);
      const piece = constrainFurniture(
        {
          id: makeId(),
          type,
          name: uniqueName(preset.name ?? entry.label, furniture),
          position: [x, 0, z],
          rotation: 0,
          dimensions,
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
      const { label, defaults } = OPENING_CATALOG[type];
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
  return { version: 2, projectName: s.projectName, rooms: s.rooms,
    activeRoomId: s.activeRoomId, roomDisplay: s.roomDisplay };
}

export const selectSelected = (s: EditorState) =>
  selectActiveRoom(s).furniture.find((f) => f.id === s.selectedId) ?? null;

/** Visible world bounds, including room rotations and negative positions. */
export function selectSceneBounds(s: EditorState) {
  const visible = s.roomDisplay === "all" ? s.rooms : [{ ...selectActiveRoom(s), position: [0, 0] as [number, number], rotation: 0 }];
  const b = projectBounds(visible);
  return { ...b, width: b.maxX - b.minX, depth: b.maxZ - b.minZ, height: Math.max(...visible.map((r) => r.room.height)) };
}

export const selectSelectedOpening = (s: EditorState) =>
  selectActiveRoom(s).openings.find((o) => o.id === s.selectedId) ?? null;

/**
 * Layout check results for the current document. Memoized on the document's
 * object identities, so every component can call this freely and the rules
 * only re-run when something actually changed (e.g. once per drag step).
 */
let issueCache: { snapshot: RoomContents; issues: Issue[] } | null = null;
export function selectIssues(state: EditorState): Issue[] {
  const s = selectActiveRoom(state);
  const c = issueCache?.snapshot;
  if (c && c.room === s.room && c.furniture === s.furniture && c.openings === s.openings && c.palette === s.palette) {
    return issueCache!.issues;
  }
  const issues = [...checkLayout(s.room, s.furniture, s.openings), ...checkPalette(s.palette, s.room, s.openings)];
  issueCache = { snapshot: { room: s.room, furniture: s.furniture, openings: s.openings, palette: s.palette }, issues };
  return issues;
}
