import { describe, expect, it } from "vitest";
import { parseFieldInput } from "./NumberField";

describe("parseFieldInput", () => {
  it("reads plain numbers as the field's unit", () => {
    expect(parseFieldInput("120", "cm")).toBe(120);
    expect(parseFieldInput(" 45,5 ", "cm")).toBe(45.5);
    expect(parseFieldInput("-90", "°")).toBe(-90);
  });

  it("converts unit suffixes", () => {
    expect(parseFieldInput("1.2m", "cm")).toBeCloseTo(120);
    expect(parseFieldInput("450mm", "cm")).toBeCloseTo(45);
    expect(parseFieldInput("90°", "°")).toBe(90);
  });

  it("adds and subtracts terms", () => {
    expect(parseFieldInput("120+35", "cm")).toBe(155);
    expect(parseFieldInput("2m-15cm", "cm")).toBeCloseTo(185);
  });

  it("rejects nonsense", () => {
    expect(parseFieldInput("", "cm")).toBeNull();
    expect(parseFieldInput("abc", "cm")).toBeNull();
    expect(parseFieldInput("12px", "cm")).toBeNull();
    expect(parseFieldInput("90°", "cm")).toBeNull();
    expect(parseFieldInput("1..2", "cm")).toBeNull();
  });
});
