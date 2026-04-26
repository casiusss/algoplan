import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockSendCode = vi.hoisted(() => vi.fn());
const mockVerifyCode = vi.hoisted(() => vi.fn());
const mockApiListWorkspaces = vi.hoisted(() => vi.fn());
const mockApiVerifyCode = vi.hoisted(() => vi.fn());
const mockApiSetToken = vi.hoisted(() => vi.fn());
const mockApiGetMe = vi.hoisted(() => vi.fn());
const mockApiIssueCliToken = vi.hoisted(() => vi.fn());
const mockApiLogin = vi.hoisted(() => vi.fn());
const mockSetQueryData = vi.hoisted(() => vi.fn());
const mockAuthSetState = vi.hoisted(() => vi.fn());

// ApiError mirrors the real class shape so the component's `instanceof` check
// can branch correctly. Status discrimination ONLY — never a sub-reason.
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

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return { ...actual, useQueryClient: () => ({ setQueryData: mockSetQueryData }) };
});

// Mock `@algoplan/core/navigation` so the cross-plan flash hook
// (`useNavigationFlash("password-updated")`) is asserted directly without
// pulling sonner into the test path. Cross-plan touch from Plan 06-06:
// LoginPage now consumes the flash set by ResetPasswordPage on its success
// branch (per UI-SPEC §Hard Constraints #14).
const mockUseNavigationFlash = vi.hoisted(() => vi.fn());
vi.mock("@algoplan/core/navigation", () => ({
  useNavigationFlash: mockUseNavigationFlash,
}));

vi.mock("@algoplan/core/auth", () => ({
  useAuthStore: Object.assign(
    // Zustand hook form — component may call useAuthStore(selector)
    (selector?: (s: unknown) => unknown) => {
      const state = { sendCode: mockSendCode, verifyCode: mockVerifyCode };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        sendCode: mockSendCode,
        verifyCode: mockVerifyCode,
      }),
      setState: mockAuthSetState,
    },
  ),
}));

vi.mock("@algoplan/core/api", () => ({
  api: {
    listWorkspaces: mockApiListWorkspaces,
    verifyCode: mockApiVerifyCode,
    setToken: mockApiSetToken,
    getMe: mockApiGetMe,
    issueCliToken: mockApiIssueCliToken,
    login: mockApiLogin,
  },
  ApiError: ApiErrorMock,
}));

vi.mock("@algoplan/core/types", () => ({}));

