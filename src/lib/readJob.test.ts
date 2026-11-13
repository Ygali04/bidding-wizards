import { describe, expect, it } from "vitest";
import { SAMPLE_JOB, readJob } from "./readJob";

describe("readJob", () => {
  it("reads a guest-bath brief into catalog materials and implied labor", () => {
    const result = readJob(SAMPLE_JOB);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const items = result.materials.map((m) => m.item);
    expect(items).toContain("Subway tile");
    expect(items).toContain("Bathroom vanity");
    expect(items).toContain("Toilet");
    expect(items).toContain("Faucet");
    expect(items).toContain("Interior paint");

    const tile = result.materials.find((m) => m.item === "Subway tile");
    expect(tile?.quantity).toBe(48);
    expect(tile?.unit).toBe("sq ft");

    const paint = result.materials.find((m) => m.item === "Interior paint");
    expect(paint?.quantity).toBe(2);

    const roles = result.labor.map((l) => l.role);
    expect(roles).toContain("Tile setter");
    expect(roles).toContain("Plumber");
    expect(roles).toContain("Painter");

    expect(result.contingencyPct).toBeGreaterThan(8);
    expect(result.matched.length).toBeGreaterThan(3);
  });

  it("qualifies out non-trade jobs", () => {
    const result = readJob(
      "Build a SaaS website and mobile app for our wedding catering marketplace, plus the lawsuit against the florist.",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("out_of_scope");
  });

  it("rejects an empty brief", () => {
    const result = readJob("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty");
  });

  it("extracts roofing quantities from a roof brief", () => {
    const result = readJob("Tear off and reroof 22 squares of architectural shingles with ice and water underlayment.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.materials.some((m) => m.item === "Asphalt shingles")).toBe(true);
    const shingles = result.materials.find((m) => m.item === "Asphalt shingles");
    expect(shingles?.quantity).toBe(22);
    expect(result.labor.some((l) => l.role === "Roofer")).toBe(true);
  });
});
