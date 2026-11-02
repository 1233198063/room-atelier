import { describe, expect, it } from "vitest";
import { constrainFurniture } from "../store/editorStore";
import type { ProjectRoom } from "../types";
import { GALLERY_RAIL } from "./catalog";
import { wallClearances } from "./geometry";
import { checkLayout } from "./layoutChecks";
import { constrainOpening } from "./openings";
import { DEFAULT_PALETTE } from "./palettes";
import { gardenHoles, isOutdoor, roomsConflict } from "./rooms";
import { VILLA_PROJECT } from "./villaTemplate";

const rooms: ProjectRoom[] = VILLA_PROJECT.rooms.map((r, i) => ({ ...r, id: `r${i}`, palette: r.palette ?? DEFAULT_PALETTE }));
const byName = (part: string) => rooms.find((r) => r.name.includes(part))!;

describe("villa with an underground library", () => {
  it.each(VILLA_PROJECT.rooms.map((r) => [r.name, r] as const))("%s keeps every designed size and position", (_, r) => {
    for (const f of r.furniture) {
      expect(constrainFurniture(f, r.room), f.name).toEqual(f);
      for (const gap of Object.values(wallClearances(f, r.room))) expect(gap, f.name).toBeGreaterThanOrEqual(-0.001);
    }
    for (const o of r.openings) expect(constrainOpening(o, r.room), o.name).toEqual(o);
  });

  it.each(rooms.map((r) => [r.name, r] as const))("%s has no layout warnings", (_, r) => {
    const warnings = checkLayout(r.room, r.furniture, r.openings, { outdoor: isOutdoor(r) })
      .filter((issue) => issue.severity === "warning");
    expect(warnings.map((issue) => `${issue.key}: ${issue.title}`)).toEqual([]);
  });

  it("uses unique ids across the whole project", () => {
    const ids = rooms.flatMap((r) => [...r.furniture, ...r.openings].map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stacks the floors and joins the wings without any room colliding", () => {
    for (const a of rooms) for (const b of rooms) if (a !== b) expect(roomsConflict(a, b), `${a.name} × ${b.name}`).toBe(false);
  });

  it("puts the library and courtyard on the same level underground, with matching glass", () => {
    const library = byName("图书馆"), court = byName("下沉庭院");
    expect(library.elevation).toBe(court.elevation);
    expect(library.elevation! + court.room.height).toBeCloseTo(0);
    const glass = (r: ProjectRoom, wall: string) => r.openings.filter((o) => o.wall === wall).map((o) => [o.offset, o.elevation, o.width, o.height]);
    expect(glass(court, "back")).toEqual(glass(library, "front"));
    expect(court.position[0]).toBe(library.position[0]);
  });

  it("opens the lawn above the sunken courtyard only", () => {
    const holes = gardenHoles(byName("花园"), rooms);
    expect(holes).toHaveLength(1);
    const xs = holes[0].map((p) => p[0]), zs = holes[0].map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(14.9);
    expect(Math.max(...zs)).toBeCloseTo(36.3);
  });

  it("brings the curved stair up level with the gallery deck", () => {
    const library = byName("图书馆");
    const stair = library.furniture.find((f) => f.type === "spiralStair")!;
    const gallery = library.furniture.find((f) => f.type === "gallery")!;
    const deck = gallery.dimensions.height - GALLERY_RAIL;
    expect(stair.dimensions.height).toBeCloseTo(deck);
    for (const f of library.furniture.filter((p) => p.position[1] > 3 && p.type !== "artwork")) expect(f.position[1], f.name).toBeCloseTo(deck);
  });
});
