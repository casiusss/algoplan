/**
 * KBN-04 — View-Toggle (Board / Liste) bleibt über Reload erhalten.
 *
 * Der `viewMode` ist im view-store partialize-Allowlist (lines 193–194), also
 * wird er von Zustand persist automatisch in localStorage gespiegelt. Dieses
 * Spec verifiziert beide Richtungen end-to-end auf der echten Seite:
 *
 *  - Default (Board) → Klick auf "Liste" → Reload → immer noch Liste.
 *  - Klick auf "Board" → Reload → immer noch Board.
 *
 * Test-Seams (aus Plänen 02–04):
 *  - `data-board-column-body` (sichtbar nur auf Board)
 *  - `data-list-view-header` (sichtbar nur auf Liste)
 *  - `aria-label="Ansicht wechseln"` (SegmentedControl-Gruppe)
 */
import { test, expect } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.beforeEach(async ({ page }) => {
  api = await createTestApi();
  // Mindestens ein Issue, damit die Liste tatsächlich Inhalt hat (sonst
  // rendert nur die Empty-State und das Spec gibt weniger Aussagekraft).
  await api.createIssue(`View toggle seed ${Date.now()}`, { status: "todo" });
  await loginAsDefault(page);
});

test.afterEach(async () => {
  if (api) {
    await api.cleanup();
  }
});

test("KBN-04: View-Toggle bleibt über Page-Reload erhalten (Board ↔ Liste)", async ({
  page,
}) => {
  // Default = Board: mindestens eine Spalte ist sichtbar.
  await expect(
    page.locator("[data-board-column-body]").first(),
  ).toBeVisible();

  const toggleGroup = page.getByRole("group", { name: "Ansicht wechseln" });

  // Wechsel zu Liste.
  await toggleGroup.getByText("Liste", { exact: true }).click();

  // Liste ist nun aktiv: List-Header sichtbar; Board-Spalten verschwunden.
  await expect(
    page.locator("[data-list-view-header]").first(),
  ).toBeVisible();
  await expect(page.locator("[data-board-column-body]")).toHaveCount(0);

  // Reload: Persistenz prüfen.
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Liste ist NACH dem Reload immer noch aktiv.
  await expect(
    page.locator("[data-list-view-header]").first(),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-board-column-body]")).toHaveCount(0);

  // Wechsel zurück zu Board.
  await toggleGroup.getByText("Board", { exact: true }).click();
  await expect(
    page.locator("[data-board-column-body]").first(),
  ).toBeVisible();
  await expect(page.locator("[data-list-view-header]")).toHaveCount(0);

  // Reload: Board persistiert ebenfalls.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("[data-board-column-body]").first(),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-list-view-header]")).toHaveCount(0);
});
