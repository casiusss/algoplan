"use client";

import { DashboardShell } from "@multica/views/dashboard-shell";
import { useCurrentWorkspace } from "@multica/core/paths";
import { MulticaIcon } from "@multica/ui/components/common/multica-icon";
import { SearchCommand, SearchTrigger } from "@multica/views/search";
import { ChatFab, ChatWindow } from "@multica/views/chat";
import { StarterContentPrompt } from "@multica/views/onboarding";

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
      loadingIndicator={<MulticaIcon className="size-6" />}
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
