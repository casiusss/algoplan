"use client";

import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@multica/ui/components/ui/sidebar";
import { ModalRegistry } from "../modals/registry";
import { DashboardGuard } from "../layout/dashboard-guard";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

export interface DashboardShellProps {
  children: ReactNode;
  /** Workspace id forwarded to AppSidebar + AppTopbar (and through them to wsId-aware atoms). */
  wsId?: string;
  /**
   * Rendered as the FIRST child of <SidebarProvider>. Desktop injects <DragStrip />.
   * When omitted, NO DOM is rendered above the topbar (no <div> wrapper, no visual gap).
   * UI-SPEC §1 + SC#2 contract.
   */
  topSlot?: ReactNode;
  /**
   * Replaces the default <SearchInput> inside <AppTopbar> (Web injects existing
   * SearchTrigger). Also forwarded to AppSidebar so the legacy desktop sidebar
   * search slot stays wired through Plan 06's app-side migration.
   */
  searchSlot?: ReactNode;
  /**
   * Sidebar-internal topSlot pass-through (Desktop's back/forward SidebarTopBar
   * sits inside the sidebar — Pitfall 2 dual-slot pattern: shell-level topSlot
   * for the full window-top edge, sidebar-level for in-sidebar chrome).
   */
  sidebarTopSlot?: ReactNode;
  /**
   * Rendered inside <SidebarInset> after children + ModalRegistry. Used for
   * absolute-positioned overlays (ChatWindow, ChatFab, StarterContentPrompt).
   */
  extra?: ReactNode;
  /** Loading indicator passed through to DashboardGuard's loadingFallback. */
  loadingIndicator?: ReactNode;
}

/**
 * Top-level dashboard shell composition. Wraps every workspace page in
 * DashboardGuard + SidebarProvider + AppSidebar + SidebarInset { AppTopbar +
 * children + ModalRegistry + extra }. Plan 06 wires both apps to consume this.
 */
export function DashboardShell({
  children,
  wsId,
  topSlot,
  searchSlot,
  sidebarTopSlot,
  extra,
  loadingIndicator,
}: DashboardShellProps) {
  return (
    <DashboardGuard
      loadingFallback={
        <div className="flex h-svh items-center justify-center">
          {loadingIndicator}
        </div>
      }
    >
      <SidebarProvider className="h-svh">
        {topSlot}
        <AppSidebar
          wsId={wsId}
          topSlot={sidebarTopSlot}
          searchSlot={searchSlot}
        />
        <SidebarInset className="relative overflow-hidden">
          <AppTopbar wsId={wsId} searchSlot={searchSlot} />
          {children}
          <ModalRegistry />
          {extra}
        </SidebarInset>
      </SidebarProvider>
    </DashboardGuard>
  );
}
