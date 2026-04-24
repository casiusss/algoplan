/**
 * Wave 0 scaffold (Phase 1, Plan 00) — assertion strategy revised in Plan 01-02.
 *
 * Verifies FND-02 (web): the Inter loader has the italic axis enabled when
 * italic content is rendered.
 *
 * Original strategy (Wave 0): regex match on woff2 URL filename for
 * /Inter.*italic/i. This does NOT work because next/font strips font names
 * from the emitted asset URLs (e.g. `8c6f6f0aec3d26a6.12az.vxvg0uok.woff2`)
 * — the italic woff2 IS fetched but is indistinguishable from any other
 * hashed asset URL.
 *
 * Revised strategy (Plan 01-02): inject an <em> using the next/font Inter
 * family, then read the route's CSS bundles and assert at least one
 * `@font-face { font-family: Inter; ...; font-style: italic; ... }` block
 * exists. This verifies the loader was configured with `style: ["normal",
 * "italic"]` (which is what FND-02 requires).
 *
 * RED before Plan 02 ships: Inter loader does NOT pass
 * `style: ["normal", "italic"]`, so no @font-face italic block exists.
 * After Plan 02 adds the style param, the block is emitted and this passes.
 *
 * Note: until Phase 2 introduces real italic headlines, the inline <em>
 * injection below is the trigger. Phase 2 may relax this hack.
 */
import { test, expect } from "@playwright/test";

test.describe("Phase 1 typography (FND-02)", () => {
  test("Inter italic axis is loaded on web when italic content renders", async ({
    page,
  }) => {
    const cssUrls: string[] = [];
    page.on("response", (r) => {
      const url = r.url();
      if (/\.css(\?|$)/.test(url) || url.includes("/_next/static/")) {
        cssUrls.push(url);
      }
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

    // Allow CSS chunks to load.
    await page.waitForLoadState("networkidle");

    // Aggregate every CSS chunk fetched during page load and search for an
    // Inter italic @font-face. next/font emits one block per unicode-range
    // when style: ["normal", "italic"] is configured.
    const cssTexts: string[] = [];
    for (const url of cssUrls.filter((u) => /\.css(\?|$)/.test(u))) {
      try {
        const res = await page.request.get(url);
        if (res.ok()) cssTexts.push(await res.text());
      } catch {
        // Ignore fetch errors — we only need at least one CSS chunk to match.
      }
    }
    const cssCorpus = cssTexts.join("\n");

    // Robust regex: looks for an @font-face declaration that names Inter
    // and includes font-style: italic anywhere within the same block.
    // The block is { ... } so we search for the pattern across newlines.
    const interItalicBlock =
      /@font-face\s*\{[^}]*font-family:\s*Inter[^}]*font-style:\s*italic[^}]*\}/i;
    const altOrder =
      /@font-face\s*\{[^}]*font-style:\s*italic[^}]*font-family:\s*Inter[^}]*\}/i;

    const found = interItalicBlock.test(cssCorpus) || altOrder.test(cssCorpus);

    expect(
      found,
      `Expected an @font-face block declaring font-family: Inter with font-style: italic. ` +
        `Inspected ${cssTexts.length} CSS chunk(s) totalling ${cssCorpus.length} chars.`,
    ).toBe(true);
  });
});
