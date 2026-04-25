/**
 * KBN-01 — WS-Event mitten im Drag darf den Drop nicht zurücksetzen.
 *
 * Bedrohungsmodell: vor v0.4 konnte ein WebSocket-Event, das während eines
 * laufenden Drags eintrifft (z. B. weil ein Kollege in einem zweiten Tab ein
 * anderes Issue ändert), die TanStack-Query-Cache-Invalidierung anstoßen
 * → der Board-View re-rendert → die Karte „springt" zurück, weil der
 * optimistische Move noch nicht in den frischen Server-Daten enthalten ist.
 *
 * Schutzmechanismus (Plan 01): `recentlyMovedRef` + `isDraggingRef`-Gate in
 * `board-view.tsx`. Während `isDragging === true` werden Cache-Updates aus
 * WS-Events für den Drag-Spalten-Subset ignoriert; `recentlyMovedRef` hält
 * dieses Fenster für eine kurze Periode nach dem Drop offen, bis der eigene
 * optimistische Patch via Mutation-Settle bestätigt wird.
 *
 * Beweis: Zwei Browser-Kontexte (gleicher User, getrennte Sessions):
 *  - Kontext 1 startet einen Drag ("Drag race source": todo → in_progress),
 *    pausiert mitten in der Bewegung.
 *  - Während der Drag pausiert, triggert die API einen Update auf einem
 *    ANDEREN Issue ("Other card for update"). Das löst beim Backend ein
 *    WS-Broadcast aus, den auch Kontext 1 empfängt.
 *  - Kontext 1 schließt den Drop ab.
 *  - Assertion: die Quellkarte ist in "In Progress" gelandet UND bleibt
 *    dort; kein "Issue konnte nicht verschoben werden"-Toast erscheint.
 *
 * Hinweis zum zweiten Kontext: Wir öffnen `page2`, damit dessen WS-
 * Subscription aktiv ist. Den eigentlichen Update-Trigger schicken wir aus
 * Determinismus-Gründen über den `TestApiClient`, nicht über die UI von
 * `page2` — sonst hängt der Test an UI-Latenz / Picker-Animations.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;
let sourceIssueId: string;
let otherIssueId: string;

test.beforeEach(async () => {
  api = await createTestApi();
  const source = await api.createIssue("Drag race source", { status: "todo" });
  const other = await api.createIssue("Other card for update", {
    status: "todo",
  });
  sourceIssueId = source.id;
  otherIssueId = other.id;
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

test("KBN-01: WS-Event mitten im Drag setzt die Karte NICHT zurück", async ({
  browser,
}) => {
  // Kontext 1 — der aktive Drag-Akteur.
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await loginAsDefault(page1);
  await page1.waitForSelector("[data-board-column-body]");

  // Kontext 2 — wir brauchen die Seite nur, damit deren WS-Subscription
  // läuft. Update-Trigger geht später über api.updateIssue (Determinismus).
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await loginAsDefault(page2);
  await page2.waitForSelector("[data-board-column-body]");

  try {
    const sourceCard = page1.locator(
      `[data-board-card-root][data-issue-id="${sourceIssueId}"]`,
    );
    await expect(sourceCard).toBeVisible();

    const inProgressColumn = columnRootByLabel(page1, "In Progress");
    const inProgressBody = inProgressColumn.locator(
      "[data-board-column-body]",
    );
    await expect(inProgressBody).toBeVisible();

    const sourceBox = await sourceCard.boundingBox();
    const targetBox = await inProgressBody.boundingBox();
    if (!sourceBox || !targetBox) {
      throw new Error("Bounding boxes für source/target fehlen");
    }

    // Drag starten und MITTEN über der Ziel-Spalte pausieren.
    await page1.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2,
    );
    await page1.mouse.down();
    // Erste Bewegung — überschreitet activation distance.
    await page1.mouse.move(
      sourceBox.x + sourceBox.width / 2 + 20,
      sourceBox.y + sourceBox.height / 2 + 20,
      { steps: 5 },
    );
    // Bewegung in Richtung Ziel-Spalte, aber NICHT loslassen.
    await page1.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 15 },
    );

    // WÄHREND der Drag mid-flight ist: Update auf ein ANDERES Issue
    // schicken. Das Backend broadcastet ein WS-Event, das auch ctx1
    // empfängt → genau die Race, gegen die board-view.tsx isolieren muss.
    await api.updateIssue(otherIssueId, {
      title: "Other card for update (touched)",
    });

    // Kurzes Fenster, damit das WS-Event tatsächlich bei ctx1 ankommt.
    // 250 ms ist großzügig genug, dass Tests nicht flackern, ohne den
    // Run unnötig zu verlangsamen.
    await page1.waitForTimeout(250);

    // Drop abschließen.
    await page1.mouse.up();

    // Assertion 1: Karte ist in "In Progress" gelandet.
    const sourceInTarget = inProgressBody.locator(
      `[data-board-card-root][data-issue-id="${sourceIssueId}"]`,
    );
    await expect(sourceInTarget).toBeVisible({ timeout: 10000 });

    // Assertion 2: Karte ist NICHT mehr in "Todo".
    const todoColumn = columnRootByLabel(page1, "Todo");
    const todoBody = todoColumn.locator("[data-board-column-body]");
    await expect(
      todoBody.locator(
        `[data-board-card-root][data-issue-id="${sourceIssueId}"]`,
      ),
    ).toHaveCount(0);

    // Assertion 3: Kein Fehler-Toast aus issues-page.handleMoveIssue.
    await expect(
      page1.getByText("Issue konnte nicht verschoben werden"),
    ).toHaveCount(0);

    // Assertion 4: nach kurzer Verifikationsperiode bleibt die Karte
    // weiterhin in "In Progress" — d. h. kein nachträgliches Snap-Back
    // durch ein verzögertes WS-Event.
    await page1.waitForTimeout(500);
    await expect(sourceInTarget).toBeVisible();
    await expect(
      todoBody.locator(
        `[data-board-card-root][data-issue-id="${sourceIssueId}"]`,
      ),
    ).toHaveCount(0);
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
});
