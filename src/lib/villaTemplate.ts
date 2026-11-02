import type { Dimensions, Furniture, FurnitureColors, FurnitureType, Opening, Palette, ProjectTemplate, Wall } from "../types";

/**
 * A Mediterranean villa with a double-height underground library, a sunken
 * courtyard and its garden, laid out from a set of concept renders, a site plan
 * and an east–west section. Sizes are estimated, not surveyed.
 *
 * North is up (toward −Z). The library sits under the south terrace, its glass
 * wall facing the sunken courtyard, as in the exterior render.
 */

const pieceMaker = (prefix: string) => (id: string, type: FurnitureType, name: string, x: number, z: number,
  dimensions: Dimensions, rotation = 0, colors?: FurnitureColors, elevation = 0): Furniture => ({
  id: `villa-${prefix}-${id}`, type, name, position: [x, elevation, z], dimensions, rotation, ...(colors ? { colors } : {}),
});

const openingMaker = (prefix: string) => (id: string, type: Opening["type"], name: string, wall: Wall, offset: number,
  width: number, height: number, elevation = 0): Opening => ({
  id: `villa-${prefix}-${id}`, type, name, wall, offset, width, height, elevation: type === "door" ? 0 : elevation, hinge: "start",
});

const HOUSE: Palette = {
  id: "custom", wall: "#f1e7d6", floor: "#d6b892", wood: "#b88b5c", woodDark: "#7b5536",
  fabric: "#eee5d6", accent: "#b9775c", metal: "#b8955c",
};
const OUTDOOR: Palette = {
  id: "custom", wall: "#eadcc6", floor: "#a9bb83", wood: "#b08a5e", woodDark: "#6f5038",
  fabric: "#ece2d0", accent: "#9b86c6", metal: "#3a3430",
};

const LEATHER: FurnitureColors = { fabric: "#8b5232", accent: "#d3b08c", woodDark: "#4b3122" };
const OLIVE: FurnitureColors = { leaves: "#8d9c6c", woodDark: "#7b6a58" };
const CYPRESS: FurnitureColors = { leaves: "#4f6040", woodDark: "#5d4a3a" };
const ROSES: FurnitureColors = { accent: "#d9879a" };
const TOMATOES: FurnitureColors = { accent: "#c8553d", leaves: "#6f8f4e" };
const BOOKS = ["#6f7d6a", "#a36f58", "#7d8c96", "#9a7b4f", "#80606b"];

// ── Underground library: 14 × 9 m, about 6 m clear, two levels joined by a gallery ──

const L = pieceMaker("lib");
const LO = openingMaker("lib");
/** The glass wall's bays, shared with the courtyard wall it looks through. */
const GLASS_BAYS = [2, 5.333, 8.667, 12];
const LIBRARY_DECK = 3.2;

