import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockApiResetPassword = vi.hoisted(() => vi.fn());
const mockNavigationPush = vi.hoisted(() => vi.fn());
const mockSetFlash = vi.hoisted(() => vi.fn());

const ApiErrorMock = vi.hoisted(() => {
  return class ApiError extends Error {
    status: number;
    statusText: string;
    constructor(message: string, status: number, statusText: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.statusText = statusText;
    }
  };
});

vi.mock("@multica/core/api", () => ({
  api: {
    resetPassword: mockApiResetPassword,
  },
  ApiError: ApiErrorMock,
}));

vi.mock("@multica/core/navigation", () => ({
  setFlash: mockSetFlash,
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mockNavigationPush }),
}));

// Mock PasswordStrengthMeter so we control the score gate deterministically.
vi.mock("./password-strength-meter", () => ({
  PasswordStrengthMeter: ({
    password,
    onScoreChange,
  }: {
    password: string;
    onScoreChange?: (score: number | null) => void;
  }) => {
    const score = password.length === 0 ? null : password.length >= 12 ? 3 : 1;
    if (onScoreChange) {
      Promise.resolve().then(() => onScoreChange(score));
    }
    return <div data-testid="password-strength-meter" data-score={score} />;
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ResetPasswordPage } from "./reset-password-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STRONG_PW = "supersecret-12-bytes";

async function fillStrongMatchingPasswords() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^neues passwort$/i), STRONG_PW);
  await user.type(screen.getByLabelText(/passwort bestätigen/i), STRONG_PW);
  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // No-token branch (token absent): renders 'Ungültiger Link' + CTA →
  // /auth/forgot-password; api.resetPassword is NOT called.
  // -------------------------------------------------------------------------

  it("no-token branch (token=undefined): renders 'Ungültiger Link' + CTA + does NOT call api.resetPassword", () => {
    render(<ResetPasswordPage token={undefined} />);
    expect(screen.getByText("Ungültiger Link")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    ).toBeInTheDocument();
    expect(mockApiResetPassword).not.toHaveBeenCalled();
  });

  it("no-token branch (token=null): same behavior as undefined", () => {
    render(<ResetPasswordPage token={null} />);
    expect(screen.getByText("Ungültiger Link")).toBeInTheDocument();
    expect(mockApiResetPassword).not.toHaveBeenCalled();
  });

  it("no-token branch: CTA navigates to /auth/forgot-password", async () => {
    render(<ResetPasswordPage token={undefined} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    );
    expect(mockNavigationPush).toHaveBeenCalledWith("/auth/forgot-password");
  });

  // -------------------------------------------------------------------------
  // Form branch (token present)
  // -------------------------------------------------------------------------

  it("form branch: renders title 'Neues Passwort wählen' + 2 password fields + meter + CTA", () => {
    render(<ResetPasswordPage token="reset-token" />);
    expect(screen.getByText("Neues Passwort wählen")).toBeInTheDocument();
    expect(screen.getByLabelText(/^neues passwort$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort bestätigen/i)).toBeInTheDocument();
    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit gating
  // -------------------------------------------------------------------------

  it("submit disabled when both fields empty", () => {
    render(<ResetPasswordPage token="reset-token" />);
    expect(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    ).toBeDisabled();
  });

  it("submit disabled when passwords do not match (also shows mismatch error)", async () => {
    render(<ResetPasswordPage token="reset-token" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^neues passwort$/i), STRONG_PW);
    await user.type(
      screen.getByLabelText(/passwort bestätigen/i),
      "different-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).toBeDisabled();
    });
    expect(
      screen.getByText(/passwörter stimmen nicht überein\./i),
    ).toBeInTheDocument();
  });

  it("submit disabled when password length < 12 (score < 2)", async () => {
    render(<ResetPasswordPage token="reset-token" />);
    const user = userEvent.setup();
    // Mocked meter: length < 12 → score 1 (fails gate).
    await user.type(screen.getByLabelText(/^neues passwort$/i), "short-pw");
    await user.type(
      screen.getByLabelText(/passwort bestätigen/i),
      "short-pw",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).toBeDisabled();
    });
  });

  it("submit ENABLED when match + length ≥ 12 + score ≥ 2", async () => {
    render(<ResetPasswordPage token="reset-token" />);
    await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Submit handler (200): setFlash + push('/auth/login') — NO auto-login
  //
  // Per UI-SPEC §Hard Constraints #14 + threat T-06-W3-AUTH-03 + Phase 5.1
  // Pitfall §6: backend deliberately omits the auth cookie. The user must
  // re-authenticate via /auth/login. Adversary with brief inbox access cannot
  // walk away with a long-lived session.
  // -------------------------------------------------------------------------

  it("on 200: calls api.resetPassword with snake_case body, fires setFlash, navigates to /auth/login", async () => {
    mockApiResetPassword.mockResolvedValueOnce({ message: "ok" });
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    await waitFor(() => {
      // snake_case body shape per FROZEN Phase 5.1 contract.
      expect(mockApiResetPassword).toHaveBeenCalledWith({
        token: "reset-token",
        new_password: STRONG_PW,
      });
      expect(mockSetFlash).toHaveBeenCalledWith(
        "password-updated",
        "Passwort aktualisiert. Bitte melde dich an.",
      );
      expect(mockNavigationPush).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("on 200: NO auto-login — the api response is NOT used to set any session", async () => {
    // Even if the server somehow returned a token (it shouldn't per Phase 5.1
    // Pitfall §6), the component must NOT extract or persist it.
    mockApiResetPassword.mockResolvedValueOnce({
      message: "ok",
      // Bait fields — should be IGNORED.
      token: "should-not-be-used",
      user: { id: "u-1" },
    });
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    await waitFor(() => {
      expect(mockNavigationPush).toHaveBeenCalledWith("/auth/login");
    });
    // Still goes through /auth/login — never to a workspace or onboarding.
    expect(mockNavigationPush).not.toHaveBeenCalledWith("/onboarding");
    expect(mockNavigationPush).not.toHaveBeenCalledWith("/");
  });

  it("shows 'Wird gespeichert…' while in-flight", async () => {
    mockApiResetPassword.mockReturnValueOnce(new Promise(() => {}));
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    expect(screen.getByText(/wird gespeichert…/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit handler (401): re-renders failure branch with title
  // 'Link abgelaufen' + CTA → /auth/forgot-password.
  // -------------------------------------------------------------------------

  it("on 401: re-renders failure branch ('Link abgelaufen') + CTA navigates to /auth/forgot-password", async () => {
    mockApiResetPassword.mockRejectedValueOnce(
      new ApiErrorMock("token expired", 401, "Unauthorized"),
    );
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Link abgelaufen")).toBeInTheDocument();
    });
    // The component MUST NOT have leaked the backend's discriminating text.
    expect(screen.queryByText(/token expired/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    );
    expect(mockNavigationPush).toHaveBeenCalledWith("/auth/forgot-password");
    // setFlash MUST NOT be called on failure.
    expect(mockSetFlash).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Submit handler (400): inline error
  // -------------------------------------------------------------------------

  it("on 400: shows inline 'Passwort entspricht nicht den Mindestanforderungen.' (form stays)", async () => {
    mockApiResetPassword.mockRejectedValueOnce(
      new ApiErrorMock("weak", 400, "Bad Request"),
    );
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /passwort entspricht nicht den mindestanforderungen\./i,
        ),
      ).toBeInTheDocument();
    });
    // Form stays visible — failure branch is NOT entered for 400.
    expect(screen.getByLabelText(/^neues passwort$/i)).toBeInTheDocument();
    expect(screen.queryByText("Link abgelaufen")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit handler (5xx): generic inline error
  // -------------------------------------------------------------------------

  it("on 5xx: shows generic inline German error (form stays)", async () => {
    mockApiResetPassword.mockRejectedValueOnce(
      new ApiErrorMock("server error", 500, "Internal Server Error"),
    );
    render(<ResetPasswordPage token="reset-token" />);

    const user = await fillStrongMatchingPasswords();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^passwort speichern$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^passwort speichern$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /passwort konnte nicht aktualisiert werden\. bitte versuche es erneut\./i,
        ),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // AlgoPlanWordmark always renders
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark in form + no-token + failure branches", async () => {
    const { rerender } = render(<ResetPasswordPage token="reset-token" />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
    rerender(<ResetPasswordPage token={undefined} />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
  });
});
