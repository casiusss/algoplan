import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockApiVerifyEmail = vi.hoisted(() => vi.fn());
const mockNavigationPush = vi.hoisted(() => vi.fn());

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
    verifyEmail: mockApiVerifyEmail,
  },
  ApiError: ApiErrorMock,
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mockNavigationPush }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { VerifyEmailPage } from "./verify-email-page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // No-token branch (token=undefined): renders 'Ungültiger Link' + CTA
  // → /auth/verify-email-resend; api.verifyEmail is NOT called.
  // -------------------------------------------------------------------------

  it("no-token branch: renders 'Ungültiger Link' title + CTA + does NOT call api.verifyEmail", () => {
    render(<VerifyEmailPage token={undefined} />);
    expect(screen.getByText("Ungültiger Link")).toBeInTheDocument();
    expect(
      screen.getByText(
        /dieser bestätigungslink ist unvollständig\. fordere einen neuen link an\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    ).toBeInTheDocument();
    expect(mockApiVerifyEmail).not.toHaveBeenCalled();
  });

  it("no-token branch: CTA navigates to /auth/verify-email-resend", async () => {
    render(<VerifyEmailPage token={undefined} />);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    );
    expect(mockNavigationPush).toHaveBeenCalledWith(
      "/auth/verify-email-resend",
    );
  });

  it("no-token branch: also handles token=null (parity with undefined)", () => {
    render(<VerifyEmailPage token={null} />);
    expect(screen.getByText("Ungültiger Link")).toBeInTheDocument();
    expect(mockApiVerifyEmail).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // In-flight branch: title 'E-Mail wird bestätigt…' + spinner
  // -------------------------------------------------------------------------

  it("in-flight branch: title 'E-Mail wird bestätigt…' + spinner element", () => {
    // Never resolves — stay in-flight forever for the assertion.
    mockApiVerifyEmail.mockReturnValueOnce(new Promise(() => {}));
    render(<VerifyEmailPage token="abc123" />);
    expect(screen.getByText(/e-mail wird bestätigt…/i)).toBeInTheDocument();
    expect(screen.getByTestId("verify-email-spinner")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Success branch (200): title 'E-Mail bestätigt' + checkmark + CTA → root
  // -------------------------------------------------------------------------

  it("success branch (200): renders 'E-Mail bestätigt' + checkmark + CTA navigates to root", async () => {
    mockApiVerifyEmail.mockResolvedValueOnce({
      id: "u-1",
      email: "x@y.test",
    });
    render(<VerifyEmailPage token="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("E-Mail bestätigt")).toBeInTheDocument();
    });
    expect(screen.getByText(/du kannst jetzt loslegen\./i)).toBeInTheDocument();
    expect(
      screen.getByTestId("verify-email-success-icon"),
    ).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: /weiter zu algoplan/i });
    const user = userEvent.setup();
    await user.click(cta);
    expect(mockNavigationPush).toHaveBeenCalledWith("/");
  });

  // -------------------------------------------------------------------------
  // Failure branch (401): title 'Bestätigung fehlgeschlagen' + X +
  // single 401 message (no enumeration) + CTA → /auth/verify-email-resend
  // -------------------------------------------------------------------------

  it("failure branch (401): renders 'Bestätigung fehlgeschlagen' + X icon + single message", async () => {
    mockApiVerifyEmail.mockRejectedValueOnce(
      new ApiErrorMock("token reused or expired", 401, "Unauthorized"),
    );
    render(<VerifyEmailPage token="bad-token" />);

    await waitFor(() => {
      expect(screen.getByText("Bestätigung fehlgeschlagen")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        /dieser link ist abgelaufen oder wurde bereits verwendet\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("verify-email-failure-icon"),
    ).toBeInTheDocument();
    // The component MUST NOT have leaked the backend's discriminating text
    // (per UI-SPEC §Hard Constraints #13).
    expect(
      screen.queryByText(/token reused or expired/i),
    ).not.toBeInTheDocument();
  });

  it("failure branch (401): CTA navigates to /auth/verify-email-resend", async () => {
    mockApiVerifyEmail.mockRejectedValueOnce(
      new ApiErrorMock("invalid", 401, "Unauthorized"),
    );
    render(<VerifyEmailPage token="bad-token" />);

    await waitFor(() => {
      expect(screen.getByText("Bestätigung fehlgeschlagen")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /neuen link anfordern/i }),
    );
    expect(mockNavigationPush).toHaveBeenCalledWith(
      "/auth/verify-email-resend",
    );
  });

  it("failure branch: any non-success rejection lands here (e.g. network error)", async () => {
    mockApiVerifyEmail.mockRejectedValueOnce(new Error("network glitch"));
    render(<VerifyEmailPage token="any-token" />);

    await waitFor(() => {
      expect(screen.getByText("Bestätigung fehlgeschlagen")).toBeInTheDocument();
    });
    // No "network glitch" string leaks — the failure message is constant.
    expect(screen.queryByText(/network glitch/i)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // One-shot ref-guard: api.verifyEmail is fired EXACTLY ONCE on mount,
  // even when React 18 StrictMode mounts the component twice.
  //
  // Per UI-SPEC §Hard Constraints #15. Backend single-use enforcement is the
  // actual safeguard, but the UI guard avoids the user seeing a confusing
  // "already used" failure on a legit first click.
  // -------------------------------------------------------------------------

  it("strict-mode double-mount: api.verifyEmail is called EXACTLY ONCE", async () => {
    mockApiVerifyEmail.mockResolvedValueOnce({
      id: "u-1",
      email: "x@y.test",
    });

    render(
      <StrictMode>
        <VerifyEmailPage token="strict-token" />
      </StrictMode>,
    );

    // Wait for any dispatched effects + microtasks to settle.
    await waitFor(() => {
      expect(screen.getByText("E-Mail bestätigt")).toBeInTheDocument();
    });

    // The critical assertion — even StrictMode's deliberate double-mount
    // resulted in EXACTLY ONE network call (ref-guard worked).
    expect(mockApiVerifyEmail).toHaveBeenCalledTimes(1);
    expect(mockApiVerifyEmail).toHaveBeenCalledWith({ token: "strict-token" });
  });

  // -------------------------------------------------------------------------
  // NOT polling — per UI-SPEC §Hard Constraints #15. The component must not
  // register any retry timer; verifyEmail fires exactly ONCE per mount.
  // We prove this structurally by reading the component source: it must not
  // contain `setInterval` or `setTimeout` (testing-library's waitFor uses
  // setInterval internally so a runtime spy would false-positive).
  // -------------------------------------------------------------------------

  it("source contains no setInterval/setTimeout (no polling/retry)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(__dirname, "verify-email-page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/\bsetInterval\b/);
    expect(src).not.toMatch(/\bsetTimeout\b/);
  });

  // -------------------------------------------------------------------------
  // AlgoPlanWordmark always renders (consistent header across all 4 branches)
  // -------------------------------------------------------------------------

  it("renders AlgoPlanWordmark in every branch", () => {
    const { rerender } = render(<VerifyEmailPage token={undefined} />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();

    mockApiVerifyEmail.mockReturnValueOnce(new Promise(() => {}));
    rerender(<VerifyEmailPage token="abc" />);
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
  });
});
