import { describe, it, expect } from "vitest";
import { priorityToAccentColor } from "./priority-color";

describe("priorityToAccentColor", () => {
  it("maps urgent → tag-p0", () => {
    expect(priorityToAccentColor("urgent")).toBe("tag-p0");
  });
  it("maps high → tag-p1", () => {
    expect(priorityToAccentColor("high")).toBe("tag-p1");
  });
  it("maps medium → tag-p2", () => {
    expect(priorityToAccentColor("medium")).toBe("tag-p2");
  });
  it("maps low → tag-p3", () => {
    expect(priorityToAccentColor("low")).toBe("tag-p3");
  });
  it("maps none → muted", () => {
    expect(priorityToAccentColor("none")).toBe("muted");
  });
});
