"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@algoplan/ui/components/ui/card";
import { Input } from "@algoplan/ui/components/ui/input";
import { Label } from "@algoplan/ui/components/ui/label";
import { Button } from "@algoplan/ui/components/ui/button";
import { api, ApiError } from "@algoplan/core/api";
import { AlgoPlanWordmark } from "./algoplan-wordmark";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { AppLink, useNavigation } from "../navigation";

// ---------------------------------------------------------------------------
// Constants — German strings per UI-SPEC §Copywriting AUTH (SignupPage)
// ---------------------------------------------------------------------------

const TITLE = "Konto erstellen";
const DESCRIPTION = "Erstelle dein AlgoPlan-Konto in einer Minute.";
const CTA_LABEL = "Konto erstellen";
const CTA_LABEL_INFLIGHT = "Wird erstellt…";
const PASSWORD_HINT = "Mindestens 12 Zeichen.";

const ERROR_EMAIL_TAKEN = "Diese E-Mail ist bereits registriert.";
const ERROR_WEAK_PASSWORD =
  "Passwort entspricht nicht den Mindestanforderungen.";
const ERROR_SIGNUP_GATED = "Registrierung ist derzeit nicht verfügbar.";
const ERROR_GENERIC =
  "Konto konnte nicht erstellt werden. Bitte versuche es erneut.";

// Score gate per UI-SPEC §Hard Constraints AUTH-02: zxcvbn score ≥ 2 AND
// length ≥ 12. Backend enforces 12-72 byte band — defense in depth.
const MIN_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_SCORE = 2;

// Email validation: a deliberately permissive regex that catches the most
// common typos (no @, no domain dot) without rejecting valid edge cases.
// Backend re-validates with its own canonical parser.
const EMAIL_RE = /^.+@.+\..+$/;

// ---------------------------------------------------------------------------
// Error mapping — branch on err.status only, never on a backend sub-reason.
//
// Per UI-SPEC §Hard Constraints #13: 409 IS the one legitimate distinguishing
// error (the user opted to create an account, so telling them the email is
// already taken is the expected feedback). 400/403/5xx are collapsed German
// messages with no sub-reason text leaked.
// ---------------------------------------------------------------------------

function signupErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return ERROR_EMAIL_TAKEN;
    if (err.status === 400) return ERROR_WEAK_PASSWORD;
    if (err.status === 403) return ERROR_SIGNUP_GATED;
  }
  return ERROR_GENERIC;
}

// ---------------------------------------------------------------------------
// Component
//
// Layout mirrors ForgotPasswordPage / ResendVerifyEmailPage (auth-card layout
// contract per UI-SPEC §Auth card layout contract). DragStrip is provided by
// the wrapping shell (web wrapper / desktop WindowOverlay), not by this page.
// ---------------------------------------------------------------------------

export function SignupPage() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email);
  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    emailValid &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (score ?? -1) >= MIN_PASSWORD_SCORE;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.signup({ name, email, password });
      navigation.push("/onboarding");
    } catch (err) {
      setError(signupErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <AlgoPlanWordmark size="lg" className="mx-auto mb-4" />
          <CardTitle className="text-2xl italic font-semibold">
            {TITLE}
          </CardTitle>
          <CardDescription>{DESCRIPTION}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="signup-form"
            className="space-y-4"
            onSubmit={onSubmit}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">E-Mail</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="du@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Passwort</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <PasswordStrengthMeter
                password={password}
                onScoreChange={setScore}
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>
            {error && (
              <p
                role="alert"
                data-testid="signup-error"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            form="signup-form"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {submitting ? CTA_LABEL_INFLIGHT : CTA_LABEL}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Bereits ein Konto?{" "}
            <AppLink
              href="/auth/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Anmelden
            </AppLink>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
