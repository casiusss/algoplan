"use client";

import { ForgotPasswordPage } from "@multica/views/auth";

/**
 * Web wrapper for the shared ForgotPasswordPage.
 *
 * No token — the page asks the user for an email address and POSTs to
 * `/auth/password-reset/request` (idempotent, always-200 per Phase 5.1).
 */
export default function Page() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <ForgotPasswordPage />
    </div>
  );
}
