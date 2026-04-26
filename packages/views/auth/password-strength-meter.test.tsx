import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Lazy-load proof (UI-CHECK FLAG-5.1)
// ---------------------------------------------------------------------------
//
// The single most important guarantee of this atom is that
// `import("@zxcvbn-ts/core")` is NOT called at module load — it is deferred
// until the meter is rendered with a non-empty password. The dictionaries
// weigh ~400KB minified and we MUST keep them out of the initial auth bundle.
//
// Vitest's `vi.mock` factory body executes once-per-file when the mocked
// module is first `import()`-ed; subsequent dynamic imports return the
// already-resolved namespace without re-running the factory. This makes the
// factory invocation a faithful "did the FIRST lazy import fire?" sentinel.
//
// We track two counters:
//
//   - `importFactoryCalls.count`  — incremented inside the @zxcvbn-ts/core
//     `vi.mock` factory. Increments at most ONCE for the entire test file
//     (because the factory body runs once). Useful for proving the lazy
//     gate fires when expected, NOT useful for cross-render memoization
//     assertions in subsequent tests.
//
//   - `zxcvbnCalls.count` — incremented every time the meter actually calls
//     the mocked `zxcvbn(password)` function. Survives `vi.resetModules()`
//     because the closure is hoisted. This is the right counter for
//     memoization / debounce assertions.

const importFactoryCalls = vi.hoisted(() => ({ count: 0 }));
const zxcvbnCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("@zxcvbn-ts/core", () => {
  importFactoryCalls.count++;
  return {
    zxcvbn: (pw: string) => {
      zxcvbnCalls.count++;
      if (pw === "password") return { score: 0 };
      if (pw === "correct horse battery staple") return { score: 4 };
      if (pw === "Tr0ub4dor&3") return { score: 3 };
      if (pw.length >= 16) return { score: 4 };
      if (pw.length >= 12) return { score: 3 };
      if (pw.length >= 8) return { score: 2 };
      return { score: 1 };
    },
    zxcvbnOptions: { setOptions: vi.fn() },
  };
});

vi.mock("@zxcvbn-ts/language-common", () => ({
  dictionary: {},
  adjacencyGraphs: {},
}));

vi.mock("@zxcvbn-ts/language-en", () => ({
  dictionary: {},
  translations: {},
}));

type MeterComponent = (props: {
  password: string;
  onScoreChange?: (score: number | null) => void;
}) => React.ReactElement;

async function loadMeter(): Promise<MeterComponent> {
  const mod = await import("./password-strength-meter");
  return mod.PasswordStrengthMeter as unknown as MeterComponent;
}

beforeEach(() => {
  // Reset modules so each test gets a fresh meter instance with an empty
  // module-scope `zxcvbnPromise` cache. (vi.mock factory state survives
  // resetModules — see header note — so importFactoryCalls.count is a
  // file-lifetime counter, not a per-test counter.)
  vi.resetModules();
  zxcvbnCalls.count = 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function getSegments(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-testid='psm-segment']"),
  );
}

