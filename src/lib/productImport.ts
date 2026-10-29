import type { Dimensions, FurnitureType } from "../types";
import { CATALOG, LIBRARY } from "./catalog";

/**
 * Turn a pasted product title and size line — as copied from a shop page —
 * into a model and its size. Plain rules, no network: keywords pick the
 * model, and the size is read from labeled values ("长220 宽95 高85cm",
 * "W220 D95 H85"), a W×D×H triple ("120*60*75cm", `84" W x 38" D x 34" H`),
 * a pair, or a TV's inches. Metric, inches and feet are all understood.
 */

export interface ParsedProduct {
  /** The model the text names, or null if no keyword matched. */
  type: FurnitureType | null;
  /** A library card whose common size fits the text better than the model default ("三人沙发"). */
  presetId: string | null;
  /** Sizes found in the text, in meters. */
  dimensions: Partial<Dimensions>;
  /** The part of the text the size was read from, for the "read from" note. */
  source: string | null;
  /** The title with the size text taken out. */
  name: string;
}

/** Keyword → model, most specific first. A preset id supplies a better default size. */
const KEYWORDS: [RegExp, FurnitureType, string?][] = [
  [/转角沙发|l\s*型沙发|l形沙发|贵妃|corner sofa|sectional|l-shaped/, "cornerSofa", "cornerSofa"],
  [/单人沙发|单人位|扶手椅|休闲椅|单椅|老虎椅|armchair|lounge chair|accent chair/, "armchair"],
  [/三人沙发|三人位|3-seat|three-seat/, "sofa", "sofa3"],
  [/双人沙发|双人位|两人位|2-seat|loveseat/, "sofa", "sofa2"],
  [/沙发|sofa|couch/, "sofa", "sofa3"],
  [/脚凳|床尾凳|搁脚|ottoman|footstool|pouf/, "ottoman"],
  [/落地灯|floor lamp/, "lamp", "floorLamp"],
  [/台灯|table lamp|desk lamp/, "lamp", "tableLamp"],
  [/办公椅|电脑椅|转椅|人体工学椅|电竞椅|office chair|gaming chair|desk chair/, "officeChair"],
  [/吧椅|吧凳|吧台椅|bar stool/, "chair", "barStool"],
  [/餐椅|椅子|靠背椅|dining chair|chair|stool|凳/, "chair", "diningChair"],
  [/圆桌|圆形餐桌|圆餐桌|round (?:dining )?table/, "roundTable"],
  [/茶几|coffee table/, "table", "coffeeTable"],
  [/边几|角几|side table|end table/, "cabinet", "sideTable"],
  [/书桌|电脑桌|写字台|办公桌|学习桌|desk/, "desk"],
  [/梳妆台|化妆台|dressing table|vanity table/, "desk", "dressingTable"],
  [/餐桌|饭桌|dining table/, "table", "dining4"],
  [/中岛|kitchen island/, "table", "island"],
  [/电视柜|电视机柜|tv stand|tv cabinet|media console|tv unit/, "dresser", "tvStand"],
  [/电视|tv\b|television/, "tv", "tv65"],
  [/床头柜|nightstand|bedside/, "cabinet", "nightstand"],
  [/衣柜|衣橱|wardrobe|closet|armoire/, "cabinet", "wardrobe"],
  [/餐边柜|sideboard|buffet/, "dresser", "sideboard"],
  [/斗柜|抽屉柜|五斗柜|chest of drawers|dresser/, "dresser"],
  [/书柜|书架|置物架|展示架|bookcase|bookshelf|shelving/, "bookcase"],
  [/冰箱|refrigerator|fridge/, "fridge"],
  [/洗衣机|烘干机|洗烘|washing machine|washer|dryer/, "washer"],
  [/橱柜|灶台柜|kitchen cabinet|kitchen counter/, "kitchenCounter"],
  [/马桶|坐便器|坐厕|toilet/, "toilet"],
  [/浴室柜|洗手台|洗脸盆|台盆柜|bathroom vanity|vanity/, "vanity"],
  [/浴缸|bathtub|\btub\b/, "bathtub"],
  [/淋浴房|淋浴屏|淋浴|shower/, "shower"],
  [/床垫|床|bed|mattress/, "bed"],
  [/灯|lamp/, "lamp", "floorLamp"],
  [/地毯|地垫|rug|carpet/, "rug", "rug"],
  [/窗帘|curtain/, "curtains"],
  [/投影幕|projector screen/, "screen"],
  [/装饰画|挂画|油画|画框|painting|poster|wall art|framed/, "artwork"],
  [/绿植|盆栽|植物|plant/, "plant", "floorPlant"],
  [/鞋柜|储物柜|柜|cabinet|cupboard|locker/, "cabinet"],
  [/桌|table/, "table", "dining4"],
];

