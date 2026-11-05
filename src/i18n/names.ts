import type { FurnitureType, OpeningType } from "../types";
import { en, type Lang, MESSAGES, zh } from "./messages";

/**
 * Names are document data: what the user types stays exactly as typed. Names
 * the app made up — catalog labels like "Chair 2", and every piece in the
 * bundled templates — are translated when they're shown, so switching
 * language never leaves one language's names in the other's interface.
 *
 * Each pair is [English, Chinese]. A stored name in either language is
 * recognized, with or without a trailing " 2"-style counter.
 */
type NamePair = [en: string, zh: string];

/** The sample bedroom, plus project and room defaults. */
const SAMPLE: NamePair[] = [
  [en.defaults.room, zh.defaults.room],
  [en.defaults.project, zh.defaults.project],
  [en.defaults.building, zh.defaults.building],
  ["Bedroom Study", "卧室书房"],
  ["Nightstand", "床头柜"],
  ["Wardrobe", "衣柜"],
  ["Fig tree", "琴叶榕"],
  ["Desk plant", "桌面绿植"],
  ["Desk window", "书桌窗"],
];

/** 阳光里的墨香与旅行手账 (roomTemplates.ts). */
const SUNLIT_STUDY: NamePair[] = [
  ["Ink and Travel Journals in the Sun", "阳光里的墨香与旅行手账"],
  ["Large sunny window", "朝阳大窗"],
  ["Study entrance", "书房入口"],
  ["Blue-grey and terracotta rug", "蓝灰与陶土色花纹地毯"],
  ["Travel books and souvenirs shelf", "旅行书籍与纪念品架"],
  ["Journal paper bookcase", "手账纸品收纳书架"],
  ["Art supplies and stationery bookcase", "绘画材料与文具书架"],
  ["Full-height cabinet, left", "左侧通顶储物柜"],
  ["Low shelf for travel books and albums", "窗下旅行书与相册矮书架"],
  ["Reading nook bookcase", "阅读角书架"],
  ["Blue-grey floral curtains", "蓝灰碎花窗帘"],
  ["Solid wood journaling table", "中央实木手账工作桌"],
  ["Wooden chair, dusty rose cushion", "豆沙粉软垫木椅"],
  ["Spare journaling chair", "手账桌备用木椅"],
  ["Wooden chair, blue-grey cushion", "蓝灰软垫木椅"],
  ["Calligraphy and painting bench", "右侧书法与绘画长案"],
  ["Reading chair by the window", "窗边布艺阅读椅"],
  ["Reading footstool", "阅读脚凳"],
  ["Reading side table", "阅读边几"],
  ["Journaling supplies chest", "手账材料收纳柜"],
  ["Plant by the window", "窗边绿植"],
  ["Windowsill plant", "窗台小盆栽"],
  ["Plant on the tall bookcase", "高书架绿植"],
  ["Plant on the reading nook shelf", "阅读角书架绿植"],
  ["Blush bouquet on the journaling table", "手账桌上的暖粉花束"],
];

