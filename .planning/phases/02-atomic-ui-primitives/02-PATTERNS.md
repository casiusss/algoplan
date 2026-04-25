# Phase 2: Atomic UI Primitives - Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 10 (4 atoms + 1 utility + 5 test/infra files)
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/ui/components/ui/tag-chip.tsx` | component (atom, presentational) | request-response (props in, JSX out) | `packages/ui/components/ui/badge.tsx` | exact |
| `packages/ui/components/ui/accent-bar.tsx` | component (atom, presentational) | request-response | `packages/ui/components/ui/badge.tsx` (CVA shell) + `packages/views/workspace/workspace-avatar.tsx` (size-map shape) | role-match |
| `packages/ui/components/ui/avatar-initial.tsx` | component (atom, presentational) | request-response | `packages/views/workspace/workspace-avatar.tsx` | exact |
| `packages/ui/components/ui/segmented-control.tsx` | component (compound atom, controlled) | request-response (controlled value/onValueChange) | `packages/ui/components/ui/toggle-group.tsx` + `packages/ui/components/ui/tabs.tsx` | exact |
| `packages/ui/lib/avatar-color.ts` | utility (pure function) | transform (string in → tag index out) | `packages/views/workspace/slug.ts` | role-match |
| `packages/ui/vitest.config.ts` | config (test infra) | n/a | `packages/views/vitest.config.ts` | exact |
| `packages/ui/test/setup.ts` | config (test infra) | n/a | `packages/views/test/setup.ts` | exact |
| `packages/ui/lib/avatar-color.test.ts` | test (unit, pure) | n/a | `packages/views/workspace/slug.test.ts` | exact |
| `packages/ui/components/ui/tag-chip.test.tsx` | test (unit, RTL) | n/a | `packages/views/styles/token-binding.test.tsx` | exact |
| `packages/ui/components/ui/accent-bar.test.tsx` | test (unit, RTL) | n/a | `packages/views/styles/token-binding.test.tsx` | exact |
| `packages/ui/components/ui/avatar-initial.test.tsx` | test (unit, RTL) | n/a | `packages/views/styles/token-binding.test.tsx` | exact |
| `packages/ui/components/ui/segmented-control.test.tsx` | test (unit, RTL) | n/a | `packages/views/styles/token-binding.test.tsx` + `packages/views/workspace/no-access-page.test.tsx` (interaction shape) | role-match |

## Pattern Assignments

### `packages/ui/components/ui/tag-chip.tsx` (component, presentational)

**Analog:** `packages/ui/components/ui/badge.tsx`

**What to copy:** `Badge` is the canonical "small pill with variant + className" primitive in this repo. Copy the entire shape — `cva()` variants block, `useRender` polymorphic export, `mergeProps` className composition, `data-slot` + `state.slot` wiring. The only delta: variants enumerate the four priority tokens (`p0…p3`) instead of semantic colors.

**Imports pattern** (lines 1-5):
```typescript
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@multica/ui/lib/utils"
```

**Core pattern — CVA + variants block** (lines 7-28):
```typescript
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 ... rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ...",
        secondary: "bg-secondary text-secondary-foreground ...",
        // ... etc
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```
**Adapt for tag-chip:** replace `variant` keys with `priority: { p0: "bg-tag-p0 text-tag-p0-foreground", p1: "bg-tag-p1 text-tag-p1-foreground", p2: "bg-tag-p2 text-tag-p2-foreground", p3: "bg-tag-p3 text-tag-p3-foreground" }`. Token classes are already verified-reachable by `packages/views/styles/token-binding.test.tsx` (Wave 0).

**Polymorphic render pattern** (lines 30-50):
```typescript
function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
```
**Adapt:** rename to `TagChip` / `tagChipVariants`, default tag stays `"span"`, state slot becomes `"tag-chip"`, expose `priority` in state.

---

### `packages/ui/components/ui/accent-bar.tsx` (component, presentational)

**Analog:** `packages/ui/components/ui/badge.tsx` (CVA shell + render contract) + `packages/views/workspace/workspace-avatar.tsx` (lookup-map mental model)

**What to copy:** AccentBar is a thin colored vertical/horizontal stripe (think left-side priority indicator on a row). It has the same shape as Badge — CVA + `useRender` over a `span` — but with a different base layout (`block` + fixed width/height, no padding, no font). Use Badge as the structural template; reuse the same `priority` variant token mapping as TagChip so both atoms stay synchronized.

**Imports + render shell:** identical to Badge (lines 1-5, 30-50 above). Strip the typography/padding/border classes from the base CVA string — accent bars are pure color rectangles.

**Variant block — copy Badge's `cva()` shape, supply Phase 2 tokens:**
```typescript
const accentBarVariants = cva(
  "block shrink-0 rounded-full",
  {
    variants: {
      priority: {
        p0: "bg-tag-p0",
        p1: "bg-tag-p1",
        p2: "bg-tag-p2",
        p3: "bg-tag-p3",
      },
      orientation: {
        vertical: "h-full w-1",
        horizontal: "h-1 w-full",
      },
    },
    defaultVariants: { priority: "p0", orientation: "vertical" },
  }
)
```

**Why workspace-avatar is a secondary reference:** its `sizeMap` (lines 3-7) is the same "enum-keyed lookup table" pattern that Phase 2's `AVATAR_PALETTE` and `priority` variant use. Same mental model, applied at variant-level via CVA instead of an inline object.

---

### `packages/ui/components/ui/avatar-initial.tsx` (component, presentational)

**Analog:** `packages/views/workspace/workspace-avatar.tsx`

**What to copy:** This file IS already an avatar-initial in everything but name. Copy verbatim, then promote it: (1) move into `@multica/ui` so both views and apps can use it without depending on `@multica/views`, (2) replace the hardcoded `bg-muted text-muted-foreground` with a palette lookup driven by `lib/avatar-color.ts`, (3) extend `sizeMap` if Phase 2 spec requires more sizes, (4) accept either a `name` (auto-extract initials) or explicit `initials` prop.

**Full pattern — copy entire file shape** (lines 1-29):
```typescript
import { cn } from "@multica/ui/lib/utils";

