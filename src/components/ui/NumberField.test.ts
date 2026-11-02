import { describe, expect, it } from "vitest";
import { parseFieldInput } from "./NumberField";

describe("parseFieldInput", () => {
  it("reads plain numbers in the unit on show, returning centimeters", () => {
    expect(parseFieldInput("120", "length")).toBe(120);
    expect(parseFieldInput(" 45,5 ", "length")).toBe(45.5);
    expect(parseFieldInput("-90", "°")).toBe(-90);
    expect(parseFieldInput("2100", "length", "mm")).toBeCloseTo(210);
    expect(parseFieldInput("2.1", "length", "m")).toBeCloseTo(210);
    expect(parseFieldInput("2.1m+50mm", "length", "mm")).toBeCloseTo(215);
  });

  it("converts unit suffixes", () => {
    expect(parseFieldInput("1.2m", "length")).toBeCloseTo(120);
    expect(parseFieldInput("450mm", "length")).toBeCloseTo(45);
    expect(parseFieldInput("90°", "°")).toBe(90);
  });

  it("reads inches and feet", () => {
    expect(parseFieldInput("12", "length", "ft")).toBeCloseTo(365.76); // a bare number is feet
    expect(parseFieldInput("12 1", "length", "ft")).toBeCloseTo(368.3); // feet, then inches
    expect(parseFieldInput("36in", "length")).toBeCloseTo(91.44);
    expect(parseFieldInput('36"', "length")).toBeCloseTo(91.44);
    expect(parseFieldInput("5'6\"", "length")).toBeCloseTo(167.64);
    expect(parseFieldInput("5' 6\"", "length", "mm")).toBeCloseTo(167.64);
    expect(parseFieldInput("5ft 6in", "length")).toBeCloseTo(167.64);
    expect(parseFieldInput("12ft-2in", "length")).toBeCloseTo(360.68);
    expect(parseFieldInput("2 inches", "length")).toBeCloseTo(5.08);
    expect(parseFieldInput("5'", "°")).toBeNull();
  });

  it("reads feet and inches typed with any kind of quote", () => {
    const twelveOne = 12 * 30.48 + 2.54;
    for (const text of ["12'1''", "12‘1’‘", "12’1”", "12′1″", "12＇1＂", "12'1", "12' 1\"", "12ft1"]) {
      expect(parseFieldInput(text, "length", "cm"), text).toBeCloseTo(twelveOne);
    }
    expect(parseFieldInput("12ft+30", "length", "cm")).toBeCloseTo(12 * 30.48 + 30); // an explicit sum keeps the plain unit
    expect(parseFieldInput("1''", "length", "mm")).toBeCloseTo(2.54);
  });

  it("adds and subtracts terms", () => {
    expect(parseFieldInput("120+35", "length")).toBe(155);
    expect(parseFieldInput("2m-15cm", "length")).toBeCloseTo(185);
  });

  it("rejects nonsense", () => {
    expect(parseFieldInput("", "length")).toBeNull();
    expect(parseFieldInput("abc", "length")).toBeNull();
    expect(parseFieldInput("12px", "length")).toBeNull();
    expect(parseFieldInput("90°", "length")).toBeNull();
    expect(parseFieldInput("1..2", "length")).toBeNull();
  });
});