const NUM = String.raw`(\d+(?:\.\d+)?)`;
/** A unit right after a number; a following word ("85 modern") is not one, but a single label letter ("84in w") may follow. */
const UNIT = String.raw`\s*(?:(mm|cm|m|in|ft)(?![a-z]{2}))?`;
/** US listings put the label after the value: 84" W. */
const TAIL = String.raw`(?:\s*[lwdh](?![a-z]))?`;
const TIMES = String.raw`\s*[x×*✕]\s*`;
/** A labeled value. Seat, arm, back and leg heights are parts, not the overall size, so they are skipped. */
const LABELS = String.raw`长度?|宽度?|深度?|进深|高度?|直径|length|width|depth|height|diameter|[lwdh]`;
const LABELED = new RegExp(String.raw`(?<![座手背头腿屉内净地a-z])(${LABELS})\s*[:=]?\s*${NUM}${UNIT}`, "g");
const TRIPLE = new RegExp(`${NUM}${UNIT}${TAIL}${TIMES}${NUM}${UNIT}${TAIL}${TIMES}${NUM}${UNIT}`);
const PAIR = new RegExp(`${NUM}${UNIT}${TAIL}${TIMES}${NUM}${UNIT}`);
const SINGLE = new RegExp(String.raw`(?<![\d.])${NUM}\s*(mm|cm|m|in|ft)(?![a-z])`);
const INCHES = /(\d{2,3})\s*(?:in|寸)(?![a-z])/;

const SCALE = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 } as const;
type Unit = keyof typeof SCALE;

