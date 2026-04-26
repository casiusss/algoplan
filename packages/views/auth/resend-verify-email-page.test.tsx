import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockApiResendVerifyEmail = vi.hoisted(() => vi.fn());
const mockNavigationPush = vi.hoisted(() => vi.fn());

vi.mock("@multica/core/api", () => ({
  api: {
    resendVerifyEmail: mockApiResendVerifyEmail,
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

import { ResendVerifyEmailPage } from "./resend-verify-email-page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ResendVerifyEmailPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Initial form rendering
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark + italic 'Bestätigungslink erneut senden' title + German description", () => {
    render(<ResendVerifyEmailPage />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
    expect(
      screen.getByText("Bestätigungslink erneut senden"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /gib deine e-mail-adresse ein\. wir senden einen neuen bestätigungslink\./i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the email field with German label and the 'Link senden' CTA", () => {
    render(<ResendVerifyEmailPage />);
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^link senden$/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Submit — in-flight label
  // -------------------------------------------------------------------------

  it("shows 'Wird gesendet…' while the request is in-flight", async () => {
    mockApiResendVerifyEmail.mockReturnValueOnce(new Promise(() => {}));
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    expect(screen.getByText(/wird gesendet…/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Idempotent success (no enumeration)
  // -------------------------------------------------------------------------

  it("on 200: replaces form with the generic German success message", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /wenn ein konto mit dieser e-mail existiert und noch nicht bestätigt ist, haben wir einen neuen link gesendet\./i,
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("E-Mail")).not.toBeInTheDocument();
  });

  it("renders the SAME success state for any email (no enumeration)", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "ghost@nobody.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /wenn ein konto mit dieser e-mail existiert und noch nicht bestätigt ist/i,
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/nicht registriert/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/existiert nicht/i)).not.toBeInTheDocument();
  });

  it("on network error: still renders the success state (non-disclosing UX)", async () => {
    mockApiResendVerifyEmail.mockRejectedValueOnce(new Error("network"));
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/wenn ein konto mit dieser e-mail existiert und noch nicht bestätigt ist/i),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // API contract — body shape
  // -------------------------------------------------------------------------

  it("submits {email} to api.resendVerifyEmail (no extra fields)", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "test@example.com");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(mockApiResendVerifyEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });
  });

  // -------------------------------------------------------------------------
  // 60s client-side cooldown
  //
  // After a successful submit the success state shows a "Erneut senden"
  // affordance. Backend already enforces 60s/email server-side per Phase 5.1;
  // the client-side cooldown protects against rapid double-clicks.
  // -------------------------------------------------------------------------

  it("after success, the 'Erneut senden' button is disabled with countdown text for 60s", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    // Wait for success branch
    await waitFor(() => {
      expect(
        screen.getByText(/wenn ein konto mit dieser e-mail existiert/i),
      ).toBeInTheDocument();
    });

    // Initial cooldown label
    const resendBtn = screen.getByRole("button", {
      name: /erneut senden in 60s/i,
    });
    expect(resendBtn).toBeDisabled();
  });

  it("after 60s the resend button re-enables and reads 'Erneut senden'", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /erneut senden in 60s/i }),
      ).toBeInTheDocument();
    });

    // Tick the cooldown one second at a time so React processes the
    // setCooldown state updates between ticks (mirrors the LoginPage
    // resend-cooldown test pattern).
    for (let i = 0; i < 61; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^erneut senden$/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /^erneut senden$/i }),
    ).not.toBeDisabled();
  });

  it("clicking the re-enabled 'Erneut senden' fires another api.resendVerifyEmail and resets the cooldown", async () => {
    mockApiResendVerifyEmail.mockResolvedValue(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(screen.getByLabelText("E-Mail"), "x@y.test");
    await user.click(screen.getByRole("button", { name: /^link senden$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /erneut senden in 60s/i }),
      ).toBeInTheDocument();
    });

    expect(mockApiResendVerifyEmail).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 61; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
    }

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^erneut senden$/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^erneut senden$/i }));

    expect(mockApiResendVerifyEmail).toHaveBeenCalledTimes(2);
    // Cooldown resets after the second send.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /erneut senden in 60s/i }),
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Back-to-login link in success state
  // -------------------------------------------------------------------------

  it("success state: 'Zurück zur Anmeldung' button navigates to /auth/login", async () => {
    mockApiResendVerifyEmail.mockResolvedValueOnce(undefined);
    render(<ResendVerifyEmailPage />);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
