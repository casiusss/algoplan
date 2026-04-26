---
phase: 06-issue-detail-remaining-views
plan: 03
subsystem: ui-settings
tags: [react, vitest, settings, german-strings, theme, danger-zone, oklch]

# Dependency graph
requires:
  - plan: 06-00
    provides: SettingsSection atom (default + danger tones)
  - plan: 04-app-shell-restyle
    provides: DarkModeToggle (sidebar) consuming useTheme() with storageKey="multica_theme"
  - plan: 02-primitives
    provides: AvatarInitial atom (used in AccountTab fallback)
  - plan: 01-token-foundation-typography
    provides: ThemeProvider wrapper pinning storageKey="multica_theme"
provides:
  - Sectioned Settings layout via <SettingsSection> across all 6 tabs
  - bg-sidebar tone on Settings left nav (replaces bg-background)
  - [Gefahrenzone] quick-jump button (Workspace group label) → switches to Workspace tab + scrolls to #danger-zone
  - Danger Zone visual signal via tone="danger" (destructive ring + heading dot)
  - German labels throughout (page title, group labels, tab labels, field labels, save buttons, delete dialog)
  - 3-option dark-mode radio with brand-green check-icon overlay on the active mockup
  - Sync between sidebar DarkModeToggle and AppearanceTab (both consume the same useTheme() hook)
  - Safe-order regression tests for navigateAwayFromCurrentWorkspace (LEAVE + DELETE flows)
  - Typed-name confirmation gate preserved (existing 9 delete-workspace-dialog tests now in German)
affects:
  - apps/web SettingsPage rendering (consumed via Next.js route)
  - apps/desktop SettingsPage rendering (consumed via desktop router)
  - Phase 6 Wave-2 will not re-touch settings; future 'Notifications tab' (DEFERRED per UI-SPEC) lands in v2 INB2-02

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SettingsSection wrapper composition (default | danger tones) — every tab body uses the same atom for visual rhythm"
    - "Controlled Tabs (value/onValueChange) so quick-jump can swap+scroll in one click"
    - "rAF-deferred scroll: setActiveTab → requestAnimationFrame → scrollIntoView ensures the destination section exists in the DOM before scrolling"
    - "Hoisted vi.fn() with explicit type parameters in vi.hoisted() blocks — required because vi.hoisted() runs before module imports and TS can't infer signatures from later usage"
    - "Mocked AlertDialog/Dialog primitives in tab test files (same pattern as delete-workspace-dialog.test.tsx) — strips Base UI portals so confirm/cancel buttons are reachable in jsdom"
    - "Module-level mockMembers + mockWorkspace ref objects — lets each test mutate state before render, matches the pattern from create-project.test.tsx"

key-files:
  created:
    - packages/views/settings/components/settings-page.test.tsx
    - packages/views/settings/components/appearance-tab.test.tsx
    - packages/views/settings/components/workspace-tab.test.tsx
    - packages/views/settings/components/account-tab.test.tsx
    - packages/views/settings/components/members-tab.test.tsx
    - packages/views/settings/components/repositories-tab.test.tsx
    - packages/views/settings/components/tokens-tab.test.tsx
    - .planning/phases/06-issue-detail-remaining-views/deferred-items.md
  modified:
    - packages/views/settings/components/settings-page.tsx
    - packages/views/settings/components/appearance-tab.tsx
    - packages/views/settings/components/workspace-tab.tsx
    - packages/views/settings/components/account-tab.tsx
    - packages/views/settings/components/members-tab.tsx
    - packages/views/settings/components/repositories-tab.tsx
    - packages/views/settings/components/tokens-tab.tsx
    - packages/views/settings/components/delete-workspace-dialog.tsx
    - packages/views/settings/components/delete-workspace-dialog.test.tsx

