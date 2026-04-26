"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@multica/core/api";
import {
  workspaceKeys,
  workspaceListOptions,
} from "@multica/core/workspace/queries";
import {
  paths,
  resolvePostAuthDestination,
  useHasOnboarded,
} from "@multica/core/paths";
import { useNavigation } from "../navigation";
import { AlgoPlanWordmark, useLogout } from "../auth";
import { DragStrip } from "../platform";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { ArrowLeft, LogOut, Users, Check, X } from "lucide-react";

export interface InvitePageProps {
  invitationId: string;
  /**
   * Optional "go back" handler. Caller passes it only when there's a
   * sensible destination (user has at least one workspace, or arrived
   * from an in-app flow). Omitted on first-invite/zero-workspace paths
   * where Back would have nowhere to go — Log out is then the only exit.
   */
  onBack?: () => void;
}

/**
 * Full-page shell for the "accept invitation" transition. Shared between
 * web (Next.js route `/invite/[id]`) and desktop (window-overlay).
 * Top-bar affordances (Back, Log out) live here so both platforms get
 * identical UX. Platform chrome (window drag region, immersive mode) is
 * layered on by the desktop overlay; web just renders the page directly.
 */
export function InvitePage({ invitationId, onBack }: InvitePageProps) {
  const { push } = useNavigation();
  const qc = useQueryClient();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const { data: invitation, isLoading, error: fetchError } = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: () => api.getInvitation(invitationId),
  });

  // Workspace list for the fallback "Go to dashboard" destinations. The invite
  // page is a pre-workspace global route so we can't rely on WorkspaceSlugProvider.
  const { data: wsList = [] } = useQuery(workspaceListOptions());
  const hasOnboarded = useHasOnboarded();
  const fallbackDest = resolvePostAuthDestination(wsList, hasOnboarded);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await api.acceptInvitation(invitationId);
      setDone("accepted");
      // Fetch the refreshed workspace list so we know the joined workspace's slug.
      const nextList = await qc.fetchQuery({
        ...workspaceListOptions(),
        staleTime: 0,
      });
      const joined = nextList.find((w) => w.id === invitation?.workspace_id);
      qc.invalidateQueries({ queryKey: workspaceKeys.myInvitations() });
      // Navigate into the joined workspace. The [workspaceSlug]/layout will
      // sync api client, stores, and the last_workspace_slug cookie from the URL.
      const dest = joined
        ? paths.workspace(joined.slug).issues()
        : fallbackDest;
      setTimeout(() => push(dest), 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Einladung konnte nicht angenommen werden.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    setError(null);
    try {
      await api.declineInvitation(invitationId);
      setDone("declined");
      qc.invalidateQueries({ queryKey: workspaceKeys.myInvitations() });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Einladung konnte nicht abgelehnt werden.",
      );
    } finally {
      setDeclining(false);
    }
  };

  if (isLoading) {
    return (
      <InviteShell onBack={onBack}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  if (fetchError || !invitation) {
    return (
      <InviteShell onBack={onBack}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <X className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg italic font-semibold">
              Einladung nicht gefunden
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Diese Einladung ist möglicherweise abgelaufen, wurde widerrufen
              oder gehört nicht zu deinem Konto.
            </p>
            <Button variant="outline" onClick={() => push(fallbackDest)}>
              Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  if (done === "accepted") {
    return (
      <InviteShell onBack={onBack}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg italic font-semibold">
              Du bist {invitation.workspace_name} beigetreten!
            </h2>
            <p className="text-sm text-muted-foreground">
              Weiterleitung zum Workspace …
            </p>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  if (done === "declined") {
    return (
      <InviteShell onBack={onBack}>
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <h2 className="text-lg italic font-semibold">Einladung abgelehnt</h2>
            <p className="text-sm text-muted-foreground">
              Du wirst diesem Workspace nicht hinzugefügt.
            </p>
            <Button variant="outline" onClick={() => push(fallbackDest)}>
              Zum Dashboard
            </Button>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  const isExpired = invitation.status !== "pending";
  const isAlreadyHandled = invitation.status === "accepted" || invitation.status === "declined";

  return (
    <InviteShell onBack={onBack}>
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-6 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl italic font-semibold">
              {invitation.workspace_name ?? "Workspace"} beitreten
            </h2>
            <p className="text-sm text-muted-foreground">
              <strong>
                {invitation.inviter_name || invitation.inviter_email}
              </strong>{" "}
              hat dich eingeladen, als{" "}
              {invitation.role === "admin" ? "Admin" : "Mitglied"} beizutreten.
            </p>
          </div>

          {isAlreadyHandled ? (
            <div className="text-sm text-muted-foreground">
              {invitation.status === "accepted"
                ? "Diese Einladung wurde bereits angenommen."
                : "Diese Einladung wurde bereits abgelehnt."}
            </div>
          ) : isExpired ? (
            <div className="text-sm text-muted-foreground">
              Diese Einladung ist abgelaufen.
            </div>
          ) : (
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                disabled={accepting || declining}
              >
                {declining ? "Wird abgelehnt …" : "Ablehnen"}
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                disabled={accepting || declining}
              >
                {accepting ? "Beitreten …" : "Beitreten"}
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </InviteShell>
  );
}

/**
 * Shared chrome for every InvitePage render state (loading, error,
 * default, accepted, declined). Keeps Back + Log out buttons in a
 * consistent position across all branches and across platforms.
 *
 * Phase 6 AUTH (UI-SPEC §AUTH §Pre-workspace pages): the
 * AlgoPlanWordmark sits ABOVE the card inside the centered region —
 * NOT above DragStrip. DragStrip remains the FIRST flex child of the
 * page-root flex container so macOS dragging keeps working; the
 * dragstrip-coverage gate enforces this structurally.
 */
function InviteShell({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: ReactNode;
}) {
  const logout = useLogout();
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <DragStrip />
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-16 left-12 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft />
          Zurück
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-16 right-12 text-muted-foreground hover:text-destructive"
        onClick={logout}
      >
        <LogOut />
        Abmelden
      </Button>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-12">
        <AlgoPlanWordmark size="lg" />
        {children}
      </div>
    </div>
  );
}
