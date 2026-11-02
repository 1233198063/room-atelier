import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import { movingUnit, selectActiveRoom, selectCombined, selectLayout, selectSceneBounds, selectVisibleRooms, useEditor } from "./editorStore";
import { parseLayout } from "../lib/persistence";
import { localToWorld, roomBounds, roomCorners, roomsConflict } from "../lib/rooms";
import { wallToWorld } from "../lib/openings";
import { ADU_PROJECT } from "../lib/aduTemplate";
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
    expect(get().roomDisplay).toBe("building");
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

describe("buildings and batch actions", () => {
  const ids = () => get().rooms.map((r) => r.id);
  const room = (id: string) => get().rooms.find((r) => r.id === id)!;
  const addRooms = (n: number) => Array.from({ length: n }, () => get().addRoom());

  it("makes each added project one building, named after it", () => {
    get().addProject(ADU_PROJECT);
    get().addProject(ADU_PROJECT);
    expect(get().buildings.map((b) => b.name)).toEqual([ADU_PROJECT.name, `${ADU_PROJECT.name} 2`]);
    const [first, second] = get().buildings;
    expect(get().rooms.filter((r) => r.buildingId === first.id)).toHaveLength(3);
    expect(get().rooms.filter((r) => r.buildingId === second.id)).toHaveLength(3);
    expect(get().rooms[0].buildingId).toBeUndefined();
    get().undo();
    expect(get().buildings).toEqual([first]);
  });

  it("groups rooms into a new building, adds others to it, and merges buildings into the first", () => {
    const [a, b, c, d] = addRooms(4);
    const building = get().groupRooms([b, a])!;
    expect(get().buildings).toEqual([{ id: building, name: "Building" }]);
    expect([room(a), room(b)].map((r) => r.buildingId)).toEqual([building, building]);

    get().groupRooms([c, a]);
    expect(room(c).buildingId).toBe(building);
    const count = get().past.length;
    expect(get().groupRooms([a, b, c])).toBe(building);
    expect(get().past).toHaveLength(count); // already one building: nothing to record

    const other = get().groupRooms([d])!;
    expect(other).not.toBe(building);
    expect(get().buildings.map((x) => x.name)).toEqual(["Building", "Building 2"]);
    get().groupRooms([d, a]);
    expect(room(d).buildingId).toBe(building); // a is listed first, so its building takes the rest in
    expect(get().buildings.map((x) => x.id)).toEqual([building]);
  });

  it("ungroups without moving rooms and drops buildings left empty", () => {
    const [a, b] = addRooms(2);
    const building = get().groupRooms([a, b])!;
    const before = [room(a).position, room(b).position];
    get().ungroupRooms([a]);
    expect(room(a)).not.toHaveProperty("buildingId");
    expect(get().buildings).toHaveLength(1);
    get().ungroupRooms([b]);
    expect(get().buildings).toEqual([]);
    expect([room(a).position, room(b).position]).toEqual(before);
    get().undo();
    expect(get().buildings.map((x) => x.id)).toEqual([building]);
    expect(room(b).buildingId).toBe(building);
  });

  it("renames buildings as an undoable step and ignores empty names", () => {
    const building = get().groupRooms(addRooms(1))!;
    get().renameBuilding(building, "  Garage  ");
    expect(get().buildings[0].name).toBe("Garage");
    get().renameBuilding(building, "   ");
    expect(get().buildings[0].name).toBe("Garage");
    get().undo();
    expect(get().buildings[0].name).toBe("Building");
  });

  it("deletes ticked rooms in one undo step, keeping at least one room", () => {
    const [a, b, c] = addRooms(3);
    get().groupRooms([b, c]);
    get().setCheckedRooms([b, c, a]);
    expect(get().checkedRoomIds).toEqual([a, b, c]);
    const count = get().past.length;
    get().removeRooms([b, c]);
    expect(ids()).not.toContain(b);
    expect(get().buildings).toEqual([]);
    expect(get().checkedRoomIds).toEqual([a]);
    expect(get().past).toHaveLength(count + 1);
    get().undo();
    expect(ids()).toContain(c);
    expect(get().buildings).toHaveLength(1);
    get().removeRooms(ids());
    expect(get().rooms).toHaveLength(4);
  });

  it("keeps ticks out of the document and the undo history", () => {
    const [a] = addRooms(1);
    const count = get().past.length;
    get().setCheckedRooms([a, "missing", a]);
    expect(get().checkedRoomIds).toEqual([a]);
    expect(get().past).toHaveLength(count);
    expect(selectLayout(get())).not.toHaveProperty("checkedRoomIds");
    get().undo(); // removes room a
    expect(get().checkedRoomIds).toEqual([]);
  });

  it("moves, nudges and turns ticked rooms as one unit", () => {
    const first = active().id;
    const [a, b] = addRooms(2);
    get().setCheckedRooms([a, b]);
    expect(movingUnit(get(), a)).toEqual([a, b]);
    expect(movingUnit(get(), first)).toEqual([first]);
    const corners = () => [a, b].flatMap((id) => roomCorners(room(id)));
    const gap = (p: number[][]) => Math.hypot(p[0][0] - p[4][0], p[0][1] - p[4][1]);
    const before = corners();
    get().moveRooms([a, b], [1.5, -2]);
    corners().forEach(([x, z], i) => {
      expect(x).toBeCloseTo(before[i][0] + 1.5);
      expect(z).toBeCloseTo(before[i][1] - 2);
    });
    const count = get().past.length;
    get().rotateRooms([a, b], 90);
    expect(get().past).toHaveLength(count + 1);
    expect([room(a).rotation, room(b).rotation]).toEqual([90, 90]);
    expect(gap(corners())).toBeCloseTo(gap(before));
    get().rotateRooms([first], 90);
    expect(room(first).position).toEqual(get().past.at(-1)!.rooms.find((r) => r.id === first)!.position);
  });

  it("joins a whole unit against another room", () => {
    const first = active().id;
    const [a, b] = addRooms(2);
    get().moveRooms([a, b], [10, 10]);
    const offset = room(b).position[0] - room(a).position[0];
    get().attachRoom(a, first, "right", [a, b]);
    const unit = [a, b].map((id) => roomBounds(room(id), true));
    expect(Math.min(...unit.map((u) => u.minX))).toBeCloseTo(roomBounds(room(first), true).maxX);
    expect(room(b).position[0] - room(a).position[0]).toBeCloseTo(offset);
  });

  it("saves buildings, and only when there are some", () => {
    expect(selectLayout(get())).not.toHaveProperty("buildings");
    get().groupRooms(addRooms(2));
    const document = selectLayout(get());
    expect(document.buildings).toHaveLength(1);
    expect(parseLayout(JSON.parse(JSON.stringify(document)))).toEqual(document);
  });
});

