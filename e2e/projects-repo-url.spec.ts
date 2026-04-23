import { test, expect } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.describe("Projects — repo_url", () => {
  test.beforeEach(async ({ page }) => {
    api = await createTestApi();
    await loginAsDefault(page);
    await api.promoteMeToAdmin();
  });

  test.afterEach(async () => {
    await api.cleanup();
  });

  test("admin can create project with repo URL", async ({ page }) => {
    // Navigate to projects
    await page.goto("/");
    await page.getByRole("link", { name: /projects/i }).first().click();

    // Open create project modal
    await page.getByRole("button", { name: /new project/i }).click();

    // Fill in project details
    await page.getByPlaceholder("Project title").fill("E2E Test Project");
    await page.getByLabel("Repository URL").fill("https://github.com/acme/e2e-a");

    // Submit
    await page.getByRole("button", { name: "Create Project" }).click();

    // Verify repo URL is displayed (normalizer appends .git)
    await expect(
      page.getByText("https://github.com/acme/e2e-a.git"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("admin can edit project repo URL", async ({ page }) => {
    // Create a project via API
    const project = await api.createProject({
      title: "Edit Test Project",
      repo_url: "https://github.com/acme/e2e-a.git",
    });

    const workspace = await api.ensureWorkspace();
    await page.goto(`/${workspace.slug}/projects/${project.id}`);

    // Click edit button
    await page.getByRole("button", { name: "Edit repository" }).click();

    // Change repo URL
    const input = page.getByLabel("Repository URL");
    await input.fill("https://github.com/acme/e2e-b.git");

    // Save
    await page.getByRole("button", { name: /^save$/i }).click();

    // Verify new URL is displayed
    await expect(
      page.getByText("https://github.com/acme/e2e-b.git"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("repo URL normalizer appends .git when missing", async ({ page }) => {
    // Create project without .git suffix via API
    const project = await api.createProject({
      title: "Normalizer Test",
      repo_url: "https://github.com/acme/normalize-test",
    });

    const workspace = await api.ensureWorkspace();
    await page.goto(`/${workspace.slug}/projects/${project.id}`);

    // Verify .git was appended by normalizer
    await expect(
      page.getByText("https://github.com/acme/normalize-test.git"),
    ).toBeVisible();
  });

  test.skip(
    "non-admin member cannot edit repo_url on project detail",
    async ({ page }) => {
      // TODO: Task 17 — implement member role gating test.
      // Currently skipped because:
      // 1. The default E2E user is created as "owner" in their workspace
      // 2. Demoting self to "member" requires coordination with promoteMeToAdmin
      // 3. Role gating is tested at the API level; this would test UI behavior
      //
      // Test outline when ready:
      // - Create project as admin
      // - Demote self to member (add setMyRole(role) helper)
      // - Verify edit button is not present OR
      // - Attempt PATCH returns 403
      // - Re-navigate to verify role is persisted
    },
  );
});