const sizeMap = {
  sm: "h-5 w-5 text-xs rounded",
  md: "h-7 w-7 text-xs rounded-md",
  lg: "h-9 w-9 text-sm rounded-md",
} as const;

interface WorkspaceAvatarProps {
  name: string;
  size?: keyof typeof sizeMap;
  className?: string;
}

function WorkspaceAvatar({ name, size = "sm", className }: WorkspaceAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border bg-muted font-semibold text-muted-foreground",
        sizeMap[size],
        className
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export { WorkspaceAvatar, type WorkspaceAvatarProps };
```

**Deltas for `AvatarInitial`:**
- Replace `name.charAt(0).toUpperCase()` with `extractInitials(name)` from `@multica/ui/lib/avatar-color`.
- Replace `bg-muted text-muted-foreground` with palette lookup: `AVATAR_PALETTE[djb2(name) % AVATAR_PALETTE.length]` resolved to `bg-tag-pN text-tag-pN-foreground`.
- Add prop `initials?: string` to override auto-extraction (agents may want custom initials).
- Drop the `border` class if Phase 2 spec wants flat avatars; keep otherwise.
- Follow-up out of scope: refactor `WorkspaceAvatar` itself to delegate to `AvatarInitial` (do NOT do this in Phase 2 — separate concern).

---

### `packages/ui/components/ui/segmented-control.tsx` (component, controlled compound)

**Analog:** `packages/ui/components/ui/toggle-group.tsx` (compound + Context fan-out) + `packages/ui/components/ui/tabs.tsx` (variant tokens via `cva` + `data-active` styling)

**What to copy:** A SegmentedControl is functionally a single-selection ToggleGroup styled like a TabsList. Use ToggleGroup as the structural blueprint (Provider context, `ToggleGroupItem` consuming context via `useContext`, `data-slot`/`data-variant`/`data-orientation` plumbing). Use TabsList's CVA variant strings for the visual treatment (muted background pill + `data-active:bg-background data-active:shadow-sm`).

**Imports pattern** (toggle-group.tsx lines 1-9):
```typescript
"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@multica/ui/lib/utils"
import { toggleVariants } from "@multica/ui/components/ui/toggle"
```
**Adapt:** if SegmentedControl needs a custom variant per Phase 2 spec, define `segmentedControlVariants` locally instead of importing `toggleVariants`. If a single-select variant of ToggleGroup is acceptable, reuse `toggleVariants` directly.

**Compound + Context pattern** (toggle-group.tsx lines 11-57):
```typescript
const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & { spacing?: number; orientation?: "horizontal" | "vertical" }
>({ size: "default", variant: "default", spacing: 0, orientation: "horizontal" })

function ToggleGroup({ className, variant, size, spacing = 0, orientation = "horizontal", children, ...props }) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-orientation={orientation}
      className={cn("group/toggle-group flex w-fit ... rounded-lg ...", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, spacing, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  )
}
```
**Adapt:** Force `single` selection mode (if `@base-ui/react/toggle-group` exposes the prop) so SegmentedControl always has exactly-one-active semantics. Keep the Context fan-out so `SegmentedControlItem` reads `size`/`variant` from parent.

**Item visual treatment — borrow from tabs.tsx `TabsTrigger`** (lines 56-70): the `data-active:bg-background data-active:shadow-sm` modifier + `text-foreground/60 hover:text-foreground` rest state is exactly the segmented-control aesthetic and is already wired to semantic tokens.

---

### `packages/ui/lib/avatar-color.ts` (utility, pure)

**Analog:** `packages/views/workspace/slug.ts` (closest pure utility in adjacent `views/workspace/` neighborhood; trivially small standalone module pattern)

**What to copy:** Pure-function module shape: a couple of named exports, no React, no side effects, deterministic. The actual algorithm (djb2 hash, initials extraction) is universally documented — implement directly per UI-SPEC, no analog needed for the math.

**Module shape to mirror:**
```typescript
// Three named exports, no default export.
export const AVATAR_PALETTE = ["p0", "p1", "p2", "p3"] as const;
export type AvatarPaletteIndex = typeof AVATAR_PALETTE[number];

export function djb2(input: string): number { /* ... */ }
export function extractInitials(name: string, max = 2): string { /* ... */ }
export function pickPaletteIndex(seed: string): AvatarPaletteIndex { /* ... */ }
```

**Constraints (from packages/ui CLAUDE rules):** zero React, zero `process.env`, zero `localStorage`. Pure TypeScript only. Place in `packages/ui/lib/` next to existing `utils.ts`.

---

## Test File Patterns

### `packages/ui/vitest.config.ts` (NEW, Wave 0)

**Analog:** `packages/views/vitest.config.ts`

**What to copy:** Identical 12-line config — same plugins, same jsdom env, same setup file path, same include glob. Zero deltas.

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
});
```

**Package.json companion change:** add `"test": "vitest run"` script and the same devDependencies block from `packages/views/package.json` lines 92-104 (`@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`, `jsdom`, `vitest` — all `catalog:`). This belongs in the Plan, not in PATTERNS.md, but flagged here because the config alone won't run without it.

---

### `packages/ui/test/setup.ts` (NEW, Wave 0)

**Analog:** `packages/views/test/setup.ts`

**What to copy:** Copy the full 63-line file verbatim. The `jest-dom` import + memory-storage shim + `matchMedia` stub + `ResizeObserver` stub + `elementFromPoint` stub are all required for any Phase 2 test that mounts a Base UI primitive (`useRender`, ToggleGroup, etc.). No Phase 2-specific deltas needed.

**Decision (out of scope for this map):** the planner may consider extracting this setup into a shared `@multica/tsconfig`-style package later, but for Phase 2 a direct copy is correct — duplicating 63 lines beats over-abstracting before the second consumer materializes.

---

### `packages/ui/lib/avatar-color.test.ts` (NEW)

**Analog:** `packages/views/workspace/slug.test.ts` (pure-function unit-test shape in the same monorepo)

**What to copy:** Standard Vitest `describe` / `it` / `expect` table-driven tests. No DOM, no mocks. Cover: djb2 determinism, djb2 distribution across the 4-color palette for representative inputs, `extractInitials` whitespace/single-name/empty-string/unicode edge cases.

```typescript
import { describe, expect, it } from "vitest";
import { djb2, extractInitials, pickPaletteIndex, AVATAR_PALETTE } from "./avatar-color";

describe("djb2", () => {
  it("is deterministic", () => { /* ... */ });
});
```

---

### `packages/ui/components/ui/tag-chip.test.tsx` (NEW)
### `packages/ui/components/ui/accent-bar.test.tsx` (NEW)
### `packages/ui/components/ui/avatar-initial.test.tsx` (NEW)

**Analog:** `packages/views/styles/token-binding.test.tsx` (Phase 1 / Wave 0 reference test)

**What to copy:** The exact test shape — `render()` from `@testing-library/react`, `describe`/`it`/`expect` from vitest, query via `data-testid` or `data-slot`, assert that the expected token classNames appear on the rendered element. jsdom does NOT compile Tailwind, so we test **className wiring only**, not resolved CSS. Real OKLCH resolution lives in E2E (per the leading comment in `token-binding.test.tsx` lines 1-13).

**Render + assert pattern** (token-binding.test.tsx lines 30-39):
```typescript
const { container } = render(
  <div className={className} data-testid="probe" />,
);
const probe = container.querySelector('[data-testid="probe"]');
expect(probe).not.toBeNull();
expect(probe?.className).toContain(className);
```

**Adapt per atom:**
- `tag-chip.test.tsx`: render `<TagChip priority="p0" />` for each of `p0…p3`, assert `bg-tag-pN` and `text-tag-pN-foreground` present on output. Also assert `data-slot="tag-chip"` and `useRender`'s `render` prop polymorphism.
- `accent-bar.test.tsx`: render `<AccentBar priority="pN" orientation="vertical|horizontal" />`, assert priority + orientation token classes present.
- `avatar-initial.test.tsx`: render `<AvatarInitial name="Stephan Rieche" />`, assert text content `"SR"` (extractInitials), assert palette class is one of the four `bg-tag-pN` values, assert deterministic — same name twice yields same class.

---

### `packages/ui/components/ui/segmented-control.test.tsx` (NEW)

**Analog:** `packages/views/styles/token-binding.test.tsx` (render shape) + `packages/views/workspace/no-access-page.test.tsx` (controlled-component / interaction shape)

**What to copy:** Same render-and-assert structure as token-binding test for static className checks (`data-active:bg-background`, `data-slot="segmented-control"`). For interaction (clicking an item flips active state), follow `no-access-page.test.tsx` style — use `@testing-library/user-event` (already in the views devDependencies block being copied), wrap state in a small controlled harness inside the test, click an item, assert `aria-pressed`/`data-state="on"` flips.

```typescript
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

it("flips active state on click", async () => {
  function Harness() {
    const [v, setV] = useState("a");
    return (
      <SegmentedControl value={v} onValueChange={setV}>
        <SegmentedControlItem value="a">A</SegmentedControlItem>
        <SegmentedControlItem value="b">B</SegmentedControlItem>
      </SegmentedControl>
    );
  }
  render(<Harness />);
  await userEvent.click(screen.getByText("B"));
  expect(screen.getByText("B")).toHaveAttribute("data-state", "on");
});
```

---

## Shared Patterns

### Variant System (CVA)
**Source:** `packages/ui/components/ui/badge.tsx` lines 7-28 and `packages/ui/components/ui/toggle.tsx` lines 8-27
**Apply to:** `tag-chip.tsx`, `accent-bar.tsx`, `segmented-control.tsx`
**Pattern:** Always reach for `cva()` from `class-variance-authority` (already in catalog). Variants block exposes one or two enum dimensions; default values via `defaultVariants`. Export both the component AND the `*Variants` function so consumers can compose className strings outside the component.

```typescript
import { cva, type VariantProps } from "class-variance-authority"
const fooVariants = cva("base classes", { variants: { /* ... */ }, defaultVariants: { /* ... */ } })
export { Foo, fooVariants }
```

### Polymorphic Render (Base UI `useRender`)
**Source:** `packages/ui/components/ui/badge.tsx` lines 36-49
**Apply to:** `tag-chip.tsx`, `accent-bar.tsx` (any presentational atom that should accept a `render` prop for `as`-style polymorphism)
**Pattern:** `useRender({ defaultTagName, props: mergeProps<"tag">({ className }, props), render, state: { slot, ...variants } })`. The `state.slot` value becomes a CSS data-slot for cross-component styling hooks; always set it.

### ClassName Composition
**Source:** `packages/ui/lib/utils.ts` (`cn(...inputs)` = `twMerge(clsx(inputs))`)
**Apply to:** All atom components and tests
**Pattern:** Always wrap final className with `cn(variantsCall(props), className)` so consumer overrides win. Never concatenate strings manually; never use `clsx` directly without `twMerge`.

### data-slot + data-{prop} Convention
**Source:** All `packages/ui/components/ui/*.tsx` files (badge, toggle, toggle-group, tabs, avatar)
**Apply to:** All four atoms
**Pattern:** Every root element receives `data-slot="<component-name>"` (kebab-case). Variant props that need CSS targeting (e.g. `data-active`, `data-orientation`, `data-size`, `data-variant`) are mirrored as `data-*` attributes. This enables descendant styling via `group-data-*` selectors without prop drilling — see how `toggle-group.tsx` uses `group-data-[spacing=0]/toggle-group:rounded-none` (line 75).

### Test File Co-Location
**Source:** `packages/views/workspace/slug.test.ts`, `create-workspace-form.test.tsx`, etc.
**Apply to:** All Phase 2 test files
**Pattern:** Test file lives next to the source file with `.test.ts` (pure) or `.test.tsx` (uses RTL) suffix. No separate `__tests__/` directory in this repo. Vitest's `include: ["**/*.test.{ts,tsx}"]` glob picks them up automatically.

### "Use client" Directive
**Source:** `packages/ui/components/ui/toggle.tsx`, `toggle-group.tsx`, `tabs.tsx`, `avatar.tsx` (all line 1)
**Apply to:** `segmented-control.tsx` (uses Base UI primitives that need client boundary). Likely NOT needed for `tag-chip.tsx`, `accent-bar.tsx`, `avatar-initial.tsx` (pure presentational, no client-only deps) — but follow Badge's lead and OMIT the directive for those three since Badge does (line 1 of badge.tsx has no "use client").

## No Analog Found

None. Every Phase 2 file has a strong existing analog in either `packages/ui/components/ui/` or `packages/views/`.

## Metadata

**Analog search scope:**
- `packages/ui/components/ui/` (badge, toggle, toggle-group, avatar, tabs)
- `packages/ui/lib/` (utils.ts)
- `packages/views/vitest.config.ts`, `packages/views/test/setup.ts`
- `packages/views/styles/token-binding.test.tsx` (Phase 1 reference)
- `packages/views/workspace/` (workspace-avatar, slug, create-workspace-form, no-access-page tests)

**Files scanned:** 11
**Pattern extraction date:** 2026-04-25
**Phase directory:** `/Users/steph/dev/multica/.planning/phases/02-atomic-ui-primitives/`
