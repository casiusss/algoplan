# Feature Research

**Domain:** Issue tracking platform visual redesign + Kanban board view (AlgoPlan rebrand of Multica)
**Researched:** 2026-04-23
**Confidence:** HIGH (all categories verified against Linear changelog, WCAG 2.2 docs, and multiple authoritative UX sources)

> **Scope constraint**: This is a FRONTEND/UI-ONLY milestone. No backend changes. Features listed here are about what is visible and interactive in the UI — not about new data fields, new API endpoints, or new business logic. Features marked "Mock-only" render the UI but wire to no real backend field.

---

## 1. Kanban Board View

The board is a new view mode toggled per Issues page alongside the existing list view. Extends: `.planning/PROJECT.md` → "Kanban-Board-View (neu)".

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drag card between status columns | Core kanban interaction — users will assume it works | MEDIUM | Use dnd-kit (@dnd-kit/core + @dnd-kit/sortable). react-beautiful-dnd is in maintenance mode as of 2023. |
| Optimistic status update on drop | Without it, the card snaps back and flickers — feels broken | MEDIUM | Apply local state immediately, then fire `useUpdateIssue` mutation. Roll back on error. Existing mutation infrastructure supports this. |
| Column headers with issue count | Users scan column load — missing count feels incomplete | LOW | Read from grouped query result. No extra API needed. |
| Empty column state with inline "Add task" CTA | Without it an empty column looks broken | LOW | Render a ghost card with `+ Add task` text. |
| Inline task creation per column | Clicking "Add task" shows an input in that column; Enter creates | MEDIUM | Fires existing `useCreateIssue` mutation. Pre-fills status from column. |
| Card shows: title, ID, priority chip, assignee avatar | Users expect at-a-glance meta visible without clicking | LOW | Re-use existing `PriorityBadge`, `ActorAvatar` from `packages/views/common/`. |
| Colored accent bar on card (left border per tag/category) | Per design mocks — part of the AlgoPlan visual identity | LOW | CSS `border-left: 4px solid var(--tag-color)`. Tag color from existing label/category data. |
| View toggle List ↔ Board (per page, persisted) | Without this, toggling the view on every visit is annoying | LOW | Store preference in `packages/core/issues/stores/view-store.ts` (already exists). Persist via StorageAdapter. |
| Keyboard move fallback (status dropdown on card) | WCAG 2.5.7 Level AA — drag-and-drop alone fails accessibility | LOW | A "Move to…" context menu or status select on the card. Must not require drag. |
| Loading skeleton per column | Without it, the board flashes empty | LOW | shadcn Skeleton component inside each column during initial query load. |
| Error / empty board state | If query fails or workspace has no issues, must not render broken UI | LOW | Per `uxpatterns.dev` — production readiness table stakes. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Keyboard arrow-key reordering within column | Power users can reorder without mouse — feels premium | MEDIUM | dnd-kit keyboard sensor + `KeyboardCoordinateGetter`. Announce moves via `aria-live`. |
| Card hover actions (quick-assign, quick-priority) | Reduces clicks for power users | MEDIUM | Show action row on `group-hover`. Uses existing mutation hooks. |
| Smooth animated card transitions on drop | Perceived performance — feels polished, not janky | LOW | dnd-kit `AnimateLayoutChanges` + CSS `transition: transform 150ms`. |
| Virtualization for columns with 50+ cards | Without it, boards with large backlogs freeze | LARGE | `@tanstack/react-virtual` inside each column. Only needed if perf tests flag it — flag for phase-specific research. |

### Anti-Features (Explicitly NOT Building)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| WIP limits | Requires per-column config UI, backend storage, enforcement logic — doubles scope for a rarely-used feature in 2-10 person teams | Show column count only. Add WIP as a future feature with its own phase. |
| Swimlanes (horizontal row grouping) | Jira-style swimlanes suit 50+ person orgs. AlgoPlan targets 2-10 person teams where swimlanes add visual noise. | Filtering + group-by on list view covers the same need with less complexity. |
| Per-column customization (rename, reorder columns) | Columns map to issue statuses — allowing rename creates a parallel naming system that diverges from the status enum. Requires backend migration. | Status names are the column names. If status names need to change, that is a backend issue settings feature. |
| Card color themes per-user | Personalisation complexity with unclear value | Colored accent bar is driven by label/category — deterministic, not personalized. |
| Multi-card drag selection | Complex interaction, rarely needed in 2-10 person teams | Bulk actions via list view checkboxes cover this need. |

