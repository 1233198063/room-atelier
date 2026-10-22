import { describe, expect, it } from "vitest";
import type { Opening, Room } from "../types";
import { checkPalette } from "./layoutChecks";
import { contrast, DEFAULT_PALETTE, glazingRatio, luminance, PALETTE_PRESETS, suggestPalettes } from "./palettes";
import { parseLayout } from "./persistence";
import { SAMPLE_LAYOUT } from "./sampleLayout";

const window_ = (width: number, height: number): Opening => ({
  id: `w${width}`,
  type: "window",
  name: "Window",
  wall: "back",
  offset: 2,
  width,
  height,
  elevation: 0.9,
  hinge: "start",
});

describe("color math", () => {
  it("computes WCAG luminance and contrast", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000000")).toBe(0);
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrast("#777777", "#777777")).toBe(1);
  });
});

describe("presets", () => {
  it("all pass their own color checks", () => {
    const room: Room = { width: 4.2, depth: 3.6, height: 2.7 };
    for (const { palette } of PALETTE_PRESETS) {
      expect(checkPalette(palette, room, [window_(1.2, 1.3), window_(1.1, 1.3)]), palette.id).toEqual([]);
    }
  });
});

describe("suggestPalettes", () => {
  const room: Room = { width: 5, depth: 4, height: 2.7 }; // 20 m²

  it("suggests pale palettes for dim rooms", () => {
    expect(glazingRatio(room, [window_(1, 1)])).toBeCloseTo(0.05);
    expect([...suggestPalettes(room, [window_(1, 1)]).keys()]).toEqual(["nordic", "warm-oak"]);
  });

  it("suggests pale palettes for small rooms", () => {
    const small: Room = { width: 3, depth: 3, height: 2.6 };
    const why = suggestPalettes(small, [window_(1.2, 1.4)]).get("nordic");
    expect(why).toContain("9.0 m²");
  });

  it("allows deeper woods in bright rooms", () => {
    expect(suggestPalettes(room, [window_(3, 1.5)]).has("mid-century")).toBe(true);
  });

  it("matches the sample room to the default palette", () => {
    expect(suggestPalettes(SAMPLE_LAYOUT.room, SAMPLE_LAYOUT.openings).has(DEFAULT_PALETTE.id)).toBe(true);
  });
});

describe("checkPalette", () => {
  const room: Room = { width: 3, depth: 3, height: 2.6 };

  it("notices furniture that blends into the walls", () => {
    const issues = checkPalette({ ...DEFAULT_PALETTE, wood: DEFAULT_PALETTE.wall }, room, [window_(1.5, 1.5)]);
    expect(issues.map((i) => i.key)).toContain("palette-blend");
  });

  it("notices dark walls in a small room", () => {
    const issues = checkPalette({ ...DEFAULT_PALETTE, wall: "#4a4038" }, room, [window_(1.5, 1.5)]);
    expect(issues.map((i) => i.key)).toContain("palette-dark-walls");
  });
});

describe("palette persistence", () => {
  it("loads old saves with the default palette and repairs bad colors", () => {
    const { palette: _, ...legacy } = SAMPLE_LAYOUT;
    expect(parseLayout(JSON.parse(JSON.stringify(legacy)))?.palette).toEqual(DEFAULT_PALETTE);
    const parsed = parseLayout({ ...SAMPLE_LAYOUT, palette: { id: "custom", wall: "#ABCDEF", wood: "red" } });
    expect(parsed?.palette).toMatchObject({ id: "custom", wall: "#abcdef", wood: DEFAULT_PALETTE.wood });
  });
});
