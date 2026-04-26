"use client";

import { Button } from "@algoplan/ui/components/ui/button";
import { paths } from "@algoplan/core/paths";
import { useNavigation } from "../navigation";
import { useLogout } from "../auth";
import { DragStrip } from "../platform";
import { AlgoPlanWordmark } from "../auth/algoplan-wordmark";

/**
 * Rendered when the workspace slug in the URL does not resolve to a workspace
 * the current user can access. Deliberately doesn't distinguish "workspace
 * doesn't exist" from "workspace exists but I'm not a member" — showing
 * either would let attackers enumerate workspace slugs (Phase 6 §T-06-W1-WS-01).
 *
 * Web-only: desktop silently heals the stale tab via WorkspaceRouteLayout
 * (no error page rendered) per UI-SPEC §WS-04.
 *
 * Layout contract (UI-SPEC §AUTH §"Pitfall reminder"):
 *   - page-root flex container is the outer <div> with `flex min-h-svh flex-col`
 *   - DragStrip is the FIRST JSX child of that flex container (macOS drag region)
 *   - the centered card region follows DragStrip
 *   - inside the card: AlgoPlanWordmark sits ABOVE the heading; CTAs follow
 *
 * The dragstrip-coverage gate enforces (1) DragStrip-as-first-flex-child
 * structurally, so the JSDoc deliberately avoids literal JSX-tag prose to
 * stay invisible to the gate's source-walk parser.
 */
export function NoAccessPage() {
  const nav = useNavigation();
  const logout = useLogout();
  return (
    <div className="flex min-h-svh flex-col">
      <DragStrip />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-12 text-center">
        <AlgoPlanWordmark size="lg" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Workspace nicht verfügbar
          </h1>
          <p className="max-w-md text-muted-foreground">
            Dieser Workspace existiert nicht oder du hast keinen Zugriff.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => nav.push(paths.root())}>
            Zu meinen Workspaces
          </Button>
          <Button variant="outline" onClick={logout}>
            Mit anderem Konto anmelden
          </Button>
        </div>
      </div>
    </div>
  );
}
