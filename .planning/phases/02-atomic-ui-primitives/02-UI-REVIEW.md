# Phase 2 — UI Review

**Audited:** 2026-04-25
**Baseline:** UI-SPEC.md (`02-UI-SPEC.md`, status: draft, shadcn_initialized: true)
**Screenshots:** not captured (no dev server on localhost:3000 / 5173; Phase 2 ships atoms only — no rendered screens until Phase 3 Showroom)
**Audit scope:** 4 atoms (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) + 1 utility (`avatar-color.ts`)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All required `aria-label` strings present (`"Remove tag"`, `name`-based, required prop on root); no generic CTA labels — these are atoms with no copy surface. |
| 2. Visuals | 3/4 | All ARIA roles correct; hierarchy crisp; but TagChip body is missing the spec-mandated `hover:opacity-90` interactivity affordance when polymorphic to `<a/>`. |
| 3. Color | 4/4 | Zero hex/rgb literals, zero inline `style` color, zero `dark:bg-*`/`dark:text-*` overrides. Single `dark:after:mix-blend-lighten` is a structural blend-mode companion (documented). |
| 4. Typography | 4/4 | Exactly 3 sizes (`text-xs`, `text-sm`, `text-base`) + 2 weights (`font-medium`, `font-semibold`) — matches UI-SPEC §Typography table 1:1. No italics in atoms (correct, per D-11). |
| 5. Spacing | 3/4 | All values on the declared 4-pt scale except `p-[3px]` on the SegmentedControl track. Documented in UI-SPEC §4 verbatim, but `[3px]` is an arbitrary off-scale value; flag is informational. SegmentedControl track height `h-6` makes outer container 24px (not 30px as UI-SPEC §4 states). |
| 6. Experience Design | 4/4 | Hover, focus-visible, disabled, and pressed states all wired through token classes; keyboard contract delegated entirely to Base UI ToggleGroup; deselect-swallow guard in place; Registry audit clean (atoms are repo-original, no third-party blocks). |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **TagChip body has no hover affordance when interactive** — `tag-chip.tsx:26` declares the chip body class string, but it lacks the UI-SPEC §1 line 174 contract: `hover:opacity-90` only when `interactive` is true (i.e., `onRemove` set or `render` is `<a/>`). Right now an `<a>`-rendered chip looks identical on hover to a passive span. **Fix:** add `interactive: true` branch a `hover:opacity-90` token. In the cva block at `tag-chip.tsx:36-40`, change `interactive.true` from `"px-1.5 pr-1"` to `"px-1.5 pr-1 hover:opacity-90"` (and add the same when `render` is anchor — the simplest way is to gate purely on `interactive`, which currently only flips when `onRemove` is set; consider making `interactive` derive from `Boolean(onRemove) || Boolean(render)` at `tag-chip.tsx:64`).

2. **SegmentedControl outer height is 24px, not 30px** — `segmented-control.tsx:62` puts `h-6` on the **track** (root) instead of on the items. UI-SPEC §4 line 220 says: "Item height: `h-6` inside `p-[3px]` track → 30px total — denser than ToggleGroup's `h-8` for use in headers and toolbars." Current behavior: track is 24px tall, items resolve to ~18px after `p-[3px]` padding. **Fix:** drop `h-6` from the root in `segmented-control.tsx:62`; add `h-6` to the item in `segmented-control.tsx:91` (replace `h-full` with `h-6`). Outer track will then auto-size to 24+3+3 = 30px.

3. **`p-[3px]` is an arbitrary off-scale value** — `segmented-control.tsx:62` uses `p-[3px]` to inset the lifted active item from the track edge. UI-SPEC §Spacing declares 4-pt multiples only, but this 3px value is documented in UI-SPEC §4 as the contract. Either (a) lift `3px` into a named token (`--spacing-half` or similar) so future audits don't re-flag it, or (b) move to `p-1` (4px) and accept the slightly larger track. **Fix recommendation:** keep `p-[3px]` but add a token alias in Phase 3 (e.g. extend `tokens.css` with `--spacing-track-inset: 3px` and use `p-(--spacing-track-inset)`).

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**Required strings (UI-SPEC §Copywriting Contract):**