key-decisions:
  - "Made Tabs controlled (value/onValueChange) instead of uncontrolled (defaultValue) — needed so the [Gefahrenzone] quick-jump can both swap the active tab AND defer-scroll to #danger-zone in the same handler"
  - "Quick-jump uses requestAnimationFrame (NOT setTimeout) before scrollIntoView — keeps the scroll on the next paint cycle so the freshly-rendered Workspace tab content (incl. the danger-zone section) is in the DOM before lookup"
  - "MembersTab role labels: kept 'Owner' / 'Admin' English-loanwords + 'Mitglied' German — matches industry SaaS convention; the role descriptions ARE German"
  - "Smoke tests added for Account/Members/Repositories/Tokens tabs (planner left this at planner discretion). Justification: each tab now has a regression-guard for SettingsSection presence + at least one German label, costing ~30 LoC per test and making future copy changes immediately visible"
  - "DeleteWorkspaceDialog confirm-instruction kept inline `<code>` element for the workspace name — UI-SPEC §Typography §Font-family token explicitly allows the font-mono exception, and the typed-name UX (GitHub-style) requires that the user clearly sees the literal characters"
  - "Removed `Card` / `CardContent` imports from WorkspaceTab + RepositoriesTab — SettingsSection now provides the bordered card body, so the previous ad-hoc Card wrapper was redundant"

requirements-completed: [SET-01, SET-02, SET-03]

# Metrics
duration: 16m
completed: 2026-04-26
---

# Phase 6 Plan 03: Settings Restyle Summary

**SettingsSection wrappers + Gefahrenzone quick-jump + brand-green check overlay on dark-mode radio + German strings throughout — every settings tab is now German-only, sectioned, and the Danger Zone visually signals "be careful here" without shouting; the typed-name delete gate and the navigateAwayFromCurrentWorkspace safe-order pattern are preserved verbatim.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-04-26T10:02:13Z
- **Completed:** 2026-04-26T10:19:02Z
- **Tasks:** 3
- **Files created:** 8 (7 test files + deferred-items.md)
- **Files modified:** 9 (7 tab/page sources + dialog source + dialog test)
- **Commits:** 3 atomic commits (`4074460f`, `dad6592d` plus a leak commit `a1552fa1` — see Deviations)
- **Total Vitest assertions added:** 47 new (across 7 test files); 9 existing dialog tests updated for German

## Accomplishments

- Settings left nav now uses `bg-sidebar` tone (replaces `bg-background`) per UI-SPEC §Color §Dominant — visual rhythm continuous from main app sidebar to settings
- Page title / group labels / tab labels all German per UI-SPEC §Copywriting Contract SET
- New `[Gefahrenzone]` quick-jump in Workspace group: clicks switch to the Workspace tab AND scroll to `#danger-zone` via `requestAnimationFrame`
- Every tab body wraps in `<SettingsSection>` (Wave-0 atom from 06-00). Workspace Danger Zone uses `tone="danger"` for the destructive ring + heading dot
- AppearanceTab: brand-green Check icon overlays the active theme mockup (`absolute top-1 right-1 text-brand`) reinforcing the active state
- AppearanceTab continues to use `useTheme()` from `@multica/ui/components/common/theme-provider` (Phase 1 wrapper, `storageKey="multica_theme"`) — sidebar `DarkModeToggle` and the radio share state via the same hook
- AccountTab gains `<AvatarInitial>` fallback for users without `avatar_url` (Phase 2 atom — deterministic per-name color)
- DeleteWorkspaceDialog: German strings only — typed-name confirmation gate UNCHANGED. Existing 9 vitest assertions still GREEN, only string literals updated
- `navigateAwayFromCurrentWorkspace` safe-order pattern PRESERVED with TWO new explicit ordering tests (LEAVE + DELETE flows) — guards the WS-05 contract

## Task Commits

1. **Task 1: SettingsPage — German strings + bg-sidebar + Gefahrenzone quick-jump** — `4074460f` (feat)
2. **Task 2: AppearanceTab — German labels + brand-green check overlay** — `a1552fa1` (feat) — see Deviation #1
3. **Task 3: WorkspaceTab + AccountTab + MembersTab + RepositoriesTab + TokensTab + DeleteWorkspaceDialog** — `dad6592d` (feat)

