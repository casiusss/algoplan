# Codebase Concerns

**Analysis Date:** 2026-04-23

## Tech Debt

### Workspace Slug Lookup Caching

**Issue:** Repeated slug→UUID database lookups on every request.

**Files:** `server/internal/middleware/workspace.go:98`

**Impact:** Every HTTP request that routes by workspace slug triggers a `GetWorkspaceBySlug` query. In high-traffic scenarios, this generates unnecessary database round-trips. Slug is immutable and safe to cache short-term.

**Fix approach:** Implement TTL cache (5-10 min) in middleware using a local map with expiration. Slug changes are rare enough that eventual consistency is acceptable.

---

### Issue-Detail Component Size

**Issue:** Monolithic React component approaching complexity limits.

**Files:** `packages/views/issues/components/issue-detail.tsx` (1441 lines)

**Impact:** File has 1441 lines, exceeding the 800-line architectural guideline. Contains mixed concerns: timeline rendering, assignee management, status/priority pickers, file uploads, comment threads, pin management. Changes to any feature require touching a massive file. Testing is fragmented — difficult to isolate behavior.

**Fix approach:** Extract into smaller focused components:
- `IssueMetadata` (status, priority, due date, project)
- `IssueAssignees` (assignee picker, removals)
- `IssueTimeline` (comments, reactions, activity, subscriber list)
- `IssueActions` (pins, file uploads, delete)
Keep only container/orchestration logic in main component.

---

### Daemon Manager Complexity

**Issue:** Daemon lifecycle and state management spread across large file.

**Files:** `apps/desktop/src/main/daemon-manager.ts` (942 lines)

**Impact:** Handles spawning, port allocation, health checks, restart logic, error recovery. Large surface area makes restart behavior unpredictable under failure scenarios. Difficult to reason about what happens when a daemon dies during critical operations.

**Fix approach:** Split into focused modules:
- `daemon-launcher.ts` — spawn/kill logic only
- `daemon-health.ts` — health check polling + status tracking
- `daemon-recovery.ts` — restart strategy and backoff

---

### Query Cache Schema Fragmentation

**Issue:** Query key generation scattered across modules with inconsistent nesting.

**Files:** Multiple `*/queries.ts` files (`packages/core/issues/queries.ts`, `packages/core/projects/queries.ts`, etc.)

**Impact:** No single schema for cache key structure. Risk of:
- Invalidation misses (typos in queryKey fragments)
- Over-invalidation (too-broad predicates)
- Workspace-scoped keys sometimes keying on wsId, sometimes not, leading to data leakage across workspace switches

**Fix approach:** Centralize all query key factories in a single module with typed factories. All workspace-scoped keys MUST include wsId as first segment after domain.

---

## Fragile Areas

### Zustand Selector Stability

**Issue:** Unstable selectors causing infinite re-renders.

**Files:** `packages/core/issues/stores/view-store.ts`, `apps/desktop/src/renderer/src/stores/tab-store.ts`

**Pattern observed:** Selectors that return freshly-built objects or arrays on every call (e.g., `useStore(s => s.items.map(...))`) trigger infinite renders when Zustand can't detect deep equality.

**Risk:** Any component using `useTabStore((s) => s.byWorkspace[slug])` or similar computed selectors will re-render on every store update, even unrelated ones. This cascades through modal/dialog state and causes UI jank.

**Safe modification:**
- Always return stable references (primitives, shallow selectors)
- If building new objects, extract to `getState()` + memoization outside component
- Test selector stability: `selector(state) === selector(state)` should be true for same input

**Test coverage gaps:** No selector stability tests. Add regression test suite for all custom hooks using Zustand selectors.

---

### useWorkspaceId() Outside WorkspaceIdProvider

**Issue:** Hooks hardcoding `useWorkspaceId()` fail when component renders outside workspace context.

**Files:** `packages/core/pins/mutations.ts:10`, `packages/core/inbox/mutations.ts:9`, and ~40 other mutation hooks

**Pattern observed:**
```typescript
export function useCreatePin() {
  const wsId = useWorkspaceId();  // Will throw if no WorkspaceIdProvider in tree
  const qc = useQueryClient();
  ...
}
```

