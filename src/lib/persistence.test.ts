import { describe, expect, it } from "vitest";
import { parseLayout } from "./persistence";
import { SAMPLE_LAYOUT } from "./sampleLayout";

describe("parseLayout", () => {
  it("round-trips a valid layout", () => {
    expect(parseLayout(JSON.parse(JSON.stringify(SAMPLE_LAYOUT)))).toEqual(SAMPLE_LAYOUT);
  });

  it("loads saves from before doors and windows existed", () => {
    const { openings: _, ...legacy } = SAMPLE_LAYOUT;
    expect(parseLayout(JSON.parse(JSON.stringify(legacy)))?.openings).toEqual([]);
  });

  it("drops malformed openings", () => {
    const parsed = parseLayout({
      ...SAMPLE_LAYOUT,
      openings: [SAMPLE_LAYOUT.openings[0], { ...SAMPLE_LAYOUT.openings[1], wall: "ceiling" }, { id: "x", type: "portal" }],
    });
    expect(parsed?.openings.map((o) => o.id)).toEqual([SAMPLE_LAYOUT.openings[0].id]);
  });

  it("rejects garbage and unknown versions", () => {
    expect(parseLayout(null)).toBeNull();
    expect(parseLayout("hello")).toBeNull();
    expect(parseLayout({ ...SAMPLE_LAYOUT, version: 2 })).toBeNull();
    expect(parseLayout({ ...SAMPLE_LAYOUT, room: { width: "4" } })).toBeNull();
  });

  it("drops malformed furniture but keeps the rest", () => {
    const raw = {
      ...SAMPLE_LAYOUT,
      furniture: [
        SAMPLE_LAYOUT.furniture[0],
        { id: "x", type: "sofa", position: [0, 0, 0], rotation: 0, dimensions: { width: 1, height: 1, depth: 1 } },
        { id: "y", type: "chair", position: [0, 0], rotation: 0, dimensions: { width: 1, height: 1, depth: 1 } },
      ],
    };
    const parsed = parseLayout(raw);
    expect(parsed?.furniture.map((f) => f.id)).toEqual([SAMPLE_LAYOUT.furniture[0].id]);
  });

  it("clamps out-of-range sizes and fills in missing names", () => {
    const parsed = parseLayout({
      ...SAMPLE_LAYOUT,
      projectName: "  ",
      furniture: [
        { id: "c", type: "chair", position: [1, 0, 1], rotation: -90, dimensions: { width: 9, height: 0.85, depth: 0.5 } },
      ],
    });
    expect(parsed?.projectName).toBe("Untitled room");
    expect(parsed?.furniture[0]).toMatchObject({ name: "Chair", rotation: 270, dimensions: { width: 0.9 } });
  });
});
