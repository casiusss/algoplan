import { test, expect } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.beforeEach(async ({ page }) => {
  api = await createTestApi();
  await loginAsDefault(page);
});

test.afterEach(async () => {
  await api.cleanup();
});

test.describe("dashboard shell", () => {
  test("dark mode persists across page reload (SC#1, SHL-01)", async ({
    page,
  }) => {
    // Land on the issues page (DashboardShell footer with DarkModeToggle is mounted).
    // loginAsDefault already navigates to /{slug}/issues, so we are on the
    // dashboard shell when the test body starts.
    await page.waitForLoadState("networkidle");

    // Resolve the toggle by aria-label per UI-SPEC §6. Pre-mount default
    // is "Toggle theme"; once mounted in light mode the label becomes
    // "Switch to dark mode".
    const toggle = page.getByRole("button", {
      name: /switch to dark mode|toggle theme/i,
    });
    await toggle.click();

    // Wait for next-themes to apply .dark on <html>.
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/, {
      timeout: 5000,
    });

    // Reload — persistence is via next-themes localStorage `multica_theme`.
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Still dark.
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/, {
      timeout: 5000,
    });

    // Cleanup: toggle back to light to leave system in a known state for
    // subsequent tests / repeat runs in the same session.
    const lightToggle = page.getByRole("button", {
      name: /switch to light mode/i,
    });
    await lightToggle.click();
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
  });
});
