import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// CreateWorkspaceForm is exercised by its own test; here we only care about
// the NewWorkspacePage shell (title / wordmark / shell strings).
vi.mock("./create-workspace-form", () => ({
  CreateWorkspaceForm: () => <div data-testid="create-workspace-form-stub" />,
}));

// useLogout calls auth.logout() — stub at the module boundary so we don't
// pull in the auth store. Same pattern as no-access-page.test.tsx.
vi.mock("../auth", async () => {
  const actual = await vi.importActual<
    typeof import("../auth")
  >("../auth");
  return {
    ...actual,
    useLogout: () => vi.fn(),
  };
});

// Stub DragStrip so the structural first-flex-child assertion can target it
// without mounting the real macOS-only `-webkit-app-region` div in jsdom.
vi.mock("../platform", () => ({
  DragStrip: () => <div data-testid="drag-strip-stub" />,
}));

import { NewWorkspacePage } from "./new-workspace-page";

function renderPage(props: Partial<React.ComponentProps<typeof NewWorkspacePage>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(
    <NewWorkspacePage onSuccess={vi.fn()} {...props} />,
    { wrapper },
  );
}

describe("NewWorkspacePage (Phase 6 AUTH restyle)", () => {
  it("renders the German title 'Willkommen bei AlgoPlan'", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Willkommen bei AlgoPlan" }),
    ).toBeInTheDocument();
  });

  it("title carries 'italic' and 'font-semibold' classes per UI-SPEC §AUTH §Pre-workspace pages", () => {
    renderPage();
    const title = screen.getByRole("heading", {
      name: "Willkommen bei AlgoPlan",
    });
    expect(title.className).toContain("italic");
    expect(title.className).toContain("font-semibold");
  });

  it("renders the AlgoPlanWordmark in the centered card region (NOT above DragStrip)", () => {
    const { container } = renderPage();
    const wordmark = container.querySelector(
      "[data-testid='algoplan-wordmark']",
    );
    expect(wordmark).not.toBeNull();
    // Wordmark must NOT be the first JSX child of the page-root flex
    // container — DragStrip is. The wordmark belongs in the centered region.
    const pageRoot = container.firstElementChild;
    expect(pageRoot).not.toBeNull();
    expect(pageRoot!.firstElementChild?.getAttribute("data-testid")).toBe(
      "drag-strip-stub",
    );
  });

  it("body explains the workspace concept in German", () => {
    renderPage();
    // Body line maps to the existing English line — copy mapping comes from
    // UI-SPEC §Copywriting AUTH NewWorkspacePage. We assert a stable phrase
    // anchor rather than the full string so minor wording tweaks don't
    // require touching this test.
    expect(
      screen.getByText(/AI-Teamkollegen|Teamkolleg/i),
    ).toBeInTheDocument();
  });

  it("invite hint reads in German", () => {
    renderPage();
    // Maps to the English "You can invite teammates once your workspace is
    // ready." — assert a stable German anchor.
    expect(screen.getByText(/Teammitglieder/i)).toBeInTheDocument();
  });

  it("Back button reads 'Zurück' (German) when onBack is provided", () => {
    renderPage({ onBack: vi.fn() });
    expect(screen.getByRole("button", { name: /Zurück/ })).toBeInTheDocument();
  });

  it("Log out button reads 'Abmelden' (German)", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /Abmelden/ }),
    ).toBeInTheDocument();
  });
});