---

## 2. Issue Detail Modal

Extends existing `packages/views/issues/components/` (IssueDetailPage, CommentThread). This milestone is a visual redesign of existing functionality + new segmented controls (mock-only for effort/blocker).

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Inline title edit (click-to-edit) | Users expect to edit the title without entering a separate edit mode | LOW | Existing behavior — must survive redesign without regression. |
| Status change (existing dropdown) | Core action — missing it breaks the modal | LOW | Existing. Redesign applies new token styling. |
| Priority as P0/P1/P2/P3 segmented control | Per design mocks + AlgoPlan identity. Expected: segmented controls feel more intentional than dropdowns for 4-value enums | LOW | Base UI `ToggleGroup` / shadcn SegmentedControl. Existing priority field, new UI. |
| Tags / label chip row | Users expect visible labels on detail view | LOW | Existing label data. Redesigned `TagChip` component with color tokens. |
| Assignee avatar + name (clickable to change) | Standard pattern — users expect to reassign from detail | LOW | Existing. Ensure agent assignees render with purple background + robot icon per CLAUDE.md. |
| Comment thread with TipTap editor | Core collaboration feature — missing it = broken product | MEDIUM | Existing `packages/views/editor/` and CommentThread. Redesign applies new tokens. |
| @-mention in comments | Users expect to tag teammates in comments — standard since 2015 | LOW | Existing `server/internal/mention/` + TipTap mention extension. |
| Activity log (status changes, assignments) | Users orient themselves with "what happened?" | LOW | Existing. Redesigned timeline component with new typography. |
| Keyboard close (Escape) | Modal UX table stakes | LOW | Existing. Verify not broken by redesign. |
| Delete action (footer, destructive style) | Users must be able to delete issues | LOW | Existing. Use danger button variant per destructive action pattern. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Effort segmented control S/M/L/XL | Visual planning affordance — makes complexity estimation tangible | LOW | Mock-only this milestone. Render SegmentedControl; no backend field. |
| Launch Blocker toggle | Quick-scan indicator for release-critical issues | LOW | Mock-only this milestone. Render toggle; no backend field. |
| Category chip (Backend/Frontend/Launch/Legal/DevOps) | Domain tagging visible at a glance | LOW | Mock-only this milestone. Use existing label system, not a new field. |
| Two-pane layout (meta right sidebar, content left) | Reduces scroll to access metadata — matches Linear and Jira patterns | MEDIUM | New layout structure; existing data. Key redesign decision. |
| Collapsed activity log by default | Reduces noise — Linear ships this in April 2025 changelog | LOW | Render last 3 entries, "Show all" expands. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-assignee select on issue | Requires backend schema change (current: single `assignee_id`). Would turn this into a backend milestone. | Single assignee picker redesigned. Multi-assignee is a future backend feature. |
| Attachment upload (new) | S3 upload flow needs backend work. Not in scope. | Render existing attachment links if they exist; do not add upload UI. |
| Nested sub-task list in modal | Complex sub-task UI requires a separate phase. | Issue relations / parent-child is a future feature. |
| Rich text in title | Editors in titles are complex UX anti-patterns — see Notion's struggles | Keep title as plain text input. Rich text stays in description only. |

---

## 3. Dashboard Shell