const library = {
  name: "地下图书馆 · 两层挑高",
  elevation: -6.4,
  position: [15, 16] as [number, number],
  rotation: 0,
  room: { width: 14, depth: 9, height: 6.2 },
  palette: { ...HOUSE, wall: "#efe3cf", floor: "#dcbd93", wood: "#ba8c5c", woodDark: "#7d5636", fabric: "#f0e8da", accent: "#b8735a" },
  openings: [
    ...GLASS_BAYS.map((x, i) => LO(`glass-${i}`, "window", `朝庭院的落地玻璃 ${i + 1}`, "front", x, 3, 3.2, 0.05)),
    ...GLASS_BAYS.map((x, i) => LO(`clerestory-${i}`, "window", `二层高窗 ${i + 1}`, "front", x, 3, 1.9, 3.7)),
    LO("stair-door", "door", "通往住宅的楼梯间", "back", 11, 1.2, 2.4),
  ],
  furniture: [
    L("spiral", "spiralStair", "通往回廊的旋转楼梯", 1.3, 1.3, { width: 2.4, depth: 2.4, height: LIBRARY_DECK }, 180),
    L("gallery", "gallery", "二层挑空回廊", 8.3, 1.1, { width: 11.4, depth: 2.2, height: LIBRARY_DECK + 1 }),
    ...[[3.9, 2.4, "楼梯旁书架"], [6.3, 2.4, "下层书墙 · 文学"], [8.7, 2.4, "下层书墙 · 艺术与旅行"], [12.8, 2.2, "门旁书架"]].map(([x, w, name], i) =>
      L(`shelf-low-${i}`, "bookcase", name as string, x as number, 0.21, { width: w as number, depth: 0.42, height: 2.7 }, 0, { accent: BOOKS[i] })),
    ...[[3.95, 2.5], [6.45, 2.5], [8.95, 2.5], [11.45, 2.5], [13.35, 1.2]].map(([x, w], i) =>
      L(`shelf-up-${i}`, "bookcase", `回廊书墙 ${i + 1}`, x, 0.21, { width: w, depth: 0.42, height: 2.8 }, 0, { accent: BOOKS[(i + 2) % BOOKS.length] }, LIBRARY_DECK)),
    L("deck-chair-1", "armchair", "回廊皮革阅读椅", 6, 1.3, { width: 0.85, depth: 0.85, height: 1 }, 0, LEATHER, LIBRARY_DECK),
    L("deck-chair-2", "armchair", "回廊皮革阅读椅 2", 7.3, 1.3, { width: 0.85, depth: 0.85, height: 1 }, 0, LEATHER, LIBRARY_DECK),
    L("deck-table", "cabinet", "回廊小边几", 6.65, 1.1, { width: 0.45, depth: 0.45, height: 0.55 }, 0, undefined, LIBRARY_DECK),
    L("deck-lamp", "lamp", "回廊阅读灯", 8.2, 1, { width: 0.42, depth: 0.42, height: 1.5 }, 0, undefined, LIBRARY_DECK),
    L("deck-plant", "plant", "回廊绿植", 12.9, 1.6, { width: 0.6, depth: 0.6, height: 1 }, 0, undefined, LIBRARY_DECK),
    L("west-shelf", "bookcase", "西墙书柜", 0.21, 3.85, { width: 2, depth: 0.42, height: 2.4 }, 90, { accent: "#8c6653" }),
    L("west-art", "artwork", "托斯卡纳风景画", 0.02, 3.85, { width: 1, depth: 0.04, height: 0.8 }, 90, undefined, 2.8),
    L("west-art-2", "artwork", "麦田小幅油画", 0.02, 6.2, { width: 0.7, depth: 0.04, height: 0.9 }, 90, undefined, 1.4),
    L("worktable", "worktable", "长木手作桌", 3.6, 6.9, { width: 3.2, depth: 1.1, height: 0.78 }, 0, { wood: "#a87d50", woodDark: "#6b4a2e" }),
    ...[2.6, 3.6, 4.6].map((x, i) => L(`work-chair-n${i}`, "chair", `手作桌木椅 ${i + 1}`, x, 6.1, { width: 0.48, depth: 0.52, height: 0.88 }, 0, { fabric: "#8b5a3c" })),
    ...[3, 4.2].map((x, i) => L(`work-chair-s${i}`, "chair", `手作桌木椅 ${i + 4}`, x, 7.7, { width: 0.48, depth: 0.52, height: 0.88 }, 180, { fabric: "#8b5a3c" })),
    L("work-flowers", "plant", "手作桌上的花束", 4.8, 7.1, { width: 0.3, depth: 0.3, height: 0.45 }, 0, { pot: "#e6dccb", leaves: "#c98f8f" }, 0.62),
    L("easel", "easel", "画架与风景油画", 1.1, 7.8, { width: 0.8, depth: 0.6, height: 1.8 }, 40),
    L("rug", "rug", "陶土色波斯地毯", 8.5, 5.4, { width: 6, depth: 4.6, height: 0.012 }, 0, { fabric: "#c98f7a", accent: "#8d5a47" }),
    L("sofa", "sofa", "白色布艺大沙发", 6.9, 5.3, { width: 3.2, depth: 1.05, height: 0.82 }, 90, { accent: "#c27f63" }),
    L("coffee", "table", "石灰华茶几", 8.7, 5.3, { width: 1.6, depth: 0.85, height: 0.4 }, 90),
    L("coffee-flowers", "plant", "茶几花束", 8.7, 5, { width: 0.32, depth: 0.32, height: 0.42 }, 0, { pot: "#9a9187", leaves: "#e3d3c4" }, 0.4),
    L("leather-chair", "armchair", "棕色皮革单椅", 9.3, 7.5, { width: 0.95, depth: 0.95, height: 1 }, 196, LEATHER),
    L("green-chair", "armchair", "橄榄绿丝绒单椅", 10.6, 3.6, { width: 0.95, depth: 0.9, height: 1 }, 312,
      { fabric: "#5d6b48", accent: "#d6b59a", woodDark: "#4b3122" }),
    L("screen", "screen", "投影幕布", 13.96, 5.3, { width: 3.4, depth: 0.08, height: 1.9 }, 270, undefined, 0.9),
    L("media", "dresser", "低矮影音柜", 13.76, 5.3, { width: 2.4, depth: 0.48, height: 0.5 }, 270),
    L("lamp-sofa", "lamp", "沙发旁落地灯", 6.8, 3.25, { width: 0.45, depth: 0.45, height: 1.65 }),
    L("lamp-chair", "lamp", "皮椅旁落地灯", 10.4, 8, { width: 0.45, depth: 0.45, height: 1.65 }),
    L("side-table", "cabinet", "沙发边几", 6.9, 7.3, { width: 0.5, depth: 0.5, height: 0.55 }),
    L("side-lamp", "lamp", "边几台灯", 6.9, 7.3, { width: 0.36, depth: 0.36, height: 0.5 }, 0, undefined, 0.55),
    L("olive-pot", "plant", "窗边橄榄树盆栽", 13.1, 8.2, { width: 1.1, depth: 1.1, height: 2.3 }, 0, { leaves: "#8d9c6c", pot: "#d9cbb5" }),
    L("stair-plant", "plant", "楼梯旁绿植", 2.9, 2.95, { width: 0.6, depth: 0.6, height: 1.3 }),
    L("east-art-1", "artwork", "高处风景画", 13.98, 3.4, { width: 0.9, depth: 0.04, height: 0.7 }, 270, undefined, 3.4),
    L("east-art-2", "artwork", "高处风景画 2", 13.98, 7.2, { width: 0.9, depth: 0.04, height: 0.7 }, 270, undefined, 3.4),
  ],
};

