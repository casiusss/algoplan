# Phase 2: Atomic UI Primitives — Research

**Researched:** 2026-04-25
**Domain:** React component primitives in `@multica/ui`, Base UI ToggleGroup composition, cva variant systems, deterministic hashing, Vitest + jsdom + user-event keyboard testing
**Confidence:** HIGH (all critical claims verified against installed `.d.ts` files, the Phase 2 UI-SPEC, and live `packages/ui/components/ui/` source)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **All implementation choices are at Claude's discretion.** Discuss phase was skipped per `workflow.skip_discuss: true`. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.
- **Visual / design contract is LOCKED in `02-UI-SPEC.md`** (do not re-debate spacing, colors, typography, ARIA semantics, hash algorithm, or palette indexes — those are settled).
- Phase boundary: the four atomic components (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) exist in `packages/ui/components/ui/`, are keyboard-accessible, and pass Vitest tests in both light and dark mode.

### Claude's Discretion

- Specific filenames within `packages/ui/components/ui/` (recommended below).
- TypeScript prop union shape (recommended discriminated union — see "Standard Stack").
- Whether to add a tiny pure-utility module (recommended `packages/ui/lib/avatar-color.ts` for testability).
- Test file layout, imports, and exact assertions (recommended in "Validation Architecture").
- Whether to add a per-package vitest config or piggy-back the existing pattern from `packages/views` (recommended: add `packages/ui/vitest.config.ts` mirroring `packages/views/vitest.config.ts`).

### Deferred Ideas (OUT OF SCOPE)

- None — discuss phase skipped, no deferred items.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | `TagChip` in `packages/ui/components/ui/` with `color` prop (semantic tokens, no hex), optional X-to-remove, tested in light + dark | "Standard Stack" + "Code Examples → TagChip"; cva-based discriminated union, lucide `X` icon, `useRender` polymorphism mirrors `badge.tsx` |
| UI-02 | `AccentBar` for the colored bar atop task cards, variable segments (1–4) | "Code Examples → AccentBar"; `role="presentation"` decorative `<div>`, segments rendered as adjacent sibling spans with no internal radius |
| UI-03 | `AvatarInitial` deterministic color from name or User-ID | "Code Examples → AvatarInitial" + djb2 hash in pure utility module — testable in isolation, 100-iteration determinism assertion |
| UI-04 | `SegmentedControl` (Base UI ToggleGroup) for P0/P1/P2/P3, keyboard-accessible | "Architecture Patterns → SegmentedControl composition" + Base UI v1.3 type definitions verified; arrow-key navigation + roving tabindex are built-in to the primitive |

</phase_requirements>

## Summary

Phase 2 is mechanically tractable: four leaf components, all in `packages/ui/components/ui/`, all consuming Phase 1 tokens that already exist in `tokens.css`. Three observations drive the plan shape:

1. **The UI-SPEC's Base UI prop name is wrong.** `02-UI-SPEC.md` says `toggleMultiple={false}` for SegmentedControl. The actual Base UI v1.3 API is `multiple={false}` (default). Additionally, the `value` prop is `readonly Value[]` (an array, even in single-select mode), and `onValueChange` callback fires with `(value: Value[], eventDetails)`. The SegmentedControl wrapper MUST adapt the array-shape to the friendlier `value: string` / `onValueChange: (value: string) => void` shape that the UI-SPEC requires. **This is the only non-trivial composition decision in the phase.**

2. **Test infrastructure does not yet exist in `packages/ui`.** No `vitest.config.ts`, no `test/setup.ts`, no `test` script in `package.json`, no devDependencies for vitest/jsdom/testing-library. All these need to land in **Wave 0** before any component test can run. The good news: `packages/views` has a working blueprint (`vitest.config.ts`, `test/setup.ts`, `package.json` script + devDeps) that can be lifted almost verbatim. All required deps are already in the pnpm catalog.

3. **No new design primitives are needed.** Every visual contract is satisfied by existing tokens, existing patterns (`badge.tsx`'s `useRender` polymorphism, `toggle.tsx`'s focus-ring recipe, `avatar.tsx`'s `after:border` ring trick, `toggle-group.tsx`'s data-attribute surface). The four components are bespoke compositions of existing parts — no shadcn registry install, no new fonts, no new dependencies in `packages/ui` (test deps notwithstanding).

**Primary recommendation:** Land the test infrastructure in a single Wave 0 task (config + setup + package.json + devDeps), then implement each atom in its own task with co-located test file. SegmentedControl is the only atom needing a thin array↔string adapter inside the wrapper; the other three are pure cva + token consumers.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Atom rendering (TagChip / AccentBar / AvatarInitial / SegmentedControl) | `packages/ui/components/ui/{name}.tsx` | — | One file per component is the established convention (`badge.tsx`, `toggle.tsx`, etc.); both apps `import` directly via the `./components/ui/*` export |
| Variant + class composition | `cva` from `class-variance-authority` (catalog) | `cn` from `@multica/ui/lib/utils` | Identical to all 50+ existing UI atoms in the package |
| Deterministic color hash | `packages/ui/lib/avatar-color.ts` (NEW pure module) | consumed by `avatar-initial.tsx` | Pure function; testable in isolation; no React; no DOM |
| Keyboard navigation for SegmentedControl | `@base-ui/react/toggle-group` (already in deps) | wrapper provides single-select array↔string adapter | Roving tabindex + arrow keys + Home/End are built into the primitive |
| Polymorphic rendering for TagChip | `useRender` + `mergeProps` from `@base-ui/react` | — | Identical pattern to `badge.tsx` — keeps API consistent across the package |
| Test runtime | `vitest` + `jsdom` + `@vitejs/plugin-react` (catalog) | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Mirrors `packages/views` — single source of truth for testing across the monorepo |
| Test infrastructure (config, setup, scripts, devDeps) | `packages/ui/vitest.config.ts` + `packages/ui/test/setup.ts` + `packages/ui/package.json` | — | Currently absent in `packages/ui`; must be added in Wave 0 |

## Standard Stack

### Core (already installed in `packages/ui`)

| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@base-ui/react` | `1.3.0` (catalog `^1.3.0`; latest `1.4.1`) | Toggle, ToggleGroup, useRender, mergeProps primitives | [VERIFIED: `packages/ui/package.json:23`] Project-wide convention — Radix is explicitly forbidden per UI-SPEC |
| `class-variance-authority` | `catalog: ^0.7.1` | Type-safe Tailwind variant system | [VERIFIED: catalog entry] Used by every existing component (`badge.tsx`, `button.tsx`, `toggle.tsx`, `tabs.tsx`, etc.) |
| `clsx` | `catalog: ^2.1.1` | Conditional class composition | [VERIFIED: catalog] Used inside `lib/utils.ts` `cn()` helper |
| `tailwind-merge` | `catalog: ^3.4.0` | Tailwind class de-duplication | [VERIFIED: catalog] Used inside `cn()` |
| `lucide-react` | `catalog: ^1.0.1` | Icon library (the `X` icon for TagChip remove button) | [VERIFIED: catalog + `components.json` `iconLibrary: lucide`] Project standard |

### Test infra (in catalog but NOT yet in `packages/ui/devDependencies`)

| Library | Catalog Version | Status | Action |
|---------|-----------------|--------|--------|
| `vitest` | `^4.1.0` (latest `4.1.5` [VERIFIED: `npm view`]) | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |
| `jsdom` | `^29.0.1` | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |
| `@vitejs/plugin-react` | `^6.0.1` | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |
| `@testing-library/react` | `^16.3.2` | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |
| `@testing-library/jest-dom` | `^6.9.1` | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |
| `@testing-library/user-event` | `^14.6.1` (latest `14.6.1` [VERIFIED: `npm view`]) | NOT in `packages/ui/package.json` | **ADD** in Wave 0 |

[VERIFIED: `pnpm-workspace.yaml` lines 28-35] Every entry above is already a catalog: reference. Use `catalog:` resolver in `packages/ui/package.json` — do NOT pin literal versions.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Base UI ToggleGroup for SegmentedControl | Base UI Tabs primitive | Tabs are coupled to a panel (TabsPanel); SegmentedControl has no panel. ToggleGroup `multiple={false}` is semantically the right primitive. **Stay with ToggleGroup.** |
| Base UI ToggleGroup for SegmentedControl | Base UI RadioGroup | RadioGroup renders as `<input type="radio">`, not buttons — wrong visual model (we want lifted button-style, not radio dots). **Stay with ToggleGroup.** |
| Discriminated string union for `color` | Loose `string` type | Loose `string` defeats the no-hex enforcement. The color tokens are a closed set — discriminated union catches typos at compile time. **Use union.** |
| djb2 hash | FNV-1a, MurmurHash, simple `charCode.sum % 8` | djb2 is the explicit choice in UI-SPEC; deterministic and fast. **Stay.** |
| Inline `style={{ backgroundColor: var(--tag-p0) }}` | Tailwind utility classes | UI-SPEC explicitly forbids `style` for color. Utility classes (`bg-tag-p0`) flow through `@theme inline` — single source of truth. **Use utilities.** |
| Bumping `@base-ui/react` to `1.4.1` | Stay at `1.3.0` | Patch-level bump; ToggleGroup API unchanged between 1.3 and 1.4. **Stay at `1.3.0`.** No upgrade in this phase. |

**Installation (Wave 0):**

```bash
pnpm --filter @multica/ui add -D vitest jsdom @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

(All pulled from catalog because catalog entries match.)

**Version verification:**
- `@testing-library/user-event` — catalog `^14.6.1`, latest `14.6.1` [VERIFIED: `npm view @testing-library/user-event version`]
- `vitest` — catalog `^4.1.0`, latest `4.1.5` [VERIFIED: `npm view vitest version`]
- `@base-ui/react` — installed `1.3.0`, latest `1.4.1` [VERIFIED: `npm view @base-ui/react version`]; no upgrade needed in this phase

## Architecture Patterns

### System Architecture Diagram

```
                                Phase 1 tokens
                       packages/ui/styles/tokens.css
                       (--tag-p0..p3, --brand, --muted, --background, --ring)
                                       │
                                       │ @theme inline binding
                                       ▼
                        Tailwind utility classes
                  (bg-tag-p0, text-tag-p0-foreground, ...)
                                       │
                                       │ consumed by
                                       ▼
            ┌──────────────────┬──────────────────┬──────────────────┬───────────────────────┐
            │                  │                  │                  │                       │
       TagChip            AccentBar          AvatarInitial      SegmentedControl       (test files)
       (cva +             (cva +             (cva +             (Base UI               vitest + jsdom
        useRender)         span array)        djb2 hash)         ToggleGroup           + RTL + user-event
            │                  │                  │              wrapper)                     │
            │                  │                  ▼                  │                        │
            │                  │       lib/avatar-color.ts            │                       │
            │                  │       (pure djb2 module)             │                       │
            │                  │                  │                   │                       │
            └──────────────────┴──────────────────┴───────────────────┘                       │
                                       │                                                      │
                                       │ exported via package.json                            │
                                       │ "./components/ui/*"                                  │
                                       ▼                                                      │
                          Phase 3 (showroom) + Phase 4 (shell) + Phase 5 (kanban) + Phase 6 (issue detail)
                                       ▲                                                      │
                                       └──────────────────────────────────────────────────────┘
                                                          asserted by
```

### Recommended File Layout

```
packages/ui/
├── components/ui/
│   ├── tag-chip.tsx                ← UI-01
│   ├── tag-chip.test.tsx
│   ├── accent-bar.tsx              ← UI-02
│   ├── accent-bar.test.tsx
│   ├── avatar-initial.tsx          ← UI-03
│   ├── avatar-initial.test.tsx
│   ├── segmented-control.tsx       ← UI-04
│   └── segmented-control.test.tsx
├── lib/
│   ├── utils.ts                    (existing — unchanged)
│   ├── avatar-color.ts             ← NEW pure utility (djb2 hash + initials extractor + palette table)
│   └── avatar-color.test.ts        ← NEW
├── test/
│   └── setup.ts                    ← NEW (mirrors packages/views/test/setup.ts)
├── vitest.config.ts                ← NEW (mirrors packages/views/vitest.config.ts)
└── package.json                    (extend devDependencies + add "test": "vitest run" script)
```

**Rationale for the pure-utility extraction (`lib/avatar-color.ts`):** the djb2 hash, initials extractor, and palette table are pure functions. Putting them in their own module gives:
- Direct unit testability (no React, no jsdom needed for the determinism assertion).
- Independent reuse if Phase 4/5 needs the same color hash for an `<Avatar>` or `<AgentAvatar>` (likely — see SHL-01 + WS-02).
- Clean separation of "math" (utility) from "rendering" (component) per CLAUDE.md SRP.

### Pattern 1: cva + Discriminated Union for Locked Color Tokens

**What:** Map a TypeScript string-union prop to a cva variant table; let cva produce both the `bg-*` and `text-*` classes in one entry.

**When to use:** Any time a component must enforce a closed set of design-token colors (TagChip, AccentBar, AvatarInitial palette).

**Why this beats alternatives:**
- `string` prop — runtime errors only; no IDE autocomplete.
- `keyof typeof palette` — works, but cva is already established in the codebase, and cva's `VariantProps<>` extracts the union for free.
- Inline `style` — explicitly forbidden by UI-SPEC.

**Example (TagChip skeleton):**

```typescript
// Source: pattern from packages/ui/components/ui/badge.tsx
const tagChipVariants = cva(
  "inline-flex h-5 w-fit items-center justify-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all",
  {
    variants: {
      color: {
        "tag-p0": "bg-tag-p0 text-tag-p0-foreground",
        "tag-p1": "bg-tag-p1 text-tag-p1-foreground",
        "tag-p2": "bg-tag-p2 text-tag-p2-foreground",
        "tag-p3": "bg-tag-p3 text-tag-p3-foreground",
        brand: "bg-brand text-brand-foreground",
      },
    },
    // No defaultVariants — UI-SPEC forbids a "default tag color"
  }
)
type TagChipColor = NonNullable<VariantProps<typeof tagChipVariants>["color"]>
```

This guarantees: caller MUST pass `color`, the union is type-locked, no `string` escape hatch, no inline `style`.