_TDD note: every task wrote a RED test file first, confirmed failures, then implemented the GREEN. Refactor passes were minor (icon import additions, re-running typecheck)._

## Section Wrapping Decisions per Tab

| Tab | Section heading(s) | Tone | Notes |
|---|---|---|---|
| AccountTab | "Profil" | default | Single section; AvatarInitial fallback when no avatar_url |
| AppearanceTab | "Theme" | (kept as plain `<h2>`) | UI-SPEC labels this as a single section and the radio IS the body — wrapping in SettingsSection would add a redundant border around three mockup cards. Section heading style matches via the same italic font-semibold conventions applied externally. |
| TokensTab | "API-Tokens" | default | Single section for create-form; token list cards are unchanged Card pattern |
| WorkspaceTab | "Allgemein" | default | General settings |
| WorkspaceTab | "Gefahrenzone" | **danger** + `id="danger-zone"` | The scroll target for the [Gefahrenzone] quick-jump from SettingsPage left nav |
| RepositoriesTab | "Repositories" | default | Repo list + add button |
| MembersTab | "Mitglieder (n)" | default | Member list + invite UI |
| MembersTab | "Ausstehende Einladungen (n)" | default | Conditional — only renders when invitations exist |

## Smoke-Test-Add Decision

**Decision: ADD smoke tests for AccountTab / MembersTab / RepositoriesTab / TokensTab.**

The plan listed this at planner discretion (UI-SPEC §Sub-Phase SET FLAG-2.2 resolution: "smoke tests are at planner discretion"). I chose to add them because:

1. **Cost is low:** each test file is 50-130 LoC of mostly mock setup, written once and stable.
2. **Regression value is high:** the German strings + SettingsSection wrappers are the kind of change that's silently easy to revert later; a 5-line assertion catches that immediately.
3. **Consistency with WorkspaceTab:** WorkspaceTab now has a real test file; not adding companion tests for the four sibling tabs would leave inconsistent coverage of the same conceptual area.
4. **Future audit:** Phase 7 rebrand and any v2 settings work will iterate on these strings; having a "what does this tab promise to render" file dramatically reduces the risk of accidental scope creep.

Each test file asserts at minimum:
- SettingsSection heading present (German)
- `[data-testid='settings-section-body']` wrapper present
- 1-2 surface-level German strings (button label, placeholder, info text)

These are intentionally NOT exhaustive behavioral tests — the underlying logic (mutations, state) is tested elsewhere or by E2E. Smoke tests guard the visual+copy contract.

## Safe-Order Regression Test — Verification

The plan's MUST-HAVE invariant: `navigateAwayFromCurrentWorkspace` MUST execute in this order:

1. read destination from cached workspace list,
2. `setCurrentWorkspace(null, null)`,
3. `navigation.push(destination)`,
4. **THEN** `mutation.mutateAsync(workspaceId)`.

The plan instruction said to **preserve** the existing safe-order test verbatim. There was no pre-existing `workspace-tab.test.tsx` (confirmed via `ls`), so I authored TWO new safe-order regression tests (one for LEAVE, one for DELETE). Both:

- Push string markers into a shared `callOrder` array via mocked `resolvePostAuthDestination`, `setCurrentWorkspace`, `navigation.push`, and the leave/delete mutations.
- Assert strict positional ordering: `idxRead < idxNull < idxPush < idxMutate`.
- Assert `setCurrentWorkspace` was called with `(null, null)`.
- Assert `navigation.push` received the destination resolved from the cached workspace list.

Both tests are GREEN (`workspace-tab.test.tsx` 13/13). The implementation in `workspace-tab.tsx` was minimally refactored to make the order explicit (extracted `destination` variable, then in order: `setCurrentWorkspace(null,null)`, `navigation.push(destination)`). The behavior is identical to the previous code; the new variable is purely for readability + testability.

## German Strings — Discovered & Handled Outside the Copywriting Table

Several copy points were not in the UI-SPEC Copywriting Contract SET but are user-facing English literals — translated for consistency:

