import { describe, expect, it } from "vitest";
import { constrainFurniture } from "../store/editorStore";
import type { Opening, ProjectRoom } from "../types";
import { APARTMENT_PROJECT } from "./apartmentTemplate";
import { footprintBounds, wallClearances } from "./geometry";
import { checkLayout } from "./layoutChecks";
import { constrainOpening, WALL_T, wallToWorld } from "./openings";
import { localToWorld, roomBounds, roomsConflict } from "./rooms";

const rooms: ProjectRoom[] = APARTMENT_PROJECT.rooms.map((r, i) => ({ ...r, id: `r${i}`, palette: r.palette! }));
const byName = (name: string) => rooms.find((r) => r.name === name)!;
const piece = (r: ProjectRoom, id: string) => r.furniture.find((f) => f.id === `apt-${id}`)!;
const living = byName("客厅 · 工作与用餐"), kitchen = byName("厨房与入户走廊"), bedroom = byName("卧室");
const closet = byName("步入式衣柜"), bathroom = byName("浴室");
const inch = 0.0254;

/** Where a door's center meets the floor, in world coordinates. */
function doorway(r: ProjectRoom, o: Opening) {
  return localToWorld(wallToWorld(o.wall, o.offset, 0, r.room), r);
}

describe("one-bedroom apartment from a floor plan", () => {
  it.each(APARTMENT_PROJECT.rooms.map((r) => [r.name, r] as const))("%s keeps every designed size and position", (_, r) => {
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

  it("lines up the outside walls like the plan's rectangle", () => {
    const b = rooms.map((r) => roomBounds(r));
    const [l, k, bed, c, bath] = b;
    expect(bed.maxX).toBeCloseTo(c.maxX, 6);
    expect(bath.maxX).toBeCloseTo(c.maxX, 6);
    expect(bath.maxZ).toBeCloseTo(k.maxZ, 6);
    expect(l.minX).toBeCloseTo(k.minX, 6);
    expect(bed.minZ).toBeCloseTo(l.minZ, 6);
  });

  it("opens the living room onto the kitchen, closed beyond it by the bedroom's front wall", () => {
    expect(living.openWalls).toEqual(["front"]);
    expect(kitchen.openWalls).toEqual(["back"]);
    const l = roomBounds(living), k = roomBounds(kitchen), bed = roomBounds(bedroom);
    expect(l.maxZ).toBeCloseTo(k.minZ, 6);
    // The rest of the kitchen's back edge is the outside face of the bedroom's front wall.
    expect(bed.maxZ + WALL_T).toBeCloseTo(k.minZ, 6);
    expect(bed.minX).toBeLessThan(k.maxX);
    const door = bedroom.openings.find((o) => o.name === "卧室门")!;
    const [x, z] = doorway(bedroom, door);
    expect(z + WALL_T).toBeCloseTo(k.minZ, 6);
    expect(x - door.width / 2).toBeGreaterThan(l.maxX + 2 * WALL_T);
    expect(x + door.width / 2).toBeLessThan(k.maxX);
  });

  it("joins the closet and bathroom wall to wall, with each door cut through both walls", () => {
    for (const a of rooms) for (const b of rooms) if (a !== b) expect(roomsConflict(a, b), `${a.name} × ${b.name}`).toBe(false);
    for (const [from, to, name] of [[bedroom, closet, "衣柜门"], [kitchen, bathroom, "浴室门"]] as const) {
      const here = from.openings.find((o) => o.name === name)!, there = to.openings.find((o) => o.name === name)!;
      expect(there.width).toBe(here.width);
      expect(there.hinge).toBe(here.hinge);
      const [x0, z0] = doorway(from, here), [x1, z1] = doorway(to, there);
      // The two wall faces are two wall thicknesses apart; along the wall they line up.
      expect(Math.hypot(x1 - x0, z1 - z0), name).toBeCloseTo(2 * WALL_T, 3);
    }
  });

  it("hangs the doors as on the building's plan", () => {
    const door = (r: ProjectRoom, name: string) => r.openings.find((o) => o.name === name)!;
    // The closet opens off the bedroom, beside the bedroom door, and swings into the closet.
    expect(kitchen.openings.some((o) => o.name === "衣柜门")).toBe(false);
    expect(door(bedroom, "衣柜门")).toMatchObject({ wall: "front", opensAway: true });
    expect(door(closet, "衣柜门").opensAway).toBeUndefined();
    const between = door(bedroom, "衣柜门").offset - door(bedroom, "衣柜门").width / 2 - (door(bedroom, "卧室门").offset + door(bedroom, "卧室门").width / 2);
    expect(between).toBeGreaterThan(0.3);
    expect(between).toBeLessThan(0.45);
    // The bathroom door is hinged at its top jamb, just below the tub, and swings into the bathroom.
    const bath = door(bathroom, "浴室门"), tub = footprintBounds(piece(bathroom, "bath-tub"));
    expect(bath.hinge).toBe("start");
    expect(bath.opensAway).toBeUndefined();
    expect(door(kitchen, "浴室门").opensAway).toBe(true);
    expect(bath.offset - bath.width / 2 - tub.maxZ).toBeCloseTo(0.15, 2);
    // The front door is hinged on the side toward the laundry, which faces the hall nook.
    const front = door(kitchen, "入户门"), washer = piece(kitchen, "kitchen-washer");
    expect(front.hinge).toBe("end");
    expect(washer.rotation).toBe(180);
    expect(footprintBounds(washer).minX).toBeGreaterThan(front.offset + front.width / 2);
    // Every door on that plan is 30 in.
    for (const r of rooms) for (const o of r.openings.filter((x) => x.type === "door")) expect(o.width, `${r.name} ${o.name}`).toBe(0.76);
  });

  it("lays out the kitchen run and the bathroom as on the building's plan", () => {
    // From the living room to the entry, along the left wall, edge to edge.
    const run = ["dishwasher", "sink", "range", "counter", "fridge"].map((id) => footprintBounds(piece(kitchen, `kitchen-${id}`)));
    expect(run[0].minZ).toBeCloseTo(0, 6);
    for (let i = 1; i < run.length; i++) expect(run[i].minZ).toBeCloseTo(run[i - 1].maxZ, 6);
    for (const b of run) expect(b.minX).toBeCloseTo(0, 6);
    // Wall cabinets hang over the counters, clear of the range top and below the ceiling.
    const range = piece(kitchen, "kitchen-range");
    for (const f of kitchen.furniture.filter((x) => x.type === "wallCabinet")) {
      expect(f.position[1] + f.dimensions.height, f.name).toBeLessThanOrEqual(kitchen.room.height);
      expect(footprintBounds(f).maxZ, f.name).toBeLessThanOrEqual(footprintBounds(piece(kitchen, "kitchen-fridge")).minZ + 1e-6);
    }
    expect(piece(kitchen, "kitchen-upper-range").position[1]).toBeGreaterThan(range.dimensions.height + 0.7);
    // A 60 × 30 in tub across the back; the vanity and the toilet against the front wall, facing into the room.
    const tub = piece(bathroom, "bath-tub");
    expect([tub.dimensions.width, tub.dimensions.depth].map((m) => Math.round(m / inch))).toEqual([60, 30]);
    expect(footprintBounds(tub).maxX).toBeCloseTo(bathroom.room.width, 6);
    const vanity = piece(bathroom, "bath-vanity"), toilet = piece(bathroom, "bath-toilet");
    for (const f of [vanity, toilet]) {
      expect(f.rotation, f.name).toBe(180);
      expect(footprintBounds(f).maxZ, f.name).toBeCloseTo(bathroom.room.depth, 6);
    }
    expect(footprintBounds(vanity).minX).toBeCloseTo(0, 6);
    expect(footprintBounds(toilet).minX).toBeGreaterThan(footprintBounds(vanity).maxX);
  });

  it("leaves at least the clearances written on the plan", () => {
    const bed = footprintBounds(piece(bedroom, "bed-bed")), desk = footprintBounds(piece(bedroom, "bed-desk"));
    expect(bed.minX, "41″ passage beside the bed").toBeGreaterThanOrEqual(41 * inch);
    expect(bed.minZ - desk.maxZ, "34″ from the desk to the bed").toBeGreaterThanOrEqual(34 * inch);
    const chair = footprintBounds(piece(living, "living-chair-1"));
    expect(living.room.depth - chair.maxZ, "76″ behind the chairs").toBeGreaterThanOrEqual(76 * inch);
    const counter = footprintBounds(piece(kitchen, "kitchen-counter")), storage = footprintBounds(piece(kitchen, "kitchen-storage"));
    expect(storage.minX - counter.maxX, "98″ kitchen aisle").toBeGreaterThanOrEqual(98 * inch);
  });

  it("sizes the furniture as labelled on the plan", () => {
    const inches = (id: [ProjectRoom, string]) => {
      const { width, depth } = piece(...id).dimensions;
      return [width, depth].map((m) => Math.round(m / inch));
    };
    expect(inches([living, "living-table"])).toEqual([72, 30]);
    expect(inches([living, "living-crate"])).toEqual([42, 28]);
    expect(inches([bedroom, "bed-desk"])).toEqual([48, 24]);
    expect(inches([bedroom, "bed-bed"])).toEqual([60, 80]);
  });

  it("stacks the dryer on the washer, under the ceiling", () => {
    const washer = piece(kitchen, "kitchen-washer"), dryer = piece(kitchen, "kitchen-dryer");
    expect([dryer.position[0], dryer.position[2]]).toEqual([washer.position[0], washer.position[2]]);
    expect(dryer.position[1]).toBeCloseTo(washer.dimensions.height, 6);
    expect(dryer.position[1] + dryer.dimensions.height).toBeLessThan(kitchen.room.height);
  });
});
