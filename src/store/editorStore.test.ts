import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import { useEditor } from "./editorStore";

const initial = useEditor.getState();
const get = () => useEditor.getState();

beforeEach(() => {
  useEditor.setState(
    {
      ...initial,
      room: { width: 4, depth: 3, height: 2.6 },
      furniture: [],
      openings: [],
      selectedId: null,
      past: [],
      future: [],
    },
    true,
  );
});

describe("editor store", () => {
  it("adds furniture inside the room and selects it", () => {
    const id = get().addFurniture("bed");
    const bed = get().furniture.find((f) => f.id === id)!;
    expect(get().selectedId).toBe(id);
    expect(bed.position[0] - bed.dimensions.width / 2).toBeGreaterThanOrEqual(0);
    expect(bed.position[2] + bed.dimensions.depth / 2).toBeLessThanOrEqual(3);
  });

  it("clamps updates so furniture never leaves the room", () => {
    const id = get().addFurniture("desk");
    get().updateFurniture(id, { position: [99, -1, -99] });
    const desk = get().furniture[0];
    expect(desk.position).toEqual([3.4, 0, 0.3]);
  });

  it("undoes and redoes", () => {
    const id = get().addFurniture("chair");
    get().updateFurniture(id, { rotation: 90 });
    expect(get().furniture[0].rotation).toBe(90);
    get().undo();
    expect(get().furniture[0].rotation).toBe(0);
    get().undo();
    expect(get().furniture).toHaveLength(0);
    expect(get().selectedId).toBeNull();
    get().redo();
    get().redo();
    expect(get().furniture[0].rotation).toBe(90);
  });

  it("records a whole drag gesture as one undo step", () => {
    const id = get().addFurniture("chair");
    const before = get().past.length;
    get().beginGesture();
    for (let i = 1; i <= 10; i++) get().updateFurniture(id, { position: [0.5 + i * 0.1, 0, 1] }, { history: false });
    get().endGesture();
    expect(get().past.length).toBe(before + 1);
    get().undo();
    expect(get().furniture[0].position[0]).not.toBeCloseTo(1.5);
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
      const [x, y, z] = get().furniture[0].position;
      get().updateFurniture(id, { position: [x + 0.01, y, z] }, { coalesceKey: `nudge:${id}` });
    }
    expect(get().past.length).toBe(before + 1);
  });

  it("pulls furniture back inside when the room shrinks", () => {
    get().loadSample();
    get().setRoom({ width: 2 });
    for (const f of get().furniture) {
      expect(f.position[0]).toBeLessThanOrEqual(2);
    }
    get().undo();
    expect(get().room.width).toBe(SAMPLE_LAYOUT.room.width);
  });

  it("adds a dresser with its catalog defaults", () => {
    get().addFurniture("dresser");
    expect(get().furniture[0]).toMatchObject({ type: "dresser", name: "Dresser" });
    expect(get().furniture[0].dimensions).toEqual({ width: 1.2, depth: 0.48, height: 0.8 });
  });

  it("duplicates with a fresh id and a numbered name", () => {
    const id = get().addFurniture("cabinet");
    get().duplicateFurniture(id);
    const [a, b] = get().furniture;
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe("Cabinet 2");
    expect(get().selectedId).toBe(b.id);
  });

  it("adds openings on a wall and selects them", () => {
    const id = get().addOpening("window");
    const w = get().openings[0];
    expect(get().selectedId).toBe(id);
    expect(w).toMatchObject({ wall: "back", offset: 2, elevation: 0.9 });
  });

  it("slides openings along walls and keeps them on the wall", () => {
    const id = get().addOpening("door");
    get().updateOpening(id, { wall: "left", offset: 99 });
    const door = get().openings[0];
    expect(door.wall).toBe("left");
    expect(door.offset + door.width / 2).toBeCloseTo(3);
  });

  it("removes and duplicates whatever is selected", () => {
    get().addOpening("window");
    get().duplicateSelection();
    expect(get().openings).toHaveLength(2);
    expect(get().openings[1].name).toBe("Window 2");
    get().removeSelection();
    expect(get().openings).toHaveLength(1);
    get().undo();
    expect(get().openings).toHaveLength(2);
  });

  it("pulls openings back onto shrunken walls", () => {
    const id = get().addOpening("window");
    get().updateOpening(id, { offset: 3.3 });
    get().setRoom({ width: 2 });
    const w = get().openings[0];
    expect(w.offset + w.width / 2).toBeLessThanOrEqual(2 + 1e-9);
  });

  it("applies palettes and edits colors as undoable steps", () => {
    get().applyPalette("japandi");
    expect(get().palette.id).toBe("japandi");
    get().setPaletteColors({ accent: "#123456" });
    expect(get().palette).toMatchObject({ id: "custom", accent: "#123456", wall: "#ebe5da" });
    get().undo();
    expect(get().palette.id).toBe("japandi");
    get().undo();
    expect(get().palette.id).toBe("warm-oak");
  });
});