// ── Sunken courtyard: 14 × 11 m, open to the sky, floor level with the library ──

const C = pieceMaker("court");
const CO = openingMaker("court");
const courtyard = {
  name: "下沉庭院",
  kind: "courtyard" as const,
  elevation: -6.4,
  position: [15, 25.2] as [number, number],
  rotation: 0,
  room: { width: 14, depth: 11, height: 6.4 },
  palette: { ...OUTDOOR, wall: "#e9dcc5", floor: "#dfd0b6" },
  openings: [
    ...GLASS_BAYS.map((x, i) => CO(`glass-${i}`, "window", `图书馆落地玻璃 ${i + 1}`, "back", x, 3, 3.2, 0.05)),
    ...GLASS_BAYS.map((x, i) => CO(`clerestory-${i}`, "window", `图书馆高窗 ${i + 1}`, "back", x, 3, 1.9, 3.7)),
  ],
  furniture: [
    C("stairs", "stairs", "下沉庭院石阶", 0.85, 5.6, { width: 1.7, depth: 10.4, height: 6.4 }, 180),
    C("olive", "tree", "庭院橄榄树", 7.6, 6.8, { width: 3.4, depth: 3.4, height: 5 }, 0, OLIVE),
    C("olive-bed", "shrub", "橄榄树下的薰衣草", 7.6, 6.8, { width: 2.4, depth: 2.4, height: 0.55 }),
    C("bistro", "table", "庭院小餐桌", 10.8, 8.9, { width: 0.75, depth: 0.75, height: 0.74 }),
    C("bistro-chair-1", "chair", "庭院餐椅", 10.8, 8.2, { width: 0.48, depth: 0.52, height: 0.88 }),
    C("bistro-chair-2", "chair", "庭院餐椅 2", 10.8, 9.6, { width: 0.48, depth: 0.52, height: 0.88 }, 180),
    C("lounge-1", "armchair", "庭院休闲椅", 4.4, 2, { width: 0.85, depth: 0.85, height: 0.95 }, 0, { fabric: "#e6dccb", accent: "#9b86c6" }),
    C("lounge-2", "armchair", "庭院休闲椅 2", 5.6, 2, { width: 0.85, depth: 0.85, height: 0.95 }, 0, { fabric: "#e6dccb", accent: "#9b86c6" }),
    C("lounge-table", "cabinet", "户外边几", 5, 2.2, { width: 0.35, depth: 0.35, height: 0.5 }),
    C("pot-1", "plant", "石阶旁陶盆", 2.5, 0.9, { width: 0.7, depth: 0.7, height: 1.4 }),
    C("pot-2", "plant", "庭院角落陶盆", 13.3, 0.9, { width: 0.8, depth: 0.8, height: 1.6 }),
    C("pot-3", "plant", "庭院角落陶盆 2", 13.3, 10.2, { width: 0.7, depth: 0.7, height: 1.2 }),
    C("east-bed", "shrub", "东墙薰衣草花带", 13.45, 6, { width: 6, depth: 0.9, height: 0.7 }, 90),
    C("south-bed", "shrub", "南墙花带", 8, 10.55, { width: 8, depth: 0.8, height: 0.75 }, 0, ROSES),
  ],
};

