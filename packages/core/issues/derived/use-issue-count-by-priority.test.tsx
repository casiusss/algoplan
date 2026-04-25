// @vitest-environment jsdom
/**
 * RED stability test scaffold (Plan 00 Wave 0).
 * Implementation: Plan 05 (useIssueCountByPriority).
 *
 * PRIORITY MAPPING (per Plan 00 verification of packages/core/types/issue.ts):
 *   "urgent" → P0, "high" → P1, "medium" → P2, "low" → P3, "none" → excluded
 * UI-SPEC §4 assumed P0-P3 string literals; the actual enum is descriptive.
 * Plan 05's useIssueCountByPriority MUST apply this mapping.
 */
import { describe, it } from "vitest";

describe("useIssueCountByPriority (stability — SHL-05)", () => {
  it.todo(
    "returns same {p0,p1,p2,p3} object reference across consecutive renders with stable input",
  );
  it.todo("returns frozen EMPTY constant when wsId is undefined");
  it.todo("maps urgent→p0, high→p1, medium→p2, low→p3 and excludes none");
});
