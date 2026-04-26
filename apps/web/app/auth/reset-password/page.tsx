"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordPage } from "@multica/views/auth";

/**
 * Web wrapper for the shared ResetPasswordPage.
 *
 * Token contract per UI-SPEC §Hard Constraints #18 (FROZEN by Phase 5.1):
 * the email link is `${FRONTEND_ORIGIN}/auth/reset-password?token=<token>`.
 * This route extracts `?token=` via Next's `useSearchParams` and passes it
 * verbatim to the shared page, which redeems it via `api.resetPassword`.
 *
 * `useSearchParams` requires Suspense boundary in Next.js App Router (CSR
 * bailout). Mirrors the LoginPage wrapper pattern.
 */
function ResetPasswordRouteContent() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? undefined;
  return <ResetPasswordPage token={token} />;
}

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Suspense fallback={null}>
        <ResetPasswordRouteContent />
      </Suspense>
    </div>
  );
}
