"use client";

import { useEffect } from "react";

/**
 * Global keydown listener with input-focus + modifier-key guards
 * (UI-SPEC §Hard Constraints #5).
 *
 * The handler fires only when ALL of the following hold:
 *   - `e.key` matches `key` (case-insensitive)
 *   - no modifier key (Cmd / Ctrl / Alt) is held — protects browser shortcuts
 *     such as Cmd+E and prevents accidental capture
 *   - no `<input>`, `<textarea>`, or `[contenteditable=true]` element holds
 *     the focus — prevents firing while the user is typing
 *
 * The listener is attached to `window` and removed on unmount.
 */
export function useInboxShortcut(key: string, handler: () => void): void {
  useEffect(() => {
    const target = key.toLowerCase();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== target) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const active = document.activeElement;
      if (active) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (active.getAttribute("contenteditable") === "true") return;
      }

      handler();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [key, handler]);
}
