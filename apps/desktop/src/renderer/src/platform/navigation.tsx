import { useEffect, useMemo, useState } from "react";
import type { DataRouter } from "react-router-dom";
import {
  NavigationProvider,
  type NavigationAdapter,
} from "@multica/views/navigation";
import { useAuthStore } from "@multica/core/auth";
import { isReservedSlug } from "@multica/core/paths";
import {
  useTabStore,
  resolveRouteIcon,
  useActiveTabIdentity,
  useActiveTabRouter,
  getActiveTab,
} from "@/stores/tab-store";
import { useWindowOverlayStore } from "@/stores/window-overlay-store";

// Public web app URL — injected at build time via .env.production. In dev
// (no VITE_APP_URL set) falls back to the local web dev server so "Copy
// link" in a dev build yields a URL that points at the running dev
// frontend, not the prod host. Matches the fallback used in pages/login.tsx.
const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:3000";

/**
 * Extract the leading workspace slug from a path, or null if the path isn't
 * workspace-scoped (root, login, any reserved prefix).
 */
function extractWorkspaceSlug(path: string): string | null {
  const first = path.split("/").filter(Boolean)[0] ?? "";
  if (!first) return null;
  if (isReservedSlug(first)) return null;
  return first;
}

/**
 * Intercept navigation to "transition" paths — pre-workspace flows that on
 * desktop are rendered as a window-level overlay instead of a tab route.
 * Returns `true` if the navigation was handled (caller should NOT proceed).
 *
 * Side effect: when opening the new-workspace overlay, the tab router is
 * ALSO reset to "/". Rationale — the only way a push lands on
 * /workspaces/new is that the workspace context is gone (fresh install,
 * delete-last, leave-last). Leaving the tab parked on a workspace-scoped
 * path would keep those components mounted under the overlay; the next
 * render after the list cache updates would then throw (useWorkspaceId
 * etc) because the slug no longer resolves.
 */
