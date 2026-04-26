"use client";

import { useState, useEffect, useCallback } from "react";
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
// Constants — German strings per UI-SPEC §Copywriting AUTH (ResendVerifyEmail)
// ---------------------------------------------------------------------------

const TITLE = "Bestätigungslink erneut senden";
const DESCRIPTION =
  "Gib deine E-Mail-Adresse ein. Wir senden einen neuen Bestätigungslink.";
const CTA_LABEL = "Link senden";
const CTA_LABEL_INFLIGHT = "Wird gesendet…";
const SUCCESS_MESSAGE =
  "Wenn ein Konto mit dieser E-Mail existiert und noch nicht bestätigt ist, haben wir einen neuen Link gesendet.";
const BACK_TO_LOGIN = "Zurück zur Anmeldung";

const COOLDOWN_SECONDS = 60;

// ---------------------------------------------------------------------------
// Component
//
// Per UI-SPEC §Hard Constraints #13 + threat T-06-W2-AUTH-03: success state
// is rendered regardless of whether the email is registered. Backend
// /auth/email-verify/resend always returns 200 (Phase 5.1, idempotent
// 60s/email server-side rate limit).
//
// Client-side cooldown of 60s on the "Erneut senden" affordance protects
// against rapid double-clicks (mirrors the LoginPage OTP resend pattern).
// Backend enforces independently — the client cooldown is purely UX.
//
// DragStrip is provided by the wrapping shell, not by this page.
// ---------------------------------------------------------------------------

export function ResendVerifyEmailPage() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Tick the cooldown down once per second. Mirrors the LoginPage resend
  // cooldown; reset to COOLDOWN_SECONDS after every successful send.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOnce = useCallback(async () => {
    setSubmitting(true);
    try {
      await api.resendVerifyEmail({ email });
    } catch {
      // Same non-disclosure rationale as ForgotPasswordPage — the backend
      // contract is always-200; turning a transport failure into UI signal
      // would create an enumeration oracle.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await sendOnce();
  }

  async function onResend() {
    if (cooldown > 0 || submitting) return;
    await sendOnce();
  }

  const resendLabel =
    cooldown > 0 ? `Erneut senden in ${cooldown}s` : "Erneut senden";

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
                data-testid="resend-verify-success-icon"
                className="mx-auto size-12 text-success"
              />
              <p className="text-sm text-muted-foreground">{SUCCESS_MESSAGE}</p>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={onResend}
                disabled={cooldown > 0 || submitting}
              >
                {resendLabel}
              </Button>
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
                <Label htmlFor="resend-email">E-Mail</Label>
                <Input
                  id="resend-email"
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