| String | English (was) | German (now) | File |
|---|---|---|---|
| Save success toast | "Workspace settings saved" | "Workspace-Einstellungen gespeichert" | workspace-tab.tsx |
| Save error toast | "Failed to save workspace settings" | "Workspace-Einstellungen konnten nicht gespeichert werden" | workspace-tab.tsx |
| Leave error toast | "Failed to leave workspace" | "Workspace konnte nicht verlassen werden" | workspace-tab.tsx |
| Delete error toast | "Failed to delete workspace" | "Workspace konnte nicht gelöscht werden" | workspace-tab.tsx |
| Confirm dialog Cancel | "Cancel" | "Abbrechen" | workspace-tab.tsx + members-tab.tsx |
| Confirm dialog Confirm | "Confirm" | "Bestätigen" | workspace-tab.tsx + members-tab.tsx |
| Leave dialog title | "Leave workspace" | "Workspace verlassen" | workspace-tab.tsx |
| Leave dialog body | "Leave {name}? You will lose access until re-invited." | "{name} verlassen? Du verlierst den Zugriff, bis du erneut eingeladen wirst." | workspace-tab.tsx |
| Avatar upload hint | "Click to upload avatar" | "Klicke, um einen Avatar hochzuladen" | account-tab.tsx |
| Save profile button | "Update Profile" / "Updating…" | "Profil aktualisieren" / "Wird aktualisiert…" | account-tab.tsx |
| Profile success | "Profile updated" | "Profil aktualisiert" | account-tab.tsx |
| Avatar success | "Avatar updated" | "Avatar aktualisiert" | account-tab.tsx |
| Repo info text | "Git repositories…" | "Git-Repositories, die mit diesem Workspace verknüpft sind…" | repositories-tab.tsx |
| Repo add button | "Add repository" | "Repository hinzufügen" | repositories-tab.tsx |
| Repo non-admin hint | "Only admins…" | "Nur Admins und Owner können Repositories verwalten." | repositories-tab.tsx |
| Member role descriptions | "Full access…" / "Manage members…" / "Create and work…" | "Voller Zugriff, alle Einstellungen verwalten" / "Mitglieder und Einstellungen verwalten" / "Issues erstellen und bearbeiten" | members-tab.tsx |
| Invite section heading | "Invite member" | "Mitglied einladen" | members-tab.tsx |
| Invite button | "Invite" / "Inviting…" | "Einladen" / "Wird eingeladen…" | members-tab.tsx |
| Invite placeholder | "user@company.com" | "user@firma.de" | members-tab.tsx |
| Pending invitations heading | "Pending invitations" | "Ausstehende Einladungen" | members-tab.tsx |
| Token info | "Personal access tokens allow…" | "Persönliche Zugriffstokens erlauben dem CLI…" | tokens-tab.tsx |
| Token name placeholder | "Token name (e.g. My CLI)" | "Token-Name (z. B. Mein CLI)" | tokens-tab.tsx |
| Token expiry options | "30 days" / "90 days" / "1 year" / "No expiry" | "30 Tage" / "90 Tage" / "1 Jahr" / "Kein Ablauf" | tokens-tab.tsx |
| Token Create | "Create" / "Creating…" | "Erstellen" / "Wird erstellt…" | tokens-tab.tsx |
| Revoke confirm dialog title | "Revoke token" | "Token widerrufen" | tokens-tab.tsx |
| Revoke confirm action | "Revoke" | "Widerrufen" | tokens-tab.tsx |
| New-token dialog | "Token created" / "Copy your personal access token now…" / "Done" / "Copy token" | "Token erstellt" / "Kopiere deinen persönlichen Zugriffstoken jetzt…" / "Fertig" / "Token kopieren" | tokens-tab.tsx |

All toast messages, dialog titles/bodies, and ad-hoc labels translated. The Copywriting Contract SET in UI-SPEC remains the source-of-truth for the visible-from-left-nav strings; the additional translations above keep the user experience German-only end-to-end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan-02 files leaked into Task 2's commit (`a1552fa1`)**

