import { afterEach, describe, expect, it } from "vitest";
import { checkLayout } from "../lib/layoutChecks";
import { SUNLIT_STUDY } from "../lib/roomTemplates";
import { SAMPLE_LAYOUT } from "../lib/sampleLayout";
import { suggestPalettes } from "../lib/palettes";
import { VILLA_PROJECT } from "../lib/villaTemplate";
import { ADU_PROJECT } from "../lib/aduTemplate";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Furniture } from "../types";
import { getLang, setLang } from ".";
import { en, zh } from "./messages";
import { localizeName, NAME_PAIRS, nameKey } from "./names";

const COUNTER = / \d+$/;
const named = (items: { name: string }[]) => items.map((i) => i.name);
const hasHan = (s: string) => /\p{Script=Han}/u.test(s);

describe("bundled names", () => {
  const chinese = [
    SUNLIT_STUDY.name, ...named(SUNLIT_STUDY.furniture), ...named(SUNLIT_STUDY.openings),
    VILLA_PROJECT.name, ...VILLA_PROJECT.rooms.flatMap((r) => [r.name, ...named(r.furniture), ...named(r.openings)]),
    ADU_PROJECT.name, ...ADU_PROJECT.rooms.flatMap((r) => [r.name, ...named(r.furniture), ...named(r.openings)]),
  ];
  const english = [SAMPLE_LAYOUT.projectName, ...named(SAMPLE_LAYOUT.furniture), ...named(SAMPLE_LAYOUT.openings)];

  it.each(chinese)("template name %s has an English translation", (name) => {
    const english = localizeName(name, "en");
    expect(hasHan(english), english).toBe(false);
    expect(localizeName(name, "zh")).toBe(name);
  });

  it.each(english)("sample name %s has a Chinese translation", (name) => {
    expect(hasHan(localizeName(name, "zh"))).toBe(true);
    expect(localizeName(name, "en")).toBe(name);
  });

  it("maps each text to one translation in each direction", () => {
    const seen = new Map<string, string>();
    for (const [e, z] of NAME_PAIRS) {
      for (const [text, other] of [[e, z], [z, e]]) {
        expect(seen.get(text) ?? other, `${text} → ${other}`).toBe(other);
        seen.set(text, other);
      }
      expect(COUNTER.test(e) || COUNTER.test(z), `${e} ends with a counter`).toBe(false);
    }
  });
});

describe("localizeName", () => {
  it("translates counters and leaves typed names alone", () => {
    expect(localizeName("Chair 3", "zh")).toBe("椅子 3");
    expect(localizeName("餐椅 4", "en")).toBe("Dining chair 4");
    expect(localizeName("Grandma's chair", "zh")).toBe("Grandma's chair");
    expect(localizeName("我的沙发 2", "en")).toBe("我的沙发 2");
    expect(nameKey("沙发 2")).toBe(nameKey("Sofa 2"));
  });
});

describe("messages", () => {
  /** Same keys at every level; functions return text in both languages. */
  function shape(value: unknown): unknown {
    if (typeof value === "function") return "fn";
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, shape(v)]));
    }
    return typeof value;
  }

  it("has the same entries in both languages", () => {
    expect(shape(zh)).toEqual(shape(en));
  });

  it("has no Chinese in English text and no untranslated English sentences in Chinese", () => {
    const strings = (value: unknown): string[] => typeof value === "string" ? [value]
      : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
    // The language switch is the one place each language names the other.
    const { language: _en, ...enRest } = en;
    const { language: _zh, ...zhRest } = zh;
    expect(strings(enRest).filter(hasHan)).toEqual([]);
    // Commands to run stay as typed.
    expect(strings(zhRest).filter((s) => /[a-z]{3,} [a-z]{3,}/.test(s.replace(/npm run \S+/g, "")))).toEqual([]);
  });
});

describe("checks and suggestions in Chinese", () => {
  const room = { width: 4, depth: 3, height: 2.6 };
  const piece = (id: string, type: Furniture["type"], name: string, x: number, z: number): Furniture =>
    ({ id, type, name, position: [x, 0, z], rotation: 0, dimensions: { width: 1, depth: 0.6, height: 0.8 } });

  it("words issues in the requested language, with names translated", () => {
    const furniture = [piece("a", "dresser", "Dresser", 1, 1), piece("b", "dresser", "我的斗柜", 1.2, 1.1)];
    const [overlap] = checkLayout(room, furniture, [], { lang: "zh" }).filter((i) => i.key.startsWith("overlap"));
    expect(overlap.title).toBe("斗柜和我的斗柜重叠了");
    const [english] = checkLayout(room, furniture, []).filter((i) => i.key.startsWith("overlap"));
    expect(english.title).toBe("Dresser and 我的斗柜 overlap");
  });

  it("explains palette suggestions in Chinese", () => {
    const why = suggestPalettes({ width: 3, depth: 3, height: 2.6 }, [], "zh").get("nordic");
    expect(why).toContain("窗户面积");
  });
});

describe("store names", () => {
  const before = getLang();
  afterEach(() => setLang(before));

  it("names new pieces in the interface language and counts across languages", () => {
    setLang("en");
    const s = useEditor.getState();
    s.addFurniture("sofa");
    setLang("zh");
    s.addFurniture("sofa");
    const names = selectActiveRoom(useEditor.getState()).furniture.filter((f) => f.type === "sofa").map((f) => f.name);
    expect(names.slice(-2)).toEqual(["Sofa", "沙发 2"]);
  });
});
