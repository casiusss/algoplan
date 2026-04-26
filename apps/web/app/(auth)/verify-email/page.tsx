"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VerifyEmailPage } from "@multica/views/auth";

/**
 * Web wrapper for the shared VerifyEmailPage.
 *
 * Token contract per UI-SPEC §Hard Constraints #18 (FROZEN by Phase 5.1):
 * the email link is `${FRONTEND_ORIGIN}/auth/verify-email?token=<token>`.
 * This route extracts `?token=` via Next's `useSearchParams` and passes it
 * verbatim to the shared page, which redeems it via `api.verifyEmail`.
 *
 * `useSearchParams` requires Suspense boundary in Next.js App Router (CSR
 * bailout) — without it, the build fails with the missing-suspense-boundary
 * error. Mirrors the LoginPage wrapper pattern.
 */
function VerifyEmailRouteContent() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? undefined;
  return <VerifyEmailPage token={token} />;
}

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Suspense fallback={null}>
        <VerifyEmailRouteContent />
      </Suspense>
    </div>
  );
}