function tryRouteToOverlay(path: string, router?: DataRouter): boolean {
  const overlay = useWindowOverlayStore.getState();
  if (path === "/workspaces/new") {
    overlay.open({ type: "new-workspace" });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path === "/onboarding") {
    overlay.open({ type: "onboarding" });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path.startsWith("/invite/")) {
    let id = "";
    try {
      id = decodeURIComponent(path.slice("/invite/".length));
    } catch {
      return true;
    }
    if (id) {
      overlay.open({ type: "invite", invitationId: id });
      return true;
    }
  }
  // Phase 6 AUTH (Plan 07) — pre-workspace auth flows on desktop are
  // overlays, not tab routes (per UI-SPEC §Hard Constraints #2). The 5
  // shared @multica/views/auth pages dispatch overlays here when shared
  // code calls `useNavigation().push("/auth/...")`.
  //
  // Order matters for two pairs:
  //   - `/auth/verify-email-resend` MUST be checked BEFORE
  //     `/auth/verify-email` because the former is a longer prefix of the
  //     latter — checking verify-email first would swallow the resend path
  //     and dispatch the wrong overlay (UI-SPEC §T-06-W4-AUTH-04).
  //   - `/auth/login` is left UN-INTERCEPTED — the existing `path === "/login"`
  //     handler in DesktopNavigationProvider.adapter.push catches the
  //     canonical login path; the shared LoginPage uses `paths.login()`
  //     which still returns "/login" (no migration to "/auth/login" yet).
  //
  // The token query string on verify-email + reset-password is parsed
  // here and forwarded as overlay payload, preserving the FROZEN Phase
  // 5.1 email-link contract end-to-end (UI-SPEC §Hard Constraints #18).
  if (path === "/auth/signup") {
    overlay.open({ type: "signup" });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path.startsWith("/auth/verify-email-resend")) {
    overlay.open({ type: "verify-email-resend" });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path.startsWith("/auth/verify-email")) {
    const token = parseTokenFromPath(path);
    overlay.open({ type: "verify-email", token });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path === "/auth/forgot-password") {
    overlay.open({ type: "forgot-password" });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  if (path.startsWith("/auth/reset-password")) {
    const token = parseTokenFromPath(path);
    overlay.open({ type: "reset-password", token });
    if (router && router.state.location.pathname !== "/") {
      router.navigate("/", { replace: true });
    }
    return true;
  }
  // Any other navigation cancels a live overlay.
  if (overlay.overlay) overlay.close();
  return false;
}

/**
 * Extract the `token` query parameter from a path string. Returns `undefined`
 * when no `?token=` is present or decoding fails. Used for verify-email +
 * reset-password overlay dispatches — the token must be passed through
 * verbatim to the shared page so it can redeem against the backend.
 *
 * Decoding error returns `undefined` instead of throwing — the shared page
 * already handles a missing token (renders the "no-token" state).
 */
function parseTokenFromPath(path: string): string | undefined {
  const tokenMatch = path.match(/[?&]token=([^&]+)/);
  if (!tokenMatch) return undefined;
  try {
    return decodeURIComponent(tokenMatch[1]!);
  } catch {
    return undefined;
  }
}

/**
 * Intercept pushes that change workspace. Returns `true` if the navigation
 * was delegated to the tab store (caller should NOT proceed).
 *
 * This is the entry point that makes shared code platform-agnostic:
 * sidebar dropdown, cmd+k "switch workspace", post-delete redirects,
 * invite-accept flow — they all call `useNavigation().push(path)` with a
 * full workspace URL, and on desktop we translate "target slug differs
 * from active" into "switch the tab-group that's visible in the TabBar".
 */
function tryRouteToOtherWorkspace(path: string): boolean {
  const targetSlug = extractWorkspaceSlug(path);
  if (!targetSlug) return false;
  const { activeWorkspaceSlug, switchWorkspace } = useTabStore.getState();
  if (targetSlug === activeWorkspaceSlug) return false;
  switchWorkspace(targetSlug, path);
  return true;
}

/**
 * Root-level navigation provider for components outside the per-tab
 * RouterProviders (sidebar, search dialog, modals, WindowOverlay contents).
 *
 * Reads from the active tab's memory router via router.subscribe().
 * Does NOT use any react-router hooks — it's above all RouterProviders.
 */
export function DesktopNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Primitive-only subscriptions so this component doesn't re-render on
  // unrelated store updates (e.g. an inactive tab's router tick). We
  // resolve the active router here only to subscribe once per tab switch.
  const { tabId: activeTabId } = useActiveTabIdentity();
  const router = useActiveTabRouter();
  // Mirror the active tab router's full location (pathname + search) so
  // shell-level consumers of useNavigation() — ChatWindow in particular —
  // can read URL search params. Must stay in sync with TabNavigationProvider
  // below; a partial shape here (just pathname) silently broke focus-mode
  // anchor resolution on `/inbox?issue=…`.
  const [location, setLocation] = useState<{ pathname: string; search: string }>(
    () => ({
      pathname: router?.state.location.pathname ?? "/",
      search: router?.state.location.search ?? "",
    }),
  );

  useEffect(() => {
    if (!router) {
      setLocation({ pathname: "/", search: "" });
      return;
    }
    setLocation({
      pathname: router.state.location.pathname,
      search: router.state.location.search,
    });
    return router.subscribe((state) => {
      setLocation({
        pathname: state.location.pathname,
        search: state.location.search,
      });
    });
  }, [activeTabId, router]);

  const adapter: NavigationAdapter = useMemo(
    () => ({
      push: (path: string) => {
        if (path === "/login") {
          useAuthStore.getState().logout();
          return;
        }
        const active = currentActiveTab();
        if (tryRouteToOverlay(path, active?.router)) return;
        if (tryRouteToOtherWorkspace(path)) return;
        active?.router.navigate(path);
      },
      replace: (path: string) => {
        const active = currentActiveTab();
        if (tryRouteToOverlay(path, active?.router)) return;
        if (tryRouteToOtherWorkspace(path)) return;
        active?.router.navigate(path, { replace: true });
      },
      back: () => {
        currentActiveTab()?.router.navigate(-1);
      },
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
      openInNewTab: (path: string, title?: string) => {
        // Cross-workspace "open in new tab" switches workspace and opens
        // the path there; same-workspace just adds a tab in the current group.
        const slug = extractWorkspaceSlug(path);
        const store = useTabStore.getState();
        if (slug && slug !== store.activeWorkspaceSlug) {
          store.switchWorkspace(slug, path);
          return;
        }
        const icon = resolveRouteIcon(path);
        const tabId = store.openTab(path, title ?? path, icon);
        if (tabId) store.setActiveTab(tabId);
      },
      getShareableUrl: (path: string) => `${APP_URL}${path}`,
    }),
    [location],
  );

  return <NavigationProvider value={adapter}>{children}</NavigationProvider>;
}

function currentActiveTab() {
  return getActiveTab(useTabStore.getState());
}

/**
 * Per-tab navigation provider rendered inside each tab's Activity wrapper.
 * Subscribes to the tab's own router for up-to-date pathname.
 *
 * This is what @multica/views page components read via useNavigation().
 */
export function TabNavigationProvider({
  router,
  children,
}: {
  router: DataRouter;
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState(router.state.location);

  useEffect(() => {
    setLocation(router.state.location);
    return router.subscribe((state) => {
      setLocation(state.location);
    });
  }, [router]);

  const adapter: NavigationAdapter = useMemo(
    () => ({
      push: (path: string) => {
        if (tryRouteToOverlay(path, router)) return;
        if (tryRouteToOtherWorkspace(path)) return;
        router.navigate(path);
      },
      replace: (path: string) => {
        if (tryRouteToOverlay(path, router)) return;
        if (tryRouteToOtherWorkspace(path)) return;
        router.navigate(path, { replace: true });
      },
      back: () => router.navigate(-1),
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
      openInNewTab: (path: string, title?: string) => {
        const slug = extractWorkspaceSlug(path);
        const store = useTabStore.getState();
        if (slug && slug !== store.activeWorkspaceSlug) {
          store.switchWorkspace(slug, path);
          return;
        }
        const icon = resolveRouteIcon(path);
        const tabId = store.openTab(path, title ?? path, icon);
        if (tabId) store.setActiveTab(tabId);
      },
      getShareableUrl: (path: string) => `${APP_URL}${path}`,
    }),
    [router, location],
  );

  return <NavigationProvider value={adapter}>{children}</NavigationProvider>;
}
