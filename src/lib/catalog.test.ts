import { describe, expect, it } from "vitest";
import { constrainFurniture } from "../store/editorStore";
import type { Furniture, FurnitureType, Opening, Room } from "../types";
import { CATALOG, LIBRARY } from "./catalog";
import { checkLayout } from "./layoutChecks";

const room: Room = { width: 4, depth: 3, height: 2.6 };
const window_: Opening = { id: "w", type: "window", name: "Window", wall: "back", offset: 2, width: 1, height: 1.2, elevation: 0.9, hinge: "start" };

let n = 0;
const piece = (type: FurnitureType, x: number, z: number, size?: [number, number, number], rotation = 0): Furniture => {
  const { width, depth, height } = CATALOG[type].defaults;
  const [w, d, h] = size ?? [width, depth, height];
  return { id: `${type}-${++n}`, type, name: type, position: [x, 0, z], rotation, dimensions: { width: w, depth: d, height: h } };
};
const keys = <T extends { key: string }>(issues: T[], prefix: string) => issues.filter((i) => i.key.startsWith(prefix));

describe("library", () => {
  const presets = LIBRARY.flatMap((c) => c.presets);

  it("uses unique card ids", () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
  });

  it.each(presets.map((p) => [p.id, p] as const))("%s fits its model's size limits", (_, p) => {
    const dimensions = p.dimensions ?? CATALOG[p.type].defaults;
    const f: Furniture = { id: p.id, type: p.type, name: p.id, position: [5, p.elevation ?? 0, 5], rotation: 0, dimensions };
    expect(constrainFurniture(f, { width: 10, depth: 10, height: 3 }).dimensions).toEqual(dimensions);
  });
});

describe("checks for the new pieces", () => {
  it("wants room in front of a toilet and a fridge", () => {
    const toilet = piece("toilet", 2, 2.6, undefined, 180); // facing the back wall, 1.9 m away
    expect(keys(checkLayout(room, [toilet], [window_]), "front-space")).toHaveLength(0);
    const cramped = piece("toilet", 2, 0.35); // back to the back wall, a cabinet 30 cm in front
    const cabinet = piece("cabinet", 2, 1.2, [0.8, 0.4, 0.9], 180);
    const [issue] = keys(checkLayout(room, [cramped, cabinet], [window_]), "front-space");
    expect(issue.targets).toEqual([cramped.id, cabinet.id]);
    expect(issue.detail).toContain("50 cm");

    const fridge = piece("fridge", 1, 2.65, undefined, 0); // doors facing the front wall, 0 cm away
    expect(keys(checkLayout(room, [fridge], [window_]), "opening-space")[0].title).toContain("faces the wall");
  });

  it("lets counters meet in an L, but checks the aisle to an island", () => {
    const back = piece("kitchenCounter", 1.2, 0.3, [2.4, 0.6, 0.85]);
    const side = piece("kitchenCounter", 0.3, 1.5, [1.8, 0.6, 0.85], 90); // along the left wall, meeting the back run
    expect(keys(checkLayout(room, [back, side], [window_]), "front-space")).toHaveLength(0);

    const island = piece("kitchenCounter", 1.4, 1.2, [1.6, 0.6, 0.85], 180);
    const [issue] = keys(checkLayout(room, [back, island], [window_]), "front-space");
    expect(issue.detail).toContain("80 cm");
  });

  it("tucks an office chair under a desk or round table", () => {
    const desk = piece("desk", 2, 0.3), chair = piece("officeChair", 2, 0.5);
    const table = piece("roundTable", 2, 2), seat = piece("officeChair", 2, 2.3);
    expect(keys(checkLayout(room, [desk, chair, table, seat], [window_]), "overlap")).toHaveLength(0);
  });

  it("leaves a wall-hung TV out of floor checks", () => {
    const stand = piece("dresser", 2, 0.25, [2, 0.4, 0.5]);
    const tv: Furniture = { ...piece("tv", 2, 0.04), position: [2, 0.85, 0.04] };
    expect(checkLayout(room, [stand, tv], [window_]).filter((i) => i.targets.includes(tv.id))).toEqual([]);
  });
});