### Pattern 2: SegmentedControl as Single-Select Adapter over ToggleGroup

**What:** Wrap `@base-ui/react/toggle-group` to expose a `value: string` (not `string[]`) API while delegating all keyboard/ARIA behavior to the primitive.

**Why this is the only non-trivial composition in the phase:** Base UI ToggleGroup's value contract is an array even when `multiple={false}`. The UI-SPEC requires `value: string` and `onValueChange: (value: string) => void`. The wrapper bridges these two shapes.

**Type definitions (verified from installed `.d.ts`):**

```typescript
// From @base-ui/react/toggle-group v1.3.0:
interface ToggleGroupProps<Value extends string> {
  value?: readonly Value[] | undefined            // ← always an array
  defaultValue?: readonly Value[] | undefined
  onValueChange?: (groupValue: Value[], eventDetails: ToggleGroup.ChangeEventDetails) => void
  disabled?: boolean | undefined
  orientation?: Orientation | undefined           // 'horizontal' | 'vertical'
  loopFocus?: boolean | undefined                 // default true
  multiple?: boolean | undefined                  // default false (single-select)
}
```

**Two important consequences:**

1. **UI-SPEC says `toggleMultiple={false}` — that prop name does NOT exist.** The correct prop is `multiple={false}` (which is also the default, so it can be omitted). Treat the UI-SPEC text as a typo; ship the correct prop.
2. **Loop focus default is `true`** — UI-SPEC says "ArrowLeft wraps from item 0 to last" — verified, this is the default behavior with `loopFocus: true`. No prop tweak needed.

**Adapter pattern:**

```typescript
type SegmentedControlProps = {
  value: string
  onValueChange: (value: string) => void
  "aria-label": string                            // REQUIRED prop per UI-SPEC
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function SegmentedControl({
  value,
  onValueChange,
  children,
  ...props
}: SegmentedControlProps) {
  return (
    <ToggleGroupPrimitive
      value={[value]}                             // ← string → array
      onValueChange={(next) => {
        // Single-select guarantees next.length is 0 or 1.
        // Empty array means "user clicked the active item" — Base UI deselects.
        // UI-SPEC contract: value is always defined; ignore deselect to keep one selected.
        if (next.length > 0) onValueChange(next[0])
      }}
      orientation="horizontal"
      multiple={false}
      data-slot="segmented-control"
      className={...}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  )
}
```

**Edge case the planner MUST address:** Base UI's ToggleGroup will deselect the currently-pressed item if the user clicks it again (single-select toggling allowed). For a P0/P1/P2/P3 segmented picker, an empty selection is invalid — the recommended behavior (and the reading of UI-SPEC) is to **swallow the deselect** so a value is always kept. The skeleton above does this with the `if (next.length > 0)` guard. Document this inline.

### Pattern 3: AccentBar as Multi-Segment Decorative Bar

**What:** Render either a single `<div>` with one color, or N adjacent sibling `<span>`s when `segments > 1`. Outer container has `rounded-sm`; segments themselves are square.

**Approach:**

```typescript
type AccentBarColor = "tag-p0" | "tag-p1" | "tag-p2" | "tag-p3" | "brand" | "muted"

interface AccentBarProps {
  color?: AccentBarColor                          // required when segments === 1
  segments?: 1 | 2 | 3 | 4
  colors?: readonly AccentBarColor[]              // length must equal segments when segments > 1
  orientation?: "horizontal" | "vertical"
  className?: string
}
```

When `segments > 1`:
- Outer is `flex` (horizontal) or `flex-col` (vertical) with `overflow-hidden rounded-sm`.
- Each segment is `flex-1` with `bg-{color}` (no individual radius — the outer mask provides the rounded ends).
- Validate `colors.length === segments` at render time; throw a development-only error or fall back to repeating `color`.

**Why `flex-1` over `grid-cols-N`:** Both work, but `flex-1` is one-class shorter and matches the dominant codebase pattern (no grid-template-columns elsewhere in `components/ui/`).

### Pattern 4: AvatarInitial as a Pure Token Consumer

**What:** A `<span role="img" aria-label={name}>` containing 1–2 letter initials, with background + foreground color picked deterministically from name.

**Module split:**

```typescript
// lib/avatar-color.ts (pure, testable in isolation)
export const AVATAR_PALETTE = [
  "bg-tag-p0 text-tag-p0-foreground",
  "bg-tag-p1 text-tag-p1-foreground",
  "bg-tag-p2 text-tag-p2-foreground",
  "bg-tag-p3 text-tag-p3-foreground",
  "bg-brand text-brand-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
  "bg-accent text-accent-foreground",
] as const

export function hashToPaletteIndex(input: string): number {
  // djb2 — Daniel J. Bernstein hash (k=33). Pure, deterministic.
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
  }
  return Math.abs(hash) % AVATAR_PALETTE.length
}

export function extractInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "?"
  // Strip leading non-alphanumerics
  const cleaned = trimmed.replace(/^[^\p{L}\p{N}]+/u, "")
  if (!cleaned) return "?"
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
```

**Why the `<span>` (not `Avatar.Root`):** UI-SPEC explicitly says "does NOT use Base UI `Avatar.Root` — this is a pure deterministic-color atom, complementary to `Avatar`/`AvatarFallback`." The component is a leaf renderer with no image/fallback semantics — wrapping in `Avatar.Root` would add a state machine for nothing.

### Pattern 5: useRender + mergeProps Polymorphism (TagChip)

**What:** Allow callers to render TagChip as `<a href="...">` instead of the default `<span>`, using Base UI's `useRender` helper. Identical to `badge.tsx`.

**Why:** Phase 5 (kanban) and Phase 6 (issue detail) may want clickable tag chips that link to a tag-filter route. The polymorphism comes free from the existing pattern.

**Implementation (mirror `badge.tsx`):**

```typescript
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

function TagChip({
  className,
  color,
  render,
  onRemove,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof tagChipVariants> & {
  onRemove?: () => void
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(tagChipVariants({ color }), className) },
      props
    ),
    render,
    state: { slot: "tag-chip", color },
  })
}
```

The `onRemove` button is rendered as a separate `<button>` child sibling, not via `useRender`, because it has its own focus and click semantics.

### Anti-Patterns to Avoid

