"use client";

import { ResendVerifyEmailPage } from "@algoplan/views/auth";

/**
 * Web wrapper for the shared ResendVerifyEmailPage.
 *
 * No token — the page asks the user for an email address and POSTs to
 * `/auth/email-verify/resend` (idempotent, always-200 per Phase 5.1).
 * The `/{verb}` form is reserved by the `auth` slug — see
 * `packages/core/paths/reserved-slugs.ts`.
 */
export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ResendVerifyEmailPage />
    </div>
  );
}