// ── Ground floor: living and dining under the upper floor ──

const G = pieceMaker("gf");
const GO = openingMaker("gf");
const groundFloor = {
  name: "地面一层 · 客厅与餐厅",
  position: [14, 9] as [number, number],
  rotation: 0,
  room: { width: 16, depth: 11, height: 3.4 },
  palette: HOUSE,
  openings: [
    GO("entry", "door", "主入口", "back", 8, 1.6, 2.5),
    GO("north-1", "window", "北窗", "back", 3.5, 1.4, 2, 0.8),
    GO("north-2", "window", "北窗 2", "back", 12.5, 1.4, 2, 0.8),
    ...[2.6, 6, 10, 13.4].map((x, i) => GO(`terrace-${i}`, "window", `通往露台的落地窗 ${i + 1}`, "front", x, 2.6, 2.6, 0.05)),
    GO("east-1", "window", "东窗", "right", 3, 1.4, 2, 0.8),
    GO("east-2", "window", "东窗 2", "right", 8, 1.4, 2, 0.8),
    GO("kitchen", "door", "通往厨房", "left", 5, 1.2, 2.4),
  ],
  furniture: [
    G("rug", "rug", "客厅地毯", 11.8, 6.4, { width: 4.2, depth: 3.4, height: 0.012 }, 0, { fabric: "#d7b9a2", accent: "#9a6a52" }),
    G("sofa", "sofa", "客厅沙发", 11.8, 4.9, { width: 3, depth: 1, height: 0.82 }),
    G("coffee", "table", "石材茶几", 11.8, 6.4, { width: 1.4, depth: 0.8, height: 0.42 }),
    G("chair-1", "armchair", "客厅单椅", 10.6, 7.9, { width: 0.85, depth: 0.85, height: 1 }, 160),
    G("chair-2", "armchair", "客厅单椅 2", 13, 7.9, { width: 0.85, depth: 0.85, height: 1 }, 200, LEATHER),
    G("lamp", "lamp", "客厅落地灯", 9.7, 4.6, { width: 0.45, depth: 0.45, height: 1.6 }),
    G("bookcase", "bookcase", "客厅书架", 15.79, 5.5, { width: 2, depth: 0.42, height: 2.4 }, 270),
    G("corner-plant", "plant", "客厅角落绿植", 15.3, 10.2, { width: 0.8, depth: 0.8, height: 1.8 }),
    G("dining", "table", "实木餐桌", 4.6, 6, { width: 2.6, depth: 1, height: 0.76 }),
    ...[3.8, 4.6, 5.4].map((x, i) => G(`dining-n${i}`, "chair", `餐椅 ${i + 1}`, x, 5.2, { width: 0.48, depth: 0.52, height: 0.88 })),
    ...[3.8, 4.6, 5.4].map((x, i) => G(`dining-s${i}`, "chair", `餐椅 ${i + 4}`, x, 6.8, { width: 0.48, depth: 0.52, height: 0.88 }, 180)),
    G("sideboard", "dresser", "餐边柜", 4.6, 0.25, { width: 2, depth: 0.48, height: 0.82 }),
    G("sideboard-art", "artwork", "餐厅挂画", 5, 0.015, { width: 0.8, depth: 0.03, height: 0.6 }, 0, undefined, 1.35),
    G("console", "cabinet", "玄关柜", 10.2, 0.2, { width: 1.2, depth: 0.4, height: 0.85 }),
    G("console-plant", "plant", "玄关小盆栽", 10.6, 0.2, { width: 0.22, depth: 0.22, height: 0.32 }, 0, undefined, 0.85),
    G("console-art", "artwork", "玄关挂画", 10.2, 0.015, { width: 0.7, depth: 0.03, height: 0.9 }, 0, undefined, 1.3),
    G("door-plant", "plant", "厨房门旁绿植", 0.5, 2, { width: 0.6, depth: 0.6, height: 1.4 }),
  ],
};