describe("showing one building", () => {
  const shown = () => selectVisibleRooms(get()).map((r) => r.id);

  it("shows only the selected room's building, in place, after adding a project", () => {
    const loose = active().id;
    get().addProject(ADU_PROJECT);
    const adu = get().rooms.filter((r) => r.buildingId).map((r) => r.id);
    expect(get().roomDisplay).toBe("building");
    expect(shown()).toEqual(adu);
    expect(selectVisibleRooms(get()).map((r) => r.position)).toEqual(get().rooms.slice(1).map((r) => r.position));
    get().setRoomDisplay("all");
    expect(shown()).toEqual([loose, ...adu]);
  });

  it("shows a room in no building on its own", () => {
    get().addProject(ADU_PROJECT);
    get().selectRoom(get().rooms[0].id);
    expect(selectCombined(get())).toBe(false);
    expect(selectVisibleRooms(get())).toEqual([{ ...get().rooms[0], position: [0, 0], rotation: 0, elevation: 0 }]);
  });

  it("switches to a building from the sidebar, keeping the room being edited when it is inside", () => {
    get().addProject(ADU_PROJECT);
    const [, kitchen, bedroom] = get().rooms;
    get().addProject(ADU_PROJECT);
    const [first, second] = get().buildings;
    get().setRoomDisplay("single");
    get().showBuilding(first.id);
    expect(get().activeRoomId).toBe(kitchen.id);
    expect(get().roomDisplay).toBe("building");
    get().selectRoom(bedroom.id);
    const token = get().cameraResetToken;
    get().showBuilding(first.id);
    expect(get().activeRoomId).toBe(bedroom.id);
    get().selectRoom(kitchen.id);
    expect(get().cameraResetToken).toBe(token + 1); // showBuilding reframes; moving within it doesn't
    get().selectRoom(get().rooms.find((r) => r.buildingId === second.id)!.id);
    expect(get().cameraResetToken).toBe(token + 2);
    expect(shown().every((id) => get().rooms.find((r) => r.id === id)!.buildingId === second.id)).toBe(true);
    get().showBuilding("missing");
    expect(get().buildings[1]).toBe(second);
  });

  it("saves the building view", () => {
    get().addProject(ADU_PROJECT);
    expect(parseLayout(JSON.parse(JSON.stringify(selectLayout(get()))))!.roomDisplay).toBe("building");
  });
});

