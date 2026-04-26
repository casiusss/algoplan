"use client";

import { useEffect, useState } from "react";
import { cn } from "@multica/ui/lib/utils";

interface PasswordStrengthMeterProps {
  password: string;
}

// ---------------------------------------------------------------------------
// Lazy-loaded zxcvbn core (UI-CHECK FLAG-5.1)
// ---------------------------------------------------------------------------
//
// The zxcvbn dictionaries weigh ~400KB minified. We MUST keep them out of
// the auth-page bundle until the user actually starts typing a password.
// Strategy:
//   - A module-scope promise factory caches the lazy-loaded core after the
//     first call, so all subsequent renders/components share one network
//     request and one parse.
//   - The promise is created on first non-empty render, never at module
//     load time. Test-side proof: `password-strength-meter.test.tsx` spies
//     on the dynamic import and asserts it's NOT called for an empty
//     password and IS called once after the first non-empty render.
//
// `setOptions` is called once when the modules resolve; it mutates a
// singleton inside @zxcvbn-ts/core, so subsequent re-renders that reuse
// the cached `zxcvbn` function reuse the configured options for free.

type ZxcvbnFn = (password: string) => { score: 0 | 1 | 2 | 3 | 4 };

let zxcvbnPromise: Promise<ZxcvbnFn> | null = null;

function loadZxcvbn(): Promise<ZxcvbnFn> {
  if (zxcvbnPromise) return zxcvbnPromise;
  zxcvbnPromise = Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
  ]).then(([core, common, en]) => {
    core.zxcvbnOptions.setOptions({
      dictionary: {
        ...common.dictionary,
        ...en.dictionary,
      },
      graphs: common.adjacencyGraphs,
      translations: en.translations,
    });
    return core.zxcvbn as unknown as ZxcvbnFn;
  });
  return zxcvbnPromise;
}

// ---------------------------------------------------------------------------
// Score → visual bucket mapping (UI-SPEC §PasswordStrengthMeter atom)
// ---------------------------------------------------------------------------

type Bucket = {
  fillClass: string; // bg-* token for filled segments
  textClass: string; // text-* token for the score label
  label: string; // German display label (Copywriting contract)
  filled: 1 | 2 | 3 | 4;
};

const BUCKETS: Record<0 | 1 | 2 | 3 | 4, Bucket> = {
  0: {
    fillClass: "bg-destructive",
    textClass: "text-destructive",
    label: "Sehr schwach",
    filled: 1,
  },
  1: {
    fillClass: "bg-destructive",
    textClass: "text-destructive",
    label: "Schwach",
    filled: 2,
  },
  2: {
    fillClass: "bg-warning",
    textClass: "text-warning",
    label: "Okay",
    filled: 3,
  },
  3: {
    fillClass: "bg-info",
    textClass: "text-info",
    label: "Stark",
    filled: 4,
  },
  4: {
    fillClass: "bg-success",
    textClass: "text-success",
    label: "Sehr stark",
    filled: 4,
  },
};

// ---------------------------------------------------------------------------
// Tiny inline debounce — keeps the dependency footprint minimal in this atom.
// (Same shape as the typescript/patterns.md `useDebounce` reference.)
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * 4-segment password strength meter driven by zxcvbn (lazy-loaded).
 *
 * Empty password → 4 muted segments + no label.
 * Non-empty → debounced 200ms → score 0..4 → fill segments + colored label.
 *
 * Per UI-SPEC §PasswordStrengthMeter atom + UI-CHECK FLAG-5.1.
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const debounced = useDebounce(password, 200);
  const [score, setScore] = useState<0 | 1 | 2 | 3 | 4 | null>(null);

  useEffect(() => {
    if (debounced.length === 0) {
      setScore(null);
      return;
    }
    let cancelled = false;
    loadZxcvbn().then((zxcvbn) => {
      if (cancelled) return;
      const result = zxcvbn(debounced);
      setScore(result.score as 0 | 1 | 2 | 3 | 4);
    });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const bucket = score !== null ? BUCKETS[score] : null;

  return (
    <div className="space-y-1.5">
      <div className="flex h-1 gap-1">
        {[0, 1, 2, 3].map((i) => {
          const isFilled = bucket !== null && i < bucket.filled;
          return (
            <span
              key={i}
              data-testid="psm-segment"
              data-filled={isFilled ? "true" : "false"}
              className={cn(
                "flex-1 rounded-sm",
                isFilled && bucket ? bucket.fillClass : "bg-muted",
              )}
            />
          );
        })}
      </div>
      {bucket && (
        <p
          data-testid="psm-label"
          className={cn(
            "text-xs font-semibold leading-none",
            bucket.textClass,
          )}
        >
          {bucket.label}
        </p>
      )}
    </div>
  );
}
