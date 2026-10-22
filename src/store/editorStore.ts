import { create } from "zustand";
import { CATALOG, ROOM_LIMITS } from "../lib/catalog";
import {
  alignedPosition,
  clamp,
  clampElevation,
  clampToRoom,
  findFreeSpot,
  normalizeDeg,
  roundMm,
} from "../lib/geometry";
import { constrainOpening, findOpeningSpot, OPENING_CATALOG } from "../lib/openings";
import { loadLayout } from "../lib/persistence";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import type {
  Dimensions,
  EditorMode,
  Furniture,
  FurnitureType,
  Layout,
  Opening,
  OpeningType,
  Room,
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
  room: Room;
  furniture: Furniture[];
  openings: Opening[];
}

export type FurniturePatch = Partial<Pick<Furniture, "name" | "position" | "rotation">> & {
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
  room: Room;
  furniture: Furniture[];
  openings: Opening[];
  /** Id of the selected furniture piece or opening (ids are unique across both). */
  selectedId: string | null;

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
  setRoom: (patch: Partial<Room>, opts?: UpdateOptions) => void;
  addFurniture: (type: FurnitureType) => string;
  updateFurniture: (id: string, patch: FurniturePatch, opts?: UpdateOptions) => void;
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
  return { ...f, dimensions, rotation, position: [roundMm(x), roundMm(y), roundMm(z)] };
}

function constrainRoom(room: Room): Room {
  const { min, max } = ROOM_LIMITS;
  return {
    width: roundMm(clamp(room.width, min.width, max.width)),
    depth: roundMm(clamp(room.depth, min.depth, max.depth)),
    height: roundMm(clamp(room.height, min.height, max.height)),
  };
}

function initialLayout(): Layout {
  const layout = loadLayout() ?? SAMPLE_LAYOUT;
  const room = constrainRoom(layout.room);
  return {
    ...layout,
    room,
    furniture: layout.furniture.map((f) => constrainFurniture(f, room)),
    openings: layout.openings.map((o) => constrainOpening(o, room)),
  };
}

// History bookkeeping that doesn't need to trigger renders lives outside the store.
let gestureStart: Snapshot | null = null;
let lastCoalesce: { key: string; at: number } | null = null;

// ── Store ────────────────────────────────────────────────────────────────

const initial = initialLayout();

export const useEditor = create<EditorState>()((set, get) => {
  const snapshot = (): Snapshot => ({ room: get().room, furniture: get().furniture, openings: get().openings });

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
    const { selectedId } = get();
    const stillExists = [...s.furniture, ...s.openings].some((item) => item.id === selectedId);
    return {
      room: s.room,
      furniture: s.furniture,
      openings: s.openings,
      selectedId: stillExists ? selectedId : null,
    };
  };

  return {
    projectName: initial.projectName,
    room: initial.room,
    furniture: initial.furniture,
    openings: initial.openings,
    selectedId: null,

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

    setRoom: (patch, opts = {}) => {
      const room = constrainRoom({ ...get().room, ...patch });
      if (JSON.stringify(room) === JSON.stringify(get().room)) return;
      set({
        ...(opts.history === false ? {} : record(opts.coalesceKey)),
        room,
        // Shrinking the room pulls furniture and openings back inside; undo restores the old positions.
        furniture: get().furniture.map((f) => constrainFurniture(f, room)),
        openings: get().openings.map((o) => constrainOpening(o, room)),
      });
    },

    addFurniture: (type) => {
      const { room, furniture } = get();
      const entry = CATALOG[type];
      const [x, z] = findFreeSpot(entry.defaults, room, furniture);
      const piece = constrainFurniture(
        {
          id: makeId(),
          type,
          name: uniqueName(entry.label, furniture),
          position: [x, 0, z],
          rotation: 0,
          dimensions: { ...entry.defaults },
        },
        room,
      );
      set({ ...record(), furniture: [...furniture, piece], selectedId: piece.id });
      return piece.id;
    },

    updateFurniture: (id, patch, opts = {}) => {
      const { room, furniture } = get();
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

    alignFurniture: (id, target) => {
      const f = get().furniture.find((p) => p.id === id);
      if (!f) return;
      const [x, z] = alignedPosition(f, get().room, target);
      get().updateFurniture(id, { position: [x, f.position[1], z] });
    },

    removeFurniture: (id) => {
      const { furniture, selectedId } = get();
      if (!furniture.some((f) => f.id === id)) return;
      set({
        ...record(),
        furniture: furniture.filter((f) => f.id !== id),
        selectedId: selectedId === id ? null : selectedId,
      });
    },

    duplicateFurniture: (id) => {
      const { furniture, room } = get();
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
      if (get().furniture.length === 0) return;
      set({ ...record(), furniture: [], selectedId: null });
    },

    addOpening: (type) => {
      const { room, openings } = get();
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
      const { room, openings } = get();
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
      const { openings, selectedId } = get();
      if (!openings.some((o) => o.id === id)) return;
      set({
        ...record(),
        openings: openings.filter((o) => o.id !== id),
        selectedId: selectedId === id ? null : selectedId,
      });
    },

    duplicateOpening: (id) => {
      const { openings, room } = get();
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
      const { selectedId, furniture } = get();
      if (!selectedId) return;
      if (furniture.some((f) => f.id === selectedId)) get().removeFurniture(selectedId);
      else get().removeOpening(selectedId);
    },

    duplicateSelection: () => {
      const { selectedId, furniture } = get();
      if (!selectedId) return;
      if (furniture.some((f) => f.id === selectedId)) get().duplicateFurniture(selectedId);
      else get().duplicateOpening(selectedId);
    },

    loadSample: () => {
      set({
        ...record(),
        projectName: SAMPLE_LAYOUT.projectName,
        room: SAMPLE_LAYOUT.room,
        furniture: SAMPLE_LAYOUT.furniture,
        openings: SAMPLE_LAYOUT.openings,
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
      const { room, furniture, openings, past } = get();
      if (start.room === room && start.furniture === furniture && start.openings === openings) return; // nothing moved
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
  return { version: 1, projectName: s.projectName, room: s.room, furniture: s.furniture, openings: s.openings };
}

export const selectSelected = (s: EditorState) =>
  s.furniture.find((f) => f.id === s.selectedId) ?? null;

export const selectSelectedOpening = (s: EditorState) =>
  s.openings.find((o) => o.id === s.selectedId) ?? null;
