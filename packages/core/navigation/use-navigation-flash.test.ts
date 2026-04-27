// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const toastMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import {
  setFlash,
  consumeFlash,
  useNavigationFlash,
} from "./use-navigation-flash";

beforeEach(() => {
  sessionStorage.clear();
  toastMock.mockClear();
});

describe("setFlash / consumeFlash", () => {
  it("setFlash writes to sessionStorage under a namespaced key", () => {
    setFlash("password-reset", "Passwort aktualisiert.");
    expect(sessionStorage.getItem("algoplan_flash:password-reset")).toBe(
      "Passwort aktualisiert.",
    );
  });

  it("consumeFlash returns the value AND removes the entry", () => {
    setFlash("toast-key", "hi");
    expect(consumeFlash("toast-key")).toBe("hi");
    expect(sessionStorage.getItem("algoplan_flash:toast-key")).toBeNull();
  });

  it("consumeFlash returns null when no flash is set", () => {
    expect(consumeFlash("missing-key")).toBeNull();
  });
});

describe("useNavigationFlash hook", () => {
  it("calls toast() exactly once for a non-empty stored flash", () => {
    setFlash("welcome", "Willkommen!");
    renderHook(() => useNavigationFlash("welcome"));
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith("Willkommen!");
  });

  it("does not call toast() when nothing is set", () => {
    renderHook(() => useNavigationFlash("absent"));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("idempotent: a second renderHook with the same key does NOT re-toast", () => {
    setFlash("once", "Nur einmal");
    const first = renderHook(() => useNavigationFlash("once"));
    expect(toastMock).toHaveBeenCalledTimes(1);
    first.unmount();

    // Second mount: the flash was consumed by the first, so no second toast.
    renderHook(() => useNavigationFlash("once"));
    expect(toastMock).toHaveBeenCalledTimes(1);
  });
});
