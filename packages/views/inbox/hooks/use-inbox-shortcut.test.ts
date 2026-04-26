import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useInboxShortcut } from "./use-inbox-shortcut";

afterEach(() => {
  cleanup();
  // Reset focus to body so guards reset between tests.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

function dispatchKey(key: string, init: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

describe("useInboxShortcut — fires", () => {
  it("fires the handler when lowercase 'e' is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("fires the handler when uppercase 'E' is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("E");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("useInboxShortcut — input-focus guards", () => {
  it("does NOT fire when an <input> has focus", () => {
    const handler = vi.fn();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e");
    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });

  it("does NOT fire when a <textarea> has focus", () => {
    const handler = vi.fn();
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e");
    expect(handler).not.toHaveBeenCalled();
    ta.remove();
  });

  it("does NOT fire when a [contenteditable=true] element has focus", () => {
    const handler = vi.fn();
    const el = document.createElement("div");
    el.setAttribute("contenteditable", "true");
    el.tabIndex = 0;
    document.body.appendChild(el);
    el.focus();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e");
    expect(handler).not.toHaveBeenCalled();
    el.remove();
  });
});

describe("useInboxShortcut — modifier-key guards", () => {
  it("does NOT fire on Cmd+E (metaKey)", () => {
    const handler = vi.fn();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e", { metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does NOT fire on Ctrl+E (ctrlKey)", () => {
    const handler = vi.fn();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e", { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does NOT fire on Alt+E (altKey)", () => {
    const handler = vi.fn();
    renderHook(() => useInboxShortcut("e", handler));
    dispatchKey("e", { altKey: true });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("useInboxShortcut — cleanup", () => {
  it("removes the keydown listener on unmount (no leak)", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useInboxShortcut("e", handler));
    unmount();
    dispatchKey("e");
    expect(handler).not.toHaveBeenCalled();
  });
});
