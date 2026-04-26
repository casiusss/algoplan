"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@multica/ui/components/ui/button";

/**
 * IssueDetailFooter — Phase 6 DTL-04 modal-footer band.
 *
 * Sticky 48px band that anchors the bottom of the LEFT pane in the issue
 * detail. Carries:
 *   - Löschen (variant="destructive") on the left — fires onDelete (caller
 *     opens the existing AlertDialog confirmation; this footer never deletes
 *     inline per UI-SPEC §Hard Constraint #10).
 *   - "Esc zum Schließen" hint on the right.
 *   - Fertig (variant="default", brand-green) on the right — only renders
 *     when `onDone` prop is defined (modal mode). In routed-page mode the
 *     button is hidden because Esc is enough.
 *
 * Position contract per UI-SPEC §Sub-Phase DTL §Modal footer:
 *   sticky bottom-0 z-10 flex h-12 items-center justify-between gap-2
 *   border-t border-border bg-card px-4
 *
 * Mobile fallback (per UI-SPEC §Sub-Phase DTL §Mobile fallback): the parent
 * IssueDetail hides this footer on mobile and keeps Delete in the
 * More-actions dropdown there. This component itself is layout-agnostic.
 */

interface IssueDetailFooterProps {
  onDelete: () => void;
  /**
   * When defined, the Fertig (Done) button renders. Modal callers pass a
   * close handler; routed-page callers omit the prop so only Esc closes.
   */
  onDone?: () => void;
  disabled?: boolean;
}

export function IssueDetailFooter({
  onDelete,
  onDone,
  disabled,
}: IssueDetailFooterProps) {
  return (
    <div
      role="contentinfo"
      className="sticky bottom-0 z-10 flex h-12 items-center justify-between gap-2 border-t border-border bg-card px-4"
    >
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="size-4" />
        Löschen
      </Button>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Esc zum Schließen</span>
        {onDone && (
          <Button
            variant="default"
            size="sm"
            onClick={onDone}
            disabled={disabled}
          >
            Fertig
          </Button>
        )}
      </div>
    </div>
  );
}
