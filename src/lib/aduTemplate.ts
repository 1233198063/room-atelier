import type { Dimensions, Furniture, FurnitureColors, FurnitureType, Opening, Palette, ProjectTemplate, Wall } from "../types";

/**
 * A one-bedroom ADU laid out from viewing photos: an open living room and
 * kitchen under a vaulted ceiling, a small low bedroom and a shower room.
 * Sizes are estimated from the photos, not measured.
 *
 * The photos show each room but not how they join, so the plan is a best
 * guess: the bedroom opens off the far end of the living room (its door is
 * visible beside the mirrored closet), and the bathroom door is the casing
 * beside the kitchen. The front door is not in any photo. The vaulted
 * ceiling, skylights and ceiling fan are not reproduced; ceilings are flat.
 *
 * Rooms are turned so what the photos look at faces the default camera
 * (the kitchen, the bed and the vanity on back walls), without mirroring
 * anything.
 */

const pieceMaker = (prefix: string) => (id: string, type: FurnitureType, name: string, x: number, z: number,
  dimensions: Dimensions, rotation = 0, colors?: FurnitureColors, elevation = 0): Furniture => ({
  id: `adu-${prefix}-${id}`, type, name, position: [x, elevation, z], dimensions, rotation, ...(colors ? { colors } : {}),
});

const doorMaker = (prefix: string) => (id: string, name: string, wall: Wall, offset: number, width: number,
  hinge: Opening["hinge"] = "start"): Opening => ({
  id: `adu-${prefix}-${id}`, type: "door", name, wall, offset, width, height: 2.03, elevation: 0, hinge,
});

const size = (width: number, depth: number, height: number): Dimensions => ({ width, depth, height });

/** Cream walls throughout; teak and linen for anything added later. */
const HOUSE: Palette = {
  id: "custom", wall: "#ece2cf", floor: "#e3d2b4", wood: "#94532c", woodDark: "#6b4226",
  fabric: "#e6e1d6", accent: "#283247", metal: "#b9b5ab",
};

/** White shaker cabinets with brushed-nickel pulls and a white quartz top. */
const SHAKER: FurnitureColors = { wood: "#f4f2ed", woodDark: "#e8e4db", metal: "#8e9194", stone: "#ebe7df" };
const BLACK = "#1f2023";
const BEDROOM_TEAK: FurnitureColors = { wood: "#94532c", woodDark: "#7a4424", metal: "#c8c6c0" };

// ── Living room and kitchen: one open room, the kitchen across its back wall ──

const G = pieceMaker("great");
const GD = doorMaker("great");
/** Base run along the back wall, left to right: counters face +Z. */
const RUN_Z = 0.31;
const UPPER_Z = 0.165;
const UPPER = 1.45;