The shell is the persistent chrome: sidebar, topbar, tab bar (desktop). Extends: `packages/views/layout/`, `apps/desktop/src/renderer/src/stores/tab-store.ts`.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sidebar collapse (icon-only mode) | Power users shrink the sidebar for more canvas space | LOW | Toggle between full and icon-only state. Store in `packages/core` Zustand store (not localStorage directly — use StorageAdapter). |
| Tab bar on desktop (workspace-scoped) | Already exists. Must survive redesign without regression | LOW | Existing tab-store. Redesign applies new AlgoPlan chrome. DragStrip stays as first flex child. |
| Dark mode toggle in sidebar (bottom) | Per design mocks — sidebar bottom is the modern SaaS convention (VS Code, Linear, Notion) | LOW | Existing theme provider. Add toggle button component in sidebar footer slot. |
| Priority-filter chips in topbar | Per design mocks — quick filter affordance | LOW | Client state only — filters the Query cache. No API change. |
| AlgoPlan wordmark in sidebar header | Brand identity — missing = incomplete rebrand | LOW | Replace current Multica logo with AlgoPlan SVG wordmark. |
| Notifications badge on sidebar inbox link | Users expect unread count badge — missing = users miss updates | LOW | Existing inbox query provides unread count. Apply badge component. |
| Search (topbar) | Discovery is table stakes | LOW | Existing `packages/views/search/`. Redesign applies new styling. |
| Empty/loading states for workspace-not-yet-loaded | Without it the shell flickers with broken layout | LOW | Skeleton sidebar during workspace hydration. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Command palette (⌘K) | Power user productivity — expected in modern developer tools | MEDIUM | New component in `packages/views/`. Searches issues, navigates to pages. Wire to existing search. Can use shadcn Combobox as base. |
| Keyboard shortcut system (documented, discoverable) | Developer-oriented users love shortcuts | MEDIUM | Base shortcuts: `C` = create issue, `B` = toggle board, `⌘K` = command palette. Teach via tooltip on first run. |
| Phase-Timeline-Bar (mock) | Visual planning context — part of AlgoPlan identity | LOW | Mock-only this milestone. Static progress widget with placeholder data. |
| Blocker badge in topbar | Alert users to launch-blocking issues | LOW | Mock-only count. Future: real count from backend. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Nested sidebar sub-menus (multi-level expand) | Linear and Notion both show that flat sidebar nav is faster than accordion trees | Keep sidebar items flat: Projects list, then within project: Issues, Settings. |
| Persistent filter panel (separate drawer) | Takes up permanent screen real estate | Filters live in topbar chips + command palette. No separate filter drawer. |
| Global dark mode toggle in topbar | Topbar is crowded with action CTAs. Dark mode toggle in sidebar bottom is the modern convention. | Sidebar bottom placement. |

---

## 4. Auth / Pre-Workspace Flows

Extends `packages/views/auth/`, `packages/views/workspace/`, `packages/views/invite/`. Visual redesign only — no new auth logic.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AlgoPlan logo/wordmark on all pre-workspace pages | Brand identity table stakes for the rebrand | LOW | Replace Multica logo on login, signup, verify, reset, create-workspace, invite. |
| Login form (email + password) in new design | Existing flow must survive | LOW | Redesign existing `packages/views/auth/` with new tokens and Inter font. |
| Signup form (email + password + name) | Existing flow | LOW | Same as login — redesign only. |
| Password strength meter on signup | Users expect progressive feedback — modern UX standard since 2015 | LOW | `zxcvbn` or `@zxcvbn-ts/core` + visual bar. Front-end only, no backend change. |
| Email verify screen (check-your-inbox state) | Without this step the flow feels abandoned | LOW | Existing. Redesign with new illustration/icon and AlgoPlan branding. |
| Password reset flow | Users expect it — missing = trust issue | LOW | Existing. Redesign only. |
| Create-workspace wizard (name + slug + validate) | Part of AlgoPlan identity. Web: Route. Desktop: WindowOverlay. | LOW | Existing `NewWorkspacePage`. Redesign with step indicators and new tokens. |
| Slug real-time availability validation | Without it users hit server errors after submission — frustrating | LOW | Existing. Verify UI feedback (green/red indicator) is visible in redesign. |
| Invite accept page | Team member onboarding path | LOW | Existing `packages/views/invite/`. Redesign with AlgoPlan branding. |
| OAuth buttons (if currently present) | Users expect "Sign in with Google" if shown | LOW | Keep or remove per existing auth configuration. Do not add new OAuth providers. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Animated success state after email verify | Reduces "did it work?" anxiety | LOW | CSS keyframe checkmark animation. No logic change. |
| Progress indicator in create-workspace wizard | Multi-step flows need orientation — "Step 2 of 3" | LOW | Static step counter. Improves perceived completion clarity. |
| "Skip for now" on optional fields | Reduces friction — onboard fast, configure later | LOW | Surface this on any non-required wizard fields. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Magic link as primary auth | Requires new email sending flow, new token system, backend changes | Keep email + password as primary. Magic link is a future auth enhancement. |
| SSO / SAML login UI | Enterprise feature. Wrong scope for 2-10 person target. | Defer. |
| Multi-step signup with profile photo | Adds friction to onboarding. Slack research shows simpler = better retention. | Profile photo can be set in settings post-signup. |

---

## 5. Settings Views