// AppLink in tests renders as a plain anchor (no NavigationProvider).
vi.mock("../navigation", () => ({
  AppLink: ({ children, href, ...props }: { children: React.ReactNode; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { LoginPage, validateCliCallback } from "./login-page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOTPInput() {
  // input-otp renders a single hidden <input> that holds the OTP value
  return screen.getByRole("textbox", { hidden: true });
}

const ERROR_INVALID_CREDENTIALS = "E-Mail oder Passwort ist falsch.";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LoginPage", () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    // Default: no existing session (getMe rejects when no auth)
    mockApiGetMe.mockRejectedValue(new Error("unauthorized"));
    localStorage.clear();
    // Reset window.location for tests that change it
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "http://localhost:3000" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Email step rendering — German strings + AlgoPlanWordmark default
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark + 'Willkommen zurück' title + German description", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    // AlgoPlanWordmark default header (no explicit logo prop)
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
    expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
    expect(
      screen.getByText(
        /melde dich mit deinem passwort an oder fordere einen anmeldecode an/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /code anfordern/i }),
    ).toBeInTheDocument();
  });

  it("does not show password field by default (OTP sub-mode is initial)", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    expect(screen.queryByLabelText(/^passwort$/i)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Sub-mode toggle (OTP ↔ password)
  // -------------------------------------------------------------------------

  it("toggling 'Mit Passwort anmelden' reveals the password field and changes CTA to 'Anmelden'", async () => {
    render(<LoginPage onSuccess={onSuccess} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );

    expect(screen.getByLabelText(/^passwort$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^anmelden$/i }),
    ).toBeInTheDocument();
    // The toggle now offers switching back to OTP
    expect(
      screen.getByRole("button", { name: /code anfordern/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Email validation
  // -------------------------------------------------------------------------

  it("primary CTA is disabled when email is empty", async () => {
    render(<LoginPage onSuccess={onSuccess} />);
    const button = screen.getByRole("button", { name: /code anfordern/i });
    expect(button).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // OTP path — sendCode flow (regression-protected)
  // -------------------------------------------------------------------------

  it("calls sendCode on form submit with email", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    expect(mockSendCode).toHaveBeenCalledWith("test@example.com");
  });

  it("shows 'Wird gesendet…' while submitting OTP", async () => {
    // Never resolve so loading stays true
    mockSendCode.mockReturnValueOnce(new Promise(() => {}));
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    expect(screen.getByText(/wird gesendet…/i)).toBeInTheDocument();
  });

  it("transitions to code step after successful sendCode", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it("shows error when sendCode fails", async () => {
    mockSendCode.mockRejectedValueOnce(new Error("Rate limited"));
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Rate limited")).toBeInTheDocument();
    });
  });

  it("shows generic German error when sendCode throws non-Error", async () => {
    mockSendCode.mockRejectedValueOnce("boom");
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/code konnte nicht gesendet werden/i),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Password sub-mode — successful login
  // -------------------------------------------------------------------------

  it("password mode: submitting calls api.login with {email, password}, seeds workspace cache, fires onSuccess", async () => {
    mockApiLogin.mockResolvedValueOnce({
      token: "tok",
      user: { id: "u-1", email: "test@example.com" },
    });
    mockApiListWorkspaces.mockResolvedValueOnce([{ id: "ws-1" }]);
    mockApiGetMe.mockResolvedValueOnce({ id: "u-1", email: "test@example.com" });

    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.type(screen.getByLabelText(/^passwort$/i), "supersecret-12-bytes");
    await user.click(screen.getByRole("button", { name: /^anmelden$/i }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "supersecret-12-bytes",
      });
      expect(mockApiListWorkspaces).toHaveBeenCalled();
      expect(mockSetQueryData).toHaveBeenCalledWith(
        expect.arrayContaining(["workspaces", "list"]),
        [{ id: "ws-1" }],
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Password sub-mode — 401 no-enumeration message
  //
  // This is the UI half of UI-SPEC §Hard Constraints #13. Two simulated 401
  // responses (would-have-been unknown-email vs would-have-been wrong-password)
  // MUST surface as the SAME constant German message. The component MUST NOT
  // branch on a backend reason discriminator — only on err.status.
  // -------------------------------------------------------------------------

  it("password mode 401: shows constant German message regardless of which credential side failed (unknown email path)", async () => {
    mockApiLogin.mockRejectedValueOnce(
      new ApiErrorMock("invalid credentials", 401, "Unauthorized"),
    );

    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );
    await user.type(screen.getByLabelText("E-Mail"), "ghost@example.com");
    await user.type(screen.getByLabelText(/^passwort$/i), "anything-12-bytes-x");
    await user.click(screen.getByRole("button", { name: /^anmelden$/i }));

    await waitFor(() => {
      expect(screen.getByText(ERROR_INVALID_CREDENTIALS)).toBeInTheDocument();
    });
  });

  it("password mode 401: shows the SAME constant message on the wrong-password path (no enumeration)", async () => {
    mockApiLogin.mockRejectedValueOnce(
      // Even if the backend's error message differed across paths (it doesn't —
      // Phase 5.1 collapses both into one), the UI must surface the constant.
      new ApiErrorMock("password mismatch — different reason text", 401, "Unauthorized"),
    );

    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );
    await user.type(screen.getByLabelText("E-Mail"), "real@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "wrong-but-12-bytes-x",
    );
    await user.click(screen.getByRole("button", { name: /^anmelden$/i }));

    await waitFor(() => {
      expect(screen.getByText(ERROR_INVALID_CREDENTIALS)).toBeInTheDocument();
    });
    // The component MUST NOT have leaked the backend's discriminating text.
    expect(
      screen.queryByText(/password mismatch/i),
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Password sub-mode — 403 (signup gated) + generic
  // -------------------------------------------------------------------------

  it("password mode 403: shows 'Registrierung nicht verfügbar.'", async () => {
    mockApiLogin.mockRejectedValueOnce(
      new ApiErrorMock("signup gated", 403, "Forbidden"),
    );

    render(<LoginPage onSuccess={onSuccess} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.type(screen.getByLabelText(/^passwort$/i), "supersecret-12-bytes");
    await user.click(screen.getByRole("button", { name: /^anmelden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Registrierung nicht verfügbar."),
      ).toBeInTheDocument();
    });
  });

  it("password mode 5xx: shows generic German error", async () => {
    mockApiLogin.mockRejectedValueOnce(
      new ApiErrorMock("server error", 500, "Internal Server Error"),
    );

    render(<LoginPage onSuccess={onSuccess} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /mit passwort anmelden/i }),
    );
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.type(screen.getByLabelText(/^passwort$/i), "supersecret-12-bytes");
    await user.click(screen.getByRole("button", { name: /^anmelden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/etwas ist schiefgelaufen/i),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Code verification (OTP path — regression)
  // -------------------------------------------------------------------------

  it("OTP: calls verifyCode, seeds workspace list cache, then onSuccess", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    mockVerifyCode.mockResolvedValueOnce(undefined);
    mockApiListWorkspaces.mockResolvedValueOnce([{ id: "ws-1" }]);

    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    const otpInput = getOTPInput();
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(mockVerifyCode).toHaveBeenCalledWith(
        "test@example.com",
        "123456",
      );
      expect(mockApiListWorkspaces).toHaveBeenCalled();
      expect(mockSetQueryData).toHaveBeenCalledWith(
        expect.arrayContaining(["workspaces", "list"]),
        [{ id: "ws-1" }],
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("OTP: shows German error on invalid code (non-Error rejection falls back to constant)", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    mockVerifyCode.mockRejectedValueOnce("boom");

    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    const otpInput = getOTPInput();
    await user.type(otpInput, "000000");

    await waitFor(() => {
      expect(
        screen.getByText("Ungültiger oder abgelaufener Code."),
      ).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Resend code with cooldown (German strings)
  // -------------------------------------------------------------------------

  it("disables resend button during cooldown ('Erneut senden in {n}s')", async () => {
    mockSendCode.mockResolvedValue(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    const resendBtn = screen.getByRole("button", { name: /erneut senden in/i });
    expect(resendBtn).toBeDisabled();
  });

  it("calls sendCode again when resend ('Code erneut senden') is clicked after cooldown", async () => {
    mockSendCode.mockResolvedValue(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    expect(mockSendCode).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 61; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /code erneut senden/i }),
      ).toBeInTheDocument();
    });

    const resendBtn = screen.getByRole("button", {
      name: /code erneut senden/i,
    });
    expect(resendBtn).not.toBeDisabled();

    await user.click(resendBtn);
    expect(mockSendCode).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Google OAuth (German label)
  // -------------------------------------------------------------------------

  it("renders Google OAuth button with 'Mit Google fortfahren'", () => {
    render(
      <LoginPage
        onSuccess={onSuccess}
        google={{ clientId: "goog-123", redirectUri: "http://localhost/cb" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /mit google fortfahren/i }),
    ).toBeInTheDocument();
  });

  it("hides Google OAuth button when google prop omitted", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    expect(
      screen.queryByRole("button", { name: /mit google fortfahren/i }),
    ).not.toBeInTheDocument();
  });

  it("renders 'oder' separator above Google button", () => {
    render(
      <LoginPage
        onSuccess={onSuccess}
        google={{ clientId: "goog-123", redirectUri: "http://localhost/cb" }}
      />,
    );
    expect(screen.getByText(/^oder$/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Cross-plan: consumes the 'password-updated' flash set by ResetPasswordPage
  //
  // Per UI-SPEC §Hard Constraints #14 + Plan 06-06: ResetPasswordPage's
  // success branch calls setFlash("password-updated", "...") then redirects
  // to /auth/login. LoginPage MUST mount useNavigationFlash on render so the
  // toast appears once after the redirect.
  // -------------------------------------------------------------------------

  it("mounts useNavigationFlash('password-updated') on render (cross-plan flash consume)", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    expect(mockUseNavigationFlash).toHaveBeenCalledWith("password-updated");
  });

  // -------------------------------------------------------------------------
  // New affordances — signup + forgot-password links
  // -------------------------------------------------------------------------

  it("renders 'Noch kein Konto?' nudge with AppLink to /auth/signup labeled 'Konto erstellen'", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    expect(screen.getByText(/noch kein konto\?/i)).toBeInTheDocument();
    const signupLink = screen.getByRole("link", { name: /konto erstellen/i });
    expect(signupLink).toHaveAttribute("href", "/auth/signup");
  });

  it("renders 'Passwort vergessen?' AppLink to /auth/forgot-password", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    const link = screen.getByRole("link", { name: /passwort vergessen\?/i });
    expect(link).toHaveAttribute("href", "/auth/forgot-password");
  });

  // -------------------------------------------------------------------------
  // CLI callback — existing session (German strings)
  // -------------------------------------------------------------------------

  it("shows cli_confirm step ('CLI autorisieren') when existing session + cliCallback", async () => {
    localStorage.setItem("multica_token", "existing-jwt");
    mockApiGetMe
      .mockRejectedValueOnce(new Error("no cookie"))
      .mockResolvedValueOnce({
        id: "u-1",
        email: "user@example.com",
        name: "Test User",
      });

    render(
      <LoginPage
        onSuccess={onSuccess}
        cliCallback={{ url: "http://localhost:9876/callback", state: "abc" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("CLI autorisieren")).toBeInTheDocument();
    });
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    // Body text "CLI als <email> auf AlgoPlan zugreifen lassen?" — assert
    // the surrounding tokens render (split by the email <span>).
    expect(screen.getByText(/CLI als/i)).toBeInTheDocument();
    expect(
      screen.getByText(/auf AlgoPlan zugreifen lassen\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^autorisieren$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /anderes konto verwenden/i }),
    ).toBeInTheDocument();
  });

  it("CLI authorize button redirects to callback URL", async () => {
    localStorage.setItem("multica_token", "existing-jwt");
    mockApiGetMe
      .mockRejectedValueOnce(new Error("no cookie"))
      .mockResolvedValueOnce({
        id: "u-1",
        email: "user@example.com",
        name: "Test User",
      });
    const onTokenObtained = vi.fn();

    render(
      <LoginPage
        onSuccess={onSuccess}
        onTokenObtained={onTokenObtained}
        cliCallback={{ url: "http://localhost:9876/callback", state: "abc" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("CLI autorisieren")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^autorisieren$/i }));

    expect(onTokenObtained).toHaveBeenCalled();
    expect(window.location.href).toContain(
      "http://localhost:9876/callback?token=existing-jwt&state=abc",
    );
  });

  it("'Anderes Konto verwenden' returns to email step", async () => {
    localStorage.setItem("multica_token", "existing-jwt");
    mockApiGetMe
      .mockRejectedValueOnce(new Error("no cookie"))
      .mockResolvedValueOnce({
        id: "u-1",
        email: "user@example.com",
        name: "Test User",
      });

    render(
      <LoginPage
        onSuccess={onSuccess}
        cliCallback={{ url: "http://localhost:9876/callback", state: "abc" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("CLI autorisieren")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /anderes konto verwenden/i }),
    );

    expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // CLI callback — cookie-based session (no localStorage token)
  // -------------------------------------------------------------------------

  it("detects cookie-based session and shows cli_confirm when no localStorage token", async () => {
    mockApiGetMe.mockResolvedValueOnce({
      id: "u-1",
      email: "cookie@example.com",
      name: "Cookie User",
    });

    render(
      <LoginPage
        onSuccess={onSuccess}
        cliCallback={{ url: "http://localhost:9876/callback", state: "abc" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("CLI autorisieren")).toBeInTheDocument();
    });
    expect(screen.getByText(/cookie@example.com/)).toBeInTheDocument();
  });

  it("CLI authorize with cookie session calls issueCliToken and redirects", async () => {
    mockApiGetMe.mockResolvedValueOnce({
      id: "u-1",
      email: "cookie@example.com",
      name: "Cookie User",
    });
    mockApiIssueCliToken.mockResolvedValueOnce({ token: "fresh-jwt" });
    const onTokenObtained = vi.fn();

    render(
      <LoginPage
        onSuccess={onSuccess}
        onTokenObtained={onTokenObtained}
        cliCallback={{ url: "http://localhost:9876/callback", state: "abc" }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("CLI autorisieren")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^autorisieren$/i }));

    await waitFor(() => {
      expect(mockApiIssueCliToken).toHaveBeenCalled();
      expect(onTokenObtained).toHaveBeenCalled();
      expect(window.location.href).toContain(
        "http://localhost:9876/callback?token=fresh-jwt&state=abc",
      );
    });
  });

  // -------------------------------------------------------------------------
  // CLI callback — code verification redirects (regression)
  // -------------------------------------------------------------------------

  it("CLI code verification redirects to callback URL", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    mockApiVerifyCode.mockResolvedValueOnce({ token: "new-jwt-token" });
    const onTokenObtained = vi.fn();

    render(
      <LoginPage
        onSuccess={onSuccess}
        onTokenObtained={onTokenObtained}
        cliCallback={{ url: "http://localhost:9876/callback", state: "xyz" }}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "cli@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    const otpInput = getOTPInput();
    await user.type(otpInput, "654321");

    await waitFor(() => {
      expect(mockApiVerifyCode).toHaveBeenCalledWith(
        "cli@example.com",
        "654321",
      );
      expect(onTokenObtained).toHaveBeenCalled();
      expect(window.location.href).toContain(
        "http://localhost:9876/callback?token=new-jwt-token&state=xyz",
      );
    });

    expect(mockVerifyCode).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Logo prop override
  // -------------------------------------------------------------------------

  it("renders custom logo when provided (overrides AlgoPlanWordmark default)", () => {
    render(
      <LoginPage
        onSuccess={onSuccess}
        logo={<div data-testid="custom-logo">Logo</div>}
      />,
    );
    expect(screen.getByTestId("custom-logo")).toBeInTheDocument();
    // When override is supplied, the default AlgoPlanWordmark is NOT rendered.
    expect(screen.queryByTestId("algoplan-wordmark")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // onTokenObtained callback (regression)
  // -------------------------------------------------------------------------

  it("calls onTokenObtained after successful OTP verification", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    mockVerifyCode.mockResolvedValueOnce(undefined);
    mockApiListWorkspaces.mockResolvedValueOnce([{ id: "ws-1" }]);
    const onTokenObtained = vi.fn();

    render(
      <LoginPage
        onSuccess={onSuccess}
        onTokenObtained={onTokenObtained}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    const otpInput = getOTPInput();
    await user.type(otpInput, "123456");

    await waitFor(() => {
      expect(onTokenObtained).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Back button on code step ('Zurück')
  // -------------------------------------------------------------------------

  it("'Zurück' button returns to email step", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /code anfordern/i }));

    await waitFor(() => {
      expect(screen.getByText("Code prüfen")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^zurück$/i }));

    expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// validateCliCallback (exported helper) — regression
// ---------------------------------------------------------------------------

describe("validateCliCallback", () => {
  it("accepts http://localhost", () => {
    expect(validateCliCallback("http://localhost:9876/callback")).toBe(true);
  });

  it("accepts http://127.0.0.1", () => {
    expect(validateCliCallback("http://127.0.0.1:8080/cb")).toBe(true);
  });

  it("accepts 10.x.x.x private IPs", () => {
    expect(validateCliCallback("http://10.0.0.5:9876/callback")).toBe(true);
    expect(validateCliCallback("http://10.255.255.255:1234/cb")).toBe(true);
  });

  it("accepts 172.16-31.x.x private IPs", () => {
    expect(validateCliCallback("http://172.16.0.1:9876/callback")).toBe(true);
    expect(validateCliCallback("http://172.31.255.255:1234/cb")).toBe(true);
  });

  it("rejects 172.x outside 16-31 range", () => {
    expect(validateCliCallback("http://172.15.0.1:9876/callback")).toBe(false);
    expect(validateCliCallback("http://172.32.0.1:9876/callback")).toBe(false);
  });

  it("accepts 192.168.x.x private IPs", () => {
    expect(validateCliCallback("http://192.168.1.131:41117/callback")).toBe(true);
    expect(validateCliCallback("http://192.168.0.1:8080/cb")).toBe(true);
  });

  it("rejects https:// URLs", () => {
    expect(validateCliCallback("https://localhost:9876/callback")).toBe(false);
  });

  it("rejects public IPs and domains", () => {
    expect(validateCliCallback("http://evil.com:9876/callback")).toBe(false);
    expect(validateCliCallback("http://8.8.8.8:9876/callback")).toBe(false);
    expect(validateCliCallback("http://192.169.1.1:9876/callback")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(validateCliCallback("not-a-url")).toBe(false);
  });
});
