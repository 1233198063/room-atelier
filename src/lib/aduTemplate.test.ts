import { describe, expect, it } from "vitest";
import { constrainFurniture } from "../store/editorStore";
import type { Opening, ProjectRoom } from "../types";
import { ADU_PROJECT } from "./aduTemplate";
import { COUNTER_STOOL_H } from "./catalog";
import { wallClearances } from "./geometry";
import { checkLayout } from "./layoutChecks";
import { constrainOpening, wallToWorld } from "./openings";
import { localToWorld, roomsConflict } from "./rooms";

const rooms: ProjectRoom[] = ADU_PROJECT.rooms.map((r, i) => ({ ...r, id: `r${i}`, palette: r.palette! }));
const byName = (part: string) => rooms.find((r) => r.name.includes(part))!;
const piece = (r: ProjectRoom, id: string) => r.furniture.find((f) => f.id === `adu-${id}`)!;

/** Where a door's center meets the floor, in world coordinates. */
function doorway(r: ProjectRoom, o: Opening) {
  return localToWorld(wallToWorld(o.wall, o.offset, 0, r.room), r);
}

describe("ADU from viewing photos", () => {
  it.each(ADU_PROJECT.rooms.map((r) => [r.name, r] as const))("%s keeps every designed size and position", (_, r) => {
    for (const f of r.furniture) {
      expect(constrainFurniture(f, r.room), f.name).toEqual(f);
      for (const gap of Object.values(wallClearances(f, r.room))) expect(gap, f.name).toBeGreaterThanOrEqual(-0.001);
    }
    for (const o of r.openings) expect(constrainOpening(o, r.room), o.name).toEqual(o);
  });

  it.each(rooms.map((r) => [r.name, r] as const))("%s has no layout warnings", (_, r) => {
    const warnings = checkLayout(r.room, r.furniture, r.openings).filter((issue) => issue.severity === "warning");
    expect(warnings.map((issue) => `${issue.key}: ${issue.title}`)).toEqual([]);
  });

  it("uses unique ids across the whole project", () => {
    const ids = rooms.flatMap((r) => [...r.furniture, ...r.openings].map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("joins the rooms wall to wall, with each connecting door cut through both walls", () => {
    for (const a of rooms) for (const b of rooms) if (a !== b) expect(roomsConflict(a, b), `${a.name} × ${b.name}`).toBe(false);
    const great = byName("客厅");
    for (const [other, name] of [[byName("卧室"), "卧室门"], [byName("卫生间"), "卫生间门"]] as const) {
      const here = great.openings.find((o) => o.name === name)!, there = other.openings.find((o) => o.name === name)!;
      expect(there.width).toBe(here.width);
      const [x0, z0] = doorway(great, here), [x1, z1] = doorway(other, there);
      // The two wall faces are two wall thicknesses apart; along the wall they line up.
      expect(Math.hypot(x1 - x0, z1 - z0), name).toBeCloseTo(0.2, 3);
    }
  });

  it("hangs the microwave and wall cabinets clear of the counters below", () => {
    const great = byName("客厅");
    const range = piece(great, "great-range"), microwave = piece(great, "great-microwave");
    expect(microwave.position[1]).toBeGreaterThan(range.position[1] + range.dimensions.height + 0.4);
    for (const f of great.furniture.filter((p) => p.type === "wallCabinet")) {
      expect(f.position[1] + f.dimensions.height, f.name).toBeLessThanOrEqual(great.room.height);
      expect(f.position[1], f.name).toBeGreaterThanOrEqual(1.45);
    }
  });

  it("seats the bistro table on counter stools", () => {
    const great = byName("客厅");
    const table = piece(great, "great-bistro");
    const stools = great.furniture.filter((f) => f.type === "chair");
    expect(stools).toHaveLength(2);
    for (const s of stools) expect(s.dimensions.height).toBeGreaterThanOrEqual(COUNTER_STOOL_H);
    expect(table.dimensions.height).toBeGreaterThan(0.85);
  });
});