- **Found during:** Task 2 commit
- **Issue:** `git commit` after `git add` of just `appearance-tab.tsx` + `appearance-tab.test.tsx` produced a 7-file commit that also included `packages/ui/components/ui/segmented-control.{tsx,test.tsx}`, `packages/views/issues/components/issue-priority-segmented-control.{tsx,test.tsx}`, and `packages/views/issues/components/index.ts`. These are Plan 02 (DTL-04 / IssuePrioritySegmentedControl) files being worked on by a parallel agent.
- **Root cause:** The parallel Plan 02 agent had pre-staged those files in the index (`A` status) before my session started; my `git add` only added MY 2 files, but the index already held the others. `git commit` ships everything in the index.
- **Fix:** Documented in this Summary; left the leaked Plan 02 files in commit `a1552fa1` (reverting would lose real Plan 02 work). The Plan 02 agent's own SUMMARY can claim ownership of those files; the per-file content is unchanged.
- **Files affected (in `a1552fa1` outside Plan 03 scope):** `packages/ui/components/ui/segmented-control.{tsx,test.tsx}`, `packages/views/issues/components/issue-priority-segmented-control.{tsx,test.tsx}`, `packages/views/issues/components/index.ts`.
- **Mitigation for Task 3:** Confirmed the index was empty before staging Task 3 files (`git diff --cached --stat` returned exactly the 12 expected paths). Task 3 commit `dad6592d` contains only Plan 03 files.

**2. [Rule 1 — Bug] First scrollIntoView mock fired before React committed the tab swap**

- **Found during:** Task 1 first GREEN run
- **Issue:** The initial test mocked `requestAnimationFrame` to flush synchronously and `scrollIntoView` via `vi.spyOn(HTMLElement.prototype, "scrollIntoView")`. But `vi.spyOn` errored with "The property 'scrollIntoView' is not defined on the object" because jsdom genuinely lacks that method on the prototype. After installing it as a stub, the mock fired BEFORE the Tabs root re-rendered with the new active value, so `getElementById('danger-zone')` returned `null`.
- **Fix:** Switched to a `vi.fn()` installed directly on `HTMLElement.prototype.scrollIntoView` (without spyOn — straight assignment with try/finally cleanup), removed the synchronous rAF mock, and used `findByTestId` + `waitFor` to give React time to commit the tab swap and rAF time to flush its queue naturally.
- **Files modified:** `packages/views/settings/components/settings-page.test.tsx`
- **Verification:** All 7 settings-page tests GREEN.
- **Committed in:** `4074460f` (Task 1 commit)

**3. [Rule 2 — Missing critical] Hoisted vi.fn() mocks lacked TS signatures, breaking strict typecheck**

