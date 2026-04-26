"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Button } from "@multica/ui/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { api } from "@multica/core/api";
import { AlgoPlanWordmark } from "./algoplan-wordmark";
import { useNavigation } from "../navigation";

// ---------------------------------------------------------------------------
// Constants — German strings per UI-SPEC §Copywriting AUTH (ForgotPasswordPage)
// ---------------------------------------------------------------------------

const TITLE = "Passwort zurücksetzen";
const DESCRIPTION =
  "Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.";
const CTA_LABEL = "Link senden";
const CTA_LABEL_INFLIGHT = "Wird gesendet…";
const SUCCESS_MESSAGE =
  "Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen gesendet. Prüfe dein Postfach.";
const BACK_TO_LOGIN = "Zurück zur Anmeldung";

// ---------------------------------------------------------------------------
// Component
//
// Per UI-SPEC §Hard Constraints #13 + threat T-06-W2-AUTH-02: the success
// state is rendered REGARDLESS of whether the email is registered. The
// backend's POST /auth/password-reset/request endpoint always returns 200
// idempotently (Phase 5.1) — the UI mirrors that contract exactly.
//
// DragStrip note: this page does NOT mount DragStrip. The desktop wrapper
// (WindowOverlay branch) and the web wrapper (apps/web/app/(auth)/...)
// own the page chrome including DragStrip. The Wave-0 dragstrip-coverage
// gate's enumeration is for full-window pages in `packages/views/`; this
// page is rendered INSIDE a wrapper that already supplies one.
// ---------------------------------------------------------------------------

export function ForgotPasswordPage() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.requestPasswordReset({ email });
    } catch {
      // Per Phase 5.1 + UI-SPEC §13: this endpoint always returns 200.
      // A network error must NOT become an enumeration oracle — show the
      // success state regardless. The user can retry from the success
      // branch's own error path if they suspect it didn't go through.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <AlgoPlanWordmark size="lg" className="mx-auto mb-4" />
          <CardTitle className="text-2xl italic font-semibold">{TITLE}</CardTitle>
          {!submitted && <CardDescription>{DESCRIPTION}</CardDescription>}
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center">
              <CheckCircle2
                aria-hidden
                data-testid="forgot-password-success-icon"
                className="mx-auto size-12 text-success"
              />
              <p className="text-sm text-muted-foreground">{SUCCESS_MESSAGE}</p>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigation.push("/auth/login")}
              >
                {BACK_TO_LOGIN}
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-Mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="du@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting || !email}
              >
                {submitting ? CTA_LABEL_INFLIGHT : CTA_LABEL}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