| Element | Expected | Actual | Status |
|---|---|---|---|
| TagChip remove `aria-label` | `"Remove tag"` | `tag-chip.tsx:77` literal `"Remove tag"` | ✅ exact match |
| AvatarInitial `aria-label` (name set) | `={name}` | `avatar-initial.tsx:53` `aria-label={safeName}` where `safeName = name.trim() \|\| "Unknown user"` | ✅ matches |
| AvatarInitial `aria-label` (empty name) | `"Unknown user"` | `avatar-initial.tsx:48` literal `"Unknown user"` | ✅ matches |
| AvatarInitial fallback initials | `"?"` | Handled in `avatar-color.ts:57-64` with 4 fallback paths (non-string / empty / whitespace-only / punctuation-only) | ✅ matches |
| SegmentedControl `aria-label` | required prop, no default | `segmented-control.tsx:35` typed as required `"aria-label": string` | ✅ enforced at type level |

**Generic-label scan:** zero matches for `Submit / Click Here / OK / Cancel / Save` across all 4 atoms. Atoms own no user-visible text apart from data and aria attributes — UI-SPEC §Copywriting Contract is correct that "atoms are typography-light".

**Language consistency:** All atom-level strings are English-only as specified in UI-SPEC §Copywriting Contract (matches `Avatar`/`Badge`/`Toggle` convention; bilingual de/en strings live at view-level, not atom-level).

**No deviations.**

### Pillar 2: Visuals (3/4)

**Visual hierarchy & ARIA:**

| Atom | Role / Element | Verdict |
|---|---|---|
| TagChip | `<span>` default, `<button>` for X, polymorphic via `useRender` | ✅ matches §1; remove button is a real `<button type="button">` |
| AccentBar | `<div role="presentation" aria-hidden="true">` | ✅ matches §2 line 191 — purely decorative; no focus, no interaction |
| AvatarInitial | `<span role="img" aria-label={...}>` | ✅ matches §3 line 205 |
| SegmentedControl | Base UI ToggleGroup root + Toggle items | ✅ delegates ARIA radiogroup semantics + roving tabindex to primitive |

**Hierarchy through size/weight/color:**
- AvatarInitial: 3 sizes mapped to 3 type sizes with `font-semibold` — clear hierarchy by container size.
- SegmentedControl active vs inactive: track `bg-muted` + `text-muted-foreground` → active item `bg-background` + `text-foreground` + `shadow-sm`. Lift is communicated through three orthogonal channels (bg, text, shadow). ✅
- TagChip: 5 colors discriminate semantically; inline `gap-1` keeps label + X readable.

