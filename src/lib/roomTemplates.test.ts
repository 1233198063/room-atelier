import { describe, expect, it } from "vitest";
import { SUNLIT_STUDY } from "./roomTemplates";
import { constrainFurniture } from "../store/editorStore";
import { constrainOpening } from "./openings";
import { checkLayout } from "./layoutChecks";
import { floorCoverage, surfaceHeightAt, wallClearances } from "./geometry";

describe("photo-inspired sunlit study", () => {
  it("fits every piece and opening without silently changing the designed dimensions", () => {
    for (const f of SUNLIT_STUDY.furniture) {
      expect(constrainFurniture(f, SUNLIT_STUDY.room), f.name).toEqual(f);
      for (const gap of Object.values(wallClearances(f, SUNLIT_STUDY.room))) expect(gap, f.name).toBeGreaterThanOrEqual(-0.001);
    }
    for (const o of SUNLIT_STUDY.openings) expect(constrainOpening(o, SUNLIT_STUDY.room)).toEqual(o);
  });

  it("keeps the entrance and furniture clear while allowing the rug under the table", () => {
    const warnings = checkLayout(SUNLIT_STUDY.room, SUNLIT_STUDY.furniture, SUNLIT_STUDY.openings)
      .filter((issue) => issue.severity === "warning");
    expect(warnings.map((issue) => `${issue.key}: ${issue.title}`)).toEqual([]);
    expect(floorCoverage(SUNLIT_STUDY.furniture, SUNLIT_STUDY.room)).toBeLessThan(0.6);
  });

  it("places the bouquet on the table surface below its desktop tools", () => {
    const vase = SUNLIT_STUDY.furniture.find((f) => f.id === "sunlit-table-bouquet")!;
    expect(surfaceHeightAt(vase.position[0], vase.position[2], SUNLIT_STUDY.furniture, vase.id)).toBeCloseTo(vase.position[1]);
  });
});
