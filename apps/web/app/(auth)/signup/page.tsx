"use client";

import { SignupPage } from "@multica/views/auth";

/**
 * Web wrapper for the shared SignupPage.
 *
 * The shared page renders a `flex flex-1 flex-col items-center justify-center`
 * card region — it expects a parent flex container that supplies a sized
 * column. This wrapper is that container; matches the equivalent shell mounted
 * by the desktop WindowOverlay (see `apps/desktop/src/renderer/src/components/window-overlay.tsx`).
 *
 * Web has no native window-drag region, so DragStrip is intentionally NOT
 * mounted here — `<DragStrip />` is a Chromium-only `-webkit-app-region`
 * affordance and would render as a 48px no-op on web. The route file is
 * deliberately thin so the shared page owns the auth-card layout contract.
 */
export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SignupPage />
    </div>
  );
}
