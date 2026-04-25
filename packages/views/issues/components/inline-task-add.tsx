"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@multica/ui/components/ui/button";
import { useCreateIssue } from "@multica/core/issues/mutations";
import type { IssueStatus } from "@multica/core/types";

export interface InlineTaskAddProps {
  status: IssueStatus;
  onCancel: () => void;
  autoFocus?: boolean;
}

/**
 * KBN-03 — inline "+ Aufgabe hinzufügen" row mounted per board column / per
 * list-view status panel. Calls `useCreateIssue` (optimistic via cache helper)
 * with the column's status pre-filled. Enter submits, Esc always cancels even
 * during a pending mutation (Hard Constraint 17).
 *
 * Workspace context is supplied by `useCreateIssue` itself (it reads
 * `useWorkspaceId()` from the surrounding `WorkspaceIdProvider`); we only
 * forward the user-visible fields. Do not duplicate `workspace_id` here — see
 * mutations.ts:101-123 for the contract (Hard Constraint B7).
 */
export function InlineTaskAdd({
  status,
  onCancel,
  autoFocus = true,
}: InlineTaskAddProps) {
  const [title, setTitle] = useState("");
  const createIssue = useCreateIssue();
  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !createIssue.isPending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    createIssue.mutate(
      { title: trimmed, status, priority: "none" },
      {
        onSuccess: () => {
          setTitle("");
          onCancel();
        },
        onError: () =>
          toast.error("Issue konnte nicht erstellt werden"),
      },
    );
  }, [canSubmit, createIssue, trimmed, status, onCancel]);

  return (
    <div className="rounded-lg border bg-card p-2 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Aufgabentitel eingeben…"
        aria-label="Aufgabentitel eingeben"
        autoFocus={autoFocus}
        disabled={createIssue.isPending}
        className="w-full text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground"
      />
      <span className="sr-only">
        Drücke Enter zum Speichern, Esc zum Abbrechen
      </span>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {createIssue.isPending && (
            <Loader2
              data-loader-spinner
              className="size-3 animate-spin"
            />
          )}
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}
