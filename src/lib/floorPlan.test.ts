import { describe, expect, it } from "vitest";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import { detectRooms, planToProject, roomAt, roomFit, scaleProblem, wallMap, type PixelRect } from "./floorPlan";

/**
 * A 400 × 300 plan with 8 px walls: one room on the left, two on the right.
 * The partition has a door gap at y 180–215, the right-hand wall one at x 280–300,
 * and the left room holds a thin "label" that must not read as a wall.
 */
function plan({ window = false } = {}) {
  const W = 400, H = 300;
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  const paint = (x0: number, y0: number, x1: number, y1: number, v = 40) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set([v, v, v, 255], (y * W + x) * 4);
  };
  paint(20, 20, 380, 28); paint(20, 272, 380, 280); paint(20, 20, 28, 280); paint(372, 20, 380, 280); // outside
  paint(200, 28, 208, 180); paint(200, 215, 208, 272); // partition with a door
  paint(208, 120, 280, 128); paint(300, 120, 372, 128); // right-hand wall with a door
  paint(50, 60, 90, 62, 20); paint(70, 45, 72, 80, 20); // a label: 2 px strokes
  if (window) {
    // A wide window in the left outside wall, drawn as three thin lines across the wall's thickness.
    paint(20, 60, 28, 250, 255);
    for (const x of [20, 23, 26]) paint(x, 60, x + 1, 250, 40);
  }
  return { data, W, H };
}

const A: PixelRect = { x0: 28, y0: 28, x1: 200, y1: 272 };
const B: PixelRect = { x0: 208, y0: 28, x1: 372, y1: 120 };
const C: PixelRect = { x0: 208, y0: 128, x1: 372, y1: 272 };

describe("floor plan reading", () => {
  const { data, W, H } = plan();
  const map = wallMap(data, W, H);

  it("treats thick dark bands as walls and thin strokes as not", () => {
    expect(map.wall[24 * W + 100]).toBe(1);
    expect(map.wall[61 * W + 60]).toBe(0);
    expect(map.wall[100 * W + 100]).toBe(0);
  });

  it("finds the room around a point, even with a door in line with it", () => {
    expect(roomAt(map, 110, 100)).toEqual(A);
    expect(roomAt(map, 110, 197)).toEqual(A); // the first rays go through the door; the rest outvote them
    expect(roomAt(map, 60, 61)).toEqual(A); // on the label
    expect(roomAt(map, 290, 70)).toEqual(B);
    expect(roomAt(map, 290, 200)).toEqual(C);
  });

  it("looks past a wide window drawn with thin lines", () => {
    const { data: withWindow } = plan({ window: true });
    const glazed = wallMap(withWindow, W, H);
    expect(roomAt(glazed, 110, 150)).toEqual(A);
    expect(detectRooms(glazed)).toEqual([A, C, B]);
  });

  it("finds nothing on a wall or outside the building", () => {
    expect(roomAt(map, 204, 100)).toBeNull();
    expect(roomAt(map, 5, 5)).toBeNull();
    expect(roomAt(map, 390, 150)).toBeNull();
  });

  it("detects every room once, largest first", () => {
    expect(detectRooms(map)).toEqual([A, C, B]);
  });

  it("flags areas too small to be rooms, and scales that can't be right", () => {
    expect(roomFit(A, 0.025)).toBe("ok");
    expect(roomFit({ x0: 0, y0: 0, x1: 30, y1: 50 }, 0.025)).toBe("small"); // 0.75 × 1.25 m: a closet
    expect(roomFit({ x0: 0, y0: 0, x1: 20, y1: 80 }, 0.025)).toBe("tooSmall"); // 0.5 m wide
    expect(roomFit(A, 0.001)).toBe("tooSmall"); // a 1 mm-per-pixel scale makes every room tiny

    expect(scaleProblem([A, B, C], 0.025)).toBeNull();
    expect(scaleProblem([A, B, C], 0.002)).toEqual({ kind: "tiny", largest: 244 * 0.002 });
    expect(scaleProblem([A, B, C], 0.5)?.kind).toBe("huge");
  });

  it("turns traced rooms into placed rooms in meters", () => {
    const project = planToProject([{ name: "Left", rect: A }, { name: "Top", rect: B }, { name: "Bottom", rect: C }], 0.025, 2.8, "Flat");
    expect(project.rooms.map((r) => [r.position, r.room])).toEqual([
      [[0, 0], { width: 4.3, depth: 6.1, height: 2.8 }],
      [[4.5, 0], { width: 4.1, depth: 2.3, height: 2.8 }],
      [[4.5, 2.5], { width: 4.1, depth: 3.6, height: 2.8 }],
    ]);

    const before = useEditor.getState().rooms;
    useEditor.getState().addProject(project, { replace: true });
    const s = useEditor.getState();
    expect(s.rooms.map((r) => r.name)).toEqual(["Left", "Top", "Bottom"]);
    expect(s.rooms[0].position).toEqual([0.1, 0.1]);
    expect(selectActiveRoom(s).name).toBe("Left");
    s.undo();
    expect(useEditor.getState().rooms).toBe(before);
  });
});