// ── Upper floor: bedrooms and study, under the main roof (shown open-plan) ──

const U = pieceMaker("uf");
const UO = openingMaker("uf");
const upperFloor = {
  name: "地面二层 · 卧室与书房",
  elevation: 3.4,
  roof: "hip" as const,
  position: [14, 9] as [number, number],
  rotation: 0,
  room: { width: 16, depth: 11, height: 3 },
  palette: { ...HOUSE, fabric: "#efe8dc" },
  openings: [
    // The last north window clears the master bed's lamps.
    ...[2.5, 6, 10, 14.8].map((x, i) => UO(`north-${i}`, "window", `二层北窗 ${i + 1}`, "back", x, 1.2, 1.5, 0.9)),
    ...[2.5, 6, 10, 13.5].map((x, i) => UO(`south-${i}`, "window", `二层南窗 ${i + 1}`, "front", x, 1.4, 1.8, 0.6)),
    UO("east-1", "window", "二层东窗", "right", 3.5, 1.2, 1.5, 0.9),
    UO("east-2", "window", "二层东窗 2", "right", 7.5, 1.2, 1.5, 0.9),
    UO("west", "window", "二层西窗", "left", 5.5, 1.2, 1.5, 0.9),
  ],
  furniture: [
    U("master-bed", "bed", "主卧大床", 12.6, 1.15, { width: 1.8, depth: 2.1, height: 0.95 }),
    U("master-ns-1", "cabinet", "主卧床头柜", 11.4, 0.25, { width: 0.5, depth: 0.45, height: 0.55 }),
    U("master-ns-2", "cabinet", "主卧床头柜 2", 13.8, 0.25, { width: 0.5, depth: 0.45, height: 0.55 }),
    U("master-lamp-1", "lamp", "床头台灯", 11.4, 0.25, { width: 0.32, depth: 0.32, height: 0.5 }, 0, undefined, 0.55),
    U("master-lamp-2", "lamp", "床头台灯 2", 13.8, 0.25, { width: 0.32, depth: 0.32, height: 0.5 }, 0, undefined, 0.55),
    U("master-rug", "rug", "主卧地毯", 12.6, 1.9, { width: 2.8, depth: 2.4, height: 0.012 }, 0, { fabric: "#e3d2bf", accent: "#a87a62" }),
    U("bench", "ottoman", "床尾凳", 12.6, 2.6, { width: 1.2, depth: 0.45, height: 0.45 }),
    U("wardrobe", "cabinet", "主卧衣柜", 15.69, 5.6, { width: 2, depth: 0.6, height: 2.3 }, 270),
    U("reading-chair", "armchair", "主卧阅读椅", 14.8, 9.8, { width: 0.85, depth: 0.85, height: 1 }, 220),
    U("reading-lamp", "lamp", "阅读落地灯", 15.55, 10.4, { width: 0.45, depth: 0.45, height: 1.55 }),
    U("desk", "desk", "书房书桌", 4.4, 10.6, { width: 1.4, depth: 0.7, height: 0.75 }, 180),
    U("desk-chair", "chair", "书桌椅", 4.4, 9.85, { width: 0.48, depth: 0.52, height: 0.88 }, 180),
    U("desk-lamp", "lamp", "书桌台灯", 4.95, 10.75, { width: 0.28, depth: 0.28, height: 0.45 }, 0, undefined, 0.75),
    U("study-shelf", "bookcase", "书房书架", 0.21, 8.5, { width: 2, depth: 0.42, height: 2.3 }, 90),
    U("guest-bed", "bed", "客房床", 3, 1.15, { width: 1.4, depth: 2.05, height: 0.95 }),
    U("guest-ns", "cabinet", "客房床头柜", 4.05, 0.25, { width: 0.45, depth: 0.45, height: 0.5 }),
    U("plant", "plant", "二层绿植", 8, 10.4, { width: 0.6, depth: 0.6, height: 1.5 }),
  ],
};