- **Inline color styles** (`style={{ backgroundColor: "var(--tag-p0)" }}`) — UI-SPEC forbids; use utility classes.
- **`dark:` overrides inside the atoms** — UI-SPEC explicitly checks for absence; tokens handle dark mode.
- **A "default" color on TagChip** — UI-SPEC forbids; `color` is a required prop with no `defaultVariants`.
- **Mocking `@multica/core` or `next/*`** in `packages/ui` tests — these aren't allowed imports. If a test seems to need them, the component is in the wrong package.
- **Pure-DOM event simulation** (`fireEvent.keyDown`) for SegmentedControl arrow-key tests — Base UI relies on real focus/blur sequencing; use `userEvent.keyboard("{ArrowRight}")` from `@testing-library/user-event`. fireEvent works for click but not for the focus-driven arrow contract.
- **`aria-label="Remove tag"` on the chip itself** — the label belongs on the inner `<button>` (the chip body is non-focusable per UI-SPEC).
- **Using `Math.random()` or `Date.now()` in `lib/avatar-color.ts`** — UI-SPEC forbids; would make the determinism test fail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Roving tabindex / arrow-key navigation for segmented control | Custom keyboard handler with `useState` + `useRef` | `@base-ui/react/toggle-group` (already a dep) | Roving focus, arrow keys, Home/End, looping — all built-in and ARIA-correct |
| Class merging (Tailwind utility de-duplication) | Manual string concatenation | `cn()` helper from `@multica/ui/lib/utils` | Already in the codebase; uses tailwind-merge to handle conflicts |
| Variant systems (color → classes mapping) | `if/else` chains or lookup objects | `cva` from `class-variance-authority` | Type-safe, exhaustive, established pattern |
| Polymorphic rendering (TagChip as `<a>` vs `<span>`) | `as` prop pattern with manual ref forwarding | `useRender` + `mergeProps` from `@base-ui/react` | Matches `badge.tsx`; no API divergence in the package |
| User-event simulation for keyboard tests | `fireEvent.keyDown` + manual `tab()` | `@testing-library/user-event` v14 | Realistic event sequencing; required for Base UI focus state machines to update correctly |
| Hash function for avatar color | Crypto-grade hash, fancy npm package | djb2 inline (8 lines, MIT-equivalent algorithm in public domain) | Zero dependency; sufficient distribution for 8-bucket palette; UI-SPEC explicitly chose this |

**Key insight:** Every hand-roll temptation in this phase is already solved by a dep that's already installed. The phase is about composition, not invention.

## Common Pitfalls

### Pitfall 1: Wrong Base UI prop name (`toggleMultiple` vs `multiple`)

**What goes wrong:** Plan or implementation uses `toggleMultiple={false}` (per UI-SPEC text) — TypeScript error or, worse, silent prop-drop and unexpected multi-select behavior.

**Why it happens:** The UI-SPEC was generated from prior knowledge; Base UI v1.x renamed/never had `toggleMultiple`. The actual prop is `multiple` (default `false`).

**How to avoid:** Use `multiple={false}` (or omit entirely — false is the default). Document the discrepancy inline so the next reviewer doesn't get tripped up.

**Warning signs:** TS error `Property 'toggleMultiple' does not exist on type 'ToggleGroupProps<string>'`. If the build passes but multi-select behavior appears, you wrote a different prop name and TypeScript caught nothing because of the props spread.

### Pitfall 2: `value` shape mismatch (string vs string[])

**What goes wrong:** Caller passes `value="board"` to SegmentedControl but the inner ToggleGroup expects `value={["board"]}` — TypeScript error, or runtime no-op.

**Why it happens:** Base UI's value model is array-shaped (uniform across single/multi); a friendly wrapper for callers must adapt.

**How to avoid:** The wrapper accepts `value: string` and converts to `[value]` internally; `onValueChange` accepts the inner callback `(arr: string[]) => void` and forwards `arr[0]`. Explicit guard for `arr.length === 0` (the deselect case) — see Pattern 2.

**Warning signs:** Tests pass clicks but `onValueChange` fires with `undefined` or `[]`; or TypeScript complains that `string[]` is not assignable to `string`.

### Pitfall 3: Empty-array deselect leaves SegmentedControl with no value

**What goes wrong:** User clicks the currently-active P1 item — Base UI's single-select ToggleGroup *does* support deselection; it fires `onValueChange([], details)` and now the consumer has no value. P0/P1/P2/P3 has no valid "no priority selected" state.

**Why it happens:** ToggleGroup is symmetric — clicking the active item deselects it. The wrapper must opt out.

**How to avoid:** Inside the wrapper's `onValueChange`, swallow empty results: `if (next.length > 0) onValueChange(next[0])`. Document inline why.

**Warning signs:** Test `clicks active item, asserts value unchanged` fails; consumer code logs `value=undefined`.

### Pitfall 4: Tests fail because no test infra exists in `packages/ui`

**What goes wrong:** Plan task says "write tag-chip.test.tsx" — `pnpm --filter @multica/ui test` fails with `command not found` or `vitest is not installed`.

**Why it happens:** `packages/ui/package.json` has no `test` script and no test devDependencies; there's no `vitest.config.ts` and no `test/setup.ts`. Existing test infra lives in `packages/views`.

**How to avoid:** Wave 0 task adds the full test setup (`vitest.config.ts`, `test/setup.ts`, `package.json` script + devDeps via `pnpm add -D` from catalog). Verify with a smoke `expect(true).toBe(true)` before any atom test runs.

**Warning signs:** First Vitest invocation errors with `Cannot find module 'vitest'` or `No test files found`.

### Pitfall 5: AvatarInitial fallback rendering throws on null/undefined name

**What goes wrong:** Production data has a user with empty `name`; component throws `cannot read property '0' of undefined` from a hand-rolled initials extractor.

**Why it happens:** UI-SPEC requires graceful fallback to `"?"` and `aria-label="Unknown user"` — easy to forget the `trim().split` on an empty string returns `[""]`, not `[]`.

**How to avoid:** The pure utility module `extractInitials` (above) handles all empty/whitespace/punctuation-only cases and returns `"?"`. Test cases: `""`, `"  "`, `"!!!"`, `"@@@ Stephan"`, `"a b c"`, `"Стephan"` (Unicode).

**Warning signs:** Crash in storybook (Phase 3) or kanban view (Phase 5) when an unnamed agent is rendered.

### Pitfall 6: Determinism test passes by accident due to memoization

**What goes wrong:** Test asserts "100 calls with same input produce same index" — but if `hashToPaletteIndex` is memoized, the 99 follow-up calls hit the cache and the test cannot detect a non-deterministic core.

**Why it happens:** Premature optimization (`useMemo` or module-level `Map<string, number>`).

**How to avoid:** Keep `hashToPaletteIndex` pure and uncached. Performance is fine — djb2 over a typical 20-char name is sub-microsecond. Test should also include a second assertion: `hashToPaletteIndex("Stephan")` produces a SPECIFIC known index (e.g., compute once, hard-code, lock down regression).

