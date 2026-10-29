import { describe, expect, it } from "vitest";
import { colorsForModel, productColors } from "./imageColors";
import { outOfRange, parseProduct, productSize } from "./productImport";

describe("parseProduct", () => {
  it.each([
    ["北欧布艺沙发 三人位 长220 宽95 高85cm", "sofa", { width: 2.2, depth: 0.95, height: 0.85 }],
    ["实木书桌 120*60*75cm 简约", "desk", { width: 1.2, depth: 0.6, height: 0.75 }],
    ["Nordic Sofa L220 x W95 x H85 cm", "sofa", { width: 2.2, depth: 0.95, height: 0.85 }],
    ["衣柜 宽180 深60 高200", "cabinet", { width: 1.8, depth: 0.6, height: 2 }],
    ["扶手椅 座高45 总高90 宽70 深75", "armchair", { width: 0.7, depth: 0.75, height: 0.9 }],
    ["岩板餐桌 1600×800×750mm", "table", { width: 1.6, depth: 0.8, height: 0.75 }],
    ["转角沙发 2.8m×1.6m", "cornerSofa", { width: 2.8, depth: 1.6 }],
    ["Round dining table, diameter 120 cm, height 75 cm", "roundTable", { width: 1.2, depth: 1.2, height: 0.75 }],
    ["滚筒洗衣机 尺寸：595＊565＊850mm", "washer", { width: 0.595, depth: 0.565, height: 0.85 }],
    ["米白色餐椅", "chair", {}],
    ['Nordic sofa 84" W x 38" D x 34" H', "sofa", { width: 2.134, depth: 0.965, height: 0.864 }],
    ["Writing desk 47 x 24 x 30 in", "desk", { width: 1.194, depth: 0.61, height: 0.762 }],
    ["Area rug 5 ft x 8 ft", "rug", { width: 1.524, depth: 2.438 }],
    ["Bookcase 31.5'' x 11.8'' x 70.9''", "bookcase", { width: 0.8, depth: 0.3, height: 1.801 }],
    ["Dining table 220x95x75 modern oak", "table", { width: 2.2, depth: 0.95, height: 0.75 }],
  ])("%s", (text, type, dimensions) => {
    const parsed = parseProduct(text);
    expect(parsed.type).toBe(type);
    expect(parsed.dimensions).toEqual(dimensions);
  });

  it("reads beds by mattress width, with the long side as depth", () => {
    const listed = parseProduct("1.8米实木床 2000×1800×1000mm");
    expect(listed).toMatchObject({ type: "bed", presetId: "bed18", dimensions: { width: 1.8, depth: 2, height: 1 } });
    const bare = parseProduct("现代简约双人床 1.5米");
    expect(bare).toMatchObject({ type: "bed", presetId: "bed15", dimensions: { width: 1.56 } });
    expect(productSize("bed", bare.presetId, bare.dimensions)).toEqual({ width: 1.56, depth: 2.1, height: 1 });
  });

  it("sizes a TV from its diagonal", () => {
    for (const text of ["海信 65英寸 4K 电视", 'Samsung 65" 4K TV', "65 inch smart TV"]) {
      const tv = parseProduct(text);
      expect(tv.type, text).toBe("tv");
      expect(tv.dimensions.width, text).toBeCloseTo(1.459, 2);
      expect(tv.dimensions.height, text).toBeCloseTo(0.83, 2);
    }
  });

  it("matches specific names before general ones", () => {
    expect(parseProduct("实木电视柜 200cm").type).toBe("dresser");
    expect(parseProduct("床头柜 两抽").type).toBe("cabinet");
    expect(parseProduct("LED desk lamp").type).toBe("lamp");
    expect(parseProduct("人体工学电脑椅").type).toBe("officeChair");
    expect(parseProduct("something unrecognizable").type).toBeNull();
  });

  it("keeps the title without its size", () => {
    expect(parseProduct("北欧布艺沙发 三人位 长220 宽95 高85cm").name).toBe("北欧布艺沙发 三人位");
    expect(parseProduct("【包邮】2025新款 实木书桌 120*60*75cm 简约").name).toBe("实木书桌 简约");
    expect(parseProduct("Nordic Sofa L220 x W95 x H85 cm").name).toBe("Nordic Sofa");
    expect(parseProduct('Nordic sofa 84" W x 38" D x 34" H').name).toBe("Nordic sofa");
  });

  it("fills missing sizes from the common size and flags out-of-range ones", () => {
    const parsed = parseProduct("三人沙发 长230");
    expect(productSize("sofa", parsed.presetId, parsed.dimensions)).toEqual({ width: 2.3, depth: 0.9, height: 0.82 });
    expect(outOfRange("sofa", { width: 6, depth: 0.9, height: 0.8 })).toBe(true);
    expect(outOfRange("sofa", { width: 2.3, depth: 0.9, height: 0.82 })).toBe(false);
  });
});

describe("productColors", () => {
  /** A white photo with a terracotta block and a smaller walnut block on it. */
  function photo(w = 40, h = 30) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sofa = x >= 6 && x < 34 && y >= 6 && y < 20, legs = x >= 6 && x < 34 && y >= 20 && y < 24;
      const [r, g, b] = sofa ? [184, 110, 80] : legs ? [92, 64, 44] : [250, 250, 248];
      data.set([r, g, b, 255], i);
    }
    return { data, w, h };
  }

  it("leaves out the backdrop and ranks colors by area", () => {
    const { data, w, h } = photo();
    const colors = productColors(data, w, h);
    expect(colors[0]).toBe("#b86e50");
    expect(colors[1]).toBe("#5c402c");
    expect(colors).toHaveLength(2);
  });

  it("gives the main color to the model's first color role", () => {
    expect(colorsForModel("sofa", { width: 2, depth: 0.9, height: 0.8 }, ["#b86e50", "#5c402c"]))
      .toEqual({ fabric: "#b86e50", accent: "#5c402c" });
    expect(colorsForModel("tv", { width: 1.4, depth: 0.06, height: 0.8 }, ["#000000"])).toBeUndefined();
  });
});