// ── Kitchen wing: a single-storey wing to the west ──

const K = pieceMaker("kit");
const KO = openingMaker("kit");
const kitchen = {
  name: "厨房侧翼",
  roof: "hip" as const,
  position: [6.8, 11] as [number, number],
  rotation: 0,
  room: { width: 7, depth: 8, height: 3.4 },
  palette: HOUSE,
  openings: [
    KO("living", "door", "通往客餐厅", "right", 3, 1.2, 2.4),
    KO("west-1", "window", "厨房西窗", "left", 2, 1.2, 1.2, 1.05),
    KO("west-2", "window", "厨房西窗 2", "left", 6, 1.2, 1.2, 1.05),
    KO("garden", "door", "通往菜园", "front", 3.5, 1, 2.3),
    KO("north", "window", "厨房北窗", "back", 3.5, 1.4, 1.2, 1.05),
  ],
  furniture: [
    K("counter-west", "cabinet", "西墙橱柜台面", 0.3, 4, { width: 3, depth: 0.6, height: 0.9 }, 90),
    K("counter-north", "cabinet", "北墙橱柜台面", 1.9, 0.3, { width: 1.8, depth: 0.6, height: 0.9 }),
    K("pantry", "cabinet", "高柜", 5.5, 0.3, { width: 1.8, depth: 0.6, height: 2.3 }),
    K("island", "table", "厨房中岛", 3.5, 4, { width: 2, depth: 1, height: 0.92 }),
    K("stool-1", "chair", "吧凳", 3, 4.85, { width: 0.45, depth: 0.48, height: 0.95 }, 180),
    K("stool-2", "chair", "吧凳 2", 4, 4.85, { width: 0.45, depth: 0.48, height: 0.95 }, 180),
    K("island-flowers", "plant", "中岛花瓶", 4.2, 3.8, { width: 0.26, depth: 0.26, height: 0.38 }, 0, { pot: "#d9d2c3", leaves: "#9fb07a" }, 0.92),
    K("plant", "plant", "厨房角落绿植", 6.5, 7.5, { width: 0.6, depth: 0.6, height: 1.3 }),
  ],
};

// ── Garden: the whole 44 × 42 m plot, with the house standing on it ──

const Y = pieceMaker("garden");
const ON_PAVING = 0.03;
const olive = (id: string, name: string, x: number, z: number, size = 4, height = 4.8) =>
  Y(id, "tree", name, x, z, { width: size, depth: size, height }, 0, OLIVE);
