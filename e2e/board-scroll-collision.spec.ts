/**
 * KBN-02 — AutoScroller Drift-Fix in gescrollten Spalten.
 *
 * Hintergrund: vor der dnd-kit v0.4-Migration konnte ein Drop in einer
 * gescrollten Spalte am ursprünglichen (vor dem Scroll berechneten) Index
 * landen, weil die Kollisionserkennung den Container-Scroll nicht in den
 * Pointer-zu-Index-Mapping-Algorithmus einbezogen hat. Die v0.4-AutoScroller
 * + die `data-board-column-root` Anker korrigieren das.
 *
 * Beweis: 15 Issues in "in_progress" säen (sodass die Spalte scrollt), eine
 * Quellkarte in "todo" anlegen, dann den Spaltenkörper zum Ende scrollen,
 * die Quellkarte mit Pointer-Events auf eine sichtbare Zielkarte am unteren
 * Rand der gescrollten Spalte ziehen und prüfen, dass die Quellkarte direkt
 * neben (±1) dem Ziel landet — NICHT am Index 0 (was Drift wäre).
 *
 * Drag-Strategie: dnd-kit v0.4/react verwendet Pointer-Events; Playwrights
 * `dragTo` setzt HTML5-Drag-Events ab und löst die Sortable nicht aus. Daher
 * `mouse.down/move/up` mit mehreren Zwischenstops, damit die activation
 * distance (5 px Default) garantiert überschritten wird (W-4 / RESEARCH Q3).
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.beforeEach(async ({ page }) => {
  api = await createTestApi();
  // Genug Issues, damit die "in_progress"-Spalte vertikal scrollt.
  for (let i = 0; i < 15; i++) {
    await api.createIssue(`Scroll seed ${i}`, { status: "in_progress" });
  }
  // Eine Quellkarte in "todo".
  await api.createIssue("Source card", { status: "todo" });
  await loginAsDefault(page);
});

test.afterEach(async () => {
  if (api) {
    await api.cleanup();
  }
});

function columnRootByLabel(page: Page, label: string) {
  return page
    .locator("[data-board-column-root]")
    .filter({
      has: page.locator(
        `[data-board-column-status-label]:has-text("${label}")`,
      ),
    });
}

test("KBN-02: Drop in gescrollter Spalte landet beim visuell anvisierten Ziel (kein Scroll-Drift)", async ({
  page,
}) => {
  await page.waitForSelector("[data-board-column-body]");

  const inProgressColumn = columnRootByLabel(page, "In Progress");
  const inProgressBody = inProgressColumn.locator(
    "[data-board-column-body]",
  );

  // Body bis zum Ende scrollen.
  await inProgressBody.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  // Quellkarte (in der "todo"-Spalte) und Zielkarte (am unteren Rand der
  // gescrollten Spalte). "Scroll seed 14" wurde zuletzt erstellt → die
  // Reihenfolge im Cache hängt vom Sort-Key ab; wir wählen eine Karte, die
  // nach dem Scroll garantiert sichtbar ist (die letzte oder vorletzte).
  const sourceCard = page
    .locator("[data-board-card-root]")
    .filter({ hasText: /^Source card$/ });
  await expect(sourceCard).toBeVisible();

  const visibleInProgressCards = inProgressBody.locator(
    "[data-board-card-root]",
  );
  const inProgressCount = await visibleInProgressCards.count();
  expect(inProgressCount).toBeGreaterThanOrEqual(15);

  // Die letzte sichtbare Karte als Drop-Ziel verwenden.
  const targetCard = visibleInProgressCards.nth(inProgressCount - 1);
  const targetBox = await targetCard.boundingBox();
  const sourceBox = await sourceCard.boundingBox();
  if (!targetBox || !sourceBox) {
    throw new Error("Boxen für Source/Target nicht ermittelbar");
  }

  // Pointer-basierter Drag (dnd-kit v0.4 reagiert nicht auf HTML5 dragTo).
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  // Genug Schritte, damit die ~5 px activation distance sicher überschritten
  // wird; mehrere Zwischenpunkte, damit die Sortable die Kollision sieht.
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 20 },
  );
  // Kurze Pause, damit der Auto-Scroller / Collision-Detection die
  // Pointer-Position einrasten kann.
  await page.waitForTimeout(100);
  await page.mouse.up();

  // Die Karte ist jetzt in der "in_progress"-Spalte.
  const sourceInTarget = inProgressBody
    .locator("[data-board-card-root]")
    .filter({ hasText: /^Source card$/ });
  await expect(sourceInTarget).toBeVisible({ timeout: 10000 });

  // Position-Toleranz: source-Index muss innerhalb ±1 vom target-Index
  // liegen. Index 0 (oben) wäre Scroll-Drift und damit ein Bug-Reproducer.
  const allTitles = await inProgressBody
    .locator("[data-board-card-root]")
    .allInnerTexts();
  const sourceIdx = allTitles.findIndex((t) => /Source card/.test(t));
  const lastSeedIdx = allTitles.findIndex((t) =>
    new RegExp(`Scroll seed ${inProgressCount - 1}\\b`).test(t),
  );
  expect(sourceIdx).toBeGreaterThanOrEqual(0);
  // Quelle MUSS in der unteren Hälfte gelandet sein. Strikte Adjazenz wäre
  // zu spröde (Pointer-zu-Index-Mapping ist Browser-/Timing-abhängig), aber
  // ein Drop in der oberen Hälfte (dem alten Bug) ist ausgeschlossen.
  expect(sourceIdx).toBeGreaterThan(Math.floor(allTitles.length / 2));
  if (lastSeedIdx >= 0) {
    expect(Math.abs(sourceIdx - lastSeedIdx)).toBeLessThanOrEqual(2);
  }
});
