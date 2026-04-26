"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@multica/ui/components/ui/card";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";
import { Button } from "@multica/ui/components/ui/button";
import { api, ApiError } from "@multica/core/api";
import { setFlash } from "@multica/core/navigation";
import { AlgoPlanWordmark } from "./algoplan-wordmark";
import { PasswordStrengthMeter } from "./password-strength-meter";
import { useNavigation } from "../navigation";

// ---------------------------------------------------------------------------
// Constants — German strings per UI-SPEC §Copywriting AUTH (ResetPasswordPage)
// ---------------------------------------------------------------------------

const TITLE_NO_TOKEN = "Ungültiger Link";
const BODY_NO_TOKEN =
  "Dieser Link zum Zurücksetzen ist unvollständig. Fordere einen neuen Link an.";
const CTA_NEW_LINK = "Neuen Link anfordern";

const TITLE_FORM = "Neues Passwort wählen";
const DESCRIPTION_FORM =
  "Wähle ein neues Passwort mit mindestens 12 Zeichen.";
const LABEL_NEW = "Neues Passwort";
const LABEL_CONFIRM = "Passwort bestätigen";
const PASSWORD_HINT = "Mindestens 12 Zeichen.";
const CTA_SAVE = "Passwort speichern";
const CTA_SAVE_INFLIGHT = "Wird gespeichert…";

const TITLE_FAILURE = "Link abgelaufen";
const BODY_FAILURE =
  "Dieser Link zum Zurücksetzen ist abgelaufen oder wurde bereits verwendet. Fordere einen neuen Link an.";

const ERROR_MISMATCH = "Passwörter stimmen nicht überein.";
const ERROR_WEAK = "Passwort entspricht nicht den Mindestanforderungen.";
const ERROR_GENERIC =
  "Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut.";

// Per UI-SPEC §Hard Constraints AUTH-05 + Phase 5.1 backend bounds.
const MIN_PASSWORD_LENGTH = 12;
const MIN_PASSWORD_SCORE = 2;

// Flash key consumed by LoginPage's useNavigationFlash("password-updated").
// Per UI-SPEC §Hard Constraints #14 + threat T-06-W3-AUTH-03: NO auto-login;
// the toast appears after the user re-authenticates on /auth/login.
const FLASH_KEY = "password-updated";
const FLASH_MESSAGE = "Passwort aktualisiert. Bitte melde dich an.";

// ---------------------------------------------------------------------------
// State machine — discriminated union per CLAUDE.md state-management
// ---------------------------------------------------------------------------

type State =
  | { kind: "no-token" }
  | { kind: "form"; submitting: boolean; error: string | null }
  | { kind: "failure" };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResetPasswordPageProps {
  /** Token extracted from `?token=` by the platform wrapper.
   *  - Web: Next.js searchParams in apps/web/app/auth/reset-password/page.tsx
   *  - Desktop: WindowOverlay payload carries the token */
  token?: string | null;
}

export function ResetPasswordPage({ token }: ResetPasswordPageProps) {
  const navigation = useNavigation();
  const [state, setState] = useState<State>(
    token
      ? { kind: "form", submitting: false, error: null }
      : { kind: "no-token" },
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [score, setScore] = useState<number | null>(null);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const showMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const submitting = state.kind === "form" && state.submitting;
  const inlineError = state.kind === "form" ? state.error : null;

  const canSubmit =
    state.kind === "form" &&
    !submitting &&
    passwordsMatch &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    (score ?? -1) >= MIN_PASSWORD_SCORE;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!token) return; // belt + suspenders — UI guards above already prevent
    setState({ kind: "form", submitting: true, error: null });
    try {
      // snake_case body per FROZEN Phase 5.1 backend contract — typed in
      // packages/core/api/client.ts to enforce at compile time.
      // The response is INTENTIONALLY ignored (per UI-SPEC §Hard Constraints #14:
      // NO auto-login). Even if the server returned a token, we would not use it.
      await api.resetPassword({ token, new_password: newPassword });
      setFlash(FLASH_KEY, FLASH_MESSAGE);
      navigation.push("/auth/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ kind: "failure" });
        return;
      }
      const message =
        err instanceof ApiError && err.status === 400 ? ERROR_WEAK : ERROR_GENERIC;
      setState({ kind: "form", submitting: false, error: message });
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <AlgoPlanWordmark size="lg" className="mx-auto mb-4" />
          {state.kind === "form" && (
            <>
              <CardTitle className="text-2xl italic font-semibold">
                {TITLE_FORM}
              </CardTitle>
              <CardDescription>{DESCRIPTION_FORM}</CardDescription>
            </>
          )}
          {state.kind === "no-token" && (
            <CardTitle className="text-2xl italic font-semibold">
              {TITLE_NO_TOKEN}
            </CardTitle>
          )}
          {state.kind === "failure" && (
            <CardTitle className="text-2xl italic font-semibold">
              {TITLE_FAILURE}
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {state.kind === "no-token" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{BODY_NO_TOKEN}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigation.push("/auth/forgot-password")}
              >
                {CTA_NEW_LINK}
              </Button>
            </div>
          )}

          {state.kind === "failure" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{BODY_FAILURE}</p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigation.push("/auth/forgot-password")}
              >
                {CTA_NEW_LINK}
              </Button>
            </div>
          )}

          {state.kind === "form" && (
            <form
              id="reset-password-form"
              className="space-y-4"
              onSubmit={onSubmit}
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="new-password">{LABEL_NEW}</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                />
                <PasswordStrengthMeter
                  password={newPassword}
                  onScoreChange={setScore}
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{LABEL_CONFIRM}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {showMismatch && (
                  <p className="text-xs text-destructive">{ERROR_MISMATCH}</p>
                )}
              </div>
              {inlineError && (
                <p
                  role="alert"
                  data-testid="reset-password-error"
                  className="text-sm text-destructive"
                >
                  {inlineError}
                </p>
              )}
            </form>
          )}
        </CardContent>
        {state.kind === "form" && (
          <CardFooter>
            <Button
              type="submit"
              form="reset-password-form"
              size="lg"
              className="w-full"
              disabled={!canSubmit}
            >
              {submitting ? CTA_SAVE_INFLIGHT : CTA_SAVE}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
