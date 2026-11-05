import type { Dimensions, Furniture, FurnitureColors, FurnitureType, Opening, Palette, ProjectTemplate, Wall } from "../types";

/**
 * A one-bedroom apartment from a measured plan drawn in inches: a living
 * room with a big work-and-dining table opening onto a galley kitchen and
 * entry hall, a bedroom with a queen bed, a desk and a walk-in closet, and
 * a bathroom off the hall.
 *
 * Inside sizes and furniture come from the plan (4.572 px to the inch, every
 * labelled size checks out). The plan draws thin walls; here each room keeps
 * its inside size and walls are 10 cm per room, so the outside grows a
 * little, and the closet and bathroom, which sit beside two wall pairs
 * instead of the plan's one thin wall, are a little shallower.
 *
 * Doors, windows, the kitchen run, the laundry and the bathroom follow the
 * building's own plan of the unit (1.812 px to the inch there), each placed
 * against what it sits beside: every door is 30 in; the closet opens off
 * the bedroom beside its door; the bathroom door hangs just below the tub;
 * the laundry closet opens to the hall nook and the front door is hinged on
 * the side toward it. The kitchen runs dishwasher, sink, range, counter,
 * fridge from the living room to the entry under a band of wall cabinets;
 * the bathroom has a 60 × 30 in tub across the back, and the vanity and
 * toilet against the front wall. Floors are the plan's grey planks, tops
 * its grey granite. The ceiling height (8 ft), window heights, the closet's
 * rods and shelves, and the heights of the rack, crate and cabinet are on
 * neither plan.
 *
 * Laid out as drawn: the top of the plan is the back, no room is turned.
 */

const pieceMaker = (prefix: string) => (id: string, type: FurnitureType, name: string, x: number, z: number,
  dimensions: Dimensions, rotation = 0, colors?: FurnitureColors, elevation = 0): Furniture => ({
  id: `apt-${prefix}-${id}`, type, name, position: [x, elevation, z], dimensions, rotation, ...(colors ? { colors } : {}),
});

const doorMaker = (prefix: string) => (id: string, name: string, wall: Wall, offset: number, width: number,
  hinge: Opening["hinge"] = "start", opensAway = false): Opening => ({
  id: `apt-${prefix}-${id}`, type: "door", name, wall, offset, width, height: 2.03, elevation: 0, hinge,
  ...(opensAway ? { opensAway } : {}),
});

const windowMaker = (prefix: string) => (id: string, name: string, offset: number, width: number): Opening => ({
  id: `apt-${prefix}-${id}`, type: "window", name, wall: "back", offset, width, height: 1.3, elevation: 0.9, hinge: "start",
});

const size = (width: number, depth: number, height: number): Dimensions => ({ width, depth, height });

/** 8 ft, the usual apartment ceiling. */
const CEILING = 2.44;

/** White walls over grey wood-look planks, with the sketch's sage green as the accent. */
const HOUSE: Palette = {
  id: "custom", wall: "#f2f0eb", floor: "#8c8782", wood: "#b08a5e", woodDark: "#5c4630",
  fabric: "#e6e2d8", accent: "#5f7a68", metal: "#9a9b9c",
};

/** Grey speckled granite, as on the building's plan. */
const GRANITE = "#9a9693";
const WHITE_CABINETS: FurnitureColors = { wood: "#f4f2ed", woodDark: "#e8e4db", metal: "#8e9194", stone: GRANITE };
const OAK: FurnitureColors = { wood: "#b08a5e", woodDark: "#7a5a3a", metal: "#8e9194" };
const SAGE_CHAIR: FurnitureColors = { wood: "#a37e57", woodDark: "#7a5a3a", fabric: "#7d9184" };

// ── Living room: the big table in the back corner, crate and rack along the bedroom wall ──