- **Found during:** Post-Task-3 typecheck (flagged by parallel Plan 02 + Plan 05 agents in `deferred-items.md`)
- **Issue:** Five TS errors in `workspace-tab.test.tsx` because the hoisted `vi.fn()` declarations had no type parameters — TS inferred `vi.fn<() => void>` and rejected calls like `mockNavigationPush('/dest')`.
- **Fix:** Added explicit type parameters to each hoisted mock: `vi.fn<(dest: string) => void>()`, `vi.fn<(slug: string|null, uuid: string|null) => void>()`, `vi.fn<(...args: unknown[]) => string>()`, `vi.fn<(id: string) => Promise<void>>()`. Also tightened the api mock signature to `Record<string, unknown>` and the array-index access to `if (!lastLeave) throw…` for `noUncheckedIndexedAccess`.
- **Files modified:** `packages/views/settings/components/workspace-tab.test.tsx`
- **Verification:** `pnpm --filter @multica/views exec tsc --noEmit` is now CLEAN for all settings/* files. Tests still 13/13 GREEN.
- **Committed in:** `dad6592d` (Task 3 commit)

---

**Total deviations:** 3 (1 blocking process, 1 bug, 1 missing-critical typecheck cleanup)
**Impact on plan:** Deviation #1 produced a "fat" Task 2 commit but no plan content was lost; Plan 02 files are real Plan 02 work. Deviation #2 was a test-infrastructure correctness fix. Deviation #3 was strictly typecheck cleanup with no behavioral change.

## Verification Results

```
pnpm --filter @multica/views exec vitest run settings/      → 67/67 GREEN (9 test files)
pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts → 24/24 GREEN
pnpm --filter @multica/views exec tsc --noEmit              → CLEAN for all settings/* files
                                                              (2 pre-existing unrelated errors in
                                                              issue-priority-segmented-control.test.tsx
                                                              already documented in deferred-items.md)
```

Both safe-order regression tests visible in verbose output:
```
✓ SAFE-ORDER … LEAVE: read dest → setCurrentWorkspace(null,null) → push → THEN leave-mutate
✓ SAFE-ORDER … DELETE: read dest → setCurrentWorkspace(null,null) → push → THEN delete-mutate
```

## Issues Encountered

- **Pre-staged Plan 02 files in index leaked into Task 2 commit.** Documented as Deviation #1. Mitigated for Task 3 by confirming a clean index pre-stage.
- **`vi.spyOn` cannot install a method that doesn't exist on the target prototype.** jsdom lacks `scrollIntoView`; switching to direct assignment + manual restore worked.
- **vi.hoisted() mocks need explicit type parameters.** The hoist-then-use pattern hides the signature from TS inference, so any non-trivial mock must declare its function type at hoist time.
- **Lint/auto-format process briefly snapshot-reverted my edits in tooling output.** The on-disk files were never actually reverted; tooling-side reminder system showed stale snapshots that didn't match the verified GREEN state.
- **Notifications tab DEFERRED per UI-SPEC.** Not touched in this plan; v2 INB2-02 covers it.

## DeleteWorkspaceDialog Behavior Preserved

The dialog's typed-name gate is the SET-03 mitigation from the threat register (T-06-W1-SET-01 — accidental destruction). Phase 6 only changed strings:

| Behavior | Status |
|---|---|
| Confirm button disabled until `typed === workspaceName` (case-sensitive, no trim) | UNCHANGED |
| Input clears on `open` change | UNCHANGED |
| Input clears on `workspaceName` change (handles mid-dialog rename race) | UNCHANGED |
| Enter key submits when matched | UNCHANGED |
| Loading state disables both buttons | UNCHANGED |
| Unicode + spaces match literally | UNCHANGED |

All 9 existing test assertions still GREEN; only the test file's literal English strings were updated to German (`"Delete workspace"` → `"Workspace löschen"`, `"Cancel"` → `"Abbrechen"`, `"Deleting..."` → `"Wird gelöscht…"`).

## Next Phase Readiness

- Wave-1 Plans 04-07 are unblocked. None depend on Settings, but the SettingsSection composition pattern + the `vi.hoisted` typed-mock pattern are reference implementations for any future tab/section layout.
- Phase 7 rebrand: Settings page is now German-only, so the rebrand has nothing to localize here. The `bg-sidebar` token reference + `useTheme()` storage key are stable.

## Self-Check: PASSED

- `[ ✓ ]` `packages/views/settings/components/settings-page.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/settings-page.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/appearance-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/appearance-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/workspace-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/workspace-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/account-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/account-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/members-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/members-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/repositories-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/repositories-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/tokens-tab.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/tokens-tab.test.tsx` — created
- `[ ✓ ]` `packages/views/settings/components/delete-workspace-dialog.tsx` — modified
- `[ ✓ ]` `packages/views/settings/components/delete-workspace-dialog.test.tsx` — modified (German)
- `[ ✓ ]` `.planning/phases/06-issue-detail-remaining-views/deferred-items.md` — present
- `[ ✓ ]` Commit `4074460f` (Task 1) — present
- `[ ✓ ]` Commit `a1552fa1` (Task 2 — see Deviation #1) — present
- `[ ✓ ]` Commit `dad6592d` (Task 3) — present

---
*Phase: 06-issue-detail-remaining-views*
*Completed: 2026-04-26*