/** 地中海别墅 (villaTemplate.ts). */
const VILLA: NamePair[] = [
  ["Mediterranean Villa · Underground Library & Garden", "地中海别墅 · 地下图书馆与花园"],
  // Underground library
  ["Underground library · double height", "地下图书馆 · 两层挑高"],
  ["Courtyard glass", "朝庭院的落地玻璃"],
  ["Clerestory window", "二层高窗"],
  ["Stair to the house", "通往住宅的楼梯间"],
  ["Curved stair to the gallery", "通往回廊的旋转楼梯"],
  ["Upper gallery", "二层挑空回廊"],
  ["Bookcase by the stair", "楼梯旁书架"],
  ["Book wall · literature", "下层书墙 · 文学"],
  ["Book wall · art and travel", "下层书墙 · 艺术与旅行"],
  ["Bookcase by the door", "门旁书架"],
  ["Gallery book wall", "回廊书墙"],
  ["Gallery leather reading chair", "回廊皮革阅读椅"],
  ["Gallery side table", "回廊小边几"],
  ["Gallery reading lamp", "回廊阅读灯"],
  ["Gallery plant", "回廊绿植"],
  ["West wall bookcase", "西墙书柜"],
  ["Tuscan landscape", "托斯卡纳风景画"],
  ["Small wheat field painting", "麦田小幅油画"],
  ["Long wooden craft table", "长木手作桌"],
  ["Craft table chair", "手作桌木椅"],
  ["Bouquet on the craft table", "手作桌上的花束"],
  ["Easel with a landscape", "画架与风景油画"],
  ["Terracotta Persian rug", "陶土色波斯地毯"],
  ["Large white fabric sofa", "白色布艺大沙发"],
  ["Travertine coffee table", "石灰华茶几"],
  ["Coffee table bouquet", "茶几花束"],
  ["Brown leather armchair", "棕色皮革单椅"],
  ["Olive velvet armchair", "橄榄绿丝绒单椅"],
  ["Low media console", "低矮影音柜"],
  ["Floor lamp by the sofa", "沙发旁落地灯"],
  ["Floor lamp by the leather chair", "皮椅旁落地灯"],
  ["Sofa side table", "沙发边几"],
  ["Side table lamp", "边几台灯"],
  ["Potted olive by the glass", "窗边橄榄树盆栽"],
  ["Plant by the stair", "楼梯旁绿植"],
  ["High landscape painting", "高处风景画"],
  // Sunken courtyard
  ["Sunken courtyard", "下沉庭院"],
  ["Library glass", "图书馆落地玻璃"],
  ["Library clerestory", "图书馆高窗"],
  ["Courtyard stone stair", "下沉庭院石阶"],
  ["Courtyard olive tree", "庭院橄榄树"],
  ["Lavender under the olive", "橄榄树下的薰衣草"],
  ["Courtyard bistro table", "庭院小餐桌"],
  ["Courtyard bistro chair", "庭院餐椅"],
  ["Courtyard lounge chair", "庭院休闲椅"],
  ["Outdoor side table", "户外边几"],
  ["Terracotta pot by the stair", "石阶旁陶盆"],
  ["Corner terracotta pot", "庭院角落陶盆"],
  ["East wall lavender bed", "东墙薰衣草花带"],
  ["South wall flower bed", "南墙花带"],
  // Ground floor
  ["Ground floor · living and dining", "地面一层 · 客厅与餐厅"],
  ["Main entrance", "主入口"],
  ["North window", "北窗"],
  ["Terrace French window", "通往露台的落地窗"],
  ["East window", "东窗"],
  ["To the kitchen", "通往厨房"],
  ["Living room rug", "客厅地毯"],
  ["Living room sofa", "客厅沙发"],
  ["Stone coffee table", "石材茶几"],
  ["Living room armchair", "客厅单椅"],
  ["Living room floor lamp", "客厅落地灯"],
  ["Living room bookcase", "客厅书架"],
  ["Living room corner plant", "客厅角落绿植"],
  ["Solid wood dining table", "实木餐桌"],
  ["Dining chair", "餐椅"],
  ["Sideboard", "餐边柜"],
  ["Dining room painting", "餐厅挂画"],
  ["Entry console", "玄关柜"],
  ["Entry plant", "玄关小盆栽"],
  ["Entry painting", "玄关挂画"],
  ["Plant by the kitchen door", "厨房门旁绿植"],
  // Upper floor
  ["Upper floor · bedrooms and study", "地面二层 · 卧室与书房"],
  ["Upper north window", "二层北窗"],
  ["Upper south window", "二层南窗"],
  ["Upper east window", "二层东窗"],
  ["Upper west window", "二层西窗"],
  ["Master bed", "主卧大床"],
  ["Master nightstand", "主卧床头柜"],
  ["Bedside lamp", "床头台灯"],
  ["Master bedroom rug", "主卧地毯"],
  ["Bench at the foot of the bed", "床尾凳"],
  ["Master wardrobe", "主卧衣柜"],
  ["Master bedroom reading chair", "主卧阅读椅"],
  ["Reading floor lamp", "阅读落地灯"],
  ["Study desk", "书房书桌"],
  ["Desk chair", "书桌椅"],
  ["Desk lamp", "书桌台灯"],
  ["Study bookcase", "书房书架"],
  ["Guest bed", "客房床"],
  ["Guest nightstand", "客房床头柜"],
  ["Upper floor plant", "二层绿植"],
  // Kitchen wing
  ["Kitchen wing", "厨房侧翼"],
  ["To the living and dining room", "通往客餐厅"],
  ["Kitchen west window", "厨房西窗"],
  ["To the kitchen garden", "通往菜园"],
  ["Kitchen north window", "厨房北窗"],
  ["West wall counter", "西墙橱柜台面"],
  ["North wall counter", "北墙橱柜台面"],
  ["Tall pantry", "高柜"],
  ["Kitchen island", "厨房中岛"],
  ["Bar stool", "吧凳"],
  ["Island vase", "中岛花瓶"],
  ["Kitchen corner plant", "厨房角落绿植"],
  // Garden
  ["Garden · site plan", "花园 · 总平面"],
  ["Main drive", "主入口车道"],
  ["Forecourt", "入口前院"],
  ["Forecourt hedge", "前院绿篱"],
  ["Entrance cypress", "入口柏树"],
  ["Entrance pot", "入口陶盆"],
  ["Terrace and outdoor dining", "露台与户外餐区"],
  ["Long outdoor table", "户外长餐桌"],
  ["Outdoor dining chair", "户外餐椅"],
  ["Terrace sofa", "露台沙发"],
  ["Terrace stone coffee table", "露台石茶几"],
  ["Terrace armchair", "露台单椅"],
  ["Terrace pot", "露台陶盆"],
  ["Courtyard north planter", "庭院北侧花槽"],
  ["Courtyard east bed", "庭院东侧花带"],
  ["Courtyard south bed", "庭院南侧花带"],
  ["Courtyard west bed", "庭院西侧花带"],
  ["Path to the courtyard stair", "通往庭院石阶的小径"],
  ["East garden path", "东侧花园步道"],
  ["Rose border", "玫瑰花境"],
  ["Old olive on the lawn", "草坪上的老橄榄树"],
  ["Lavender border", "薰衣草花带"],
  ["West path", "西侧小径"],
  ["Kitchen garden path", "菜园步道"],
  ["Vegetable bed", "菜园种植床"],
  ["Olive by the kitchen", "厨房外的橄榄树"],
  ["North olive", "北侧橄榄树"],
  ["North cypress", "北侧柏树"],
  ["West cypress", "西侧柏树"],
  ["West olive", "西侧橄榄树"],
  ["East cypress", "东侧柏树"],
  ["East olive", "东侧橄榄树"],
  ["South olive", "南侧橄榄树"],
  ["South cypress", "南侧柏树"],
];