const L = pieceMaker("living");
const LW = windowMaker("living");
const living = {
  name: "客厅 · 工作与用餐",
  position: [0, 0] as [number, number],
  rotation: 0,
  room: { width: 3.17, depth: 3.62, height: CEILING },
  // Opens onto the kitchen; its front edge lines up with the outside of the bedroom's front wall.
  openWalls: ["front" as const],
  palette: HOUSE,
  openings: [LW("window", "客厅窗", 2.02, 2.05)],
  furniture: [
    L("table", "table", "大桌（工作 + 吃饭）", 0.915, 0.38, size(1.83, 0.76, 0.75), 0, { wood: "#c19a6b", woodDark: "#2b2b2b" }),
    L("chair-1", "chair", "大桌椅", 0.52, 1.09, size(0.46, 0.46, 0.85), 180, SAGE_CHAIR),
    L("chair-2", "chair", "大桌椅 2", 1.34, 1.09, size(0.46, 0.46, 0.85), 180, SAGE_CHAIR),
    // No crate model: a low cabinet of the crate's size and height, its door end toward the room.
    L("crate", "cabinet", "狗笼", 2.815, 0.76, size(1.07, 0.71, 0.79), 270, { wood: "#d2b48a", woodDark: "#9a7448", metal: "#2e2e2e" }),
    L("rack", "bookcase", "储物架", 2.965, 2.31, size(1.02, 0.41, 1.8), 270, { wood: "#e8e6e1", woodDark: "#3a3a3a", metal: "#3a3a3a" }),
  ],
};

// ── Kitchen and entry hall: the counter run on the left, storage and laundry on the right ──

/** Along the left wall from the living room, as on the building's plan: where each piece starts and ends (z). */
const RUN = { dishwasher: [0, 0.6], sink: [0.6, 2.02], range: [2.02, 2.78], counter: [2.78, 3.55], fridge: [3.55, 4.34] } as const;
const mid = ([a, b]: readonly [number, number]) => Math.round((a + b) / 2 * 1000) / 1000;
const span = ([a, b]: readonly [number, number]) => Math.round((b - a) * 1000) / 1000;
const UPPER = 1.37;

const K = pieceMaker("kitchen");
const KD = doorMaker("kitchen");
const kitchen = {
  name: "厨房与入户走廊",
  position: [0, 3.62] as [number, number],
  rotation: 0,
  room: { width: 4.3, depth: 4.65, height: CEILING },
  // The living room on the left of its back edge, the bedroom's front wall on the right.
  openWalls: ["back" as const],
  palette: HOUSE,
  openings: [
    // 2.19–2.95 m from the left wall, hinged on the side toward the laundry.
    KD("front-door", "入户门", "front", 2.57, 0.76, "end"),
    // Hinged at the top, 15 cm below the tub on the other side of the wall; it swings into the bathroom.
    KD("bath-door", "浴室门", "right", 3.02, 0.76, "start", true),
  ],
  furniture: [
    // The run backs on the left wall and faces the room.
    K("dishwasher", "dishwasher", "洗碗机", 0.31, mid(RUN.dishwasher), size(span(RUN.dishwasher), 0.62, 0.91), 90, { stone: GRANITE }),
    K("sink", "kitchenCounter", "水槽台面", 0.31, mid(RUN.sink), size(span(RUN.sink), 0.62, 0.91), 90, WHITE_CABINETS),
    K("range", "range", "炉灶烤箱", 0.33, mid(RUN.range), size(span(RUN.range), 0.66, 0.97), 90),
    K("counter", "kitchenCounter", "炉灶旁台面", 0.31, mid(RUN.counter), size(span(RUN.counter), 0.62, 0.91), 90, WHITE_CABINETS),
    K("fridge", "fridge", "冰箱", 0.35, mid(RUN.fridge), size(span(RUN.fridge), 0.7, 1.72), 90),
    // The plan's band of wall cabinets over the counters, set higher over the range.
    K("upper-1", "wallCabinet", "吊柜", 0.16, mid([0, 2.02]), size(2.02, 0.32, 0.76), 90, WHITE_CABINETS, UPPER),
    K("upper-range", "wallCabinet", "吊柜 2", 0.16, mid(RUN.range), size(span(RUN.range), 0.32, 0.38), 90, WHITE_CABINETS, 1.75),
    K("upper-2", "wallCabinet", "吊柜 3", 0.16, mid(RUN.counter), size(span(RUN.counter), 0.32, 0.76), 90, WHITE_CABINETS, UPPER),
    // 42 in deep on the plan, deeper than any cabinet: as deep as one goes, facing the hall by the bedroom door.
    K("storage", "cabinet", "储物柜", 3.765, 1.89, size(1.07, 0.8, 2.1), 180, WHITE_CABINETS),
    // A compact stacked pair at the back of a laundry closet that opens to the nook in front of the bathroom door.
    K("washer", "washer", "叠放洗衣机", 3.77, 4.31, size(0.65, 0.68, 0.86), 180),
    K("dryer", "washer", "烘干机", 3.77, 4.31, size(0.65, 0.68, 0.86), 180, undefined, 0.86),
  ],
};

