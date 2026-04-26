import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockApiRequestPasswordReset = vi.hoisted(() => vi.fn());
const mockNavigationPush = vi.hoisted(() => vi.fn());

vi.mock("@multica/core/api", () => ({
  api: {
    requestPasswordReset: mockApiRequestPasswordReset,
  },
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mockNavigationPush }),
  AppLink: ({ children, href, ...props }: { children: React.ReactNode; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { ForgotPasswordPage } from "./forgot-password-page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // No timers to restore — this page does NOT use a cooldown.
  });

  // -------------------------------------------------------------------------
  // Initial form rendering
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark + italic 'Passwort zurücksetzen' title + German description", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
    expect(screen.getByText("Passwort zurücksetzen")).toBeInTheDocument();
    expect(
      screen.getByText(
        /gib deine e-mail-adresse ein\. wir senden dir einen link zum zurücksetzen\./i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the email field with German label and the 'Link senden' CTA", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^link senden$/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit — in-flight label
  // -------------------------------------------------------------------------

  it("shows 'Wird gesendet…' while the request is in-flight", async () => {
    mockApiRequestPasswordReset.mockReturnValueOnce(new Promise(() => {}));
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    expect(screen.getByText(/wird gesendet…/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Idempotent success — UI replaces form regardless of email validity
  //
  // Per UI-SPEC §Hard Constraints #13 + threat T-06-W2-AUTH-02: backend
  // always returns 200 for /auth/password-reset/request, and the UI must
  // mirror that — never branch on whether the email is "real".
  // -------------------------------------------------------------------------

  it("on 200 (any email): replaces the form with the generic German success message", async () => {
    mockApiRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "real@example.com");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /wenn ein konto mit dieser e-mail existiert, haben wir einen link zum zurücksetzen gesendet\. prüfe dein postfach\./i,
        ),
      ).toBeInTheDocument();
    });

    // Form is GONE — assert by label disappearance.
    expect(screen.queryByLabelText("E-Mail")).not.toBeInTheDocument();
    // Success branch surfaces a checkmark icon.
    expect(screen.getByTestId("forgot-password-success-icon")).toBeInTheDocument();
  });

  it("renders the SAME success state for a presumably-unknown email (no enumeration)", async () => {
    // Resolve unconditionally — the backend treats unknown email exactly
    // like a known one and returns 200. The UI MUST do the same.
    mockApiRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "ghost@nobody.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /wenn ein konto mit dieser e-mail existiert, haben wir einen link zum zurücksetzen gesendet/i,
        ),
      ).toBeInTheDocument();
    });
    // No error, no "this email isn't registered" hint anywhere.
    expect(screen.queryByText(/nicht registriert/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/existiert nicht/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/unknown/i)).not.toBeInTheDocument();
  });

  it("on network error: still renders the success state (non-disclosing UX)", async () => {
    // Even if the network blew up, surfacing the same success state keeps
    // the no-enumeration contract intact for the user. (The backend's
    // contract is always-200 — anything else is a network glitch the UI
    // should not turn into an enumeration oracle.)
    mockApiRequestPasswordReset.mockRejectedValueOnce(new Error("network"));
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/wenn ein konto mit dieser e-mail existiert/i),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // API contract — body shape
  // -------------------------------------------------------------------------

  it("submits {email} to api.requestPasswordReset (no extra fields)", async () => {
    mockApiRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(mockApiRequestPasswordReset).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Back-to-login link in success state
  // -------------------------------------------------------------------------

  it("success state: 'Zurück zur Anmeldung' button navigates to /auth/login", async () => {
    mockApiRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /zurück zur anmeldung/i }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /zurück zur anmeldung/i }),
    );
    expect(mockNavigationPush).toHaveBeenCalledWith("/auth/login");
  });
});