const greatRoom = {
  name: "客厅与开放式厨房",
  position: [0, 0] as [number, number],
  rotation: 0,
  room: { width: 4, depth: 6.4, height: 2.8 },
  palette: HOUSE,
  openings: [
    GD("bath-door", "卫生间门", "left", 1.25, 0.75),
    GD("front-door", "入户门", "right", 2.4, 0.9, "end"),
    GD("bedroom-door", "卧室门", "front", 3.25, 0.8),
  ],
  furniture: [
    // Kitchen: drawers, range, sink, dishwasher, and the fridge in the corner
    G("drawers", "kitchenCounter", "抽屉地柜", 0.33, RUN_Z, size(0.66, 0.62, 0.91), 0, SHAKER),
    G("range", "range", "不锈钢燃气灶烤箱", 1.04, 0.33, size(0.76, 0.66, 0.97)),
    G("sink", "kitchenCounter", "水槽地柜", 2.02, RUN_Z, size(1.2, 0.62, 0.91), 0, SHAKER),
    G("dishwasher", "dishwasher", "黑色洗碗机", 2.92, RUN_Z, size(0.6, 0.62, 0.91), 0, { ceramic: BLACK, stone: SHAKER.stone }),
    G("fridge", "fridge", "黑色冰箱", 3.6, 0.37, size(0.76, 0.74, 1.68), 0, { ceramic: BLACK, metal: "#2b2c2f" }),
    G("upper-1", "wallCabinet", "白色吊柜", 0.33, UPPER_Z, size(0.66, 0.33, 0.76), 0, SHAKER, UPPER),
    G("microwave", "microwave", "黑色微波炉", 1.04, 0.2, size(0.76, 0.4, 0.42), 0, { ceramic: BLACK }, UPPER),
    G("upper-mw", "wallCabinet", "微波炉上方吊柜", 1.04, UPPER_Z, size(0.76, 0.33, 0.34), 0, SHAKER, 1.87),
    G("upper-2", "wallCabinet", "白色吊柜 2", 2.02, UPPER_Z, size(1.2, 0.33, 0.76), 0, SHAKER, UPPER),
    G("upper-3", "wallCabinet", "白色吊柜 3", 2.92, UPPER_Z, size(0.6, 0.33, 0.76), 0, SHAKER, UPPER),
    G("upper-fridge", "wallCabinet", "冰箱上方吊柜", 3.6, RUN_Z, size(0.76, 0.62, 0.4), 0, SHAKER, 1.81),
    G("counter-plant", "plant", "台面小盆栽", 0.33, 0.28, size(0.18, 0.18, 0.28), 0, { pot: "#e8e4dc", leaves: "#7d9a4a" }, 0.91),
    // Sitting area: loveseat against the left wall facing the armchair across an ottoman
    G("rug", "rug", "灰色长毛地毯", 1.75, 3.9, size(1.6, 2.2, 0.015), 0, { fabric: "#9c9c9a", accent: "#929290" }),
    G("sofa", "sofa", "灰蓝色双人沙发", 0.44, 3.85, size(1.8, 0.88, 0.85), 90, { fabric: "#8389a8", accent: "#c9b45c", woodDark: "#2c2724" }),
    G("ottoman", "ottoman", "灰蓝软凳茶几", 1.55, 3.85, size(0.62, 0.62, 0.44), 0, { fabric: "#8e98a9", woodDark: "#2c2724" }),
    G("armchair", "armchair", "木扶手灰色单椅", 2.95, 4.25, size(0.74, 0.8, 0.84), 250, { fabric: "#b4b6b3", accent: "#283247", woodDark: "#7a4a2a" }),
    // The far end: a counter-height bistro table, the mirrored closet and the bedroom door
    G("bistro", "roundTable", "高脚小圆桌", 0.55, 5.8, size(0.62, 0.62, 0.92), 0, { wood: "#3e2c22", woodDark: "#2a201a" }),
    G("stool-tan", "chair", "棕色绗缝吧凳", 0.48, 5.2, size(0.44, 0.46, 1), 180, { wood: "#a87a4c", woodDark: "#8a6440", fabric: "#b98d5e" }),
    G("stool-white", "chair", "白色吧凳", 1.08, 5.42, size(0.44, 0.46, 1), 135, { wood: "#ece8e0", woodDark: "#8a6440", fabric: "#f1eee8" }),
    G("bistro-plant", "plant", "小圆桌上的绿植", 0.55, 5.8, size(0.2, 0.2, 0.28), 0, { pot: "#f0ede6", leaves: "#5f7d46" }, 0.92),
    G("closet", "cabinet", "镜面推拉门衣柜", 1.95, 6.1, size(1.5, 0.6, 2.03), 180, { wood: "#d5dbdf", woodDark: "#e9e5dc", metal: "#a9adb0" }),
    G("magnolia", "artwork", "黑白玉兰花挂画", 0.02, 5.65, size(0.6, 0.04, 0.6), 90, { wood: "#2a2a2c" }, 1.45),
  ],
};

// ── Bedroom: small, with a low ceiling; the bed's head against the back wall ──