Extends `packages/views/settings/`. Visual redesign of existing settings pages.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sectioned layout (nav sidebar + content area) | Users scan settings by category — flat list is disorienting | LOW | Existing structure. Redesign applies new sidebar tokens (forest-green nav, white content). |
| Form field pattern (label above, helper text below, error inline) | Standard SaaS form pattern — deviating breaks muscle memory | LOW | Apply consistently across all settings forms via new design tokens. |
| Save/Cancel button pair (sticky footer or top) | Without explicit save, users are unsure if changes persisted | LOW | Existing. Ensure button pair is visible above the fold. |
| Destructive action confirmation modal | "Delete workspace" / "Leave workspace" — modal with typed confirmation required | LOW | Use existing modal infrastructure. Danger button variant + typed name confirmation for irreversible actions. |
| API token management (list, create, revoke) | Developer users expect this — "Create API Key" with copy-once pattern | MEDIUM | Existing if present; redesign the display. Show token only once, then redact. "Revoke" with confirmation. |
| Member management (invite, role, remove) | Workspace admin table stakes | LOW | Existing. Redesign table with new typography and action buttons. |
| Profile settings (name, email, avatar) | Users expect to update their profile | LOW | Existing. Redesign form with new tokens. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Settings search / jump-to-section | Speeds up navigation in settings with many sections | MEDIUM | Simple filter input that highlights matching sections. Can defer to v2. |
| Inline success toast after save | Reduces "did it save?" anxiety | LOW | Existing toast system. Wire to all settings mutations. |
| Danger zone section (visually separated) | Clear visual warning before destructive actions | LOW | Red-tinted section container with "Danger Zone" heading. GitLab pattern. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time auto-save for settings | Settings are not drafts — unexpected auto-save on text fields causes unintended changes | Explicit Save button. Consider auto-save only for toggle-type preferences (dark mode, notifications). |
| Settings wizard/tours | Overengineered for 2-10 person teams | Inline helper text per field is sufficient. |

---

## 6. Inbox / Notification Center

Extends `packages/views/inbox/`, `packages/core/inbox/`. Visual redesign + WS real-time already works.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unread / read visual distinction | Without it, users cannot find new notifications | LOW | Existing. Redesign with bolder unread typography and dot indicator. |
| Mark single item as read (hover action) | Standard pattern — hover reveals checkmark | LOW | Existing mutation. Surface checkmark on `group-hover`. |
| Mark all as read | Bulk action — users expect this | LOW | Existing. Make button prominent (top-right of inbox). Linear ships this in their April 2025 changelog. |
| Real-time updates via WS (new notifications appear without refresh) | Without this, users miss time-sensitive agent activity | LOW | Existing WS infrastructure. Verify redesign does not break WS invalidation pattern. |
| Grouping by date (Today / Earlier) | Users scan temporally — date groups are standard | LOW | Client-side grouping of query results. No API change. |
| Empty inbox state | Without it the inbox looks broken | LOW | Illustration + "You're all caught up" message. |
| Filter by type (issue update, comment, mention, agent) | AlgoPlan is agent-first — users need to filter agent noise | MEDIUM | Client-side filter via type field on existing notification data. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Filter by actor (person or agent) | Linear ships this in April 2025. High signal for power users managing many agents | MEDIUM | Client-side filter. Existing notification actor field. |
| Notification preview on hover | Reduces clicks to understand context | LOW | Tooltip or popover showing notification body on hover. |
| Archive (dismiss without mark-read) | Cleaner inbox management than just mark-read | MEDIUM | Requires new UI state (archived status). May need backend support — flag for phase research. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Snooze notification | Requires timer + reminder redelivery — backend feature. Complex for this milestone. | Mark as unread is sufficient recovery UX. |
| Notification preferences UI (per-event-type toggles) | Requires backend preference storage. Out of scope. | Defer to a future settings enhancement. |
| Separate notification panel (slide-in overlay) | Inbox is a first-class page in this design. Adding a panel creates two surfaces. | Keep inbox as dedicated route. Badge in sidebar links to inbox page. |

---

## 7. Component Showroom (Storybook-equivalent)