**Risk:** Any reuse of these hooks in a sidebar (rendered before workspace loads) or desktop overlay (pre-workspace flows) will throw `"useWorkspaceId: no workspace selected"` error.

**Safe modification:** 
- Mutation hooks should accept `wsId` as optional parameter: `useCreatePin(wsId?: string)`
- Inside component, call with `useWorkspaceId()` if no param passed
- Allows hooks to work both inside and outside WorkspaceIdProvider

**Test coverage gaps:** No tests of mutations outside workspace context. Overlays and sidebars likely untested.

---

### Desktop Workspace Destructive Operations Race Condition

**Issue:** Leave/Delete workspace doesn't guarantee proper order of state updates vs. async mutation.

**Files:** `packages/views/settings/components/delete-workspace-dialog.tsx`, `apps/desktop/src/renderer/src/platform/navigation.tsx`, `packages/core/auth/store.ts:71`

**Pattern from CLAUDE.md:**
```
1. Read destination from cached workspace list
2. setCurrentWorkspace(null, null)
3. navigation.push(destination)
4. THEN await mutation.mutateAsync(workspaceId)
```

**Risk:** If step 4 fails after step 3, the user sees an error but the workspace is already half-deleted from client state. Worse: concurrent queries from the old workspace may still be in flight and try to refetch using a stale wsId.

**Current mitigation:** `setCurrentWorkspace(null, null)` is called explicitly in auth store logout. However, the delete/leave dialog flow doesn't enforce the strict ordering. If a user clicks delete and the network hiccup happens between push and mutation, the state machine breaks.

**Safe modification:**
- Create a wrapper mutation `useDeleteWorkspaceWithNavigation` that guarantees order
- Return a promise that doesn't resolve until all cleanup (step 4) completes
- Only then allow the next workspace to mount

---

### Desktop Tab Isolation & Cross-Workspace Navigation

**Issue:** Tab store distinguishes workspace groups but doesn't prevent accidental cross-workspace data leakage.

**Files:** `apps/desktop/src/renderer/src/stores/tab-store.ts:674-675`

**Pattern observed:**
```typescript
const slug = useTabStore((s) => s.activeWorkspaceSlug);
const tabId = useTabStore((s) => s.byWorkspace[slug]?.activeTabId);
```

**Risk:** If slug changes mid-render (e.g., another tab in another workspace gets activated), the selector reads a different key. Queries still using old wsId will fetch stale data.

**Safe modification:** 
- Components must cache the workspace slug at render start
- Never mix `useWorkspaceId()` (context-based) with dynamic slug reads from tab store in the same render
- Consider using `useMemo` to pin workspace identity across render

**Test coverage gaps:** No cross-workspace navigation stress tests. Desktop switching workspaces rapidly is untested.

---

### Migration 058 Constraint Tightening

**Issue:** Migration adds NOT NULL + RESTRICT FK constraint that can fail if orphaned issues exist.

**Files:** `server/migrations/058_project_repos.up.sql:52-73`

**Pattern observed:**
- Step 4 routes all orphan issues to workspace's "Inbox" project
- Step 5 backfills repo_url from workspace default
- Step 6 hardens constraints: `ALTER TABLE issue ALTER COLUMN project_id SET NOT NULL`
- Step 6b changes issue→project FK from SET NULL to RESTRICT

**Risk:** If a project is deleted after migration but before a code deployment that handles the RESTRICT FK correctly, subsequent delete attempts will fail with obscure FK violation errors. The DB now prevents orphaning, but app code may not expect this constraint.

**Current status:** Migration executed. Ensure all project delete handlers check for attached issues first and delete issues or reassign to Inbox before deleting project.

**Fix approach:** Add constraint validation test: attempt deleting a project with attached issues, verify error is caught gracefully.

---

### WS Cache Invalidation Debounce Races

**Issue:** 100ms debounce on WS invalidation can miss simultaneous events.

**Files:** `packages/core/realtime/use-realtime-sync.ts:136-146`

**Pattern observed:**
```typescript
const debouncedRefresh = (prefix: string, fn: () => void) => {
  const existing = timers.get(prefix);
  if (existing) clearTimeout(existing);
  timers.set(prefix, setTimeout(() => fn(); }, 100));
};
```