// ── Bedroom: desk under the window, the queen bed's head against the right wall ──

const B = pieceMaker("bed");
const BD = doorMaker("bed");
const BW = windowMaker("bed");
const bedroom = {
  name: "卧室",
  position: [3.37, 0] as [number, number],
  rotation: 0,
  room: { width: 3.09, depth: 3.52, height: CEILING },
  palette: HOUSE,
  openings: [
    BW("window", "卧室窗", 1.15, 2.05),
    // Opens off the hall, 14 cm from the bedroom's left wall; the kitchen has no back wall there.
    BD("door", "卧室门", "front", 0.52, 0.76),
    // Into the walk-in closet, so it sweeps none of the bedroom's floor.
    BD("closet-door", "衣柜门", "front", 1.64, 0.76, "start", true),
  ],
  furniture: [
    B("desk", "desk", "书桌 A", 0.61, 0.305, size(1.22, 0.61, 0.75), 0, { wood: "#ece9e2", woodDark: "#b8b2a6", metal: "#8e9194" }),
    B("desk-chair", "chair", "书桌椅", 0.61, 0.94, size(0.46, 0.46, 0.85), 180, SAGE_CHAIR),
    B("bed", "bed", "Queen 床", 2.075, 2.26, size(1.52, 2.03, 1), 270,
      { wood: "#b08a5e", woodDark: "#6b4e33", fabric: "#eceae4", accent: "#7d9184" }),
    B("nightstand", "cabinet", "床头柜", 2.86, 1.22, size(0.46, 0.46, 0.6), 270, OAK),
  ],
};

// ── Walk-in closet off the bedroom, bathroom off the hall ──

const C = doorMaker("closet");
const closet = {
  name: "步入式衣柜",
  position: [4.5, 3.72] as [number, number],
  rotation: 0,
  room: { width: 1.96, depth: 1.43, height: CEILING },
  palette: HOUSE,
  // 13 cm from the closet's left wall.
  openings: [C("door", "衣柜门", "back", 0.51, 0.76)],
  furniture: [],
};

const T = pieceMaker("bath");
const TD = doorMaker("bath");
const bathroom = {
  name: "浴室",
  position: [4.5, 5.35] as [number, number],
  rotation: 0,
  room: { width: 1.96, depth: 2.92, height: CEILING },
  palette: { ...HOUSE, wall: "#eef0ef", floor: "#8a857b", wood: "#f4f2ed", woodDark: "#e8e4db" },
  openings: [TD("door", "浴室门", "left", 1.29, 0.76)],
  furniture: [
    // Across the back, against the right wall, the tap at its left end.
    T("tub", "bathtub", "浴缸", 1.2, 0.38, size(1.52, 0.76, 0.58)),
    // Both against the front wall: the vanity in the left corner, the toilet to its right.
    T("vanity", "vanity", "浴室柜", 0.455, 2.615, size(0.91, 0.61, 0.86), 180, { wood: "#f4f2ed", metal: "#c8cbcd" }),
    T("toilet", "toilet", "马桶", 1.49, 2.54, size(0.48, 0.76, 0.76), 180),
  ],
};

export const APARTMENT_PROJECT: ProjectTemplate = {
  name: "一居室公寓 · 按平面图",
  rooms: [living, kitchen, bedroom, closet, bathroom],
};
