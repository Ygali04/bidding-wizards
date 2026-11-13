import { describe, expect, it } from "vitest";
import { breakdown, emptyLabor, markupForMargin, marginAfterOverrun } from "./estimate";

describe("margin guard", () => {
  it("markup for a target margin round-trips through breakdown", () => {
    const labor = [{ ...emptyLabor(), hours: 10, rate: 100 }];
    const m = markupForMargin(20);
    expect(m).toBe(25);
    expect(breakdown({ materials: [], labor, contingencyPct: 0, markupPct: m }).marginPct).toBe(20);
  });
  it("overrun eats margin at a fixed bid price", () => {
    const labor = [{ ...emptyLabor(), hours: 10, rate: 100 }];
    const input = { materials: [], labor, contingencyPct: 0, markupPct: 25 };
    expect(marginAfterOverrun(input, 0)).toBe(20);
    expect(marginAfterOverrun(input, 10)).toBe(12);
  });
});
