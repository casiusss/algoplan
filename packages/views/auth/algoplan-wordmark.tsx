import { cn } from "@algoplan/ui/lib/utils";

interface AlgoPlanWordmarkProps {
  /**
   * `default` — sidebar / chrome size (matches Phase 4 wordmark): 16px text,
   * `size-1` brand dot, upright.
   * `lg` — auth-page display size: 24px italic text, `size-2` brand dot.
   *
   * The italic axis is reserved for `lg` per Phase 6 AUTH-01: auth display
   * titles use italic Inter Semibold; sidebar wordmark stays upright per
   * Phase 4 D-12.
   */
  size?: "default" | "lg";
  className?: string;
}

/**
 * AlgoPlan brand wordmark — composed atom for headers + auth pages.
 *
 * Composition: `<span class="size-X rounded-full bg-brand" /> <span>AlgoPlan</span>`
 * within a flex row. `default` is the chrome variant; `lg` is the
 * auth-page display variant. Phase 6 introduces the lg italic variant
 * for auth display only — see UI-SPEC §AlgoPlanWordmark atom.
 */
export function AlgoPlanWordmark({
  size = "default",
  className,
}: AlgoPlanWordmarkProps) {
  const isLg = size === "lg";
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      data-testid="algoplan-wordmark"
    >
      <span
        aria-hidden
        data-testid="algoplan-dot"
        className={cn(
          "rounded-full bg-brand",
          isLg ? "size-2" : "size-1",
        )}
      />
      <span
        data-testid="algoplan-text"
        className={cn(
          "font-semibold leading-none",
          isLg ? "text-2xl italic" : "text-base not-italic",
        )}
      >
        AlgoPlan
      </span>
    </span>
  );
}
