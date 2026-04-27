"use client";

import { DashboardShell } from "@algoplan/views/dashboard-shell";
import { useCurrentWorkspace } from "@algoplan/core/paths";
import { AlgoPlanIcon } from "@algoplan/ui/components/common/algoplan-icon";
import { SearchCommand, SearchTrigger } from "@algoplan/views/search";
import { ChatFab, ChatWindow } from "@algoplan/views/chat";
import { StarterContentPrompt } from "@algoplan/views/onboarding";

export default function Layout({ children }: { children: React.ReactNode }) {
  // Pass wsId explicitly to DashboardShell (PLAN-CHECK W-4 fix). The parent
  // [workspaceSlug]/layout.tsx already mounts WorkspaceSlugProvider, so
  // useCurrentWorkspace() resolves the active workspace via the slug→list
  // join. wsId stays undefined for the briefest mount window between
  // workspace fetch and DashboardShell render, which AppSidebar tolerates.
  const workspace = useCurrentWorkspace();

  return (
    <DashboardShell
      wsId={workspace?.id}
      loadingIndicator={<AlgoPlanIcon className="size-6" />}
      searchSlot={<SearchTrigger />}
      extra={
        <>
          <SearchCommand />
          <ChatWindow />
          <ChatFab />
          <StarterContentPrompt />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