**Risk:** If two issue:updated events arrive within 100ms, the first timer is cleared and replaced. Only one refresh is queued. If the events modified different properties, the debounce silently loses one update.

**Current mitigation:** Debounce prevents thundering herd on bulk operations (good). But simultaneously misses legitimate rapid-fire changes.

**Impact:** Low for UX (most users won't notice a 100ms delay), medium for consistency (stale data briefly possible).

**Fix approach:** Instead of simple debounce, implement "debounce + coalesce": collect event types in a Set during the 100ms window, then invalidate all collected prefixes at once. This batches the requests while ensuring each unique event type triggers at least one refresh.

---

## Security Considerations

### Workspace Header Validation

**Issue:** X-Workspace-Slug and X-Workspace-ID headers accept user input without sanitization before lookup.

**Files:** `server/internal/middleware/workspace.go:70-83`

**Current behavior:**
- Slug is looked up via `GetWorkspaceBySlug(r.Context(), slug)` — DB query sanitizes via parameterization
- UUID is accepted directly — regex/UUID validation should be enforced

**Risk:** Low for SQL injection (parameterized queries). Medium for privilege escalation if a malformed UUID causes context bypass.

**Current mitigation:** `GetMemberByUserAndWorkspace` validates membership. Even with a bogus wsId, the member lookup will fail and return 404. Access control is enforced at handler level.

**Recommendations:**
- Validate X-Workspace-ID as valid UUID format before querying (fail fast)
- Log invalid header attempts for abuse detection
- Consider rate-limiting workspace resolution by source IP

---

### Auth Token Scope & API Security

**Issue:** No per-workspace token scoping. A leaked token has full workspace access.

**Files:** `packages/core/api/client.ts`, `server/internal/middleware/` (no token validation observed)

**Current behavior:** X-User-ID header identifies the user. Workspace membership is checked via `GetMemberByUserAndWorkspace`. No token-level scoping.

**Risk:** If a user's session token is exposed, an attacker can use it to access all workspaces the user is a member of. No way to issue tokens with narrower scope (e.g., read-only, single workspace).

**Recommendations:**
- Implement token scopes (read, write, admin per workspace)
- Issue short-lived access tokens + long-lived refresh tokens
- Add token revocation mechanism
- For CLI use, issue workspace-scoped tokens instead of user tokens

---

### Activity Log Data Exposure

**Issue:** `activity_log` table updated in migration 058 may not filter access properly.

**Files:** `server/migrations/058_project_repos.up.sql:75-80`

**Pattern observed:** Activity log gets project_id column and index. If handler returns unfiltered activity_log rows, users could see events from other workspaces.

**Current status:** Unknown if activity_log queries are workspace-scoped. Assume they are but verify.

**Recommendations:**
- Audit all `SELECT * FROM activity_log` queries — ensure WHERE workspace_id = ?
- Test that a user in workspace A cannot query activity for workspace B

---

## Performance Bottlenecks

### Issue Detail Component Re-renders

**Issue:** Large component with many subscriptions triggers full re-render on any sub-query invalidation.

**Files:** `packages/views/issues/components/issue-detail.tsx`

**Pattern observed:** Component subscribes to:
- Issue detail (timeline, reactions, subscribers)
- Comments (multiple)
- Issue usage (metrics)
- Pins
- Members & agents (for pickers)
- Chatbot events

Each invalidation causes entire component to re-render even if only one piece changed.

**Impact:** On slower machines or with large comment threads, noticeable jank when other issues update in background.

**Improvement path:**
- Split into focused sub-components with their own useQuery hooks
- Memoize comment list separately
- Lazy-load sections below fold
- Use React.memo on static header sections

---

### Workspace Slug Lookup Multiplied by User Count

**Issue:** Every logged-in user's every request triggers workspace slug lookup.

**Files:** `server/internal/middleware/workspace.go:99-114`

**Impact:** 100 concurrent users × 10 requests/min × 1 client slug lookup = 1000 queries/min to the database for slugs that rarely change.

**Improvement path:**
- Implement Redis cache with 5-10 min TTL
- On workspace update (rename), invalidate immediately
- Client-side: cache slug→UUID mapping in IndexedDB, validate on reconnect

---

### Child Issues List Query on Every Issue Load

**Issue:** `childIssuesOptions` query may fetch all descendants on every issue detail open.

**Files:** `packages/views/issues/components/issue-detail.tsx:76`

**Impact:** If an issue has 100 descendants, opening the detail view fetches all 100. If multiple users open the same issue, cache may help but cold start is expensive.

**Improvement path:**
- Paginate child issues (load 20, "load more" button)
- Only fetch direct children by default, lazy-load grandchildren

---

## Test Coverage Gaps

### Settings Page & Workspace Operations

**Issue:** Settings pages lack test coverage despite destructive operations.

**Files:**
- `packages/views/settings/components/settings-page.tsx` (no test)
- `packages/views/settings/components/delete-workspace-dialog.tsx` (has test, good)
- `packages/views/settings/components/workspace-tab.tsx` (no test)
- `packages/views/settings/components/members-tab.tsx` (no test)

**Risk:** Delete dialog has tests, but workflow (confirm→setCurrentWorkspace→push→mutate) isn't integrated tested. Renaming workspaces, leaving, changing role — all untested.

**Recommendation:** Add E2E tests:
- Delete last workspace → redirect to /workspaces/new overlay
- Delete workspace in use → cleanup should prevent orphan issues
- Leave workspace → user disappears from members list immediately
- Rename workspace → slug cache should refresh within 1 req

---

### Selector & Hook Stability Tests

**Issue:** No tests for Zustand selector re-render stability.

**Files:** `packages/core/issues/stores/view-store.ts`, `apps/desktop/src/renderer/src/stores/tab-store.ts`

**Risk:** Selector footguns (returning new objects) cause infinite re-renders only in integration; unit tests can't catch them.

**Recommendation:** Add selector regression tests:
```typescript
test("selector returns stable reference", () => {
  const state = useViewStore.getState();
  const sel = (s) => ({ filters: s.statusFilters });
  expect(sel(state)).toBe(sel(state));  // MUST be same object
});
```

---

### Autopilot & Daemon Integration Tests

**Issue:** Autopilot and daemon registration flows lack E2E coverage.

**Files:** Untested flows:
- Daemon register → claim response carries project repo_url + slug (from recent commit)
- Autopilot trigger on issue creation → task runs on claimed daemon
- Daemon health check interval logic

**Risk:** Subtle timing bugs in claim/register handshake or task dispatch go undetected.

---

## Migration & Deployment Concerns

### Migration 058 Pre-deployment Validation

**Issue:** Migration adds tight constraints but doesn't validate preconditions at deployment time.

**Files:** `server/migrations/058_project_repos.up.sql`

**Checklist before running:**
- [ ] Every workspace has at least one repo with a URL
- [ ] No orphaned issues exist (or all are handled by Inbox logic)
- [ ] All project delete code paths check for attached issues first

**Post-deployment:**
- [ ] Verify `issue.project_id` is never null in any query
- [ ] Verify no project deletions fail with FK constraint errors
- [ ] Monitor error logs for unexpected "project_id SET NOT NULL" constraint violations

---

### Feat/repos-per-project In-Flight Work

**Issue:** Recent commits add project-level repo_url, per-workspace/project worktree paths, claim responses carry repo data.

**Files:**
- `server/pkg/db/generated/project.sql.go` (generated)
- Server migration 058
- CLI `cmd/multica/cmd_issue.go`

**Current status:** Feature actively landing. Interdependencies:
- Issue creation must reference project (already enforced by NOT NULL)
- Daemon claim must return project repo_url (new as of commit 57234231)
- Worktree layout changed to per-workspace/project (commit 0539e260)

**Risk:** CLI and daemon binaries built before full deployment will fail to handle new repo_url field in claim responses.

**Deployment order:**
1. Deploy server (migration + new handlers)
2. Build and deploy CLI + daemon binaries
3. Test daemon claim flow end-to-end
4. Announce to users

---

## Known Bugs & Edge Cases

### Tab Router Reset on New-Workspace Navigation

**Issue:** Navigating to /workspaces/new forcibly resets tab router to /.

**Files:** `apps/desktop/src/renderer/src/platform/navigation.tsx:48-55`

**Behavior:** When user deletes last workspace or creates new workspace, the router is reset via `router.navigate("/", { replace: true })` to prevent useWorkspaceId errors in mounted components.

**Edge case:** If user has multiple tabs open, all tabs reset to /. Not a data loss risk but UX surprise.

**Mitigation:** Currently acceptable. User is transitioning away from workspace context anyway. Could improve by restoring tab state after new workspace is created.

---

### Desktop Overlay State on Window Refocus

**Issue:** WindowOverlay state persists when window regains focus.

**Files:** `apps/desktop/src/renderer/src/stores/window-overlay-store.ts` (assumed, not verified)

**Risk:** If overlay is open (new-workspace) and user switches to another app and back, overlay is still there but may be stale (workspace list updated in background).

**Safe behavior:** Overlay should refresh its backing data (workspace list) on focus, or warn user if assumptions changed.

---

## Scaling Limits

### Query Cache Unbounded Growth

**Issue:** QueryClient cache never evicts old workspace data.

**Files:** `packages/core/query-client.ts`, `packages/core/realtime/use-realtime-sync.ts`

**Current:** Queries cache with default Tanstack settings. Workspace switching invalidates old workspace keys but doesn't evict from memory.

**Scaling limit:** If a user switches between 10 workspaces daily, each with 1000 issues in cache, the browser tab's memory grows unbounded.

**Improvement path:**
- Add `gcTime` (garbage collection time) to all workspace-scoped queryFn options (e.g., 5 min)
- On workspace switch, explicitly remove old workspace's keys from cache
- Monitor memory usage in E2E tests for memory leaks

---

### CLI Issue Create Without Project

**Issue:** Migration 058 made project_id NOT NULL, but CLI issue creation may not enforce it.

**Files:** `server/cmd/multica/cmd_issue.go:1180` (line count suggests this file is large and complex)

**Impact:** If CLI doesn't default to Inbox project, issue creation fails at DB layer with a confusing "project_id NOT NULL" error instead of user-friendly "must select a project".

**Recommendation:** 
- CLI issue create must default to workspace's Inbox project if no --project flag provided
- Validate this in tests

---

## Dependencies at Risk

### Zustand Selector API

**Issue:** Zustand's shallow comparison doesn't work for returned objects/arrays.

**Risk:** If Zustand changes or developers forget to use shallow selectors, re-renders spike.

**Mitigation:** Already in CLAUDE.md rules. Just ensure no regressions.

---

### TanStack Query Cache Key Format

**Issue:** Query key strings are fragile — typos cause miss-invalidations.

**Risk:** Refactoring a query key factory string breaks invalidation elsewhere without type safety.

**Mitigation:** Centralize all query key factories (see Query Cache Schema Fragmentation above).

---

## Missing Critical Features

### Partial Workspace Data Loading

**Issue:** New users or desktop app launch fetches full workspace data even if they only need issue counts.

**Files:** Not applicable; architectural concern.

**Impact:** Slow cold start for workspaces with 10k+ issues.

**Recommendation:** Implement lazy loading:
- Initial load: workspace metadata + issue count summaries only
- Detail views: fetch full issue data on-demand
- List views: paginate or virtualizes to avoid fetching all 10k rows

---

### Cross-Workspace Search

**Issue:** Search is workspace-scoped. Users can't find issues across all their workspaces in one query.

**Files:** `packages/views/issues/` (search uses workspace-scoped API)

**Impact:** Users must switch workspaces to search within them.

**Recommendation:** Add "search all workspaces" mode (gated behind feature flag for now). Requires backend to accept multiple workspace IDs in single query.

---

## Technical Debt Summary

| Priority | Area | Impact | Effort |
|----------|------|--------|--------|
| Medium | Issue-detail component size | Maintenance burden, fragmented tests | 1-2 days |
| Medium | Workspace slug caching | Database load | 4 hours |
| High | useWorkspaceId() hook scoping | Crashes in overlays/sidebars | 2-3 hours |
| High | Zustand selector stability tests | Infinite re-render risks | 1 day |
| Low | Query cache eviction | Memory leaks on workspace switch | 4 hours |
| Medium | Daemon manager complexity | Unpredictable restart behavior | 1-2 days |

---

*Concerns audit: 2026-04-23*
