import { test } from "@playwright/test";

/**
 * Wave 0 skeleton — Plan 06 fills in the real assertions once both apps
 * wire DashboardShell. Currently SKIPPED to keep the suite green.
 */
test.describe("dashboard shell", () => {
  test.skip("dark mode persists across page reload (SC#1, SHL-01)", async ({ page }) => {
    // Plan 06 implementation:
    //   1. login (loginAsDefault)
    //   2. await page.goto(`/${workspaceSlug}/issues`)
    //   3. click [aria-label="Switch to dark mode"]
    //   4. expect <html> to have class "dark"
    //   5. page.reload()
    //   6. expect <html> to STILL have class "dark"
    void page;
  });
});