A new dedicated app/route for reviewing all AlgoPlan components before and after integration. Extends: `apps/` (new internal app). Per PROJECT.md: "Neue App/Route als Storybook-Showroom".

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Story per component (renders component in isolation) | Without it, the showroom is not a showroom | LOW | One story file per `packages/ui/components/ui/` component. |
| Interactive controls (props via UI) | Without controls, stories are screenshots not a workshop | MEDIUM | Storybook ArgTypes / manual prop-control UI. If not using Storybook, a sidebar with toggles per prop. |
| Light / dark theme switcher | AlgoPlan ships both themes — showroom must test both | LOW | Global toolbar toggle. Injects `data-theme` attribute on container. |
| Viewport tester (desktop / tablet breakpoints) | Desktop-first but must not break at common viewport sizes | LOW | Three preset iframe widths: 1440px, 1024px, 768px. Toggle buttons in toolbar. |
| A11y check overlay | WCAG compliance is table stakes — a11y panel catches regressions before shipping | LOW | `@storybook/addon-a11y` uses axe-core. Run checks on every story. |
| Component search / filter | As the library grows, finding a component must be fast | LOW | Simple text filter on component list. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Copy-paste code snippet per story | Developers can grab the exact JSX for a component | LOW | Code block with copy button below each story. |
| Figma link per component | Bridges design and code | LOW | Static link in story metadata. Only if mocks are linked. |
| Status badge per component (Draft / Stable / Deprecated) | Signals implementation confidence | LOW | Badge in component list. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full Storybook installation (`storybook` CLI) | Storybook adds ~200MB of tooling, its own Webpack/Vite config, and a separate build pipeline. This is overkill for an internal showroom in a monorepo that already has Turborepo. | Build a lightweight custom showroom route in `apps/web` (dev-only page) or as a standalone Vite app. Reuse the same `packages/ui` components directly — no transformation needed due to Internal Packages pattern. |
| Visual regression screenshots (Chromatic) | Automated screenshot diffing requires CI budget and Chromatic account. Not appropriate for first milestone. | Manual review via showroom is sufficient for v1. Add visual regression after design system is stable. |
| Documentation generator (auto-doc from JSDoc) | Auto-docs are noisy and low-quality without significant editorial investment | Write hand-curated usage notes per component. |

---

## Feature Dependencies

```
Design Tokens (colors, typography, spacing)
    └──required by──> ALL other features (every component reads tokens)

Kanban Board
    ├──requires──> dnd-kit installation
    ├──requires──> IssueCard component (new)
    ├──requires──> View Toggle store (exists, may need column pref extension)
    └──requires──> Inline Create → useCreateIssue mutation (exists)

Issue Detail Modal (redesign)
    ├──requires──> SegmentedControl component (new in packages/ui)
    ├──requires──> TagChip component (new in packages/ui)
    └──requires──> ActorAvatar component (exists, verify redesign-safe)

Command Palette
    ├──requires──> existing search infrastructure (packages/views/search/)
    └──requires──> keyboard shortcut system (new)

Inbox filter by type/actor
    └──requires──> notification type field in existing data model (verify)

Showroom
    └──requires──> all packages/ui components exist first (built as part of design tokens phase)

Password strength meter (auth)
    └──requires──> zxcvbn or equivalent library (new dependency)
```

### Dependency Notes

- **Design tokens are a hard prerequisite** for everything else. No component can be built with AlgoPlan colors until the token layer exists in `packages/ui/styles/tokens.css`.
- **SegmentedControl and TagChip** are new `packages/ui` atoms needed by Issue Detail and potentially Kanban cards. Build them in the tokens/foundation phase.
- **dnd-kit is new** — must be added to `pnpm-workspace.yaml` catalog. No conflicts with existing deps.
- **Command palette requires search** — do not build command palette before search is in a stable state.
- **Virtualization is a late optimization** — only needed if Kanban perf fails with 50+ cards. Flag for phase-specific research, do not build upfront.

---

## MVP Definition

### Launch With (v1 — this milestone)

All of these must ship for the redesign to be "complete":

- [ ] Design token layer (colors, typography) in `packages/ui/styles/` — every other feature depends on this
- [ ] Kanban board view with drag-drop, optimistic updates, inline create, view toggle — the headline new feature
- [ ] Issue detail modal redesigned (segmented priority, tag chips, two-pane layout)
- [ ] Dashboard shell (sidebar collapse, dark mode toggle, AlgoPlan wordmark, notifications badge)
- [ ] Auth/pre-workspace views (AlgoPlan branding on all pages, password strength meter)
- [ ] Settings views (sectioned layout, destructive action confirmation)
- [ ] Inbox redesign (mark-all-read, date grouping, filter by type)
- [ ] Component showroom (stories, theme toggle, a11y panel, viewport tester)
- [ ] Effort/blocker/category controls rendered (mock-only — no backend)

### Add After Validation (v1.x)

- [ ] Command palette — after core views are stable
- [ ] Keyboard shortcut system — depends on command palette being discoverable
- [ ] Archive in inbox — verify if backend support needed first
- [ ] Kanban card virtualization — only if perf tests flag 50+ card columns