/** Full-width punctuation, Chinese units, "米" and inch or foot marks after a number, in one spelling. */
function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[：]/g, ":").replace(/[＊]/g, "*").replace(/[Ｘｘ]/g, "x").replace(/[，、]/g, ",").replace(/．/g, ".")
    .replace(/毫米/g, "mm").replace(/厘米|公分/g, "cm").replace(/(\d)\s*米/g, "$1m")
    .toLowerCase()
    .replace(/(\d)\s*(?:英寸|inches|inch|[“”″＂"]|[‘’′＇']{2})/g, "$1in").replace(/(\d)\s*(?:feet|foot|ft|[‘’′＇'])/g, "$1ft");
}

/** Values given without a unit: millimetres if any is 400 or more, meters if all are small, otherwise centimetres. */
function inferUnit(values: number[]): Unit {
  const max = Math.max(...values);
  if (max >= 400) return "mm";
  if (max <= 3.5) return "m";
  return "cm";
}

/** Scale a group of values. A unit written on any of them applies to the ones without. */
function toMeters(values: number[], units: (string | undefined)[]): number[] {
  const written = units.find(Boolean) as Unit | undefined;
  const fallback = written ?? inferUnit(values);
  return values.map((v, i) => v * SCALE[(units[i] as Unit | undefined) ?? fallback]);
}

const round = (m: number) => Math.round(m * 1000) / 1000;

function axisOf(label: string): "length" | "width" | "depth" | "height" | "diameter" {
  if (label === "直径" || label === "diameter") return "diameter";
  const key = label[0];
  return key === "长" || key === "l" ? "length" : key === "宽" || key === "w" ? "width"
    : key === "深" || key === "进" || key === "d" ? "depth" : "height";
}

function readSize(text: string): { dimensions: Partial<Dimensions>; source: string | null; lone?: boolean } {
  // 1. Labeled values: 长/宽/深/高, L/W/D/H, or the words. A lone single letter is too easy to misread.
  const labeled = [...text.matchAll(LABELED)];
  if (labeled.length >= 2 || labeled.some((m) => m[1].length > 1 || /[^a-z]/.test(m[1]))) {
    const meters = toMeters(labeled.map((m) => Number(m[2])), labeled.map((m) => m[3]));
    const v: Record<string, number> = {};
    labeled.forEach((m, i) => { v[axisOf(m[1])] ??= meters[i]; });
    // A Chinese listing's 长 is side to side and its 宽 front to back; so are an English L and W.
    const width = v.diameter ?? v.length ?? v.width;
    const depth = v.diameter ?? v.depth ?? (v.length !== undefined ? v.width : undefined);
    const dimensions: Partial<Dimensions> = {};
    if (width !== undefined) dimensions.width = round(width);
    if (depth !== undefined) dimensions.depth = round(depth);
    if (v.height !== undefined) dimensions.height = round(v.height);
    return { dimensions, source: labeled.map((m) => m[0].trim()).join(" ") };
  }
  // 2. W × D × H, then W × D.
  const triple = TRIPLE.exec(text);
  if (triple) {
    const [w, d, h] = toMeters([triple[1], triple[3], triple[5]].map(Number), [triple[2], triple[4], triple[6]]);
    return { dimensions: { width: round(w), depth: round(d), height: round(h) }, source: triple[0].trim() };
  }
  const pair = PAIR.exec(text);
  if (pair) {
    const [w, d] = toMeters([pair[1], pair[3]].map(Number), [pair[2], pair[4]]);
    return { dimensions: { width: round(w), depth: round(d) }, source: pair[0].trim() };
  }
  // 3. One length with a unit ("1.4m 餐桌"): the width.
  const single = SINGLE.exec(text);
  if (single) return { dimensions: { width: round(Number(single[1]) * SCALE[single[2] as Unit]) }, source: single[0].trim(), lone: true };
  return { dimensions: {}, source: null };
}

export function parseProduct(input: string): ParsedProduct {
  const text = normalize(input);
  const hit = KEYWORDS.find(([re]) => re.test(text));
  let type = hit?.[1] ?? null;
  let presetId = hit?.[2] ?? null;
  const size = readSize(text);
  let { dimensions, source } = size;

  if (type === "bed") {
    // Beds are listed by mattress width ("1.8米床"); their long side is our depth.
    if (dimensions.width !== undefined && dimensions.depth !== undefined && dimensions.width > dimensions.depth) {
      dimensions = { ...dimensions, width: dimensions.depth, depth: dimensions.width };
    }
    const w = dimensions.width;
    presetId = w === undefined ? "bed18" : w < 1.35 ? "bed12" : w < 1.65 ? "bed15" : "bed18";
    if (w !== undefined && dimensions.depth === undefined && w <= 2.2) {
      // A bare mattress width: add the frame, as the library's beds do.
      dimensions = { ...dimensions, width: round(w + 0.06) };
    }
  }

  const inches = INCHES.exec(text);
  // A TV's one inch figure is its diagonal, not its width.
  if (inches && (type === "tv" || (type === null && /电视|tv/.test(text))) && (dimensions.width === undefined || size.lone)) {
    // A 16:9 panel: width and height from the diagonal.
    const diagonal = Number(inches[1]) * 0.0254;
    type = "tv";
    presetId = "tv65";
    dimensions = { width: round(diagonal * 0.8716 + 0.02), height: round(diagonal * 0.4903 + 0.02) };
    source = inches[0].trim();
  }

  return { type, presetId, dimensions, source, name: titleOf(input) };
}

const LENGTH = String.raw`\d+(?:\.\d+)?\s*(?:mm|cm|m|in(?:ch(?:es)?)?|ft|[“”″＂"]|[‘’′＇']{1,2}|毫米|厘米|公分|米)?(?:\s*[lwdh](?![a-z]))?`;
const SIZE_TEXT = [
  new RegExp(`${LENGTH}(?:\\s*[x×*✕＊ｘ]\\s*${LENGTH}){1,2}`, "gi"),
  new RegExp(`(?<![座手背头腿屉内净地a-z])(?:${LABELS}|尺寸|规格)\\s*[:：=]?\\s*${LENGTH}`, "gi"),
  /\d+(?:\.\d+)?\s*(?:mm|cm|毫米|厘米|公分|inch(?:es)?\b|in\b)/gi,
];

/** Shop-listing words that say nothing about the piece. */
const CLUTTER = /包邮|顺丰|新款|现货|爆款|网红|官方|旗舰店|正品|特价|促销|热卖|厂家直销|免安装|20\d\d\s*年?\s*新?款?|free shipping|best seller|hot sale|\bnew\b/gi;

/** The product name: the first line without its size text, shop clutter and brackets, kept short. */
function titleOf(input: string): string {
  let line = input.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  for (const re of SIZE_TEXT) line = line.replace(re, " ");
  line = line.replace(CLUTTER, " ");
  line = line.replace(/[【】[\]（）()|,，、:：]+/g, " ").replace(/(?<=^|\s)[x×*✕](?=\s|$)/gi, " ").replace(/\s+/g, " ").trim();
  return line.length > 24 ? `${line.slice(0, 23)}…` : line;
}

/** The size to build: what the text gave, the rest from the matching library card or the model's default. */
export function productSize(type: FurnitureType, presetId: string | null, found: Partial<Dimensions>): Dimensions {
  const preset = LIBRARY.flatMap((c) => c.presets).find((p) => p.id === presetId && p.type === type);
  return { ...(preset?.dimensions ?? CATALOG[type].defaults), ...found };
}

/** Whether a size had to be pulled into the model's limits. */
export function outOfRange(type: FurnitureType, size: Dimensions): boolean {
  const { min, max } = CATALOG[type];
  return (["width", "depth", "height"] as const).some((k) => size[k] < min[k] - 1e-6 || size[k] > max[k] + 1e-6);
}
