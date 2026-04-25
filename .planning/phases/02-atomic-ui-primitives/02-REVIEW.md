---
phase: 02-atomic-ui-primitives
reviewed: 2026-04-25T11:07:46Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/ui/lib/avatar-color.ts
  - packages/ui/lib/avatar-color.test.ts
  - packages/ui/components/ui/tag-chip.tsx
  - packages/ui/components/ui/tag-chip.test.tsx
  - packages/ui/components/ui/accent-bar.tsx
  - packages/ui/components/ui/accent-bar.test.tsx
  - packages/ui/components/ui/avatar-initial.tsx
  - packages/ui/components/ui/avatar-initial.test.tsx
  - packages/ui/components/ui/segmented-control.tsx
  - packages/ui/components/ui/segmented-control.test.tsx
  - packages/ui/vitest.config.ts
  - packages/ui/test/setup.ts
  - packages/ui/test/smoke.test.ts
  - packages/ui/package.json
findings:
  blocker: 0
  high: 0
  medium: 1
  low: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-25T11:07:46Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 02 ships four atomic primitives (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`), one pure utility module (`lib/avatar-color.ts`), and the `packages/ui` test infrastructure (vitest config, jsdom setup, smoke test, devDeps). Implementation quality is high overall and adheres to the locked UI-SPEC contract.

**What is solid:**

- **Package boundary clean** — zero `@multica/core`, zero `next/*`, zero `react-router-dom` imports across all reviewed source.
- **Token discipline strong** — zero hex / RGB / OKLCH literals; all colors flow through Phase 1 semantic Tailwind utilities.
- **Base UI prop name correct** — `multiple={false}` (verified against installed `@base-ui/react@1.3.0` `.d.ts`); the `toggleMultiple` typo from UI-SPEC §SegmentedControl is correctly avoided and explicitly source-asserted in `segmented-control.test.tsx`.
- **No XSS risk** — zero `dangerouslySetInnerHTML`, zero `innerHTML` writes, no `eval`. All content rendered via React children.
- **djb2 hash deterministic and non-cryptographic** — explicit security comment in source, `|= 0` 32-bit normalization, intentionally not memoized (preserves determinism test integrity), regression-locked to `Stephan → 0`.
- **No `dark:` per-color overrides** in atom tsx — the one `dark:after:mix-blend-lighten` in `avatar-initial.tsx` is the documented structural blend-mode companion (matches `avatar.tsx`), not a per-color override.
- **TypeScript strict** — zero `any`, discriminated unions on `TagChipColor` / `AccentBarColor`, `VariantProps` extraction from cva.
- **Accessibility solid** — `SegmentedControl` requires `aria-label` (TS-required), `AccentBar` carries `role="presentation" aria-hidden="true"`, `AvatarInitial` carries `role="img"` + dynamic `aria-label` with `"Unknown user"` fallback, `TagChip` X-button has `aria-label="Remove tag"`.
- **Test quality strong** — keyboard tests use `userEvent` (not `fireEvent`); 100-iter determinism assertion present in both `avatar-color.test.ts` and `avatar-initial.test.tsx`; tests correctly assert the deselect-swallowing behavior of `SegmentedControl`.

**What needs attention:**

- One MEDIUM token-discipline violation in `tag-chip.tsx` (`hover:bg-black/10` on the X button — `black` is not a Phase 1 token).
- A handful of LOW-severity items around runtime-throwing validation, render-prop / interactive-child HTML validity, surrogate-pair handling in `extractInitials`, and a self-contradicting source comment about `import.meta.url` in `segmented-control.test.tsx`.
- Three INFO-level cleanup items.

No BLOCKER or HIGH findings.

---

## Medium

### MD-01: `TagChip` X-button uses `hover:bg-black/10` — not a Phase 1 semantic token

**File:** `packages/ui/components/ui/tag-chip.tsx:82`
**Issue:** The X-button hover state uses `hover:bg-black/10`. The Phase 2 reviewer brief and UI-SPEC §Color require all colors to flow through Phase 1 semantic tokens (`--background`, `--muted`, `--border`, `--foreground`, `--tag-p*`, `--brand`, `--accent`, `--secondary`, `--ring`). `bg-black` is a Tailwind keyword color, not one of those tokens — it does not adapt to dark mode and bypasses the token layer. Other components in `packages/ui/` (`badge.tsx`, `button.tsx`) use opacity overlays on existing semantic tokens (e.g. `bg-muted/50`, `bg-destructive/20`), never `bg-black/*`.

UI-SPEC §Color, line 268: `If implementation surfaces a need for a token outside this list, STOP and re-open the design contract. Do NOT silently introduce new tokens.` Using `bg-black` is exactly that: a silently introduced color outside the inventory.

**Fix:** Replace with a token-driven hover. Two reasonable options:

```tsx
// Option A: foreground-tinted wash (works in both modes; analogous to ghost-button pattern)
className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"

// Option B: invert the chip's foreground for the hover hit-target (uses the chip's own paired tokens)
className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-current/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
```

Option A matches the codebase's existing pattern (`button.tsx` uses `bg-foreground/...` style washes). Recommend Option A.

---

## Low

### LO-01: `TagChip` + `render={<a/>}` + `onRemove` produces invalid HTML (button inside anchor)

**File:** `packages/ui/components/ui/tag-chip.tsx:74-86`
**Issue:** When a caller passes both `render={<a href=...>}` (polymorphic anchor) AND `onRemove` (X button child), the rendered DOM is `<a><button>X</button></a>`. The HTML spec forbids interactive content inside an `<a>` element ("Content model: Transparent, but there must be no interactive content descendant"). Browsers usually tolerate this, but it can produce unexpected screen-reader behavior and click-target ambiguity.

UI-SPEC §1 TagChip says the chip body switches to `<button>` only when `onRemove` is present, and supports `render` for link-style chips — but does not call out the conflict between the two. The implementation `e.stopPropagation()` correctly prevents the X click from triggering anchor navigation, but the HTML is still invalid.

**Fix:** Either dev-warn or assert at the type level. Cheapest fix is a `process.env.NODE_ENV !== "production"` guard:

```tsx
if (process.env.NODE_ENV !== "production" && onRemove && render) {
  console.warn(
    "[TagChip] `render` and `onRemove` together produce invalid HTML " +
      "(interactive content inside an anchor). Use one or the other.",
  )
}
```

Alternative (preferred long-term): make the prop combination a TypeScript error via overload signatures so callers cannot pass both. Document the limitation either way.

### LO-02: `AccentBar` validation throws synchronously during render

**File:** `packages/ui/components/ui/accent-bar.tsx:42-59`
**Issue:** `AccentBar` validates prop combinations by `throw new Error(...)` inside the function body, which throws during React render and triggers the nearest ErrorBoundary (or crashes the subtree if none exists). This is a leaf atom — a single misconfigured `<AccentBar />` in production could blank an entire issue card or kanban column.

The root cause is that the type allows both `color` and `colors` to be optional (and `segments` defaults to `1`), so the contract is enforced at runtime instead of at the type level. UI-SPEC §2 AccentBar says `color` is required and the `colors` array length "must equal `segments`, validated via TypeScript tuple" — neither is currently enforced by the type.

**Fix (preferred):** discriminated union so invalid combinations are unreachable at the call site. Sketch:

```tsx
type SingleSegmentProps = {
  segments?: 1
  color: AccentBarColor
  colors?: never
}
type MultiSegmentProps<N extends 2 | 3 | 4> = {
  segments: N
  colors: readonly [AccentBarColor, ...AccentBarColor[]] & { length: N }
  color?: AccentBarColor // permitted as fallback when colors omitted
}
type AccentBarProps =
  | SingleSegmentProps
  | MultiSegmentProps<2> | MultiSegmentProps<3> | MultiSegmentProps<4>
```

**Fix (minimum):** keep the runtime check but downgrade to dev-only `console.error` + render a fallback (e.g. a `bg-muted` bar) instead of throwing, so a misconfigured atom degrades gracefully in production.

### LO-03: `extractInitials` uses `charAt(0)` — splits surrogate pairs on astral-plane characters

**File:** `packages/ui/lib/avatar-color.ts:66-70`
**Issue:** `firstWord.charAt(0)` returns the first UTF-16 code unit, which is half of a surrogate pair for any character outside the Basic Multilingual Plane (e.g. emoji "😀", many CJK extensions, mathematical alphanumeric symbols). For a name like `"😀 Alice"`, `charAt(0)` returns the lone high-surrogate `\uD83D`, and uppercasing it produces a broken mojibake initial — not a crash, but a bad UX on Unicode-rich names.

The `\p{L}\p{N}` regex with the `u` flag in line 61 *is* surrogate-aware (good), but the subsequent `charAt(0)` is not.

**Fix:** Use `String.prototype.codePointAt` + `String.fromCodePoint` (or the iterator protocol) for the first-grapheme extraction:

```ts
function firstChar(s: string): string {
  const cp = s.codePointAt(0)
  return cp === undefined ? "" : String.fromCodePoint(cp)
}
// then:
const first = firstChar(firstWord)
const last = firstChar(lastWord)
return (first + last).toLocaleUpperCase()
```

Add a test case asserting `extractInitials("😀 Alice")` does not produce a lone surrogate. (Bonus: `toLocaleUpperCase` is preferable to `toUpperCase` for locale-correct casing — Turkish dotted/dotless `i`, German `ß`, etc.)

### LO-04: Self-contradicting `import.meta.url` handling in segmented-control test

**File:** `packages/ui/components/ui/segmented-control.test.tsx:148-154`
**Issue:** The comment block on lines 148-149 explicitly warns: *"Vite transforms `import.meta.url` to a non-`file://` scheme in jsdom, so we cannot use `new URL(..., import.meta.url)` here — use Node's path APIs instead."* Then line 153 does exactly that: `path.dirname(new URL(import.meta.url).pathname)`. This works only because `new URL(import.meta.url)` (without a base argument) avoids the warned-about resolution failure, but the call still depends on a `file:`-scheme URL — the very thing the comment says is unreliable.

The sibling file `accent-bar.test.tsx:102` correctly uses `url.fileURLToPath(import.meta.url)`, which is the documented Node-blessed way to get a filesystem path from a `file:` URL.

**Fix:** Align with `accent-bar.test.tsx`:

```ts
async function readSource() {
  const path = await import("node:path")
  const fs = await import("node:fs")
  const url = await import("node:url")
  const here = path.dirname(url.fileURLToPath(import.meta.url))
  return fs.readFileSync(path.join(here, "segmented-control.tsx"), "utf8")
}
```

This also makes the comment accurate.

### LO-05: `AccentBar` `defaultVariants.orientation` duplicated between cva and function defaults

**File:** `packages/ui/components/ui/accent-bar.tsx:7-14, 39`
**Issue:** `accentBarVariants` declares `defaultVariants: { orientation: "horizontal" }` (line 13). The function signature also defaults `orientation = "horizontal"` (line 39). Two sources of truth for the same default; if one is changed without the other, behavior diverges silently.

**Fix:** Remove one. Preferred: drop the function-signature default and let cva supply it:

```tsx
function AccentBar({
  color,
  segments = 1,
  colors,
  orientation,
  className,
}: AccentBarProps) {
  // ...
  return (
    <div
      // ...
      className={cn(accentBarVariants({ orientation }), className)}
    >
      {/* ... */}
    </div>
  )
}
```

This keeps the single source of truth in the variants table, where the rest of the orientation config lives.

---

## Info

### IN-01: `test/smoke.test.ts` is marked for deletion in its own header comment but remains

**File:** `packages/ui/test/smoke.test.ts:4-5`
**Issue:** The file's leading comment says: *"Wave 1 plans will add real component tests; this file can be deleted once those exist."* Wave 1 component tests (`tag-chip.test.tsx`, `accent-bar.test.tsx`, `avatar-initial.test.tsx`, `segmented-control.test.tsx`) are now in place — the smoke file's reason to exist is gone.

It is harmless to keep (six fast assertions, exercises the setup shims), but the comment is now stale.

**Fix:** Either delete the file or update the comment to "kept as a fast canary that the test infrastructure (jsdom, shims, jest-dom matchers) is wired correctly — does not depend on any component."

### IN-02: `TagChip` exposes `color` via `useRender` `state` — surfaces as `data-color` on rendered element

**File:** `packages/ui/components/ui/tag-chip.tsx:93`
**Issue:** Base UI's `useRender` writes the `state` object as `data-*` attributes on the rendered element. Passing `state: { slot: "tag-chip", color }` will surface the color as `data-color="tag-p0"` on every chip in the DOM. This is not a bug — it is consistent with how `badge.tsx` exposes `state: { slot: "badge", variant }` — but it is worth being aware of as a stable consumer-visible API surface (DOM-attribute selectors elsewhere may start depending on it).

**Fix:** No action required. Documented here so it shows up in the audit trail.

### IN-03: `localStorage` shim defines `window.localStorage` only when missing — fine, but the assertion is `clear !== "function"`

**File:** `packages/ui/test/setup.ts:22`
**Issue:** The check `typeof globalThis.localStorage?.clear !== "function"` is a clever way to detect a present-but-broken localStorage (jsdom in some configurations exposes the property without the methods). It is correct and intentional; it only reads odd at first glance.

**Fix:** No action required. Optional one-line clarifying comment, e.g. `// jsdom may set the property without functional methods — re-check via .clear`.

---

_Reviewed: 2026-04-25T11:07:46Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