const B = pieceMaker("bed");
const BD = doorMaker("bed");
const bedroom = {
  name: "小卧室",
  // Beyond the living room's far end; its right wall backs onto the living room's front wall.
  position: [0.7, 9.7] as [number, number],
  rotation: 90,
  room: { width: 3.1, depth: 3.3, height: 2.3 },
  palette: { ...HOUSE, floor: "#cdbfa6", fabric: "#e9e2d4" },
  openings: [
    BD("door", "卧室门", "right", 2.55, 0.8),
    { id: "adu-bed-window", type: "window" as const, name: "卧室窗", wall: "front" as const, offset: 2.1, width: 1.2, height: 1.25,
      elevation: 0.8, hinge: "start" as const },
  ],
  furniture: [
    B("carpet", "rug", "米色满铺地毯", 1.55, 1.65, size(3.08, 3.28, 0.012), 0, { fabric: "#d1c5af", accent: "#c8bba3" }),
    B("bed", "bed", "双人床 · 灰色佩斯利床品", 1.32, 1, size(1.4, 2, 0.9), 0,
      { wood: "#8a5a35", woodDark: "#6b4226", fabric: "#c3c8ce", accent: "#d0ae48" }),
    B("nightstand-left", "cabinet", "里侧床头柜", 0.33, 0.21, size(0.5, 0.42, 0.6), 0, BEDROOM_TEAK),
    B("nightstand-right", "cabinet", "外侧床头柜", 2.3, 0.21, size(0.5, 0.42, 0.6), 0, BEDROOM_TEAK),
    B("bed-lamp", "lamp", "床头柜台灯", 2.3, 0.21, size(0.36, 0.36, 0.66), 0, { fabric: "#f2ede2", metal: "#b8a372" }, 0.6),
    B("art", "artwork", "床头抽象风景画", 1.32, 0.02, size(1, 0.04, 0.75), 0, { wood: "#3a332d" }, 1.15),
    B("desk", "desk", "铁艺腿木书桌", 0.26, 2.6, size(1.1, 0.52, 0.76), 90, { wood: "#9a6a3f", woodDark: "#2f2a26", metal: "#2f2a26" }),
    B("desk-chair", "chair", "灰色软垫木椅", 0.78, 2.6, size(0.48, 0.52, 0.84), 90, { wood: "#9b5d34", woodDark: "#8a5230", fabric: "#7c7f76" }),
    B("desk-lamp", "lamp", "书桌台灯", 0.22, 2.98, size(0.2, 0.2, 0.42), 0, { fabric: "#4a433c", metal: "#3a3430" }, 0.76),
  ],
};

// ── Bathroom: vanity on the back wall, toilet on the left, shower along the front ──

const T = pieceMaker("bath");
const TD = doorMaker("bath");
const bathroom = {
  name: "卫生间 · 淋浴",
  // Beside the kitchen; its right wall backs onto the living room's left wall.
  position: [-2.3, 0.2] as [number, number],
  rotation: 0,
  room: { width: 2.1, depth: 2.3, height: 2.3 },
  palette: { ...HOUSE, wall: "#e9dac4", wood: "#f4f2ed", woodDark: "#e8e4db" },
  openings: [TD("door", "卫生间门", "right", 1.05, 0.75)],
  furniture: [
    T("shower", "shower", "推拉玻璃门淋浴间", 0.775, 1.875, size(1.55, 0.85, 2), 180, { ceramic: "#f3f1ec", metal: "#c8cbcd" }),
    T("toilet", "toilet", "马桶", 0.35, 1.03, size(0.4, 0.7, 0.76), 90),
    T("vanity", "vanity", "白色浴室柜", 1.45, 0.275, size(1.2, 0.55, 0.86), 0, { ceramic: "#ece5d3", metal: "#c8cbcd" }),
    T("orchid", "plant", "浴室柜上的黄色兰花", 1.95, 0.18, size(0.22, 0.22, 0.45), 0, { pot: "#a07c52", leaves: "#d8b23a" }, 0.86),
  ],
};

export const ADU_PROJECT: ProjectTemplate = {
  name: "后院小屋 ADU · 一室一厅一卫",
  rooms: [greatRoom, bedroom, bathroom],
};
