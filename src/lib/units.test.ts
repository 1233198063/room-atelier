import { describe, expect, it } from "vitest";
import type { Furniture } from "../types";
import { checkLayout } from "./layoutChecks";
import { feetInches, formatArea, formatLength, splitFeet, formatRange, formatSize, fromUnit, lengthValue, nudgeSteps, snapSteps, toUnit } from "./units";

describe("length units", () => {
  it("shows lengths to the millimeter in each unit", () => {
    expect([lengthValue(2.1, "mm"), lengthValue(2.1, "cm"), lengthValue(2.1, "m")]).toEqual(["2100", "210", "2.1"]);
    expect([lengthValue(1.0255, "mm"), lengthValue(1.0255, "cm"), lengthValue(1.0255, "m")]).toEqual(["1026", "102.6", "1.026"]);
    expect(lengthValue(0.1 + 0.2, "m")).toBe("0.3");
  });

  it("shows feet and inches as plans do, and areas in square feet alongside them", () => {
    expect(lengthValue(0.9144, "ft")).toBe(`3' 0"`);
    expect(lengthValue(2.1, "ft")).toBe(`6' 10.7"`);
    expect(lengthValue(2.1, "ft", true)).toBe(`6' 11"`);
    expect(lengthValue(0.2, "ft")).toBe(`7.9"`);
    expect(formatSize(4.2, 3.6, "ft")).toBe(`13' 9.4" × 11' 9.7"`);
    expect(lengthValue(2.105, "m", true)).toBe("2.1");
    expect(formatArea(15.12, "ft")).toBe("163 ft²");
    expect(formatArea(15.12, "cm")).toBe("15.1 m²");
    expect(nudgeSteps("ft")).toEqual([0.0254, 0.254]);
    expect(snapSteps("mm")).toEqual([0.01, 0.05, 0.1]);
  });

  it("writes feet and inches like a plan", () => {
    expect(feetInches(3.683)).toBe(`12' 1"`);
    expect(feetInches(0.3048 * 6)).toBe(`6' 0"`);
    expect(feetInches(1.2)).toBe(`3' 11.2"`);
    expect(feetInches(3.6575)).toBe(`12' 0"`); // 143.996 in rounds up to a whole foot
    expect(feetInches(-0.5)).toBe(`-1' 7.7"`);
    expect(splitFeet(3.683)).toEqual([12, 1]);
  });

  it("formats with the unit", () => {
    expect(formatLength(0.55, "mm")).toBe("550 mm");
    expect(formatSize(4.2, 3.6, "m")).toBe("4.2 × 3.6 m");
    expect(formatRange(0.5, 2.4, "cm")).toBe("50–240 cm");
  });

  it("converts both ways", () => {
    expect(toUnit(2.105, "cm")).toBe(210.5);
    expect(fromUnit(3600, "mm")).toBe(3.6);
  });

  it("words layout checks in the chosen unit", () => {
    const room = { width: 4, depth: 3, height: 2.6 };
    // A desk against the back wall with a sideboard 40 cm in front of it.
    const desk: Furniture = { id: "d", type: "desk", name: "Desk", position: [2, 0, 0.3], rotation: 0,
      dimensions: { width: 1.2, depth: 0.6, height: 0.75 } };
    const sideboard: Furniture = { id: "s", type: "cabinet", name: "Sideboard", position: [2, 0, 1.2], rotation: 180,
      dimensions: { width: 2, depth: 0.4, height: 0.8 } };
    const window_ = { id: "w", type: "window" as const, name: "Window", wall: "back" as const, offset: 2, width: 1, height: 1.2, elevation: 0.9, hinge: "start" as const };
    const seat = (unit: "mm" | "cm" | "m" | "ft") =>
      checkLayout(room, [desk, sideboard], [window_], { unit }).find((i) => i.key.startsWith("seat"))!.detail;
    expect(seat("mm")).toContain("700 mm");
    expect(seat("cm")).toContain("70 cm");
    expect(seat("m")).toContain("0.7 m");
    expect(seat("ft")).toContain(`2' 4"`);
  });
});