const cypress = (id: string, name: string, x: number, z: number, height = 7) =>
  Y(id, "tree", name, x, z, { width: 1.25, depth: 1.25, height }, 0, CYPRESS);

const garden = {
  name: "花园 · 总平面",
  kind: "garden" as const,
  position: [0, 0] as [number, number],
  rotation: 0,
  room: { width: 44, depth: 42, height: 10 },
  palette: OUTDOOR,
  openings: [],
  furniture: [
    // ① Entrance and drive
    Y("drive", "paving", "主入口车道", 27, 2.25, { width: 4, depth: 4.5, height: 0.03 }),
    Y("forecourt", "paving", "入口前院", 22, 6.7, { width: 16, depth: 4.4, height: 0.03 }),
    Y("hedge-front", "shrub", "前院绿篱", 19.5, 4.1, { width: 10, depth: 0.6, height: 1.1 }),
    Y("hedge-front-2", "shrub", "前院绿篱 2", 31.5, 4.1, { width: 4, depth: 0.6, height: 1.1 }),
    cypress("gate-cypress-1", "入口柏树", 13, 5),
    cypress("gate-cypress-2", "入口柏树 2", 31, 6.2),
    Y("entry-pot-1", "plant", "入口陶盆", 20.6, 8.4, { width: 0.7, depth: 0.7, height: 1.3 }, 0, undefined, ON_PAVING),
    Y("entry-pot-2", "plant", "入口陶盆 2", 23.4, 8.4, { width: 0.7, depth: 0.7, height: 1.3 }, 0, undefined, ON_PAVING),
    // ③ Terrace and outdoor dining
    Y("terrace", "paving", "露台与户外餐区", 22, 22.6, { width: 16.2, depth: 5, height: 0.03 }),
    Y("dining", "table", "户外长餐桌", 18, 22.4, { width: 2.8, depth: 1, height: 0.76 }, 0, undefined, ON_PAVING),
    ...[17, 18, 19].map((x, i) => Y(`dining-n${i}`, "chair", `户外餐椅 ${i + 1}`, x, 21.6, { width: 0.48, depth: 0.52, height: 0.88 }, 0, undefined, ON_PAVING)),
    ...[17, 18, 19].map((x, i) => Y(`dining-s${i}`, "chair", `户外餐椅 ${i + 4}`, x, 23.2, { width: 0.48, depth: 0.52, height: 0.88 }, 180, undefined, ON_PAVING)),
    Y("lounge-sofa", "sofa", "露台沙发", 25.5, 21.2, { width: 2.6, depth: 0.95, height: 0.8 }, 0, { accent: "#c98f6c" }, ON_PAVING),
    Y("lounge-table", "table", "露台石茶几", 25.5, 22.6, { width: 1.2, depth: 0.7, height: 0.4 }, 0, undefined, ON_PAVING),
    Y("lounge-chair-1", "armchair", "露台单椅", 24, 23.6, { width: 0.85, depth: 0.85, height: 0.95 }, 150, undefined, ON_PAVING),
    Y("lounge-chair-2", "armchair", "露台单椅 2", 27, 23.6, { width: 0.85, depth: 0.85, height: 0.95 }, 210, undefined, ON_PAVING),
    Y("terrace-pot-1", "plant", "露台陶盆", 14.5, 20.8, { width: 0.8, depth: 0.8, height: 1.6 }, 0, undefined, ON_PAVING),
    Y("terrace-pot-2", "plant", "露台陶盆 2", 29.5, 20.8, { width: 0.8, depth: 0.8, height: 1.6 }, 0, undefined, ON_PAVING),
    // ⑤ Planting around the sunken courtyard, doubling as its parapet
    Y("court-edge-n1", "shrub", "庭院北侧花槽", 18.6, 24.75, { width: 6.78, depth: 0.6, height: 0.8 }, 0, undefined, ON_PAVING),
    Y("court-edge-n2", "shrub", "庭院北侧花槽 2", 25.4, 24.75, { width: 6.78, depth: 0.6, height: 0.8 }, 0, undefined, ON_PAVING),
    Y("court-edge-e", "shrub", "庭院东侧花带", 29.6, 30.7, { width: 11, depth: 0.8, height: 0.8 }, 90),
    Y("court-edge-s", "shrub", "庭院南侧花带", 23.2, 36.8, { width: 11.2, depth: 0.8, height: 0.8 }, 0, ROSES),
    Y("court-edge-w", "shrub", "庭院西侧花带", 14.5, 30, { width: 10, depth: 0.7, height: 0.8 }, 90),
    Y("court-path", "paving", "通往庭院石阶的小径", 15.8, 38.6, { width: 1.6, depth: 4.6, height: 0.03 }),
    // ④ Lawn and flower garden
    Y("east-path", "paving", "东侧花园步道", 32.5, 22.6, { width: 4.8, depth: 1.4, height: 0.03 }),
    Y("roses-1", "shrub", "玫瑰花境", 33.5, 20.6, { width: 4.6, depth: 1, height: 0.7 }, 0, ROSES),
    Y("roses-2", "shrub", "玫瑰花境 2", 33.5, 24.6, { width: 4.6, depth: 1, height: 0.7 }, 0, ROSES),
    olive("lawn-olive", "草坪上的老橄榄树", 36, 28, 5, 5.5),
    // ⑧ Pet-friendly lawn, edged with lavender
    Y("lavender-1", "shrub", "薰衣草花带", 36, 33.8, { width: 6, depth: 1.2, height: 0.65 }),
    Y("lavender-2", "shrub", "薰衣草花带 2", 36, 36.2, { width: 6, depth: 1.2, height: 0.65 }),
    // ⑦ Side yard and kitchen garden
    Y("west-path", "paving", "西侧小径", 10, 22.6, { width: 7.8, depth: 1.4, height: 0.03 }),
    Y("veg-path", "paving", "菜园步道", 8, 29.5, { width: 1.2, depth: 12, height: 0.03 }),
    ...[[6, 26.5], [10, 26.5], [6, 31], [10, 31]].map(([x, z], i) =>
      Y(`veg-${i}`, "shrub", `菜园种植床 ${i + 1}`, x, z, { width: 1.6, depth: 3.2, height: 0.5 }, 0, TOMATOES)),
    olive("kitchen-olive", "厨房外的橄榄树", 4, 18, 3.5, 4.4),
    // The boundary planting from the site plan
    olive("n-olive-1", "北侧橄榄树", 4, 2.6, 4, 4.6),
    cypress("n-cypress-1", "北侧柏树", 10, 2.2),
    olive("n-olive-2", "北侧橄榄树 2", 16, 2.6, 3.6, 4.2),
    olive("n-olive-3", "北侧橄榄树 3", 35, 2.6, 4, 4.8),
    cypress("n-cypress-2", "北侧柏树 2", 40.5, 2.4, 7.5),
    ...[[9, true], [15, false], [21, true], [27, true], [33, true], [39, false]].map(([z, slim], i) => slim
      ? cypress(`w-${i}`, `西侧柏树 ${i + 1}`, 2.4, z as number)
      : olive(`w-${i}`, `西侧橄榄树 ${i + 1}`, 2.4, z as number)),
    ...[[9, false], [15, true], [21, false], [27, true], [33, false], [39, true]].map(([z, slim], i) => slim
      ? cypress(`e-${i}`, `东侧柏树 ${i + 1}`, 41.6, z as number)
      : olive(`e-${i}`, `东侧橄榄树 ${i + 1}`, 41.6, z as number)),
    olive("s-olive-1", "南侧橄榄树", 8, 39.6),
    cypress("s-cypress-1", "南侧柏树", 24, 40),
    olive("s-olive-2", "南侧橄榄树 2", 30, 39.6),
    cypress("s-cypress-2", "南侧柏树 2", 36, 40),
  ],
};

export const VILLA_PROJECT: ProjectTemplate = {
  name: "地中海别墅 · 地下图书馆与花园",
  rooms: [garden, groundFloor, upperFloor, kitchen, library, courtyard],
};
