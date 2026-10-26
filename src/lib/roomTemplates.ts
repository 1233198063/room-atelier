import type { Dimensions, Furniture, FurnitureColors, FurnitureType, RoomTemplate } from "../types";

const piece = (id: string, type: FurnitureType, name: string, x: number, z: number,
  dimensions: Dimensions, rotation = 0, colors?: FurnitureColors, elevation = 0): Furniture => ({
  id: `sunlit-${id}`, type, name, position: [x, elevation, z], dimensions, rotation, ...(colors ? { colors } : {}),
});

/** Estimated from the supplied reference, not a measured survey. All items remain editable. */
export const SUNLIT_STUDY: RoomTemplate = {
  name: "阳光里的墨香与旅行手账",
  room: { width: 4.8, depth: 5.8, height: 2.9 },
  palette: {
    id: "custom", wall: "#eee1cc", floor: "#d3b085", wood: "#b68a58", woodDark: "#795332",
    fabric: "#d2bd9e", accent: "#8c9b9d", metal: "#b5914d",
  },
  openings: [
    { id: "sunlit-window", type: "window", name: "朝阳大窗", wall: "back", offset: 2.35,
      width: 2.6, height: 1.65, elevation: 0.85, hinge: "start" },
    { id: "sunlit-door", type: "door", name: "书房入口", wall: "front", offset: 1.08,
      width: 0.9, height: 2.15, elevation: 0, hinge: "start" },
  ],
  furniture: [
    piece("rug", "rug", "蓝灰与陶土色花纹地毯", 2.45, 3.25, { width: 3.6, depth: 4.45, height: 0.012 }, 0,
      { fabric: "#8d9b9c", accent: "#b88d70" }),
    ...[0.85, 2.3, 3.75].map((z, i) => piece(`shelf-${i}`, "bookcase", ["旅行书籍与纪念品架", "手账纸品收纳书架", "绘画材料与文具书架"][i],
      0.24, z, { width: 1.4, depth: 0.46, height: 2.65 }, 90,
      { wood: "#b68e60", woodDark: "#85613f", accent: ["#68766b", "#a57c61", "#7d8c96"][i], metal: "#af8848" })),
    piece("left-cabinet", "cabinet", "左侧通顶储物柜", 0.24, 5.05, { width: 1.1, depth: 0.46, height: 2.6 }, 90),
    piece("window-shelf", "bookcase", "窗下旅行书与相册矮书架", 2.35, 0.26, { width: 2.6, depth: 0.42, height: 0.72 }, 0,
      { wood: "#ab8051", woodDark: "#725033", accent: "#8c6653" }),
    piece("right-shelf", "bookcase", "阅读角书架", 4.57, 0.54, { width: 0.9, depth: 0.42, height: 2.3 }, 270),
    piece("curtains", "curtains", "蓝灰碎花窗帘", 2.35, 0.1, { width: 3.4, depth: 0.16, height: 2.65 }, 0,
      { fabric: "#82959b", accent: "#d8c5a4", metal: "#62442c" }, 0.1),
    piece("craft-table", "worktable", "中央实木手账工作桌", 2.22, 3.65, { width: 2.55, depth: 1.15, height: 0.94 }, 90,
      { wood: "#9e6a3c", woodDark: "#674428", accent: "#835342", metal: "#b59049" }),
    piece("chair-rose", "chair", "豆沙粉软垫木椅", 1.15, 3.0, { width: 0.5, depth: 0.52, height: 0.92 }, 270,
      { wood: "#936737", woodDark: "#62452e", fabric: "#b98d83" }),
    piece("chair-left", "chair", "手账桌备用木椅", 1.15, 4.25, { width: 0.5, depth: 0.52, height: 0.92 }, 270,
      { wood: "#936737", woodDark: "#62452e", fabric: "#c5ab8e" }),
    piece("chair-blue", "chair", "蓝灰软垫木椅", 3.24, 3.65, { width: 0.5, depth: 0.55, height: 0.93 }, 90,
      { wood: "#936737", woodDark: "#62452e", fabric: "#8f9b97" }),
    piece("calligraphy", "worktable", "右侧书法与绘画长案", 4.4, 3.78, { width: 2.45, depth: 0.66, height: 0.94 }, 270,
      { wood: "#a27c52", woodDark: "#6b4d32", accent: "#453b32", metal: "#b48b48" }),
    piece("reading-chair", "armchair", "窗边布艺阅读椅", 3.72, 1.2, { width: 0.86, depth: 0.9, height: 1.08 }, 345,
      { fabric: "#d2b998", accent: "#b7877b", woodDark: "#745038" }),
    piece("ottoman", "ottoman", "阅读脚凳", 3.5, 2.15, { width: 0.62, depth: 0.48, height: 0.39 }, 345,
      { fabric: "#cdb494", woodDark: "#745038" }),
    piece("side-table", "cabinet", "阅读边几", 2.95, 1.25, { width: 0.4, depth: 0.4, height: 0.56 }, 0,
      { wood: "#92643f", woodDark: "#63452f" }),
    piece("supplies", "dresser", "手账材料收纳柜", 4.27, 5.39, { width: 0.75, depth: 0.47, height: 0.82 }, 270,
      { wood: "#bd986a", woodDark: "#8e693f", metal: "#ad8744" }),
    piece("floor-plant", "plant", "窗边绿植", 0.8, 0.65, { width: 0.45, depth: 0.45, height: 1.1 }, 0,
      { pot: "#b99c70", leaves: "#576c3c" }),
    piece("window-plant", "plant", "窗台小盆栽", 1.95, 0.26, { width: 0.23, depth: 0.23, height: 0.32 }, 0,
      { pot: "#cbb796", leaves: "#7d8c45" }, 0.72),
    piece("shelf-plant", "plant", "高书架绿植", 0.24, 0.85, { width: 0.24, depth: 0.24, height: 0.22 }, 0,
      { pot: "#b4a488", leaves: "#586f3d" }, 2.65),
    piece("right-plant", "plant", "阅读角书架绿植", 4.57, 0.54, { width: 0.32, depth: 0.32, height: 0.35 }, 0,
      { pot: "#b9a488", leaves: "#5a713e" }, 2.3),
    piece("table-bouquet", "plant", "手账桌上的暖粉花束", 2.22, 2.8, { width: 0.28, depth: 0.28, height: 0.4 }, 0,
      { pot: "#e2d4bb", leaves: "#ba8b7b" }, 0.78),
  ],
};

export const ROOM_TEMPLATES: Record<string, RoomTemplate> = { "sunlit-study": SUNLIT_STUDY };
