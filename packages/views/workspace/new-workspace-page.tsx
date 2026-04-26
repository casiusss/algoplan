"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@algoplan/ui/components/ui/button";
import type { Workspace } from "@algoplan/core/types";
import { AlgoPlanWordmark, useLogout } from "../auth";
import { DragStrip } from "../platform";
import { CreateWorkspaceForm } from "./create-workspace-form";

/**
 * Full-page shell for the "create workspace" transition. Shared between web
 * (Next.js route `/workspaces/new`) and desktop (window-overlay). The
 * top-bar affordances — Back (when dismissable) and Log out — live here
 * so both platforms get identical UX; platform-specific concerns like
 * window-drag region and macOS traffic-light handling stay in each app's
 * shell.
 *
 * `onBack` is optional: caller passes it only when there's somewhere to go
 * back to (user has other workspaces, or the flow was entered from an
 * existing session). On the zero-workspace entry path it's omitted, which
 * hides Back — Log out is then the only escape.
 *
 * Layout contract (Phase 6 AUTH, UI-SPEC §AUTH §Pre-workspace pages):
 *  - DragStrip stays the FIRST flex child of the page-root flex container
 *    — wordmark goes INSIDE the centered card region, never above DragStrip.
 *    The dragstrip-coverage gate enforces this structurally.
 *  - Title is `text-3xl italic font-semibold` reading "Willkommen bei AlgoPlan".
 *  - Shell strings (body, invite hint, Back, Log out) are German.
 */
export function NewWorkspacePage({
  onSuccess,
  onBack,
}: {
  onSuccess: (workspace: Workspace) => void;
  onBack?: () => void;
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

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="flex flex-col items-center text-center">
            <AlgoPlanWordmark size="lg" className="mb-4" />
            <h1 className="text-3xl italic font-semibold tracking-tight">
              Willkommen bei AlgoPlan
            </h1>
            <p className="mt-3 text-muted-foreground">
              Ein Workspace, in dem du und deine AI-Teamkollegen Seite an Seite
              arbeitet — Issues übernehmen, Kommentare hinterlassen, denselben
              Kontext teilen.
            </p>
          </div>
          <CreateWorkspaceForm onSuccess={onSuccess} />
          <p className="text-center text-xs text-muted-foreground">
            Du kannst Teammitglieder einladen, sobald dein Workspace bereit ist.
          </p>
        </div>
      </div>
    </div>
  );
}
