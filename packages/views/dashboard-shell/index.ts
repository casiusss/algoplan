// Phase 4 dashboard shell — exports populated as plans 01–05 land.
// Plan 06 wires both apps to import from here via the layout/ shim.
// INVARIANT (UI-SPEC SC#4 + grep hook): no file in this directory may call the useWorkspaceId hook.
export { AppSidebar } from "./app-sidebar";
export { Wordmark, WordmarkText } from "./wordmark";
export { PriorityGrid } from "./priority-grid";
export { NotificationsBadge } from "./notifications-badge";
export { DarkModeToggle } from "./dark-mode-toggle";
export { CollapseToggle } from "./collapse-toggle";
