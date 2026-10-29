import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import { selectActiveRoom, selectLayout, selectSceneBounds, useEditor } from "./editorStore";
import { parseLayout } from "../lib/persistence";
import { roomBounds } from "../lib/rooms";
import { supportingSurface } from "../lib/plantPlacement";
import { footprintBounds } from "../lib/geometry";

const initial = useEditor.getState();
const get = () => useEditor.getState();
const active = () => selectActiveRoom(get());

beforeEach(() => {
  useEditor.setState(
    {
      ...initial,
      rooms: [{ ...initial.rooms[0], room: { width: 4, depth: 3, height: 2.6 }, furniture: [], openings: [] }],
      activeRoomId: initial.rooms[0].id,
      selectedId: null,
      past: [],
      future: [],
    },
    true,
  );
});

describe("editor store", () => {
  it("places a plant on a tall cabinet, persists it, and undoes the placement in one step", () => {
    const cabinetId = get().addFurniture("cabinet");
    get().updateFurniture(cabinetId, { dimensions: { height: 1.8 }, position: [1, 0, 0.5] });
    const plantId = get().addFurniture("plant", { dimensions: { width: 0.22, depth: 0.22, height: 0.32 } });
    const before = active().furniture.find((f) => f.id === plantId)!;
    const count = get().past.length;
    expect(get().placePlantOnSurface(plantId, cabinetId)).toBe(true);
    const placed = active().furniture.find((f) => f.id === plantId)!;
    expect(placed.position).toEqual([1, 1.8, 0.5]);
    expect(get().past).toHaveLength(count + 1);
    expect(supportingSurface(placed, active().furniture, active().room)?.id).toBe(cabinetId);
    const saved = parseLayout(selectLayout(get()))!;
    expect(saved.rooms[0].furniture.find((f) => f.id === plantId)?.position).toEqual(placed.position);
    get().undo();
    expect(active().furniture.find((f) => f.id === plantId)?.position).toEqual(before.position);
    get().redo();
    expect(active().furniture.find((f) => f.id === plantId)?.position).toEqual(placed.position);
  });

  it("returns a tabletop plant to an open floor spot instead of inside the cabinet", () => {
    const cabinetId = get().addFurniture("cabinet");
    const plantId = get().addFurniture("plant", { dimensions: { width: 0.22, depth: 0.22, height: 0.32 } });
    get().placePlantOnSurface(plantId, cabinetId);
    const top = active().furniture.find((f) => f.id === plantId)!.position;
    expect(get().placePlantOnSurface(plantId, null)).toBe(true);
    const floor = active().furniture.find((f) => f.id === plantId)!;
    expect(floor.position[1]).toBe(0);
    const p = footprintBounds(floor), c = footprintBounds(active().furniture.find((f) => f.id === cabinetId)!);
    expect(p.maxX <= c.minX || p.minX >= c.maxX || p.maxZ <= c.minZ || p.minZ >= c.maxZ).toBe(true);
    get().undo();
    expect(active().furniture.find((f) => f.id === plantId)?.position).toEqual(top);
  });

  it("rejects insufficient ceiling space and supports from other rooms without creating history", () => {
    const roomId = get().activeRoomId;
    const cabinetId = get().addFurniture("cabinet");
    get().updateFurniture(cabinetId, { dimensions: { height: 2.4 } });
    const plantId = get().addFurniture("plant", { dimensions: { width: 0.22, depth: 0.22, height: 0.32 } });
    get().addRoom();
    const otherId = get().addFurniture("cabinet");
    get().selectRoom(roomId);
    const before = active().furniture, history = get().past;
    expect(get().placePlantOnSurface(plantId, cabinetId)).toBe(false);
    expect(get().placePlantOnSurface(plantId, otherId)).toBe(false);
    expect(get().placePlantOnSurface(cabinetId, cabinetId)).toBe(false);
    expect(active().furniture).toBe(before);
    expect(get().past).toBe(history);
  });

  it("keeps placement feedback out of the saved document and drag history", () => {
    const cabinetId = get().addFurniture("cabinet");
    const plantId = get().addFurniture("plant", { dimensions: { width: 0.22, depth: 0.22, height: 0.32 } });
    const saved = selectLayout(get()), count = get().past.length;
    get().setPlantDropTarget(cabinetId);
    expect(selectLayout(get())).toEqual(saved);
    expect(get().past).toHaveLength(count);
    get().beginGesture();
    get().updateFurniture(plantId, { position: [1, 1.6, 1] }, { history: false });
    get().updateFurniture(plantId, { position: [1.1, 1.6, 1] }, { history: false });
    get().setPlantDropTarget(null);
    get().endGesture();
    expect(get().past).toHaveLength(count + 1);
    get().undo();
    expect(selectLayout(get())).toEqual(saved);
    expect(get().plantDropTargetId).toBeNull();
  });

  it("assigns colors to a single piece independently of other pieces and rooms", () => {
    const id = get().addFurniture("chair");
    const neighbor = get().addFurniture("chair");
    const roomId = get().activeRoomId, palette = active().palette;
    get().setFurnitureColors(id, { wood: "#ABCDEF", fabric: "#123456" });
    expect(active().furniture.find((f) => f.id === id)?.colors).toEqual({ wood: "#abcdef", fabric: "#123456" });
    expect(active().furniture.find((f) => f.id === neighbor)?.colors).toBeUndefined();
    expect(active().palette).toBe(palette);
    get().addRoom();
    const other = get().addFurniture("chair");
    get().setFurnitureColors(other, { wood: "#224466" });
    get().selectRoom(roomId);
    expect(active().furniture.find((f) => f.id === id)?.colors?.wood).toBe("#abcdef");
  });

  it("undoes, redoes and resets individual furniture colors", () => {
    const id = get().addFurniture("bed");
    get().setFurnitureColors(id, { wood: "#aabbcc" });
    get().setFurnitureColors(id, { fabric: "#112233" });
    expect(active().furniture[0].colors).toEqual({ wood: "#aabbcc", fabric: "#112233" });
    get().undo();
    expect(active().furniture[0].colors).toEqual({ wood: "#aabbcc" });
    get().redo();
    get().resetFurnitureColors(id);
    expect(active().furniture[0].colors).toBeUndefined();
    get().undo();
    expect(active().furniture[0].colors).toEqual({ wood: "#aabbcc", fabric: "#112233" });
  });

  it("copies furniture colors without coupling the duplicate to the original", () => {
    const id = get().addFurniture("desk");
    get().setFurnitureColors(id, { wood: "#112233", metal: "#aabbcc" });
    get().duplicateFurniture(id);
    const copy = active().furniture[1];
    expect(copy.colors).toEqual(active().furniture[0].colors);
    get().setFurnitureColors(copy.id, { wood: "#ff0000" });
    expect(active().furniture[0].colors?.wood).toBe("#112233");
    expect(active().furniture[1].colors).toEqual({ wood: "#ff0000", metal: "#aabbcc" });
    get().applyPalette("japandi");
    expect(active().furniture[0].colors?.wood).toBe("#112233");
  });

  it("ignores invalid color updates and coalesces continuous picker changes", () => {
    const id = get().addFurniture("cabinet");
    const before = get().past.length;
    get().setFurnitureColors(id, { wood: "red" });
    expect(get().past).toHaveLength(before);
    get().setFurnitureColors(id, { wood: "#112233" }, { coalesceKey: `color:${id}` });
    get().setFurnitureColors(id, { wood: "#334455" }, { coalesceKey: `color:${id}` });
    expect(get().past).toHaveLength(before + 1);
    get().undo();
    expect(active().furniture[0].colors).toBeUndefined();
  });

  it("keeps each room's furniture, openings, size and palette independent", () => {
    const firstId = get().activeRoomId;
    get().addFurniture("bed");
    get().addOpening("window");
    const first = active();
    const secondId = get().addRoom();
    expect(active().furniture).toEqual([]);
    expect(active().openings).toEqual([]);
    get().addFurniture("desk");
    get().addOpening("door");
    get().setRoom({ width: 5 });
    get().applyPalette("japandi");
    get().selectRoom(firstId);
    expect(active()).toBe(first);
    expect(get().selectedId).toBeNull();
    get().selectRoom(secondId);
    expect(active().room.width).toBe(5);
    expect(active().furniture[0].type).toBe("desk");
    expect(active().openings[0].type).toBe("door");
    expect(active().palette.id).toBe("japandi");
  });

  it("preserves local contents and placement while switching display modes", () => {
    get().addRoom();
    get().addFurniture("chair");
    get().addOpening("door");
    const before = active();
    get().updateRoom(before.id, { position: [-6, 4], rotation: 90, name: "Study" });
    get().setRoomDisplay("all");
    expect(selectSceneBounds(get()).minX).toBeLessThan(-6);
    get().setRoomDisplay("single");
    expect(selectSceneBounds(get()).width).toBeCloseTo(before.room.width + 0.2);
    expect(active()).toMatchObject({ position: [-6, 4], rotation: 90, name: "Study" });
    expect(active().furniture).toBe(before.furniture);
    expect(active().openings).toBe(before.openings);
  });

  it("undoes and redoes an entire room move as one step", () => {
    const id = get().addRoom(), before = active().position;
    const historyLength = get().past.length;
    get().beginGesture();
    for (let i = 1; i <= 10; i++) get().updateRoom(id, { position: [i, -i] }, { history: false });
    get().endGesture();
    expect(get().past).toHaveLength(historyLength + 1);
    get().undo();
    expect(active().position).toEqual(before);
    get().redo();
    expect(active().position).toEqual([10, -10]);
  });

  it.each(["left", "right", "back", "front"] as const)("attaches rotated rooms on the %s side", (side) => {
    const first = active();
    const id = get().addRoom();
    get().updateRoom(id, { rotation: 90 });
    get().attachRoom(id, first.id, side);
    const a = roomBounds(first, true), b = roomBounds(active(), true);
    if (side === "left") expect(b.maxX).toBeCloseTo(a.minX);
    if (side === "right") expect(b.minX).toBeCloseTo(a.maxX);
    if (side === "back") expect(b.maxZ).toBeCloseTo(a.minZ);
    if (side === "front") expect(b.minZ).toBeCloseTo(a.maxZ);
  });

  it("restores deleted rooms and contents and keeps at least one room", () => {
    const id = get().addRoom();
    get().addFurniture("desk");
    const removed = active();
    get().removeRoom(id);
    expect(get().rooms).toHaveLength(1);
    get().undo();
    expect(get().activeRoomId).toBe(id);
    expect(active()).toBe(removed);
    get().redo();
    get().removeRoom(get().activeRoomId);
    expect(get().rooms).toHaveLength(1);
  });

  it("uses fresh sample IDs in each room and preserves neighbors", () => {
    get().loadSample();
    const first = active();
    get().addRoom();
    get().loadSample();
    expect(get().rooms[0]).toBe(first);
    const ids = get().rooms.flatMap((r) => [...r.furniture, ...r.openings].map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("round-trips a complete multi-room project through persistence", () => {
    get().addFurniture("bed");
    get().addRoom();
    get().addOpening("window");
    get().updateRoom(get().activeRoomId, { position: [-2, 7.35], rotation: 37 });
    get().setRoomDisplay("all");
    const document = selectLayout(get());
    expect(parseLayout(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });
  it("adds furniture inside the room and selects it", () => {
    const id = get().addFurniture("bed");
    const bed = active().furniture.find((f) => f.id === id)!;
    expect(get().selectedId).toBe(id);
    expect(bed.position[0] - bed.dimensions.width / 2).toBeGreaterThanOrEqual(0);
    expect(bed.position[2] + bed.dimensions.depth / 2).toBeLessThanOrEqual(3);
  });

  it("clamps updates so furniture never leaves the room", () => {
    const id = get().addFurniture("desk");
    get().updateFurniture(id, { position: [99, -1, -99] });
    const desk = active().furniture[0];
    expect(desk.position).toEqual([3.4, 0, 0.3]);
  });

  it("undoes and redoes", () => {
    const id = get().addFurniture("chair");
    get().updateFurniture(id, { rotation: 90 });
    expect(active().furniture[0].rotation).toBe(90);
    get().undo();
    expect(active().furniture[0].rotation).toBe(0);
    get().undo();
    expect(active().furniture).toHaveLength(0);
    expect(get().selectedId).toBeNull();
    get().redo();
    get().redo();
    expect(active().furniture[0].rotation).toBe(90);
  });

  it("records a whole drag gesture as one undo step", () => {
    const id = get().addFurniture("chair");
    const before = get().past.length;
    get().beginGesture();
    for (let i = 1; i <= 10; i++) get().updateFurniture(id, { position: [0.5 + i * 0.1, 0, 1] }, { history: false });
    get().endGesture();
    expect(get().past.length).toBe(before + 1);
    get().undo();
    expect(active().furniture[0].position[0]).not.toBeCloseTo(1.5);
  });

  it("ignores gestures that changed nothing", () => {
    get().addFurniture("chair");
    const before = get().past.length;
    get().beginGesture();
    get().endGesture();
    expect(get().past.length).toBe(before);
  });

  it("merges bursts of coalesced updates", () => {
    const id = get().addFurniture("chair");
    const before = get().past.length;
    for (let i = 0; i < 5; i++) {
      const [x, y, z] = active().furniture[0].position;
      get().updateFurniture(id, { position: [x + 0.01, y, z] }, { coalesceKey: `nudge:${id}` });
    }
    expect(get().past.length).toBe(before + 1);
  });

  it("pulls furniture back inside when the room shrinks", () => {
    get().loadSample();
    get().setRoom({ width: 2 });
    for (const f of active().furniture) {
      expect(f.position[0]).toBeLessThanOrEqual(2);
    }
    get().undo();
    expect(active().room.width).toBe(SAMPLE_LAYOUT.room.width);
  });

  it("adds a dresser with its catalog defaults", () => {
    get().addFurniture("dresser");
    expect(active().furniture[0]).toMatchObject({ type: "dresser", name: "Dresser" });
    expect(active().furniture[0].dimensions).toEqual({ width: 1.2, depth: 0.48, height: 0.8 });
  });

  it("duplicates with a fresh id and a numbered name", () => {
    const id = get().addFurniture("cabinet");
    get().duplicateFurniture(id);
    const [a, b] = active().furniture;
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe("Cabinet 2");
    expect(get().selectedId).toBe(b.id);
  });

  it("adds openings on a wall and selects them", () => {
    const id = get().addOpening("window");
    const w = active().openings[0];
    expect(get().selectedId).toBe(id);
    expect(w).toMatchObject({ wall: "back", offset: 2, elevation: 0.9 });
  });

  it("slides openings along walls and keeps them on the wall", () => {
    const id = get().addOpening("door");
    get().updateOpening(id, { wall: "left", offset: 99 });
    const door = active().openings[0];
    expect(door.wall).toBe("left");
    expect(door.offset + door.width / 2).toBeCloseTo(3);
  });

  it("removes and duplicates whatever is selected", () => {
    get().addOpening("window");
    get().duplicateSelection();
    expect(active().openings).toHaveLength(2);
    expect(active().openings[1].name).toBe("Window 2");
    get().removeSelection();
    expect(active().openings).toHaveLength(1);
    get().undo();
    expect(active().openings).toHaveLength(2);
  });

  it("pulls openings back onto shrunken walls", () => {
    const id = get().addOpening("window");
    get().updateOpening(id, { offset: 3.3 });
    get().setRoom({ width: 2 });
    const w = active().openings[0];
    expect(w.offset + w.width / 2).toBeLessThanOrEqual(2 + 1e-9);
  });

  it("applies palettes and edits colors as undoable steps", () => {
    get().applyPalette("japandi");
    expect(active().palette.id).toBe("japandi");
    get().setPaletteColors({ accent: "#123456" });
    expect(active().palette).toMatchObject({ id: "custom", accent: "#123456", wall: "#ebe5da" });
    get().undo();
    expect(active().palette.id).toBe("japandi");
    get().undo();
    expect(active().palette.id).toBe("warm-oak");
  });
});

describe("multi-level projects", () => {
  it("adds a whole project beside the existing rooms in one undo step, keeping relative placement", () => {
    const before = get().rooms.length;
    get().addProject({ name: "Pair", rooms: [
      { name: "Garden", kind: "garden", position: [0, 0], rotation: 0, room: { width: 10, depth: 8, height: 6 },
        furniture: [{ id: "t", type: "tree", name: "Tree", position: [3, 0, 3], rotation: 0, dimensions: { width: 2, depth: 2, height: 4 } }],
        openings: [], palette: active().palette },
      { name: "Cellar", elevation: -3, position: [2, 1], rotation: 0, room: { width: 4, depth: 3, height: 2.8 },
        furniture: [], openings: [], palette: active().palette },
    ] });
    const [garden, cellar] = get().rooms.slice(before);
    expect(get().roomDisplay).toBe("all");
    expect(get().activeRoomId).toBe(garden.id);
    expect(garden.kind).toBe("garden");
    expect(cellar.elevation).toBe(-3);
    expect(cellar.position[0] - garden.position[0]).toBeCloseTo(2);
    expect(cellar.position[1] - garden.position[1]).toBeCloseTo(1);
    expect(garden.furniture[0].id).not.toBe("t");
    expect(selectSceneBounds(get()).minY).toBe(-3);
    get().undo();
    expect(get().rooms).toHaveLength(before);
  });

  it("validates room structure edits and stores the defaults as absent", () => {
    const id = active().id;
    get().updateRoom(id, { elevation: -2.5, kind: "courtyard", roof: "hip" });
    expect(active()).toMatchObject({ elevation: -2.5, kind: "courtyard", roof: "hip" });
    get().updateRoom(id, { elevation: Number.NaN, kind: "attic" as never });
    expect(active()).toMatchObject({ elevation: -2.5, kind: "courtyard" });
    get().updateRoom(id, { elevation: 0, kind: "indoor", roof: "none" });
    expect(active()).not.toHaveProperty("elevation");
    expect(active()).not.toHaveProperty("kind");
    expect(active()).not.toHaveProperty("roof");
    expect(parseLayout(JSON.parse(JSON.stringify(selectLayout(get()))))).toEqual(selectLayout(get()));
  });
});