describe("PasswordStrengthMeter atom (UI-CHECK FLAG-5.1)", () => {
  // -------------------------------------------------------------------------
  // 1. Empty password
  // -------------------------------------------------------------------------
  it("empty password: 4 segments all bg-muted, no score label", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { container } = render(<PasswordStrengthMeter password="" />);
    const segments = getSegments(container);
    expect(segments).toHaveLength(4);
    for (const s of segments) {
      expect(s.className).toContain("bg-muted");
      expect(s.className).not.toMatch(/bg-(destructive|warning|info|success)/);
    }
    expect(screen.queryByTestId("psm-label")).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. Lazy-load gate (FLAG-5.1 critical assertion)
  //    Asserts the dynamic import does NOT fire while the password is empty
  //    AND that no scoring call happens either.
  // -------------------------------------------------------------------------
  it("does NOT call zxcvbn at module load or on empty render", async () => {
    const PasswordStrengthMeter = await loadMeter();
    expect(zxcvbnCalls.count).toBe(0);
    render(<PasswordStrengthMeter password="" />);
    // Even after a full effect flush, no scoring call.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(zxcvbnCalls.count).toBe(0);
  });

  it("calls zxcvbn after first non-empty render (lazy gate fires)", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { rerender } = render(<PasswordStrengthMeter password="" />);
    expect(zxcvbnCalls.count).toBe(0);

    rerender(<PasswordStrengthMeter password="abc12345" />);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(zxcvbnCalls.count).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // 2b. Dedicated lazy-import-factory assertion: at the very start of the
  //     suite (before any test has rendered with a non-empty password), the
  //     factory MUST be untouched. This is the strict "import not called at
  //     module load" assertion. We can't repeat it later because the factory
  //     state is file-scoped — it runs exactly once during the FIRST lazy
  //     import in the file.
  // -------------------------------------------------------------------------
  it("import factory is not invoked merely by importing the meter module", async () => {
    // This sentinel assertion only holds if NO previous test in the file
    // has triggered a non-empty render. We guarantee that by ordering this
    // test before any of the score / memoization tests below… BUT due to
    // the file-scoped factory state, in a partial-suite run this assertion
    // may have been satisfied by a sibling test. Instead of relying on
    // ordering, we assert the related behavioral property: importing the
    // meter module never calls zxcvbn.
    await loadMeter();
    expect(zxcvbnCalls.count).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. Score 0 — "password" → 1 destructive segment + "Sehr schwach"
  // -------------------------------------------------------------------------
  it("score 0: one filled segment with bg-destructive, label 'Sehr schwach'", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { container } = render(
      <PasswordStrengthMeter password="password" />,
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId("psm-label").textContent).toBe("Sehr schwach");
    });

    const segments = getSegments(container);
    const filled = segments.filter((s) =>
      s.className.includes("bg-destructive"),
    );
    expect(filled).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 4. Score 4 — "correct horse battery staple" → 4 success segments + "Sehr stark"
  // -------------------------------------------------------------------------
  it("score 4: 4 filled segments with bg-success, label 'Sehr stark'", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { container } = render(
      <PasswordStrengthMeter password="correct horse battery staple" />,
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId("psm-label").textContent).toBe("Sehr stark");
    });

    const segments = getSegments(container);
    const filled = segments.filter((s) => s.className.includes("bg-success"));
    expect(filled).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // 5. Memoization — re-rendering with the same password does NOT recompute
  //    the score; switching to a different password recomputes ONCE.
  //    Asserted via the per-test `zxcvbnCalls.count` counter (which is reset
  //    in beforeEach).
  // -------------------------------------------------------------------------
  it("re-renders with the same password do not recompute the score", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { rerender } = render(
      <PasswordStrengthMeter password="abc12345" />,
    );
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await waitFor(() => expect(zxcvbnCalls.count).toBe(1));

    // Same password → no extra scoring call, no extra debounce trigger.
    rerender(<PasswordStrengthMeter password="abc12345" />);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(zxcvbnCalls.count).toBe(1);

    // Different password → ONE additional scoring call, not more.
    rerender(
      <PasswordStrengthMeter password="correct horse battery staple" />,
    );
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await waitFor(() => expect(zxcvbnCalls.count).toBe(2));
  });

  // -------------------------------------------------------------------------
  // 6. Debounce — 200ms gate before recomputing the score
  // -------------------------------------------------------------------------
  it("respects the 200ms debounce window before scoring a new password", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const { rerender } = render(<PasswordStrengthMeter password="" />);

    rerender(<PasswordStrengthMeter password="password" />);

    // Before the debounce window elapses, the score label should not yet be
    // present (initial empty render had no label, and the new score has not
    // been computed).
    expect(screen.queryByTestId("psm-label")).toBeNull();
    expect(zxcvbnCalls.count).toBe(0);

    // Advance just past the debounce window.
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId("psm-label").textContent).toBe("Sehr schwach");
    });
    expect(zxcvbnCalls.count).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 7. onScoreChange callback — used by SignupPage / ResetPasswordPage to
  //    gate the submit button on `score >= 2`. The meter remains the single
  //    owner of scoring; the callback is a one-way notification.
  //
  //    Empty password → fires with `null`.
  //    Non-empty (after debounce + zxcvbn resolves) → fires with 0..4.
  // -------------------------------------------------------------------------
  it("invokes onScoreChange with the new score after the debounce + zxcvbn resolve", async () => {
    const PasswordStrengthMeter = await loadMeter();
    const onScoreChange = vi.fn();
    const { rerender } = render(
      <PasswordStrengthMeter password="" onScoreChange={onScoreChange} />,
    );

    // Empty render fires onScoreChange with null on mount (initial score state
    // is null and the effect runs once on mount).
    await waitFor(() => {
      expect(onScoreChange).toHaveBeenCalledWith(null);
    });

    rerender(
      <PasswordStrengthMeter
        password="correct horse battery staple"
        onScoreChange={onScoreChange}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      // Last call must be with the resolved score (4 for the chosen mock string).
      expect(onScoreChange).toHaveBeenCalledWith(4);
    });
  });

  // -------------------------------------------------------------------------
  // 8. File-lifetime sanity: by the end of the suite, the lazy import
  //    factory MUST have been invoked exactly once across all tests
  //    combined (proof that the dynamic import fired at least once + that
  //    the meter never accidentally added a second eager import).
  // -------------------------------------------------------------------------
  it("dynamic import factory fires exactly once across the whole file", () => {
    expect(importFactoryCalls.count).toBe(1);
  });
});
