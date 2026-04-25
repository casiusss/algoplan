// Plan 02 re-export shim: AppSidebar moved to packages/views/dashboard-shell/.
// Existing app-side imports of `@multica/views/layout` keep resolving without
// churn until Plan 06 deletes the legacy `./app-sidebar` file and rewires the
// app layouts to import from `@multica/views/dashboard-shell` directly.
export { AppSidebar } from "../dashboard-shell";
export { DashboardGuard } from "./dashboard-guard";
export { DashboardLayout } from "./dashboard-layout";
export { useDashboardGuard } from "./use-dashboard-guard";
export { WorkspaceLoader } from "./workspace-loader";
