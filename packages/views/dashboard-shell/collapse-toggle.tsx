"use client";

// Phase 4 §7 decision: alias the SidebarTrigger primitive for naming clarity
// inside the dashboard-shell directory. Persistence + animation are owned by
// the primitive (cookie-backed `sidebar_state`, 200ms CSS transition).
export { SidebarTrigger as CollapseToggle } from "@multica/ui/components/ui/sidebar";