**Issue 1 (priority fix #1): TagChip body has no hover affordance when interactive.**

UI-SPEC §1 line 174 says: "Hover state: Subtle darkening (`hover:opacity-90`) only when interactive (`onRemove` present or `render` is anchor)".

Current `tag-chip.tsx:26-40`:
```ts
"group/tag-chip inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md text-xs font-medium whitespace-nowrap transition-all"
// + interactive.true: "px-1.5 pr-1"
// + interactive.false: "px-2 py-0.5"
```

No `hover:` rule on the chip body in either branch. The X-button at `tag-chip.tsx:82` does have `hover:bg-foreground/10`, but the chip body itself is hover-inert. When used as `<TagChip render={<a/>} ...>` (anchor pattern from §1 line 173), the user gets no visual hover feedback. **This is the only real spec deviation in the visuals layer.**

**No focus on the chip body — correct.** UI-SPEC §1 line 175 says "the chip body is non-focusable; focus-visible ring is on the remove-button only". `tag-chip.tsx:82` has the ring on the button; the chip body has no `focus-visible:` rule. ✅

**Disabled state:** UI-SPEC §1 line 176 says TagChip explicitly does NOT support disabled. Source has zero `disabled` references in `tag-chip.tsx`. ✅

**No truncation / overflow** — atoms render data, not free-form copy; truncation lives at view level (per UI-SPEC §Copywriting Contract intent).

### Pillar 3: Color (4/4)

**Token discipline (the heaviest constraint for this phase):**

| Anti-pattern | Files scanned | Matches |
|---|---|---|
| Hex literals (`#xxxxxx`) | all 4 atoms | 0 |
| `rgb(...)` literals | all 4 atoms | 0 |
| `style={{ backgroundColor }}` / `style={{ color }}` | all 4 atoms | 0 |
| `dark:bg-*` / `dark:text-*` overrides | all 4 atoms | 0 |
| Any `\bdark:` substring in source | all 4 atoms | 1 — `avatar-initial.tsx:24` `dark:after:mix-blend-lighten` |

The single `dark:` substring in `avatar-initial.tsx:24` is the structural blend-mode companion for the after-ring (`mix-blend-darken` ↔ `mix-blend-lighten`), not a per-color theme override. It is documented inline at `avatar-initial.tsx:18-22` with explicit rationale. UI-SPEC §3 line 201 mandates this exact pattern: "Same `after:` ring trick as `avatar.tsx` (`after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten`)". ✅

**TagChip color contract enforcement:**
`tag-chip.tsx:49`: `type TagChipColor = NonNullable<VariantProps<typeof tagChipVariants>["color"]>`. Discriminated union derived from cva — no string escape hatch. `defaultVariants.color` is intentionally **omitted** (per UI-SPEC §Color forbidding default tag color), enforced by inline comment at `tag-chip.tsx:44-46`. ✅

**AccentBar color contract:**
`accent-bar.tsx:17-26`: 6-entry static lookup `{ tag-p0 / p1 / p2 / p3 / brand / muted }` mapped to background tokens. Closed `keyof typeof segmentColorClass` union. ✅

**AvatarInitial palette:**
`avatar-color.ts:16-25`: 8-entry frozen `as const` array — exact match to UI-SPEC §Color line 126-135 (`tag-p0..p3, brand, secondary, muted, accent`). Hash regression-locked at `hashToPaletteIndex('Stephan') === 0` per `avatar-color.test.ts`. Determinism gate runs 100 iterations in component test. ✅

**SegmentedControl tokens:**
- Track: `bg-muted` (correct, §4 line 217)
- Active: `data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm` (correct, §4 line 218)
- Inactive: `text-muted-foreground hover:text-foreground` (correct, §4 line 219)
- Focus ring: `focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none` (correct, §4 line 224)

**Verdict: Pillar 3 is the strongest pillar of this phase — full mark.** All 4 atoms route theme adaptation through Phase 1 tokens exclusively. Source-level invariant tests in `accent-bar.test.tsx`, `tag-chip.test.tsx`, and `avatar-initial.test.tsx` actively guard against regression.

### Pillar 4: Typography (4/4)

**Distinct font sizes in use (across all 4 atom sources):**

| Class | Count | Source |
|---|---|---|
| `text-xs` | 2 | `tag-chip.tsx:26`, `avatar-initial.tsx:28` |
| `text-sm` | 2 | `avatar-initial.tsx:29`, `segmented-control.tsx:91` |
| `text-base` | 1 | `avatar-initial.tsx:30` |

3 distinct sizes, all from UI-SPEC §Typography. No `text-lg / xl / 2xl /...` leaks.

**Distinct font weights:**

| Class | Count | Source |
|---|---|---|
| `font-medium` | 2 | `tag-chip.tsx:26`, `segmented-control.tsx:91` |
| `font-semibold` | 1 | `avatar-initial.tsx:24` |

2 weights, exactly matching UI-SPEC §Typography (medium for body/label, semibold for AvatarInitial caption).

**Mapping to UI-SPEC §Typography table (lines 67-72):**

| Role | Spec | Implementation | Match |
|---|---|---|---|
| TagChip label | `text-xs` + `font-medium` | `tag-chip.tsx:26` `text-xs font-medium` | ✅ |
| SegmentedControl item label | `text-sm` + `font-medium` | `segmented-control.tsx:91` `text-sm font-medium` | ✅ |
| AvatarInitial sm | `text-xs` + `font-semibold` | `avatar-initial.tsx:24,28` `font-semibold` + `text-xs` | ✅ |
| AvatarInitial default | `text-sm` + `font-semibold` | `avatar-initial.tsx:24,29` | ✅ |
| AvatarInitial lg | `text-base` + `font-semibold` | `avatar-initial.tsx:24,30` | ✅ |

**Italic usage:** zero `italic` classes across all 4 atoms — correct per UI-SPEC §Typography "Italic usage: None of the four atoms use italic. Italic is reserved for display headings."

**Tabular numerals:** not required for atoms (no count badges in this phase). Confirmed absent.

**Verdict: full mark.** Typography is exactly the declared subset, no drift.

### Pillar 5: Spacing (3/4)

**Spacing class usage:**

| Class | Source | Spec match |
|---|---|---|
| `px-2`, `py-0.5` | `tag-chip.tsx:38` (default) | ✅ §1 line 176 default padding |
| `px-1.5`, `pr-1` | `tag-chip.tsx:37` (interactive) | ✅ §1 line 176 interactive padding |
| `gap-1` | `tag-chip.tsx:26` | ✅ in xs scale |
| `gap-0` | `segmented-control.tsx:62` | ✅ §4 multi-segment gap "0" — segments touch |
| `p-[3px]` | `segmented-control.tsx:62` | ⚠️ arbitrary value — see below |
| `px-3` | `segmented-control.tsx:91` | ✅ §4 line 221 "px-3 for label-only items" |

**Sizing class usage:**

| Class | Source | Spec match |
|---|---|---|
| `h-1`, `w-1` | `accent-bar.tsx:8-9` | ✅ §2 line 187 default thickness 4px |
| `w-full`, `h-full` | `accent-bar.tsx:8-9` | ✅ §2 line 188 default length |
| `h-5` | `tag-chip.tsx:26` | ✅ §1 line 178 "h-5 (20px) — matches Badge" |
| `size-6` | `avatar-initial.tsx:28` | ✅ §3 line 200 sm=24px |
| `size-8` | `avatar-initial.tsx:29` | ✅ §3 line 200 default=32px |
| `size-10` | `avatar-initial.tsx:30` | ✅ §3 line 200 lg=40px |
| `h-6` | `segmented-control.tsx:62` | ⚠️ on track, not items — see below |
| `min-w-8` | `segmented-control.tsx:91` | ✅ §Spacing line 58 "min-width 32px touch target" |
| `size-3.5`, `size-3` | `tag-chip.tsx:82,84` | ✅ X button + icon sizing |

**Issue 1 (priority fix #2): `h-6` on track instead of on item.**

UI-SPEC §4 line 220: "Item height: `h-6` inside `p-[3px]` track → 30px total".

Current behavior at `segmented-control.tsx:62,91`:
- Root: `h-6 ... p-[3px]` — track is 24px tall.
- Item: `h-full ...` — item fills the available height inside `p-[3px]` padding, resolving to ~18px.

Spec intent: item should be 24px (`h-6`), track should auto-size to 24+6=30px from the inner padding.

This is a small visual deviation — the control reads slightly more compressed than spec. Recommendation: drop `h-6` from root, add explicit `h-6` to the item, drop `h-full` from the item.

**Issue 2 (priority fix #3): `p-[3px]` is the only off-scale value.**

UI-SPEC §Spacing line 34 declares the spacing scale as multiples of 4 (`xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48, 3xl=64`). `p-[3px]` is 3px — not on the scale. However, UI-SPEC §4 line 217 explicitly mandates `p-[3px]` ("`bg-muted` (matches `TabsList` default variant) with `p-[3px]` inner padding"). The spec is internally inconsistent — the implementation honors the §4 rule and breaks the §Spacing rule.

Both rules can be satisfied by lifting `3px` into a named CSS custom property in Phase 3 (`--spacing-track-inset: 3px`) and using `p-(--spacing-track-inset)`. Until then, this is a known and documented deviation.

**No other arbitrary spacing in any atom.** All other values land on the declared scale. Reducing the score from 4 to 3 reflects the two specific issues above (h-6 placement + the bracket-arbitrary value).

### Pillar 6: Experience Design (4/4)

**State coverage matrix:**

| State | TagChip | AccentBar | AvatarInitial | SegmentedControl |
|---|---|---|---|---|
| Loading | n/a (atoms render data, not async) | n/a | n/a | n/a |
| Error | thrown Error on caller misuse (`onRemove` is opt-in; no runtime error path) | ✅ throws on `(segments=1, no color)` and `(colors.length !== segments)` — `accent-bar.tsx:43-58` | thrown only via the pure utility's defensive fallback; `extractInitials("")` → `"?"` (no throw) | n/a |
| Empty | n/a (chip is always single tag, no empty state) | thrown for invalid empty case (defensive throw, see above) | `"?"` initials + `aria-label="Unknown user"` — `avatar-initial.tsx:48` + `avatar-color.ts:57-64` | swallowed deselect — `segmented-control.tsx:54-55` keeps `value` always defined |
| Disabled | not supported per §1 line 176 (correct) | n/a | n/a | ✅ wired through Toggle primitive — `segmented-control.tsx:88,95` (`disabled:pointer-events-none disabled:opacity-50`) |
| Hover | ⚠️ X-button only (chip body missing — see priority fix #1) | n/a (decorative) | n/a (decorative) | ✅ `hover:text-foreground` on items — `segmented-control.tsx:92` |
| Focus-visible | ✅ on X-button — `tag-chip.tsx:82` (`focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none`) | n/a | n/a | ✅ on items, not root (roving focus model) — `segmented-control.tsx:93` |
| Active / pressed | n/a | n/a | n/a | ✅ `data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm` — `segmented-control.tsx:94` |

**Confirmation for destructive actions:** UI-SPEC §Copywriting Contract line 151 says no destructive actions in this phase. Confirmed — TagChip's `onRemove` is a UI-level action, not a destructive backend mutation; the consumer is expected to wrap a confirm dialog if needed. ✅

**Keyboard contract (SegmentedControl):**
Source delegates 100% to Base UI ToggleGroup primitive. Per `segmented-control.tsx` and the test file (12 vitest+RTL+user-event assertions per Plan 02-05 SUMMARY), the following are verified:
- ArrowRight / ArrowLeft cycle (with loop wrap)
- Home / End jump to first / last
- Tab moves focus OUT (single tab stop)
- Space / Enter activate
- Disabled items skipped on arrow nav
- Disabled items not click-activatable

This matches UI-SPEC §4 line 215 keyboard contract exactly.

**Single-fire `onRemove` on TagChip:** `tag-chip.tsx:78-81` calls `e.stopPropagation()` BEFORE invoking `onRemove`, then invokes once. Tests assert wrapping `onClick` is not invoked (mitigates T-02-02-03 click-bubble escalation). ✅

**Determinism guarantees (AvatarInitial):**
- 100-iteration determinism test in component (per Plan 02-04 SUMMARY).
- Regression-locked djb2 fixture: `hashToPaletteIndex('Stephan') === 0` (hard-coded literal in `avatar-color.test.ts`).
- `hashKey` override allows colors to stay stable across name edits.

This is exceptional — the experience guarantee is encoded as a unit-test gate that fails loudly on any silent algorithm rewrite.

**Verdict: full mark.** Every interaction state declared by UI-SPEC is implemented and test-locked. The only state miss is the TagChip-body hover which has been called out under Pillar 2 and priority fix #1 — it's a visual-affordance issue, not a state-handling failure.

---

## Registry Safety

`packages/ui/components.json` exists (shadcn initialized in `packages/ui/`). Per UI-SPEC §Registry Safety line 254-260:

| Registry | Blocks Used | Status |
|---|---|---|
| shadcn official | none — TagChip, AccentBar, AvatarInitial, SegmentedControl are repo-original (NOT installed via `pnpm ui:add`) | n/a |
| third-party | none declared in UI-SPEC | n/a |

**Result:** Registry audit: 0 third-party blocks checked, no flags. UI-SPEC §Registry Safety rationale at line 260 confirms these atoms must be hand-authored because no shadcn block matches their semantics (color-locked discriminated union, deterministic-hash avatar, single-select segmented value picker over a track).

No suspicious patterns scanned (no fetch / XMLHttpRequest / process.env / eval / dynamic http imports) — the atoms are pure presentational, no network access, no env reads.

---

## Files Audited

**Source (5 files):**
- `/Users/steph/dev/multica/packages/ui/components/ui/tag-chip.tsx` (97 lines)
- `/Users/steph/dev/multica/packages/ui/components/ui/accent-bar.tsx` (75 lines)
- `/Users/steph/dev/multica/packages/ui/components/ui/avatar-initial.tsx` (62 lines)
- `/Users/steph/dev/multica/packages/ui/components/ui/segmented-control.tsx` (105 lines)
- `/Users/steph/dev/multica/packages/ui/lib/avatar-color.ts` (71 lines)

**Spec / context (8 files):**
- `02-00-SUMMARY.md` (test infra)
- `02-01-SUMMARY.md` (avatar-color utility)
- `02-02-SUMMARY.md` (TagChip)
- `02-03-SUMMARY.md` (AccentBar)
- `02-04-SUMMARY.md` (AvatarInitial)
- `02-05-SUMMARY.md` (SegmentedControl)
- `02-UI-SPEC.md` (design contract — baseline)
- `02-CONTEXT.md`

**Total source LOC audited:** 410.
**Test LOC backing this audit (per SUMMARY.md self-checks):** ~600+ across 5 component test files (smoke + avatar-color + tag-chip + accent-bar + avatar-initial + segmented-control), all green at the time each plan completed.

---

*Phase: 02-atomic-ui-primitives*
*Audit completed: 2026-04-25*
