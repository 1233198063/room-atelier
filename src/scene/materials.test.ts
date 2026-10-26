import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE, PALETTE_PRESETS } from "../lib/palettes";
import { PLANT_COLORS } from "../lib/furnitureColors";
import { applyFurnitureColors, applyPalette, cloneMaterials, MATERIALS } from "./materials";

const owned: ReturnType<typeof cloneMaterials>[] = [];
const fresh = () => { const materials = cloneMaterials(); owned.push(materials); return materials; };
afterEach(() => { owned.splice(0).forEach((set) => Object.values(set).forEach((material) => material.dispose())); });

describe("individual furniture materials", () => {
  it("recolors one piece without mutating its neighbors, room walls or templates", () => {
    const room = fresh(), first = fresh(), second = fresh();
    applyPalette(DEFAULT_PALETTE, room);
    applyFurnitureColors(DEFAULT_PALETTE, { wood: "#123456", woodDark: "#654321", metal: "#aabbcc" }, first);
    applyFurnitureColors(DEFAULT_PALETTE, { wood: "#ee8833" }, second);
    expect(first.oak.color.getHexString()).toBe("123456");
    expect(first.oakDark.color.getHexString()).toBe("654321");
    expect(first.brass.color.getHexString()).toBe("aabbcc");
    expect(second.oak.color.getHexString()).toBe("ee8833");
    expect(room.oak.color.getHexString()).toBe(DEFAULT_PALETTE.wood.slice(1));
    expect(room.wall.color.getHexString()).toBe(DEFAULT_PALETTE.wall.slice(1));
    expect(MATERIALS.oak.color.getHexString()).toBe("d9b88f");
    expect(first.oak).not.toBe(second.oak);
  });

  it("preserves custom colors through room style changes while inheriting unedited roles", () => {
    const piece = fresh(), palette = PALETTE_PRESETS.find((p) => p.palette.id === "japandi")!.palette;
    const colors = { wood: "#dd2233", fabric: "#1122ee", accent: "#557711" };
    applyFurnitureColors(DEFAULT_PALETTE, colors, piece);
    applyFurnitureColors(palette, colors, piece);
    expect(piece.oak.color.getHexString()).toBe("dd2233");
    expect(piece.linen.color.getHexString()).toBe("1122ee");
    expect(piece.cushion.color.getHexString()).toBe("1122ee");
    expect(piece.throw.color.getHexString()).toBe("557711");
    expect(piece.oakDark.color.getHexString()).toBe(palette.woodDark.slice(1));
    expect(piece.brass.color.getHexString()).toBe(palette.metal.slice(1));
    // Resetting overrides restores the current room style, not the style at creation.
    applyFurnitureColors(palette, {}, piece);
    expect(piece.oak.color.getHexString()).toBe(palette.wood.slice(1));
    const room = fresh();
    applyPalette(palette, room);
    expect(piece.cushion.color.equals(room.cushion.color)).toBe(true);
  });

  it("customizes plant pots and leaves and restores their model defaults", () => {
    const plant = fresh();
    applyFurnitureColors(DEFAULT_PALETTE, { pot: "#1122ff", leaves: "#ef1255" }, plant);
    expect(plant.terracotta.color.getHexString()).toBe("1122ff");
    expect(plant.leaf.color.getHexString()).toBe("ef1255");
    expect(plant.leafDark.color.r).toBeLessThan(plant.leaf.color.r);
    applyFurnitureColors(DEFAULT_PALETTE, {}, plant);
    expect(plant.terracotta.color.getHexString()).toBe(PLANT_COLORS.pot.slice(1));
    expect(plant.leaf.color.getHexString()).toBe(PLANT_COLORS.leaves.slice(1));
    expect(plant.leafDark.color.equals(MATERIALS.leafDark.color)).toBe(true);
  });
});
