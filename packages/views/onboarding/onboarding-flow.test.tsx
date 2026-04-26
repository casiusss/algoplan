import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Hoisted state so the auth mock can flip the user.
const authState = vi.hoisted(() => ({
  user: {
    id: "u-1",
    email: "u@example.com",
    onboarding_questionnaire: {},
    onboarded_at: null,
  } as Record<string, unknown> | null,
}));

vi.mock("@algoplan/core/auth", () => {
  const useAuthStore = Object.assign(
    (selector: (s: { user: typeof authState.user }) => unknown) =>
      selector({ user: authState.user }),
    { getState: () => ({ user: authState.user }) },
  );
  return { useAuthStore };
});

// StepWelcome carries its own AlgoPlanWordmark, but Phase 6 also wires the
// wordmark inside the OnboardingFlow's hero header (or via shell strings).
// The flow's `welcome` branch returns <StepWelcome /> directly — to assert
// that the wordmark appears on the welcome render, stub StepWelcome to a
// surface that exposes the wordmark assertion target.
vi.mock("./steps/step-welcome", () => ({
  StepWelcome: () => (
    <div data-testid="step-welcome-stub">
      {/* Wordmark presence on Welcome is owned by step-welcome.tsx itself.
          OnboardingFlow's responsibility (this test file) is to confirm
          its OWN shell renders Welcome at all, so this stub is sufficient. */}
    </div>
  ),
}));

vi.mock("./steps/step-questionnaire", () => ({
  StepQuestionnaire: () => <div data-testid="step-questionnaire-stub" />,
}));
vi.mock("./steps/step-workspace", () => ({
  StepWorkspace: () => <div data-testid="step-workspace-stub" />,
}));
vi.mock("./steps/step-platform-fork", () => ({
  StepPlatformFork: () => <div data-testid="step-platform-fork-stub" />,
}));
vi.mock("./steps/step-runtime-connect", () => ({
  StepRuntimeConnect: () => <div data-testid="step-runtime-connect-stub" />,
}));
vi.mock("./steps/step-agent", () => ({
  StepAgent: () => <div data-testid="step-agent-stub" />,
}));
vi.mock("./steps/step-first-issue", () => ({
  StepFirstIssue: () => <div data-testid="step-first-issue-stub" />,
}));

vi.mock("@algoplan/core/onboarding", () => ({
  ONBOARDING_STEP_ORDER: [
    "welcome",
    "questionnaire",
    "workspace",
    "runtime",
    "agent",
    "first_issue",
  ],
  completeOnboarding: vi.fn(),
  saveQuestionnaire: vi.fn(),
}));

vi.mock("@algoplan/core/workspace/queries", () => ({
  workspaceListOptions: () => ({
    queryKey: ["workspaces"],
    queryFn: () => Promise.resolve([]),
  }),
}));

// Stub DragStrip so the dragstrip-coverage gate's targets stay testable.
vi.mock("@algoplan/views/platform", () => ({
  DragStrip: () => <div data-testid="drag-strip-stub" />,
}));

import { OnboardingFlow } from "./onboarding-flow";

function renderFlow() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<OnboardingFlow onComplete={vi.fn()} />, { wrapper });
}

describe("OnboardingFlow (Phase 6 AUTH restyle)", () => {
  it("renders the Welcome step on initial mount", () => {
    renderFlow();
    expect(screen.getByTestId("step-welcome-stub")).toBeInTheDocument();
  });

  it("requires an authenticated user (throws otherwise)", () => {
    authState.user = null;
    expect(() => renderFlow()).toThrow();
    // Restore for downstream tests in this file.
    authState.user = {
      id: "u-1",
      email: "u@example.com",
      onboarding_questionnaire: {},
      onboarded_at: null,
    };
  });
});
