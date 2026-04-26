import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockApiSignup = vi.hoisted(() => vi.fn());
const mockNavigationPush = vi.hoisted(() => vi.fn());

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

vi.mock("@multica/core/api", () => ({
  api: {
    signup: mockApiSignup,
  },
  ApiError: ApiErrorMock,
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mockNavigationPush }),
  AppLink: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the PasswordStrengthMeter so we control the score gate deterministically.
// The mocked component invokes `onScoreChange` synchronously based on password
// length: < 12 → score 1, >= 12 → score 3 (passes the >= 2 gate).
vi.mock("./password-strength-meter", () => ({
  PasswordStrengthMeter: ({
    password,
    onScoreChange,
  }: {
    password: string;
    onScoreChange?: (score: number | null) => void;
  }) => {
    const score = password.length === 0 ? null : password.length >= 12 ? 3 : 1;
    // Effect-like: fire on every render so the component sees the latest score.
    // We do this synchronously inside the body so the assertion can settle in
    // the same test tick.
    if (onScoreChange) {
      // Use Promise.resolve so the parent state update lands in a microtask
      // (mirrors how a real useEffect would fire after render).
      Promise.resolve().then(() => onScoreChange(score));
    }
    return <div data-testid="password-strength-meter" data-score={score} />;
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { SignupPage } from "./signup-page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial rendering — wordmark, title, fields, CTA, login nudge
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark size='lg' + italic 'Konto erstellen' title + German description", () => {
    render(<SignupPage />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
    // Two "Konto erstellen" strings render: the title and the submit button.
    // Both are valid hits — the assertion is that the title text exists.
    expect(screen.getAllByText("Konto erstellen").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/erstelle dein algoplan-konto in einer minute\./i),
    ).toBeInTheDocument();
  });

  it("renders Name + E-Mail + Passwort fields with German labels", () => {
    render(<SignupPage />);
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^passwort$/i)).toBeInTheDocument();
  });

  it("renders the PasswordStrengthMeter under the password field", () => {
    render(<SignupPage />);
    expect(screen.getByTestId("password-strength-meter")).toBeInTheDocument();
  });

  it("submit button label is 'Konto erstellen'", () => {
    render(<SignupPage />);
    expect(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    ).toBeInTheDocument();
  });

  it("renders the 'Bereits ein Konto?' nudge with AppLink to /auth/login labeled 'Anmelden'", () => {
    render(<SignupPage />);
    expect(screen.getByText(/bereits ein konto\?/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /^anmelden$/i });
    expect(link).toHaveAttribute("href", "/auth/login");
  });

  // -------------------------------------------------------------------------
  // Submit gating — name + email + password ≥ 12 + score ≥ 2
  // -------------------------------------------------------------------------

  it("submit disabled when all fields empty", () => {
    render(<SignupPage />);
    expect(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    ).toBeDisabled();
  });

  it("submit disabled when name is empty (email + strong password set)", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^e-mail$/i), "user@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    // Wait for the meter's onScoreChange microtask to flush.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).toBeDisabled();
    });
  });

  it("submit disabled when email is invalid (e.g. 'foo')", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "foo");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).toBeDisabled();
    });
  });

  it("submit disabled when password length < 12 (score < 2)", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "user@example.com");
    // Mocked meter: password length < 12 → score 1 (fails gate).
    await user.type(screen.getByLabelText(/^passwort$/i), "short-pw");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).toBeDisabled();
    });
  });

  it("submit ENABLED when name + valid email + password length ≥ 12 + score ≥ 2", async () => {
    render(<SignupPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^name$/i), "Erika Mustermann");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Submit handler — 200 navigates to /onboarding
  // -------------------------------------------------------------------------

  it("on 200: calls api.signup with {name, email, password} and navigates to /onboarding", async () => {
    mockApiSignup.mockResolvedValueOnce({
      token: "tok",
      user: { id: "u-1", email: "erika@example.com" },
    });
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika Mustermann");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    await waitFor(() => {
      expect(mockApiSignup).toHaveBeenCalledWith({
        name: "Erika Mustermann",
        email: "erika@example.com",
        password: "supersecret-12-bytes",
      });
      expect(mockNavigationPush).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("shows 'Wird erstellt…' while the request is in-flight", async () => {
    mockApiSignup.mockReturnValueOnce(new Promise(() => {}));
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    expect(screen.getByText(/wird erstellt…/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit handler — error mapping
  //
  // Per UI-SPEC §Hard Constraints #13: 409 IS the one legitimate distinguishing
  // error (the user opted to create an account). 401/403/5xx surface as
  // collapsed German messages with no sub-reason.
  // -------------------------------------------------------------------------

  it("on 409: shows 'Diese E-Mail ist bereits registriert.'", async () => {
    mockApiSignup.mockRejectedValueOnce(
      new ApiErrorMock("email taken", 409, "Conflict"),
    );
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "taken@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Diese E-Mail ist bereits registriert."),
      ).toBeInTheDocument();
    });
    // The component MUST NOT have leaked the backend's discriminating text.
    expect(screen.queryByText(/email taken/i)).not.toBeInTheDocument();
  });

  it("on 400: shows 'Passwort entspricht nicht den Mindestanforderungen.'", async () => {
    mockApiSignup.mockRejectedValueOnce(
      new ApiErrorMock("weak password", 400, "Bad Request"),
    );
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /passwort entspricht nicht den mindestanforderungen\./i,
        ),
      ).toBeInTheDocument();
    });
  });

  it("on 403: shows 'Registrierung ist derzeit nicht verfügbar.'", async () => {
    mockApiSignup.mockRejectedValueOnce(
      new ApiErrorMock("signup gated", 403, "Forbidden"),
    );
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/registrierung ist derzeit nicht verfügbar\./i),
      ).toBeInTheDocument();
    });
  });

  it("on 5xx: shows generic German error", async () => {
    mockApiSignup.mockRejectedValueOnce(
      new ApiErrorMock("server error", 500, "Internal Server Error"),
    );
    render(<SignupPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/^name$/i), "Erika");
    await user.type(screen.getByLabelText(/^e-mail$/i), "erika@example.com");
    await user.type(
      screen.getByLabelText(/^passwort$/i),
      "supersecret-12-bytes",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^konto erstellen$/i }),
      ).not.toBeDisabled();
    });
    await user.click(
      screen.getByRole("button", { name: /^konto erstellen$/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /konto konnte nicht erstellt werden\. bitte versuche es erneut\./i,
        ),
      ).toBeInTheDocument();
    });
  });
});