/** 一居室公寓 (apartmentTemplate.ts). */
const APARTMENT: NamePair[] = [
  ["One-bedroom apartment · from a floor plan", "一居室公寓 · 按平面图"],
  ["Living room · work & meals", "客厅 · 工作与用餐"],
  ["Kitchen & entry hall", "厨房与入户走廊"],
  ["Bedroom", "卧室"],
  ["Walk-in closet", "步入式衣柜"],
  ["Bathroom", "浴室"],
  ["Front door", "入户门"],
  ["Bedroom door", "卧室门"],
  ["Living room window", "客厅窗"],
  ["Bedroom window", "卧室窗"],
  ["Closet door", "衣柜门"],
  ["Bath door", "浴室门"],
  // Living room
  ["Big table (work + meals)", "大桌（工作 + 吃饭）"],
  ["Big table chair", "大桌椅"],
  ["Dog crate", "狗笼"],
  ["Storage rack", "储物架"],
  // Kitchen and hall
  ["Sink counter", "水槽台面"],
  ["Range and oven", "炉灶烤箱"],
  ["Counter by the range", "炉灶旁台面"],
  ["Storage cabinet", "储物柜"],
  ["Stacked washer", "叠放洗衣机"],
  ["Dryer", "烘干机"],
  // Bedroom
  ["Desk A", "书桌 A"],
  ["Queen bed", "Queen 床"],
];

/** Labels of everything in the library: the default names of new pieces. */
const LABELS: NamePair[] = [
  ...(Object.keys(en.furniture) as FurnitureType[]).map((t): NamePair => [en.furniture[t].label, zh.furniture[t].label]),
  ...(Object.keys(en.openings) as OpeningType[]).map((t): NamePair => [en.openings[t].label, zh.openings[t].label]),
  ...Object.keys(en.presets).map((k): NamePair => [en.presets[k], zh.presets[k]]),
];

export const NAME_PAIRS: NamePair[] = [...SAMPLE, ...SUNLIT_STUDY, ...VILLA, ...APARTMENT, ...LABELS];

const LOOKUP = new Map<string, NamePair>();
for (const pair of NAME_PAIRS) for (const text of pair) LOOKUP.set(text, pair);

const COUNTER = /^(.*\S) (\d+)$/;

/** A stored name as it should read in `lang`. Unknown (typed) names come back unchanged. */
export function localizeName(name: string, lang: Lang): string {
  const exact = LOOKUP.get(name);
  if (exact) return exact[lang === "en" ? 0 : 1];
  const m = COUNTER.exec(name);
  const base = m && LOOKUP.get(m[1]);
  return base ? `${base[lang === "en" ? 0 : 1]} ${m[2]}` : name;
}

/** Language-independent identity of a name, so "Chair 2" and "椅子 2" count as the same name. */
export const nameKey = (name: string) => localizeName(name, "en");

export const furnitureLabel = (type: FurnitureType, lang: Lang) => MESSAGES[lang].furniture[type].label;
export const openingLabel = (type: OpeningType, lang: Lang) => MESSAGES[lang].openings[type].label;