### Future Consideration (v2+)

- [ ] WIP limits on kanban columns — requires dedicated feature scope
- [ ] Swimlanes — requires user research to confirm value for 2-10 person teams
- [ ] Magic link auth — new backend auth flow
- [ ] Notification preferences per event type — backend preferences model
- [ ] Visual regression testing (Chromatic) — after design system is stable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Design tokens + Inter font | HIGH | MEDIUM | P1 |
| Kanban board (core drag-drop + inline create) | HIGH | MEDIUM | P1 |
| Issue detail modal redesign | HIGH | MEDIUM | P1 |
| Dashboard shell (sidebar, topbar) | HIGH | MEDIUM | P1 |
| Auth flows rebrand | MEDIUM | LOW | P1 |
| Inbox redesign | MEDIUM | LOW | P1 |
| Settings redesign | MEDIUM | LOW | P1 |
| Component showroom | MEDIUM | MEDIUM | P1 |
| SegmentedControl + TagChip atoms | HIGH | LOW | P1 |
| Dark mode (both themes from day one) | HIGH | MEDIUM | P1 |
| Command palette | MEDIUM | MEDIUM | P2 |
| Keyboard shortcuts | LOW | MEDIUM | P2 |
| Kanban card hover actions | LOW | LOW | P2 |
| Inbox filter by actor | LOW | LOW | P2 |
| Kanban virtualization | LOW | LARGE | P3 |
| WIP limits | LOW | LARGE | P3 |
| Swimlanes | LOW | LARGE | P3 |

---

## Competitor Feature Analysis

| Feature | Linear (2025-2026) | Jira | AlgoPlan v1 Approach |
|---------|------------------|------|---------------------|
| Kanban view | Yes, clean minimal board | Yes, deep customization, WIP limits, swimlanes | Yes — minimal like Linear. No WIP, no swimlanes. |
| Issue detail pane | Two-pane, metadata right sidebar | Configurable screen layout | Two-pane per design mocks |
| Drag-drop library | Proprietary (fast sync engine) | Own implementation | dnd-kit (best-in-class OSS, 60fps, accessible) |
| Command palette | Yes (⌘K) | Minimal | P2 — build after core views |
| Dark mode | Yes | Yes | Yes — both themes from day one |
| Inline issue create | Yes | Yes | Yes — per column in board |
| Priority as segmented control | Dropdown with icon | Dropdown | Segmented P0-P3 (differentiator) |
| Effort estimation | Story points (separate field) | Story points | Mock S/M/L/XL (v1 mock, backend later) |
| Inbox | Notification inbox, filter by actor (Apr 2025) | Notification bell popover | Full inbox page, date groups, filter by type |
| Storybook / showroom | Internal | Internal | Custom lightweight showroom (not full Storybook) |

---

## Sources

- [Linear vs Jira 2026 — Everhour](https://everhour.com/blog/linear-vs-jira/)
- [Linear Changelog — Apr 2025 (collapsed history, mark-all-read, filter by actor)](https://linear.app/changelog)
- [Kanban Board Pattern — UX Patterns for Developers](https://uxpatterns.dev/patterns/data-display/kanban-board)
- [Build a Kanban Board With Drag-and-Drop in React with Shadcn — Marmelab (Jan 2026)](https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html)
- [Best React Drag and Drop Libraries 2025 — Zoer AI](https://zoer.ai/posts/zoer/best-react-drag-drop-libraries-comparison)
- [WCAG 2.5.7 Dragging Movements — TestParty 2025](https://testparty.ai/blog/wcag-2-5-7-dragging-movements-2025-guide)
- [4 Major Patterns for Accessible Drag and Drop — Salesforce UX / Medium](https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09)
- [Destructive Actions — GitLab Pajamas Design System](https://design.gitlab.com/patterns/destructive-actions/)
- [Design Guidelines for Better Notifications UX — Smashing Magazine 2025](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- [Login & Signup UX 2025 Guide — Authgear](https://www.authgear.com/post/login-signup-ux-guide)
- [Command Palette Pattern — UX Patterns for Developers](https://uxpatterns.dev/patterns/advanced/command-palette)
- [Storybook Accessibility Addon — storybook.js.org](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [Dark Mode vs Light Mode for SaaS — Vivantio](https://www.vivantio.com/blog/dark-mode-vs-light-mode-for-saas/)

---
*Feature research for: AlgoPlan — Frontend Redesign & Kanban Board Milestone*
*Researched: 2026-04-23*
