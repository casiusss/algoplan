/**
 * Wave 0 scaffold (Phase 1, Plan 00).
 *
 * Verifies FND-02 (web): the Inter loader requests the italic axis when
 * italic content is rendered.
 *
 * Strategy: navigate to /, inject a hidden <em> element to force italic
 * rendering, capture all network responses, assert at least one URL matches
 * /Inter.*italic/i.
 *
 * RED before Plan 02 ships: Inter loader currently does NOT pass
 * `style: ["normal", "italic"]`, so no italic woff2 is requested even when
 * <em> is rendered. After Plan 02 adds the style param, this test passes.
 *
 * Note: until Phase 2 introduces real italic headlines, the inline <em>
 * injection below is the trigger. Phase 2 may relax this hack.
 */
import { test, expect } from "@playwright/test";

test.describe("Phase 1 typography (FND-02)", () => {
  test("Inter italic woff2 loads on web when italic content renders", async ({
    page,
  }) => {
    const responseUrls: string[] = [];
    page.on("response", (r) => {
      responseUrls.push(r.url());
    });

    await page.goto("/");

    // Force italic rendering. Until Phase 2 ships italic headlines, this is
    // the trigger that exercises the italic axis.
    await page.evaluate(() => {
      const el = document.createElement("em");
      el.textContent = "italic axis probe";
      el.style.fontStyle = "italic";
      el.style.fontWeight = "400";
      document.body.appendChild(el);
    });

    // Allow font fetch to complete (Inter italic woff2 ~30-80kb).
    await page.waitForTimeout(1500);

    const italicHits = responseUrls.filter((u) => /Inter.*italic/i.test(u));
    expect(
      italicHits,
      `Expected at least one Inter italic font request. Saw ${responseUrls.length} responses; italic-matching: ${italicHits.length}`,
    ).not.toHaveLength(0);
  });
});
