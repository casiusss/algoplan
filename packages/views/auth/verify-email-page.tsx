"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@multica/ui/components/ui/card";
import { Button } from "@multica/ui/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@multica/core/api";
import { AlgoPlanWordmark } from "./algoplan-wordmark";
import { useNavigation } from "../navigation";

// ---------------------------------------------------------------------------
// Constants — German strings per UI-SPEC §Copywriting AUTH (VerifyEmailPage)
// ---------------------------------------------------------------------------

const TITLE_NO_TOKEN = "Ungültiger Link";
const BODY_NO_TOKEN =
  "Dieser Bestätigungslink ist unvollständig. Fordere einen neuen Link an.";
const CTA_NO_TOKEN = "Neuen Link anfordern";

const TITLE_IN_FLIGHT = "E-Mail wird bestätigt…";

const TITLE_SUCCESS = "E-Mail bestätigt";
const BODY_SUCCESS = "Du kannst jetzt loslegen.";
const CTA_SUCCESS = "Weiter zu AlgoPlan";

const TITLE_FAILURE = "Bestätigung fehlgeschlagen";
// Per UI-SPEC §Hard Constraints #13 + threat T-06-W3-AUTH-01: a single
// collapsed message for reused/expired/invalid (mirrors backend collapse).
// Never branch on a backend sub-reason.
const BODY_FAILURE =
  "Dieser Link ist abgelaufen oder wurde bereits verwendet.";
const CTA_FAILURE = "Neuen Link anfordern";

// ---------------------------------------------------------------------------
// State machine — discriminated union to avoid render races.
// Per CLAUDE.md state-management Common Footguns: never parallel booleans.
// ---------------------------------------------------------------------------

type State =
  | { kind: "no-token" }
  | { kind: "in-flight" }
  | { kind: "success" }
  | { kind: "failure" };

// ---------------------------------------------------------------------------
// Component
//
// Per UI-SPEC §Hard Constraints #15: this is a one-shot token-redemption
// flow — NOT polling. The `hasRunRef` guard prevents React 18 StrictMode's
// deliberate double-mount from firing api.verifyEmail twice on the same
// mount. The backend's single-use enforcement is the actual safeguard;
// the UI guard avoids the user seeing a confusing "already used" failure
// on a legit first click.
//
// DragStrip is provided by the wrapping shell, not by this page.
// ---------------------------------------------------------------------------

interface VerifyEmailPageProps {
  /** Token extracted from `?token=` by the platform wrapper.
   *  - Web: Next.js searchParams in apps/web/app/(auth)/verify-email/page.tsx
   *  - Desktop: WindowOverlay payload carries the token */
  token?: string | null;
}

export function VerifyEmailPage({ token }: VerifyEmailPageProps) {
  const navigation = useNavigation();
  const hasRunRef = useRef(false);
  const [state, setState] = useState<State>(
    token ? { kind: "in-flight" } : { kind: "no-token" },
  );

  useEffect(() => {
    if (!token) return;
    if (hasRunRef.current) return; // strict-mode guard
    hasRunRef.current = true;
    api
      .verifyEmail({ token })
      .then(() => setState({ kind: "success" }))
      .catch(() => setState({ kind: "failure" }));
  }, [token]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <AlgoPlanWordmark size="lg" className="mx-auto mb-4" />
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state.kind === "no-token" && (
            <>
              <CardTitle className="text-2xl italic font-semibold">
                {TITLE_NO_TOKEN}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{BODY_NO_TOKEN}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigation.push("/auth/verify-email-resend")}
              >
                {CTA_NO_TOKEN}
              </Button>
            </>
          )}

          {state.kind === "in-flight" && (
            <>
              <Loader2
                aria-hidden
                data-testid="verify-email-spinner"
                className="mx-auto size-8 animate-spin text-muted-foreground"
              />
              <CardTitle className="text-2xl italic font-semibold">
                {TITLE_IN_FLIGHT}
              </CardTitle>
            </>
          )}

          {state.kind === "success" && (
            <>
              <CheckCircle2
                aria-hidden
                data-testid="verify-email-success-icon"
                className="mx-auto size-12 text-success"
              />
              <CardTitle className="text-2xl italic font-semibold">
                {TITLE_SUCCESS}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{BODY_SUCCESS}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigation.push("/")}
              >
                {CTA_SUCCESS}
              </Button>
            </>
          )}

          {state.kind === "failure" && (
            <>
              <XCircle
                aria-hidden
                data-testid="verify-email-failure-icon"
                className="mx-auto size-12 text-destructive"
              />
              <CardTitle className="text-2xl italic font-semibold">
                {TITLE_FAILURE}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{BODY_FAILURE}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigation.push("/auth/verify-email-resend")}
              >
                {CTA_FAILURE}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
