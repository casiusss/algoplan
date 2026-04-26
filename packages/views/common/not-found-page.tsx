"use client";

import { Button } from "@multica/ui/components/ui/button";
import { useNavigation } from "../navigation";
import { DragStrip } from "../platform";
import { AlgoPlanWordmark } from "../auth/algoplan-wordmark";

/**
 * 404 — page not found (WS-04).
 *
 * Full-window error page for both web and desktop. Web mounts via
 * Next.js's `app/not-found.tsx`; desktop mounts via the tab-router
 * fallback. DragStrip is the FIRST flex child so the macOS window
 * remains draggable even on this terminal route.
 *
 * Mirror of `NoAccessPage` in tone — single primary CTA back to root.
 * Uses the AlgoPlan brand wordmark above the heading per UI-SPEC §WS-04.
 */
export function NotFoundPage() {
  const navigation = useNavigation();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DragStrip />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-12 text-center">
        <AlgoPlanWordmark size="lg" />
        <div className="space-y-2">
          <h1 className="text-2xl italic font-semibold">
            Seite nicht gefunden
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Diese Seite gibt es nicht oder sie wurde verschoben.
          </p>
        </div>
        <Button onClick={() => navigation.push("/")}>
          Zur Startseite
        </Button>
      </div>
    </div>
  );
}
