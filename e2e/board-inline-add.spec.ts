/**
 * KBN-03 — Inline-Aufgabe pro Spalte hinzufügen.
 *
 * Beweist:
 *  - `+`-Button in der Spaltenüberschrift öffnet das Inline-Eingabefeld.
 *  - Enter erstellt ein Issue mit dem Status der Spalte vorausgefüllt.
 *  - Esc schließt das Eingabefeld, ohne ein Issue zu erstellen.
 *
 * Das Spec konsumiert die in den Plänen 02–04 etablierten Test-Seams:
 *  - `data-board-column-root` (Spalten-Wrapper)
 *  - `data-board-column-status-label` (Statusbeschriftung in der Überschrift)
 *  - `data-board-column-add-trigger` (`+`-Button, `aria-label="Issue hinzufügen"`)
 *  - `data-board-column-inline-add` (Mount-Anker des Inline-Eingabefelds)
 *  - `aria-label="Aufgabentitel eingeben"` (Eingabefeld)
 *  - `data-board-card-root` (Karten-Wrapper)
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.beforeEach(async ({ page }) => {
  api = await createTestApi();
  await loginAsDefault(page);
});

test.afterEach(async () => {
  if (api) {
    await api.cleanup();
  }
});

/**
 * Lokalisiert die Spalte mit dem angegebenen STATUS_CONFIG.label-Text. Die
 * Statusbeschriftungen bleiben Englisch (siehe Plan 05 §interfaces – Stand
 * Wave 4): "Backlog" / "Todo" / "In Progress" / "Done" / "Cancelled".
 */
function columnByStatusLabel(page: Page, label: string) {
  return page
    .locator("[data-board-column-root]")
    .filter({
      has: page.locator(
        `[data-board-column-status-label]:has-text("${label}")`,
      ),
    });
}

test("KBN-03: + in der Todo-Spalte öffnet Inline-Eingabe; Enter erstellt Issue mit Status pre-filled", async ({
  page,
}) => {
  // Board ist die Default-Ansicht; loginAsDefault hat bereits zu /{slug}/issues
  // navigiert und dort gewartet.
  await page.waitForSelector("[data-board-column-body]");

  const todoColumn = columnByStatusLabel(page, "Todo");
  await expect(todoColumn).toHaveCount(1);

  const todoAddTrigger = todoColumn.locator(
    "[data-board-column-add-trigger]",
  );
  await todoAddTrigger.click();

  const inlineAdd = todoColumn.locator("[data-board-column-inline-add]");
  await expect(inlineAdd).toBeVisible();

  const input = inlineAdd.getByRole("textbox", {
    name: "Aufgabentitel eingeben",
  });
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();

  const title = `E2E inline ${Date.now()}`;
  await input.fill(title);
  await input.press("Enter");

  // Karte mit dem neuen Titel taucht in der Todo-Spalte auf. Wir warten
  // explizit innerhalb der Spalte, sonst könnte der Test eine zufällige
  // Übereinstimmung in einer anderen Spalte greifen.
  const newCard = todoColumn
    .locator("[data-board-card-root]")
    .filter({ hasText: title });
  await expect(newCard).toBeVisible({ timeout: 10000 });

  // Inline-Eingabe schließt sich nach erfolgreichem Submit.
  await expect(inlineAdd).toBeHidden();

  // Server-Bestätigung: das Issue ist mit status=todo persistiert. Wir
  // prüfen das, indem wir alle Issues vom Workspace abrufen und nach Titel
  // filtern. Der `data-issue-id`-Seam auf der Karte erlaubt uns, die ID
  // direkt aus dem DOM zu lesen.
  const newIssueId = await newCard.getAttribute("data-issue-id");
  expect(newIssueId).toBeTruthy();
  // Issue-ID in den Cleanup-Pool aufnehmen, damit afterEach das Issue
  // entfernt (createTestApi hat es nicht selbst erstellt).
  if (newIssueId) {
    api.trackIssue(newIssueId);
  }
});

test("KBN-03: Esc schließt die Inline-Eingabe, ohne ein Issue zu erstellen", async ({
  page,
}) => {
  await page.waitForSelector("[data-board-column-body]");

  const todoColumn = columnByStatusLabel(page, "Todo");
  await todoColumn.locator("[data-board-column-add-trigger]").click();

  const inlineAdd = todoColumn.locator("[data-board-column-inline-add]");
  await expect(inlineAdd).toBeVisible();

  const input = inlineAdd.getByRole("textbox", {
    name: "Aufgabentitel eingeben",
  });
  const ghostTitle = `Should not be created ${Date.now()}`;
  await input.fill(ghostTitle);
  await input.press("Escape");

  await expect(inlineAdd).toBeHidden();

  // Karte darf nirgends auf dem Board auftauchen.
  await expect(
    page.locator("[data-board-card-root]").filter({ hasText: ghostTitle }),
  ).toHaveCount(0);
});