describe("custom joins", () => {
  const room = (id: string) => get().rooms.find((r) => r.id === id)!;
  const doorAt = (id: string, wall: string, along: (o: { offset: number; width: number }) => number) => {
    const r = room(id), o = r.openings.find((x) => x.type === "door" && x.wall === wall)!;
    return localToWorld(wallToWorld(o.wall, along(o), 0, r.room), r);
  };
  const gap = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

  it("turns and places a room against the chosen wall and cuts one door through both walls", () => {
    const target = active().id;
    const moving = get().addRoom();
    get().setRoom({ width: 3, depth: 2.4 });
    const count = get().past.length;
    expect(get().joinRooms({ roomId: moving, wall: "front", targetId: target, targetWall: "right", align: "center", offset: 0.2,
      connection: "door", doorWidth: 0.8 })).toBe(true);
    expect(get().past).toHaveLength(count + 1);
    expect(room(moving).rotation).toBe(270);
    expect(roomsConflict(room(target), room(moving))).toBe(false);
    // The two doors face each other across the walls, and hinge on the same side.
    const middle = (o: { offset: number }) => o.offset, jamb = (hinge: string) => (o: { offset: number; width: number }) => o.offset + (hinge === "start" ? -1 : 1) * o.width / 2;
    expect(gap(doorAt(target, "right", middle), doorAt(moving, "front", middle))).toBeCloseTo(0.2);
    const hinge = (id: string) => room(id).openings.find((o) => o.type === "door")!.hinge;
    expect(gap(doorAt(target, "right", jamb(hinge(target))), doorAt(moving, "front", jamb(hinge(moving))))).toBeCloseTo(0.2);
    // Centered on the shared part: the moving wall spans 0.2–3.2 m along a 3 m wall.
    expect(room(target).openings.find((o) => o.type === "door")!.offset).toBeCloseTo((0.2 + 3) / 2);
    get().undo();
    expect(room(target).openings.some((o) => o.type === "door")).toBe(false);
    expect(room(moving).rotation).toBe(0);
  });

  it("opens two matching walls into one space, and only matching ones", () => {
    const target = active().id;
    const moving = get().addRoom();
    const count = get().past.length;
    expect(get().joinRooms({ roomId: moving, wall: "left", targetId: target, targetWall: "right", align: "start", offset: 0.5, connection: "open" })).toBe(false);
    expect(get().past).toHaveLength(count);
    expect(get().joinRooms({ roomId: moving, wall: "left", targetId: target, targetWall: "right", align: "start", offset: 0, connection: "open" })).toBe(true);
    expect(room(moving).openWalls).toEqual(["left"]);
    expect(room(target).openWalls).toEqual(["right"]);
    expect(room(moving).position).toEqual([4, room(target).position[1]]); // floors meet: no wall between
    expect(roomsConflict(room(target), room(moving))).toBe(false);
    // Joined again with walls, both walls come back.
    get().joinRooms({ roomId: moving, wall: "left", targetId: target, targetWall: "right", align: "start", offset: 0, connection: "wall" });
    expect(room(moving)).not.toHaveProperty("openWalls");
    expect(room(target)).not.toHaveProperty("openWalls");
  });

  it("refuses a door where the walls share too little, and joins that move a target along", () => {
    const target = active().id;
    const moving = get().addRoom();
    expect(get().joinRooms({ roomId: moving, wall: "left", targetId: target, targetWall: "right", align: "start", offset: 2.5, connection: "door" })).toBe(false);
    expect(get().joinRooms({ roomId: moving, wall: "left", targetId: target, targetWall: "right", align: "start", offset: 0, connection: "wall",
      together: [moving, target] })).toBe(false);
  });

  it("moves ticked rooms along with the joined one", () => {
    const target = active().id;
    const a = get().addRoom(), b = get().addRoom();
    get().moveRooms([a, b], [20, 5]);
    const before = roomCorners(room(b))[0], anchor = roomCorners(room(a))[0];
    get().joinRooms({ roomId: a, wall: "back", targetId: target, targetWall: "front", align: "start", offset: 0, connection: "wall", together: [a, b] });
    expect(room(a).position).toEqual([room(target).position[0], room(target).position[1] + 3.2]);
    expect(gap(roomCorners(room(b))[0], roomCorners(room(a))[0])).toBeCloseTo(gap(before, anchor));
  });
});
