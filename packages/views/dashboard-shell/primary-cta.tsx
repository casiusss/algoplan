"use client";

import { Button } from "@algoplan/ui/components/ui/button";
import { useModalStore } from "@algoplan/core/modals";

/**
 * Topbar primary CTA — opens the existing "Create issue" modal via the same
 * handler the sidebar `New Issue` button and the global `C` shortcut use.
 *
 * UI-SPEC §12: label is the literal string "+ New issue" (the `+` is a
 * character, not a Plus icon — keeps the button compact).
 */
export function PrimaryCTA() {
  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => useModalStore.getState().open("create-issue")}
    >
      + New issue
    </Button>
  );
}
