import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_STORAGE_KEY, loadLayout, parseLayout, saveLayout, STORAGE_KEY } from "./persistence";
import { SAMPLE_LAYOUT } from "./sampleLayout";

afterEach(() => vi.unstubAllGlobals());

describe("parseLayout", () => {
  it("round-trips individual furniture colors in old and new project formats", () => {
    const raw = { ...SAMPLE_LAYOUT, furniture: [
      { ...SAMPLE_LAYOUT.furniture[0], colors: { wood: "#aabbcc", fabric: "#123456" } },
    ] };
    const migrated = parseLayout(raw)!;
    expect(migrated.rooms[0].furniture[0].colors).toEqual(raw.furniture[0].colors);
    expect(parseLayout(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    expect(parseLayout(SAMPLE_LAYOUT)?.rooms[0].furniture[0].colors).toBeUndefined();
  });

  it("keeps valid overrides while dropping malformed colors and unknown roles", () => {
    const raw = { ...SAMPLE_LAYOUT, furniture: [
      { ...SAMPLE_LAYOUT.furniture[0], colors: { wood: "#ABCDEF", fabric: "invalid", wall: "#112233", metal: 123 } },
    ] };
    expect(parseLayout(raw)?.rooms[0].furniture[0].colors).toEqual({ wood: "#abcdef" });
    expect(parseLayout({ ...raw, furniture: [{ ...raw.furniture[0], colors: "#abcdef" }] })?.rooms[0].furniture[0].colors).toBeUndefined();
  });

  it("migrates a legacy room without changing its contents", () => {
    const result = parseLayout(SAMPLE_LAYOUT)!;
    expect(result.version).toBe(2);
    expect(result.roomDisplay).toBe("single");
    expect(result.activeRoomId).toBe(result.rooms[0].id);
    expect(result.rooms[0]).toMatchObject({ room: SAMPLE_LAYOUT.room, furniture: SAMPLE_LAYOUT.furniture,
      openings: SAMPLE_LAYOUT.openings, palette: SAMPLE_LAYOUT.palette, position: [0, 0], rotation: 0 });
  });

  it("drops malformed or duplicate rooms and recovers invalid selection and placement", () => {
    const base = parseLayout(SAMPLE_LAYOUT)!;
    const valid = base.rooms[0];
    const parsed = parseLayout({ ...base, activeRoomId: "missing", rooms: [
      { ...valid, position: [Infinity, 1], rotation: NaN }, valid,
      { id: "broken", room: null }, { ...valid, id: "second", furniture: [], openings: [], position: [-3, 5], rotation: -90 },
    ] })!;
    expect(parsed.rooms).toHaveLength(2);
    expect(parsed.activeRoomId).toBe(valid.id);
    expect(parsed.rooms[0]).toMatchObject({ position: [0, 0], rotation: 0 });
    expect(parsed.rooms[1]).toMatchObject({ position: [-3, 5], rotation: 270 });
  });

  it("rejects an empty project and unsupported versions", () => {
    expect(parseLayout({ version: 2, rooms: [] })).toBeNull();
    expect(parseLayout({ ...SAMPLE_LAYOUT, version: 3 })).toBeNull();
  });

  it("does not allow prototype property names as furniture or opening types", () => {
    const parsed = parseLayout({ ...SAMPLE_LAYOUT,
      furniture: [{ ...SAMPLE_LAYOUT.furniture[0], type: "constructor" }],
      openings: [{ ...SAMPLE_LAYOUT.openings[0], type: "toString" }],
    });
    expect(parsed?.rooms[0].furniture).toEqual([]);
    expect(parsed?.rooms[0].openings).toEqual([]);
  });

  it("keeps a legacy backup when saving v2 and loads the new project first", () => {
    const entries = new Map([[LEGACY_STORAGE_KEY, JSON.stringify(SAMPLE_LAYOUT)]]);
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value) } });
    const migrated = loadLayout()!;
    expect(migrated.rooms).toHaveLength(1);
    const next = { ...migrated, projectName: "Multi-room project" };
    expect(saveLayout(next)).toBe(true);
    expect(entries.get(LEGACY_STORAGE_KEY)).toBe(JSON.stringify(SAMPLE_LAYOUT));
    expect(loadLayout()).toEqual(next);
    entries.set(STORAGE_KEY, "broken JSON");
    expect(loadLayout()).toEqual(migrated);
  });
  it("round-trips a valid layout", () => {
    const migrated = parseLayout(SAMPLE_LAYOUT)!;
    expect(parseLayout(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
  });

  it("loads saves from before doors and windows existed", () => {
    const { openings: _, ...legacy } = SAMPLE_LAYOUT;
    expect(parseLayout(JSON.parse(JSON.stringify(legacy)))?.rooms[0].openings).toEqual([]);
  });

  it("drops malformed openings", () => {
    const parsed = parseLayout({
      ...SAMPLE_LAYOUT,
      openings: [SAMPLE_LAYOUT.openings[0], { ...SAMPLE_LAYOUT.openings[1], wall: "ceiling" }, { id: "x", type: "portal" }],
    });
    expect(parsed?.rooms[0].openings.map((o) => o.id)).toEqual([SAMPLE_LAYOUT.openings[0].id]);
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
    expect(parsed?.rooms[0].furniture.map((f) => f.id)).toEqual([SAMPLE_LAYOUT.furniture[0].id]);
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
    expect(parsed?.rooms[0].furniture[0]).toMatchObject({ name: "Chair", rotation: 270, dimensions: { width: 0.9 } });
  });
});
