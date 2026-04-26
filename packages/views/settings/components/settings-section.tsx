import type { ReactNode } from "react";
import { cn } from "@multica/ui/lib/utils";

interface SettingsSectionProps {
  /** Italic display heading shown above the body (German source-of-truth in Phase 6). */
  heading: string;
  /**
   * Visual tone:
   * - `default` — neutral card body.
   * - `danger` — adds a `border-destructive/30` ring and a destructive heading dot.
   *   Used by Gefahrenzone (Workspace tab leave/delete section).
   */
  tone?: "default" | "danger";
  children: ReactNode;
  /** Anchor id used by the Settings sidebar [Gefahrenzone] quick-jump scroll target. */
  id?: string;
  className?: string;
}

/**
 * Sectioned wrapper for Settings tabs (SET-01). Italic display heading +
 * card body. The `tone="danger"` variant adds a soft destructive ring +
 * leading dot — visual signal without shouting.
 *
 * Per UI-SPEC §SettingsSection atom + §Sub-Phase SET — Settings.
 */
export function SettingsSection({
  heading,
  tone = "default",
  children,
  id,
  className,
}: SettingsSectionProps) {
  const isDanger = tone === "danger";
  return (
    <section id={id} className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        {isDanger && (
          <span
            aria-hidden
            data-testid="settings-section-dot"
            className="size-1.5 rounded-full bg-destructive"
          />
        )}
        <h3 className="text-sm italic font-semibold">{heading}</h3>
      </div>
      <div
        data-testid="settings-section-body"
        className={cn(
          "rounded-lg border bg-card p-4",
          isDanger && "border-destructive/30",
        )}
      >
        {children}
      </div>
    </section>
  );
}