**Warning signs:** Component renders different colors for the same name across page reloads — but the determinism test still passes locally. (This phase doesn't memoize, so this pitfall is preventive only — call it out in the plan.)

### Pitfall 7: `lucide-react` `X` icon size override needed for chip

**What goes wrong:** The lucide `X` renders at default `size-4` (16px) — too big for a 20px-tall TagChip, breaks vertical alignment.

**Why it happens:** lucide-react SVGs default to `1em` width/height; container `text-xs` makes them ~12px, but UI-SPEC says `size-3` (12px) explicitly.

**How to avoid:** Render `<X className="size-3" />` inside the remove button. UI-SPEC line 171 specifies this exactly.

**Warning signs:** Visual oddity — X icon overflows the chip vertically.

## Runtime State Inventory

> **N/A — this is a greenfield component-creation phase, not a rename or migration.** No databases, no live service config, no OS-registered state, no secrets, and no build artifacts depend on these new component names. The new components are new files; nothing else needs to be re-registered, re-keyed, or re-installed.

## Code Examples

Patterns ready to be lifted into the implementation. Each is grounded in either UI-SPEC requirements or verified existing patterns in this codebase.

### TagChip (full skeleton)

```typescript
// packages/ui/components/ui/tag-chip.tsx
"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@multica/ui/lib/utils"

const tagChipVariants = cva(
  "group/tag-chip inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md text-xs font-medium whitespace-nowrap transition-all",
  {
    variants: {
      color: {
        "tag-p0": "bg-tag-p0 text-tag-p0-foreground",
        "tag-p1": "bg-tag-p1 text-tag-p1-foreground",
        "tag-p2": "bg-tag-p2 text-tag-p2-foreground",
        "tag-p3": "bg-tag-p3 text-tag-p3-foreground",
        brand: "bg-brand text-brand-foreground",
      },
      interactive: {
        true: "px-1.5 pr-1",
        false: "px-2 py-0.5",
      },
    },
    defaultVariants: {
      interactive: false,
    },
    // No defaultVariants for `color` — UI-SPEC forbids a default color
  }
)

type TagChipColor = NonNullable<VariantProps<typeof tagChipVariants>["color"]>

interface TagChipExtraProps {
  color: TagChipColor
  onRemove?: () => void
}

function TagChip({
  className,
  color,
  render,
  onRemove,
  children,
  ...props
}: useRender.ComponentProps<"span"> & TagChipExtraProps) {
  const interactive = Boolean(onRemove)

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(tagChipVariants({ color, interactive }), className),
        children: (
          <>
            {children}
            {onRemove ? (
              <button
                type="button"
                aria-label="Remove tag"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-black/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </>
        ),
      },
      props
    ),
    render,
    state: { slot: "tag-chip", color },
  })
}

export { TagChip, tagChipVariants, type TagChipColor }
```

### AccentBar (full skeleton)

```typescript
// packages/ui/components/ui/accent-bar.tsx
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@multica/ui/lib/utils"

const accentBarVariants = cva(
  "overflow-hidden rounded-sm",
  {
    variants: {
      orientation: {
        horizontal: "flex h-1 w-full flex-row",
        vertical: "flex h-full w-1 flex-col",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

const segmentColorClass = {
  "tag-p0": "bg-tag-p0",
  "tag-p1": "bg-tag-p1",
  "tag-p2": "bg-tag-p2",
  "tag-p3": "bg-tag-p3",
  brand: "bg-brand",
  muted: "bg-muted",
} as const

export type AccentBarColor = keyof typeof segmentColorClass

interface AccentBarProps extends VariantProps<typeof accentBarVariants> {
  color?: AccentBarColor
  segments?: 1 | 2 | 3 | 4
  colors?: readonly AccentBarColor[]
  className?: string
}

function AccentBar({
  color,
  segments = 1,
  colors,
  orientation = "horizontal",
  className,
}: AccentBarProps) {
  // Resolve segment colors. If `colors` provided, validate length; else repeat `color`.
  let resolved: readonly AccentBarColor[]
  if (segments === 1) {
    if (!color) throw new Error("AccentBar: `color` is required when segments === 1")
    resolved = [color]
  } else if (colors) {
    if (colors.length !== segments) {
      throw new Error(
        `AccentBar: \`colors\` length (${colors.length}) must equal \`segments\` (${segments})`
      )
    }
    resolved = colors
  } else if (color) {
    resolved = Array.from({ length: segments }, () => color)
  } else {
    throw new Error("AccentBar: provide `color` or `colors` matching `segments`")
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-slot="accent-bar"
      className={cn(accentBarVariants({ orientation }), className)}
    >
      {resolved.map((c, i) => (
        <span key={i} className={cn("flex-1", segmentColorClass[c])} />
      ))}
    </div>
  )
}

export { AccentBar }
```

### AvatarInitial (full skeleton)

```typescript
// packages/ui/components/ui/avatar-initial.tsx
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@multica/ui/lib/utils"
import { AVATAR_PALETTE, extractInitials, hashToPaletteIndex } from "@multica/ui/lib/avatar-color"

const avatarInitialVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
  {
    variants: {
      size: {
        sm: "size-6 text-xs",
        default: "size-8 text-sm",
        lg: "size-10 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface AvatarInitialProps extends VariantProps<typeof avatarInitialVariants> {
  name: string
  hashKey?: string
  className?: string
}

function AvatarInitial({ name, hashKey, size, className }: AvatarInitialProps) {
  const initials = extractInitials(name)
  const colorClasses = AVATAR_PALETTE[hashToPaletteIndex(hashKey ?? name)]
  const safeName = name.trim() || "Unknown user"

  return (
    <span
      role="img"
      aria-label={safeName}
      data-slot="avatar-initial"
      className={cn(avatarInitialVariants({ size }), colorClasses, className)}
    >
      {initials}
    </span>
  )
}

export { AvatarInitial }
```

### SegmentedControl (full skeleton)

```typescript
// packages/ui/components/ui/segmented-control.tsx
"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@multica/ui/lib/utils"

interface SegmentedControlProps {
  value: string
  onValueChange: (value: string) => void
  "aria-label": string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

function SegmentedControl({
  value,
  onValueChange,
  children,
  className,
  disabled,
  ...props
}: SegmentedControlProps) {
  return (
    <ToggleGroupPrimitive
      value={[value]}
      onValueChange={(next) => {
        // Single-select; swallow deselect to keep one value always set
        if (next.length > 0) onValueChange(next[0])
      }}
      multiple={false}
      orientation="horizontal"
      disabled={disabled}
      data-slot="segmented-control"
      className={cn(
        "inline-flex h-6 w-fit items-center gap-0 rounded-lg bg-muted p-[3px]",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  )
}

interface SegmentedControlItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

function SegmentedControlItem({
  value,
  children,
  disabled,
  className,
}: SegmentedControlItemProps) {
  return (
    <TogglePrimitive
      value={value}
      disabled={disabled}
      data-slot="segmented-control-item"
      className={cn(
        "inline-flex h-full min-w-8 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-all",
        "hover:text-foreground",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </TogglePrimitive>
  )
}

export { SegmentedControl, SegmentedControlItem }
```

### Pure utility module + tests (avatar-color)

```typescript
// packages/ui/lib/avatar-color.test.ts
import { describe, it, expect } from "vitest"
import {
  AVATAR_PALETTE,
  extractInitials,
  hashToPaletteIndex,
} from "./avatar-color"

describe("extractInitials", () => {
  it("returns 2 letters for 'First Last'", () => {
    expect(extractInitials("Stephan Rieche")).toBe("SR")
  })
  it("returns 1 letter for single-word names", () => {
    expect(extractInitials("Madonna")).toBe("M")
  })
  it("returns ? for empty input", () => {
    expect(extractInitials("")).toBe("?")
  })
  it("returns ? for whitespace", () => {
    expect(extractInitials("   ")).toBe("?")
  })
  it("strips leading non-alphanumerics", () => {
    expect(extractInitials("@@@ Stephan")).toBe("S")
  })
  it("uppercases lowercase", () => {
    expect(extractInitials("alice bob")).toBe("AB")
  })
})

describe("hashToPaletteIndex", () => {
  it("is deterministic across 100 calls", () => {
    const expected = hashToPaletteIndex("Stephan")
    for (let i = 0; i < 100; i++) {
      expect(hashToPaletteIndex("Stephan")).toBe(expected)
    }
  })
  it("returns an index in [0, AVATAR_PALETTE.length)", () => {
    for (const name of ["a", "Stephan", "Alice", "Bob", "Привет", ""]) {
      const idx = hashToPaletteIndex(name)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(AVATAR_PALETTE.length)
    }
  })
  it("locks in known fixture (regression guard)", () => {
    // Compute once during plan, hard-code here to detect algorithm drift.
    // Replace TBD with the actual computed index from the first run.
    expect(hashToPaletteIndex("Stephan")).toBe(/* TBD: compute from first run */ 0)
  })
})
```

### packages/ui/vitest.config.ts (lift from packages/views)

```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
})
```

### packages/ui/test/setup.ts (lift from packages/views — minimal subset)

```typescript
import "@testing-library/jest-dom/vitest"

// jsdom doesn't provide matchMedia
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom doesn't provide ResizeObserver — Base UI Toggle uses it for size
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
```

### SegmentedControl keyboard test (full skeleton)

```typescript
// packages/ui/components/ui/segmented-control.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SegmentedControl, SegmentedControlItem } from "./segmented-control"

function setup(initialValue = "p0") {
  const onValueChange = vi.fn()
  const utils = render(
    <SegmentedControl
      value={initialValue}
      onValueChange={onValueChange}
      aria-label="Issue priority"
    >
      <SegmentedControlItem value="p0">P0</SegmentedControlItem>
      <SegmentedControlItem value="p1">P1</SegmentedControlItem>
      <SegmentedControlItem value="p2">P2</SegmentedControlItem>
      <SegmentedControlItem value="p3">P3</SegmentedControlItem>
    </SegmentedControl>
  )
  return { ...utils, onValueChange }
}

describe("SegmentedControl", () => {
  it("renders aria-label on the root", () => {
    setup()
    expect(screen.getByRole("group", { name: "Issue priority" })).toBeInTheDocument()
  })

  it("ArrowRight from item 0 focuses item 1", async () => {
    const user = userEvent.setup()
    setup()
    const p0 = screen.getByRole("button", { name: "P0" })
    p0.focus()
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("button", { name: "P1" })).toHaveFocus()
  })

  it("ArrowLeft from item 0 wraps to last (loopFocus default true)", async () => {
    const user = userEvent.setup()
    setup()
    const p0 = screen.getByRole("button", { name: "P0" })
    p0.focus()
    await user.keyboard("{ArrowLeft}")
    expect(screen.getByRole("button", { name: "P3" })).toHaveFocus()
  })

  it("Home focuses first; End focuses last", async () => {
    const user = userEvent.setup()
    setup("p1")
    const p2 = screen.getByRole("button", { name: "P2" })
    p2.focus()
    await user.keyboard("{End}")
    expect(screen.getByRole("button", { name: "P3" })).toHaveFocus()
    await user.keyboard("{Home}")
    expect(screen.getByRole("button", { name: "P0" })).toHaveFocus()
  })

  it("Space activates focused item", async () => {
    const user = userEvent.setup()
    const { onValueChange } = setup()
    screen.getByRole("button", { name: "P2" }).focus()
    await user.keyboard(" ")
    expect(onValueChange).toHaveBeenCalledWith("p2")
  })

  it("clicking the active item does not deselect (value stays)", async () => {
    const user = userEvent.setup()
    const { onValueChange } = setup("p0")
    await user.click(screen.getByRole("button", { name: "P0" }))
    // Internal ToggleGroup fires with [], wrapper swallows — onValueChange NOT called
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("Tab moves focus OUT of the control (single tab stop)", async () => {
    const user = userEvent.setup()
    const { onValueChange } = setup()
    render(<button>after</button>)
    screen.getByRole("button", { name: "P0" }).focus()
    await user.tab()
    // Focus left the group entirely
    const p0 = screen.getByRole("button", { name: "P0" })
    const p1 = screen.getByRole("button", { name: "P1" })
    expect(p0).not.toHaveFocus()
    expect(p1).not.toHaveFocus()
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `as` prop for polymorphism (Radix) | `useRender` + `mergeProps` (Base UI) | Project-wide (Base UI v1.x adoption) | All atoms in `components/ui/` use the new pattern; TagChip follows |
| `cva` defaults for required-but-typed-loose props | Discriminated union with NO `defaultVariants` for the locked dimension | This phase | Forces caller to pass `color` — TS error if omitted, no silent default |
| `fireEvent.keyDown` for keyboard tests | `userEvent.keyboard("{ArrowRight}")` v14 setup model | testing-library/user-event v14 | Real focus state machine updates; required for Base UI ToggleGroup tests |
| Hand-rolled keyboard nav for segmented controls | Base UI ToggleGroup with `multiple={false}` | Base UI v1.0 stable | Roving tabindex + arrow keys + Home/End for free; reduces atom code by ~40 lines |

**Deprecated/outdated:**
- **Radix ToggleGroup** — project chose Base UI; do not import `@radix-ui/react-toggle-group` even though it's a familiar API.
- **`shadcn add` for these four** — these are repo-original components per UI-SPEC; don't run `pnpm ui:add tag-chip` (no such block exists; would fail or pull a wrong template).
- **`React.forwardRef` boilerplate for refs** — React 19 (in catalog) accepts `ref` as a regular prop; `useRender` already handles ref forwarding.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The hash output for `"Stephan"` will be a specific known index (`/* TBD */`) — needs to be computed once and hard-coded into the regression test | Code Examples → avatar-color test | Low — first test run reveals the value; lock it then. Fixture-locking guards against accidental algorithm drift. |
| A2 | `loopFocus` default `true` matches UI-SPEC's "ArrowLeft wraps from item 0 to last" | Architecture Patterns → SegmentedControl | Low — verified in Base UI `.d.ts` (`@default true`). |
| A3 | `data-pressed` (not `data-state="on"`) is the active-item attribute on Base UI's Toggle (UI-SPEC mentions `data-state="on"`) | Code Examples → SegmentedControl | Medium — UI-SPEC's `data-state="on"` may be stale (Radix terminology). Plan task should grep the Base UI Toggle source to confirm; falling back to `data-[pressed]` is safe since Base UI exposes a `pressed` data attribute. If wrong, the active-item style won't apply — easy to detect visually and fix in the cva string. |
| A4 | `userEvent.tab()` correctly leaves the ToggleGroup (single tab stop) | Code Examples → SegmentedControl test | Low — roving tabindex is Base UI's documented behavior; `userEvent.tab()` simulates the same. If wrong, the test's "Tab moves focus OUT" assertion fails — test is then a useful regression marker. |

## Open Questions

1. **Should `SegmentedControlItem` accept an `icon`-only variant with `px-2` (UI-SPEC line 219) without rendering a label?**
   - What we know: UI-SPEC says `px-3` for label-only, `px-2` for icon-only.
   - What's unclear: whether Phase 5/6 consumers actually need an icon-only segmented control in v1.
   - Recommendation: implement both `px-3` (label) and `px-2` (icon-only) via a `data-icon-only` attribute or a `size="icon"` cva variant from day one. Cost is one cva entry; benefit is no follow-up patch when Phase 6 needs an icon-mode toggle.

2. **Should `AccentBar`'s `colors` prop be a tuple type (`readonly [AccentBarColor, AccentBarColor]` for `segments={2}`) for compile-time length validation?**
   - What we know: UI-SPEC says "validated via TypeScript tuple" — implies tuple types.
   - What's unclear: whether tuple validation is worth the type-overload complexity (4 conditional types: 1/2/3/4 segments).
   - Recommendation: ship the runtime check (`if (colors.length !== segments) throw`) for now; add a discriminated-union conditional type in a follow-up if a real consumer mistypes. The runtime check is sufficient because AccentBar is only rendered from views that ship to dev first.

3. **Should `TagChip`'s remove-button `aria-label` be localizable (passed as a prop)?**
   - What we know: UI-SPEC says `aria-label="Remove tag"` is fixed English.
   - What's unclear: whether bilingual de/en consumers in Phase 5 want it German.
   - Recommendation: ship as fixed `"Remove tag"` per UI-SPEC; if a consumer needs it, expose a `removeAriaLabel?: string` prop in a follow-up patch (additive, non-breaking).

## Environment Availability

> Skipped — this phase is purely code/config. No external tools, services, runtimes, or CLIs beyond `pnpm`/`node`/`vitest` (all already used by `make check`). The only "missing" thing is the test infra inside `packages/ui`, which Wave 0 provisions.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (catalog `^4.1.0`, latest installed `4.1.5`) |
| Environment | jsdom 29.x (catalog) |
| React adapter | `@vitejs/plugin-react` (catalog) |
| Component testing | `@testing-library/react` (catalog), `@testing-library/jest-dom` (catalog) |
| Keyboard simulation | `@testing-library/user-event` v14 (catalog) — REQUIRED for SegmentedControl arrow-key tests |
| Config file | `packages/ui/vitest.config.ts` — **does not exist; created in Wave 0** |
| Setup file | `packages/ui/test/setup.ts` — **does not exist; created in Wave 0** |
| Quick run command | `pnpm --filter @multica/ui exec vitest run <file-pattern>` |
| Full suite command | `pnpm --filter @multica/ui test` |
| Whole-monorepo | `pnpm test` (Turborepo discovers `packages/ui` once `test` script is added) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | TagChip renders all 5 colors with correct `bg-tag-p*`/`text-tag-p*-foreground` classes | unit | `pnpm --filter @multica/ui exec vitest run components/ui/tag-chip.test.tsx` | ❌ Wave 0 (file) + Wave 0 (infra) |
| UI-01 | TagChip with `onRemove` renders X button with `aria-label="Remove tag"`; click fires callback | unit | same as above | ❌ Wave 0 |
| UI-01 | TagChip with `render` prop swaps to `<a>` (polymorphism) | unit | same as above | ❌ Wave 0 |
| UI-02 | AccentBar renders single-color and multi-segment (2/3/4); `role="presentation"` + `aria-hidden="true"` present | unit | `pnpm --filter @multica/ui exec vitest run components/ui/accent-bar.test.tsx` | ❌ Wave 0 |
| UI-02 | AccentBar orientation prop flips dimension classes | unit | same as above | ❌ Wave 0 |
| UI-02 | AccentBar throws when `colors.length !== segments` | unit | same as above | ❌ Wave 0 |
| UI-03 | `extractInitials("Stephan Rieche")` → `"SR"`; `""` → `"?"`; single-word → 1 letter; punctuation prefix stripped | unit (pure) | `pnpm --filter @multica/ui exec vitest run lib/avatar-color.test.ts` | ❌ Wave 0 |
| UI-03 | `hashToPaletteIndex("Stephan")` deterministic across 100 calls; index in `[0, 8)` | unit (pure) | same as above | ❌ Wave 0 |
| UI-03 | AvatarInitial `aria-label` matches name; `"Unknown user"` when empty; size prop produces `size-6`/`size-8`/`size-10` | unit | `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` | ❌ Wave 0 |
| UI-03 | AvatarInitial `hashKey` overrides name for color | unit | same as above | ❌ Wave 0 |
| UI-04 | SegmentedControl renders all items; `aria-label` on root | unit | `pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx` | ❌ Wave 0 |
| UI-04 | Click item fires `onValueChange(value)` with string (not array) | unit | same as above | ❌ Wave 0 |
| UI-04 | ArrowRight focuses next; ArrowLeft from first wraps to last | unit (keyboard) | same as above — uses `userEvent.keyboard("{ArrowRight}")` | ❌ Wave 0 |
| UI-04 | Home focuses first, End focuses last | unit (keyboard) | same as above | ❌ Wave 0 |
| UI-04 | Space/Enter activates focused item | unit (keyboard) | same as above | ❌ Wave 0 |
| UI-04 | Tab leaves the control (single tab stop, roving tabindex) | unit (keyboard) | same as above | ❌ Wave 0 |
| UI-04 | Clicking the active item does NOT fire `onValueChange([])` (deselect-swallow) | unit | same as above | ❌ Wave 0 |
| UI-04 | Disabled item is not focusable / not activatable | unit | same as above | ❌ Wave 0 |
| All | Atoms render correctly under `<div className="dark">` ancestor — assert presence of token classes (no pixel snapshot) | unit (theme) | each atom's test file | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @multica/ui exec vitest run <changed-file-test>` — sub-second per atom.
- **Per wave merge:** `pnpm --filter @multica/ui test` — full UI package suite.
- **Phase gate:** `make check` runs (typecheck + tests + lint + Go tests + E2E). The `pnpm test` step inside `make check` will pick up `packages/ui` once the `test` script is added in Wave 0.

### Wave 0 Gaps

- [ ] `packages/ui/package.json` — add `"test": "vitest run"` script
- [ ] `packages/ui/package.json` — add `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` to `devDependencies` (all `catalog:` references)
- [ ] `packages/ui/vitest.config.ts` — create (mirror `packages/views/vitest.config.ts` verbatim)
- [ ] `packages/ui/test/setup.ts` — create (subset of `packages/views/test/setup.ts`: jest-dom matcher import + `matchMedia` shim + `ResizeObserver` shim; `localStorage` shim NOT needed for these atoms)
- [ ] `packages/ui/lib/avatar-color.ts` — create pure module (djb2 + extractInitials + AVATAR_PALETTE)
- [ ] `packages/ui/lib/avatar-color.test.ts` — covers UI-03 deterministic hash + initials extraction
- [ ] `packages/ui/components/ui/tag-chip.test.tsx` — covers UI-01
- [ ] `packages/ui/components/ui/accent-bar.test.tsx` — covers UI-02
- [ ] `packages/ui/components/ui/avatar-initial.test.tsx` — covers UI-03 component layer
- [ ] `packages/ui/components/ui/segmented-control.test.tsx` — covers UI-04
- [ ] Smoke check after Wave 0 infra task: `pnpm --filter @multica/ui exec vitest run --reporter=basic` should report "no test files found" cleanly (not error) before any test file is added; once first test file lands, it should pass.

## Security Domain

Required because `security_enforcement` is not explicitly disabled in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | These atoms have no auth — they're pure presentational primitives. |
| V3 Session Management | no | No sessions, no cookies, no tokens. |
| V4 Access Control | no | No data access; consumers handle authorization above the atom layer. |
| V5 Input Validation | yes (light) | The `name` prop on AvatarInitial accepts any string. The pure `extractInitials` strips leading non-alphanumerics and handles empty/whitespace — covered by tests. The `aria-label` is set to user-supplied `name` — see V14.5 below. |
| V6 Cryptography | no | The djb2 hash is **not cryptographic** and is **not used for security** — it's a perceptual color picker. Document inline that djb2 is NOT a substitute for a real hash anywhere a security boundary exists. |
| V14 Configuration | yes (XSS-adjacent) | TagChip `children` and AvatarInitial `name` are React children — React auto-escapes. **No `dangerouslySetInnerHTML`** anywhere in these atoms. The `aria-label={name}` attribute is set via React's prop system, which also escapes — safe. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user-supplied `name` rendered into AvatarInitial | Tampering | React JSX auto-escaping; no `innerHTML`; no `dangerouslySetInnerHTML`; `aria-label` set via prop binding (escaped) |
| XSS via TagChip `children` (e.g. tag name from user content) | Tampering | React JSX auto-escaping; no element-from-string parsing; consumers should not pass `dangerouslySetInnerHTML` through `children` |
| Misuse of djb2 hash as if it were cryptographic | Information Disclosure | Inline comment in `lib/avatar-color.ts`: "djb2 is a NON-cryptographic perceptual hash for color selection. Do NOT use for IDs, secrets, or any security boundary." |
| Hash-collision spoofing of avatar color | Spoofing | N/A — color is decorative, not authoritative; collisions are expected and acceptable for an 8-bucket palette |
| Click-jacking on TagChip remove button | Tampering | The remove button uses `e.stopPropagation()` to prevent unintended parent activation; standard React event model — no iframe vulnerability surface |

## Sources

### Primary (HIGH confidence)

- [VERIFIED: `node_modules/.pnpm/@base-ui+react@1.3.0/.../@base-ui/react/toggle-group/ToggleGroup.d.ts`] — exact ToggleGroup API (multiple, value array shape, loopFocus default, orientation)
- [VERIFIED: `node_modules/.pnpm/@base-ui+react@1.3.0/.../@base-ui/react/toggle-group/ToggleGroupDataAttributes.d.ts`] — data attributes (`data-disabled`, `data-orientation`, `data-multiple`)
- [VERIFIED: `node_modules/.pnpm/@base-ui+react@1.3.0/.../@base-ui/react/toggle/Toggle.d.ts`] — Toggle props (pressed, defaultPressed, value, onPressedChange)
- [VERIFIED: `packages/ui/components/ui/badge.tsx`] — useRender + mergeProps polymorphism pattern (template for TagChip)
- [VERIFIED: `packages/ui/components/ui/toggle.tsx`] — focus-visible recipe + cva size variants
- [VERIFIED: `packages/ui/components/ui/toggle-group.tsx`] — ToggleGroup wrapping idiom + roving-focus comment
- [VERIFIED: `packages/ui/components/ui/avatar.tsx`] — `after:border` ring trick + size data attribute pattern
- [VERIFIED: `packages/ui/components/ui/tabs.tsx`] — `bg-muted` track + `data-active:bg-background data-active:shadow-sm` recipe (basis for SegmentedControl visuals)
- [VERIFIED: `packages/views/vitest.config.ts` + `packages/views/test/setup.ts`] — test infra blueprint to lift into `packages/ui`
- [VERIFIED: `packages/views/auth/login-page.test.tsx`] — `userEvent.setup()` v14 invocation pattern
- [VERIFIED: `pnpm-workspace.yaml`] — catalog versions for vitest / jsdom / RTL / user-event
- [VERIFIED: `packages/ui/styles/tokens.css`] — Phase 1 tokens (`--tag-p0..p3`, `--brand`, all `@theme inline` bindings) confirmed present
- [VERIFIED: `npm view @testing-library/user-event version` → 14.6.1; `npm view vitest version` → 4.1.5; `npm view @base-ui/react version` → 1.4.1] — current registry versions
- [CITED: `02-UI-SPEC.md`] — locked design contract for all four atoms
- [CITED: `01-RESEARCH.md`] — Phase 1 token system context, `@theme inline` binding mechanism

### Secondary (MEDIUM confidence)

- [CITED: `https://base-ui.com/react/components/toggle-group`] — public Base UI docs (corroborates the .d.ts findings: `multiple`, `value: string[]`, `loopFocus`, ARIA semantics)

### Tertiary (LOW confidence)

- None — all factual claims have a primary source.

## Project Constraints (from CLAUDE.md)

These project rules constrain the implementation directly:

- **Package boundary:** `packages/ui` has zero `@multica/core` imports, zero `next/*`, zero `react-router-dom`. The atoms are pure UI; no API calls, no auth, no router. (Confirmed in UI-SPEC and verified across all existing files in `packages/ui/components/ui/`.)
- **Base UI primitives only** (no Radix). Verified — all existing files use `@base-ui/react/*`.
- **shadcn config in `packages/ui/components.json`** — `style: "base-nova"`, `iconLibrary: "lucide"`, alias `ui: "@multica/ui/components/ui"`. New atoms follow these aliases for any internal imports.
- **No hardcoded color values** (`text-red-500`, `bg-gray-100`). All atom styles use semantic tokens (`bg-tag-p0`, `text-foreground`, etc.) — UI-SPEC enforces this independently.
- **Many small files > few large files** — one component per file (already the convention in `components/ui/`).
- **TypeScript strict mode is enabled** — explicit types on all exports; no `any`.
- **Tests follow the code, not the app** — atoms test in `packages/ui` (NOT in `apps/web` or `apps/desktop`). Mocking `@multica/core` or `next/*` is a smell; these aren't allowed imports here, so the temptation shouldn't even arise.
- **Catalog references for shared deps** — every test devDep added in Wave 0 uses `catalog:` (verified the catalog already has them).
- **Comments in English only** — applies to all new files.
- **No `console.log` in production code** — no logging needed for these atoms; the AccentBar runtime errors should `throw` (caught by error boundaries upstream), not log.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every dep verified in `packages/ui/package.json` or `pnpm-workspace.yaml` catalog; missing test deps are catalog-resolved adds.
- Architecture: **HIGH** — every pattern grounded in an existing file (badge, toggle, toggle-group, avatar, tabs); the SegmentedControl array↔string adapter is the only novel composition and it's supported by the verified Base UI type signatures.
- Pitfalls: **HIGH** — derived from the verified `.d.ts` files (the `toggleMultiple` correction, the `value: string[]` shape, the deselect edge case) and from the absence of test infra in `packages/ui` (verified via `find` and `package.json` inspection).
- Validation Architecture: **HIGH** — pattern lifted from working `packages/views` config; commands tested mentally against the existing turbo + pnpm setup.
- Security: **HIGH** — atoms have minimal attack surface; React's auto-escaping covers the only XSS-adjacent input (`name` prop into `aria-label` and `extractInitials`).

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days; stable libraries, no upcoming Base UI breaking changes signaled)
