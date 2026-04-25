import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — all spies and mutable state created via vi.hoisted so vi.mock
// factories (which are hoisted to top-of-file) can safely reference them.
// ---------------------------------------------------------------------------

const { mockMutate, toastError, toastSuccess, pendingRef } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  pendingRef: { current: false },
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/issues/mutations", () => ({
  useCreateIssue: () => ({
    mutate: mockMutate,
    isPending: pendingRef.current,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: toastSuccess },
}));

// ---------------------------------------------------------------------------
// Import (after mocks)
// ---------------------------------------------------------------------------

import { InlineTaskAdd } from "./inline-task-add";

// ---------------------------------------------------------------------------
// Tests — KBN-03 inline-add contract
// ---------------------------------------------------------------------------

describe("InlineTaskAdd - KBN-03", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingRef.current = false;
  });

  it("renders input + Abbrechen + Hinzufügen buttons", () => {
    const { getByRole, getByText } = render(
      <InlineTaskAdd status="todo" onCancel={() => {}} />,
    );
    expect(getByRole("textbox")).toBeTruthy();
    expect(getByText("Abbrechen")).toBeTruthy();
    expect(getByText("Hinzufügen")).toBeTruthy();
  });

  it("Hinzufügen disabled when input empty", () => {
    const { getByText } = render(
      <InlineTaskAdd status="todo" onCancel={() => {}} />,
    );
    const submit = getByText("Hinzufügen").closest("button") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("Enter submits when input non-empty + calls useCreateIssue with status pre-filled", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineTaskAdd status="in_progress" onCancel={onCancel} />,
    );
    await user.type(getByRole("textbox"), "Neue Aufgabe");
    await user.keyboard("{Enter}");
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Neue Aufgabe",
        status: "in_progress",
        priority: "none",
      }),
      expect.any(Object),
    );
  });

  it("Esc calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineTaskAdd status="todo" onCancel={onCancel} />,
    );
    (getByRole("textbox") as HTMLInputElement).focus();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("loading state shows Loader2 spinner + disables submit", () => {
    pendingRef.current = true;
    const { getByText, container } = render(
      <InlineTaskAdd status="todo" onCancel={() => {}} />,
    );
    const submit = getByText("Hinzufügen").closest("button") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(container.querySelector("[data-loader-spinner]")).toBeTruthy();
  });

  it("Esc still works during pending (Hard Constraint 17 — Abbrechen always enabled)", async () => {
    pendingRef.current = true;
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { getByText } = render(
      <InlineTaskAdd status="todo" onCancel={onCancel} />,
    );
    const cancel = getByText("Abbrechen").closest("button") as HTMLButtonElement;
    expect(cancel.disabled).toBe(false);
    await user.click(cancel);
    expect(onCancel).toHaveBeenCalled();
  });

  it("on failure shows toast + preserves input", async () => {
    mockMutate.mockImplementation((_vars: unknown, opts: { onError?: () => void }) => {
      opts.onError?.();
    });
    const user = userEvent.setup();
    const { getByRole } = render(
      <InlineTaskAdd status="todo" onCancel={() => {}} />,
    );
    const input = getByRole("textbox") as HTMLInputElement;
    await user.type(input, "Test");
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        "Issue konnte nicht erstellt werden",
      );
    });
    expect(input.value).toBe("Test");
  });

  it("on success clears input + calls onCancel", async () => {
    mockMutate.mockImplementation((_vars: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.();
    });
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { getByRole } = render(
      <InlineTaskAdd status="todo" onCancel={onCancel} />,
    );
    const input = getByRole("textbox") as HTMLInputElement;
    await user.type(input, "Erfolg");
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it("whitespace-only input keeps submit disabled", async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = render(
      <InlineTaskAdd status="todo" onCancel={() => {}} />,
    );
    await user.type(getByRole("textbox"), "   ");
    const submit = getByText("Hinzufügen").closest("button") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});
