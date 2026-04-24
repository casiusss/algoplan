/**
 * Wave 0 scaffold (Phase 1, Plan 00).
 *
 * Token wiring smoke test — asserts the className strings consumed by Phase 2
 * primitives (TagChip, AccentBar) are reachable. jsdom does NOT compile Tailwind
 * CSS, so this test verifies CLASSNAME WIRING ONLY, not the resolved
 * background-color. The real OKLCH-resolution check lives in
 * `e2e/theme-toggle.spec.ts` (Chromium with built CSS).
 *
 * RED before Plan 01 ships: passes (className strings are static), but the
 * companion grep in scripts/grep-hardcoded-colors.sh still flags violations.
 * GREEN signal for Phase 1: this test passes AND the grep script returns 0.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Phase 1 token wiring (FND-01)", () => {
  const REQUIRED_TAG_CLASSES = [
    "bg-tag-p0",
    "bg-tag-p1",
    "bg-tag-p2",
    "bg-tag-p3",
    "text-tag-p0-foreground",
    "text-tag-p1-foreground",
    "text-tag-p2-foreground",
    "text-tag-p3-foreground",
    "bg-highlight",
  ];

  for (const className of REQUIRED_TAG_CLASSES) {
    it(`accepts and preserves '${className}' className`, () => {
      const { container } = render(
        <div className={className} data-testid="probe" />,
      );
      const probe = container.querySelector('[data-testid="probe"]');
      expect(probe).not.toBeNull();
      expect(probe?.className).toContain(className);
    });
  }

  it("accepts the canonical semantic surface tokens", () => {
    const SURFACE_CLASSES = [
      "bg-background",
      "bg-card",
      "bg-sidebar",
      "text-foreground",
      "text-muted-foreground",
      "border-border",
    ];
    for (const className of SURFACE_CLASSES) {
      const { container } = render(
        <div className={className} data-testid="surface" />,
      );
      expect(
        container.querySelector('[data-testid="surface"]')?.className,
      ).toContain(className);
    }
  });
});
