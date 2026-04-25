// Phase 4 shim: legacy app-sidebar.tsx + dashboard-layout.tsx deleted; re-export
// from the new module so any unmigrated consumer of @multica/views/layout keeps
// working. New code should import from @multica/views/dashboard-shell directly.
export { AppSidebar, DashboardShell as DashboardLayout } from "../dashboard-shell";
export { DashboardGuard } from "./dashboard-guard";
export { useDashboardGuard } from "./use-dashboard-guard";
export { WorkspaceLoader } from "./workspace-loader";
