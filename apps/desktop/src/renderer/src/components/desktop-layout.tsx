import { useEffect, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@algoplan/ui/lib/utils";
import { useTabHistory } from "@/hooks/use-tab-history";
import { useActiveTitleSync } from "@/hooks/use-tab-sync";
import { useTabStore, resolveRouteIcon } from "@/stores/tab-store";
import {
  SidebarTrigger,
  useSidebar,
} from "@algoplan/ui/components/ui/sidebar";
import { DashboardShell } from "@algoplan/views/dashboard-shell";
import { DragStrip } from "@algoplan/views/platform";
import { SearchTrigger } from "@algoplan/views/search";
import { ChatFab, ChatWindow } from "@algoplan/views/chat";
import { StarterContentPrompt } from "@algoplan/views/onboarding";
import { WorkspaceSlugProvider } from "@algoplan/core/paths";
import {
  getCurrentSlug,
  getCurrentWsId,
  subscribeToCurrentSlug,
} from "@algoplan/core/platform";
import { DesktopNavigationProvider } from "@/platform/navigation";
import { TabBar } from "./tab-bar";
import { TabContent } from "./tab-content";
import { WindowOverlay } from "./window-overlay";

function SidebarTopBar() {
  const { canGoBack, canGoForward, goBack, goForward } = useTabHistory();

  return (
    <div
      className="h-12 shrink-0 flex items-center justify-end px-2"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div
        className="flex items-center gap-0.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Go back"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          aria-label="Go forward"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

// The main area's top bar doubles as a window drag region. When the sidebar
// is not occupying main-flow width — either user-collapsed (offcanvas) or
// auto-hidden in mobile mode (<768px, becomes a sheet drawer) — we pad the
// left side so tabs don't land under the macOS traffic lights (which live at
// roughly x=16..68 and always hit-test above HTML), and surface a trigger so
// the sidebar can be brought back without keyboard shortcut.
function MainTopBar() {
  const { state, isMobile } = useSidebar();
  const sidebarHidden = state === "collapsed" || isMobile;

  return (
    <header
      className={cn(
        "h-12 shrink-0 flex items-center gap-2",
        sidebarHidden && "pl-20",
      )}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {sidebarHidden && (
        <SidebarTrigger
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        />
      )}
      <TabBar />
    </header>
  );
}

function useInternalLinkHandler() {
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path;
      if (!path) return;
      const icon = resolveRouteIcon(path);
      const store = useTabStore.getState();
      const tabId = store.openTab(path, path, icon);
      store.setActiveTab(tabId);
    };
    window.addEventListener("algoplan:navigate", handler);
    return () => window.removeEventListener("algoplan:navigate", handler);
  }, []);
}

export function DesktopShell() {
  useInternalLinkHandler();
  useActiveTitleSync();

  // Reactive read of current workspace slug from the platform singleton.
  // On first mount, slug is null until WorkspaceRouteLayout (inside the tab
  // router) sets it. Once set, the sidebar and other shell-level components
  // can resolve workspace-scoped paths via useWorkspacePaths().
  const slug = useSyncExternalStore(
    subscribeToCurrentSlug,
    getCurrentSlug,
    () => null,
  );
  // wsId mirror is updated alongside slug by WorkspaceRouteLayout (Pitfall 1
  // wsId pass-through); it lets DashboardShell forward an explicit workspace
  // id to AppSidebar / AppTopbar without re-resolving the slug downstream.
  const wsId = useSyncExternalStore(
    subscribeToCurrentSlug,
    getCurrentWsId,
    () => null,
  );

  // Children of DashboardShell — desktop's tab chrome (back/forward+tabs row +
  // rounded TabContent container). Memoized via constant JSX so the same
  // element reference is reused while DashboardShell re-renders for slug/wsId
  // changes — TabContent owns Activity-based state preservation per tab.
  const dashboardChildren = (
    <div className="flex h-full min-h-0 flex-col">
      <MainTopBar />
      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden mr-2 mb-2 ml-0.5 rounded-xl shadow-sm bg-background">
        <TabContent />
      </div>
    </div>
  );

  return (
    <DesktopNavigationProvider>
      {/* WorkspaceSlugProvider accepts null — components that need slug
          use useWorkspaceSlug() (nullable) or useRequiredWorkspaceSlug()
          (throws). TabContent MUST always render so the tab router can
          mount WorkspaceRouteLayout, which calls setCurrentWorkspace()
          to populate the slug. The sidebar gates on slug being present
          to avoid the useRequiredWorkspaceSlug throw. Zero-workspace
          users see the window-level overlay (new-workspace flow)
          triggered by IndexRedirect, not a route.

          Two render paths:
          - slug present: full <DashboardShell> with sidebar + topbar + chrome
          - slug null: TabContent renders bare so its IndexRedirect can run
            and populate the slug via WorkspaceRouteLayout. DragStrip stays
            mounted at the very top so the window remains draggable. */}
      <WorkspaceSlugProvider slug={slug}>
        {slug ? (
          <DashboardShell
            wsId={wsId ?? undefined}
            topSlot={<DragStrip />}
            sidebarTopSlot={<SidebarTopBar />}
            searchSlot={<SearchTrigger />}
            extra={
              <>
                <ChatWindow />
                <ChatFab />
                <StarterContentPrompt />
              </>
            }
          >
            {dashboardChildren}
          </DashboardShell>
        ) : (
          <div className="flex h-svh flex-col">
            <DragStrip />
            <div className="flex-1 min-h-0">
              <TabContent />
            </div>
          </div>
        )}
        <WindowOverlay />
      </WorkspaceSlugProvider>
    </DesktopNavigationProvider>
  );
}
