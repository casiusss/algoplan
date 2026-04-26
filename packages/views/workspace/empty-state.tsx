import type { ReactNode } from "react";
import { Button } from "@algoplan/ui/components/ui/button";

interface EmptyStateProps {
  /** Optional SVG / icon block above the heading. */
  illustration?: ReactNode;
  /** German display heading (e.g. "Keine Benachrichtigungen"). */
  heading: string;
  /** Optional supporting paragraph below the heading. */
  body?: string;
  /** Optional primary action — only rendered when set. */
  cta?: { label: string; onClick: () => void };
}

/**
 * Reusable empty state for inbox / agents / search / future surfaces (WS-03).
 *
 * Per UI-SPEC §Sub-Phase WS — Workspace + Agents + Error States §WS-03.
 */
export function EmptyState({
  illustration,
  heading,
  body,
  cta,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      {illustration && (
        <div data-testid="empty-state-illustration">{illustration}</div>
      )}
      <h3 className="text-base font-semibold text-foreground">{heading}</h3>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      {cta && <Button onClick={cta.onClick}>{cta.label}</Button>}
    </div>
  );
}
