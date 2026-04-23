# Repos per Project — Design Spec

**Date:** 2026-04-23
**Status:** Draft, awaiting review
**Scope:** Backend (Go) + Frontend (Next.js) + CLI + DB migration + tests

## Summary

Move the "which repositories does this work touch?" contract from the
workspace level to the project level. Every project owns exactly one
repository URL. The daemon task-claim response carries the
project-owned repo instead of the workspace-wide repo list. Workspace
repos remain as a template pool for project creation.

## Goals

- A project is a hard repo boundary: agents working on project X only
  see project X's repo, even if other projects in the same workspace
  point at unrelated repos.
- Parallel agent execution across projects without worktree collisions:
  worktrees root separated per workspace + project.
- Clear authorization: changing a project's repo is admin/owner-only.
- Migration is safe for existing installations: orphan issues are
  auto-routed to a default "Inbox" project per workspace.

## Non-Goals

- Multiple repos per project (deferred — needs array schema + worktree
  fan-out logic).
- Automatic clone-check / URL reachability validation (deferred —
  network-dependent, flaky).
- Autopilot.project_id hardening (separate phase).
- Team-level ACLs, per-project membership (out of scope).

## Decisions (locked)

| # | Question | Decision |
|---|---|---|
| 1 | Fallback when project has no repo | N/A — repo is mandatory (NOT NULL) |
| 2 | Cardinality | Exactly 1 repo per project (`project.repo_url TEXT NOT NULL`) |
| 3 | Issues without project_id | Migrate into per-workspace "Inbox" default project; `issue.project_id` becomes NOT NULL |
| 4 | `workspace.repos` after migration | Keep as template pool for project creation (b.2) |
| 5 | Empty `workspace.repos` during migration | Migration aborts with clear error; admin must populate workspace.repos first (c.1) |
| 6 | UI entry points | Create-Project modal + Settings tab (a.2) |
| 7 | URL handling | Format check + normalization (strip trailing slash, unify `.git` suffix) (b.2) |
| 8 | Daemon worktree path | Split per project: `~/.multica/worktrees/<workspace>/<project>/<task>` (c.2) |
| 9 | Authorization for `repo_url` changes | Admin/owner only (d.2) |
| 10 | CLI support in this task | Yes — `project create --repo-url`, `project update --repo-url` (a.1) |
| 11 | Audit trail | `activity_log` entry with `action='project.repo_url_changed'` + `details` JSONB (b.1) |
| 12 | Test scope | Full: unit + integration + migration rollback + worktree path + URL normalization + 1 E2E (c.2) |
| 13 | Autopilots | Out of scope (d.2) |

## Data Model

### Schema changes (`server/migrations/058_project_repos.up.sql`)

```sql
-- 1. Preflight: reject migration if any workspace has no repos
DO $$
DECLARE bad INT;
BEGIN
  SELECT COUNT(*) INTO bad FROM workspace
   WHERE jsonb_array_length(COALESCE(repos, '[]'::jsonb)) = 0;
  IF bad > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate: % workspace(s) have empty repos list. '
      'Set workspace.repos[0] before running this migration.', bad;
  END IF;
END $$;

-- 2. Add nullable column first (so we can backfill before enforcing NOT NULL)
ALTER TABLE project ADD COLUMN repo_url TEXT;

-- 3. Create per-workspace "Inbox" default project, repo_url = workspace.repos[0]
INSERT INTO project
  (id, workspace_id, title, description, icon, status, repo_url,
   created_at, updated_at)
SELECT
  gen_random_uuid(),
  w.id,
  'Inbox',
  'Default project for issues without an explicit project',
  '📥',
  'in_progress',
  w.repos->0->>'url',
  now(), now()
FROM workspace w;

-- 4. Route orphan issues (project_id IS NULL) to their workspace's Inbox
UPDATE issue i
SET project_id = (
  SELECT p.id FROM project p
   WHERE p.workspace_id = i.workspace_id AND p.title = 'Inbox'
   ORDER BY p.created_at ASC LIMIT 1
)
WHERE i.project_id IS NULL;

-- 5. Backfill repo_url on pre-existing projects
UPDATE project p
SET repo_url = (SELECT w.repos->0->>'url' FROM workspace w WHERE w.id = p.workspace_id)
WHERE p.repo_url IS NULL;

-- 6. Harden constraints
ALTER TABLE project ALTER COLUMN repo_url SET NOT NULL;
ALTER TABLE project ADD CONSTRAINT project_repo_url_not_empty
  CHECK (length(trim(repo_url)) > 0);
ALTER TABLE issue ALTER COLUMN project_id SET NOT NULL;

-- 7. activity_log: add optional project_id + index for project-scoped audit queries
ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES project(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_project
  ON activity_log(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- 8. Index for fast project lookup by workspace + repo_url (diagnostic queries)
CREATE INDEX IF NOT EXISTS idx_project_repo_url ON project(workspace_id, repo_url);
```

### Down-migration (`058_project_repos.down.sql`)

- Relax `issue.project_id` back to nullable.
- Drop `project.repo_url` column + check constraint.
- Drop `idx_activity_log_project` index and `activity_log.project_id`
  column (details JSONB already carries project context, so no data
  loss for historical events).
- **Intentionally keep the Inbox projects** to avoid data loss. Operator
  manually deletes them if desired.

## Backend Contract

### `server/internal/handler/daemon.go` — task-claim response

Current (`daemon.go:650-658`) loads `workspace.repos` and puts them in
`resp.Repos`. New behavior:

1. If `task.IssueID.Valid`: fetch the issue, then the issue's project.
   Build a single-element `[]RepoData` from `project.repo_url` (the
   project's description can be the `Description` field of
   `RepoData` for daemon logging — optional).
2. Fallback to `workspace.repos` is **no longer needed** because every
   issue now has a project (NOT NULL).
3. Chat tasks (no issue) keep using workspace.repos for now (out of
   scope for this change but flagged as follow-up).

Shape unchanged (`[]RepoData` stays as-is) so the daemon's existing
allowlist + worktree code keeps working.

### `server/internal/handler/project.go`

- `CreateProject`: require `repo_url` in request body, apply
  normalization (see below), 400 on missing/invalid.
- `UpdateProject`: accept optional `repo_url`. On change, verify caller
  has `admin` or `owner` workspace role, insert into `activity_log`
  with `action='project.repo_url_changed'`, `project_id` set, and
  `details` JSONB carrying `{old_url, new_url}`. Return 403 on role
  mismatch.
- `GetProject` / `ListProjects`: include `repo_url` in JSON response.

### URL normalization helper (`server/internal/util/repo_url.go`, new)

```go
func NormalizeRepoURL(raw string) (string, error) {
    s := strings.TrimSpace(raw)
    if s == "" {
        return "", errors.New("repo_url is empty")
    }
    // Strip trailing slash
    s = strings.TrimRight(s, "/")
    // For https:// URLs: tolerate trailing .git (keep canonical form: WITH .git)
    if strings.HasPrefix(s, "https://") || strings.HasPrefix(s, "http://") {
        if _, err := url.Parse(s); err != nil {
            return "", fmt.Errorf("invalid URL: %w", err)
        }
        if !strings.HasSuffix(s, ".git") {
            s = s + ".git"
        }
        return s, nil
    }
    // git@... SSH form — accept as-is after basic shape check
    if strings.HasPrefix(s, "git@") && strings.Contains(s, ":") {
        if !strings.HasSuffix(s, ".git") {
            s = s + ".git"
        }
        return s, nil
    }
    return "", errors.New("repo_url must be https://, http://, or git@... SSH URL")
}
```

Canonical form: **always ends with `.git`**. Prevents duplicate entries
like `repo` and `repo.git` in the same workspace.

### Authorization helper (reuse existing)

`middleware.RequireWorkspaceRole(queries, "admin", "owner")` wrapping the
`PUT /api/projects/{id}` route. Handler checks specifically on
`repo_url` diff; other fields (title, description, etc.) remain
member-editable.

## Worktree Layout (Daemon)

Current: daemon constructs worktree path from `runtime/config` + repo
URL hash. Change to:

```
~/.multica/worktrees/<workspace_slug>/<project_slug>/<task_id>/
```

- `workspace_slug` from the `WorkspaceID` passed in task payload
  (already present).
- `project_slug` derived from `project.title` (kebab-case, fallback to
  project UUID prefix if ambiguous).
- `task_id` already present.

Changes to `server/internal/daemon/execenv/context.go` +
`server/internal/daemon/execenv/git.go` to construct the path.

Daemon receives `project_id` + `project_slug` in `Task` struct
(extension of `types.Task`):

```go
type Task struct {
    // ... existing fields
    ProjectID   string `json:"project_id,omitempty"`
    ProjectSlug string `json:"project_slug,omitempty"`
}
```

Server populates these from the issue's project when building the task
response.

## Frontend Changes

### Create-Project modal

File: `packages/views/modals/create-project.tsx`.

- New required field `Repository URL`.
- Input = combobox: dropdown of `workspace.repos[].url` + free-text
  input. Placeholder: "Select from workspace defaults or enter a
  custom URL."
- Client-side validation mirrors server normalization (trimmed,
  non-empty, must start `https://`, `http://`, or `git@`).
- Submit disabled until valid.

### Project settings (inline in detail view)

File: `packages/views/projects/components/project-detail.tsx`.
No new separate settings tab — keep current inline-edit pattern
consistent with title/description editing already in that file.

- New field block "Repository" with current `repo_url` + inline edit.
- Edit button visible only if current user has `admin` or `owner` role
  (read from workspace store).
- On save, send `PUT /api/projects/{id}` with new `repo_url`. On 403,
  show inline "Only workspace admins can change the repository."
- On success, show toast + re-fetch project (`updated_at` and new
  `repo_url` appear). The `activity_log` insert is write-only from the
  UI — no render of the event in this phase.

### Project detail view

Show `repo_url` next to project title as a small mono-font chip,
click-to-copy.

## CLI Changes

### `server/cmd/multica/cmd_project.go`

- `multica project create --repo-url <url>` (new required flag,
  breaking change — document in release notes).
- `multica project update <id> --repo-url <url>` (new optional flag).
- Both pass URL as-is; server normalizes.
- `multica project get <id> --output json` already returns all
  fields, no change needed beyond the new JSON key.

## Audit Trail

`activity_log` entry emitted by `UpdateProject` on `repo_url` change:

| Column | Value |
|---|---|
| `workspace_id` | project's workspace |
| `project_id` | project UUID (new column) |
| `issue_id` | NULL |
| `actor_type` | `'member'` |
| `actor_id` | caller's user UUID |
| `action` | `'project.repo_url_changed'` |
| `details` | `{"old_url": "...", "new_url": "..."}` |

Frontend MVP: no dedicated renderer. Event is queryable via DB for
operators and available as raw data for a future "Project activity"
tab. The `project-detail.tsx` inline edit shows just
`Last updated <time ago>` from `project.updated_at`.

## Error Handling

| Scenario | Behavior |
|---|---|
| Migration runs with any empty `workspace.repos` | Abort with clear message listing workspace IDs |
| `POST /api/projects` without `repo_url` | 400 + `{"error":"repo_url is required"}` |
| Malformed URL | 400 + message from normalizer |
| Non-admin tries to change `repo_url` | 403 + `{"error":"only admins can change repo_url"}` |
| Daemon receives task with empty `project_slug` | Fallback to project UUID prefix; log warning |
| Project deletion with attached issues | (existing behavior) cascade SET NULL on `issue.project_id` **is no longer allowed** — change FK to RESTRICT, force user to reassign issues first |

**Note:** The FK change on `issue.project_id` from `ON DELETE SET NULL`
→ `ON DELETE RESTRICT` is part of this migration because we now require
a project on every issue.

## Testing

### Go unit (`server/internal/util/repo_url_test.go`, new)

Table-driven tests for `NormalizeRepoURL`:
- `""` → error
- `"  "` → error
- `"https://github.com/a/b"` → `"https://github.com/a/b.git"`
- `"https://github.com/a/b/"` → `"https://github.com/a/b.git"`
- `"https://github.com/a/b.git/"` → `"https://github.com/a/b.git"`
- `"git@github.com:a/b.git"` → same
- `"git@github.com:a/b"` → `"git@github.com:a/b.git"`
- `"ftp://x"` → error
- `"not a url"` → error

### Go integration (`server/internal/handler/project_test.go`)

- `CreateProject` without `repo_url` → 400.
- `CreateProject` with valid URL → 201, `repo_url` normalized in
  response.
- `UpdateProject` `repo_url` as member → 403.
- `UpdateProject` `repo_url` as admin → 200, `activity_log` row exists with `action='project.repo_url_changed'`, correct `project_id`, and `details` matching old/new URLs.
- `ListProjects` response includes `repo_url` field.

### Go integration for daemon claim
(`server/cmd/server/integration_test.go`)

- Issue in project A → claim task → response `Repos` contains exactly
  project A's `repo_url`.
- Issue in project B (same workspace, different repo) → claim task →
  response contains only project B's repo.

### Migration rollback test (new, `server/internal/db/migrate_test.go`)

- Apply 058 up, seed data, apply 058 down, verify:
  - `project.repo_url` gone
  - `issue.project_id` nullable again
  - Inbox projects still present (intentional)
  - No data loss in `issue` or `project`
- Apply up again → must succeed (idempotent-ish; re-creates Inbox
  only if missing — guard with `ON CONFLICT DO NOTHING` adjustment).

### Worktree path test
(`server/internal/daemon/execenv/context_test.go`)

- Given workspace slug + project slug + task ID → resolved path matches
  `~/.multica/worktrees/<ws>/<proj>/<task>`.
- Slug collisions (two projects titled "Foo") → fallback to UUID
  prefix verified.

### Component tests (`packages/views/projects/*.test.tsx`)

- Create dialog renders combobox with workspace.repos values.
- Submit disabled until URL valid.
- Settings tab edit button hidden for non-admin.
- After admin save: component refetches project and shows new URL.

### E2E (`e2e/tests/projects-repo-url.spec.ts`, new)

- Login as admin → create project with repo URL → verify project
  detail shows URL → open inline edit → change URL → verify toast →
  verify displayed URL is the new one after refetch.
- Login as member → settings tab → edit button absent.

## Rollout

1. Deploy order: backend + migration + CLI together. Frontend follows
   within minutes (Next.js is served from the same origin; cold deploy
   OK).
2. Operator runs migration 058. If it aborts, operator populates
   `workspace.repos` via SQL/UI, retries.
3. Existing issues auto-assigned to Inbox projects. Existing projects
   inherit `workspace.repos[0]`.
4. Daemon update: every user must restart their daemon after
   backend deploy — new task-claim response shape is additive
   (adds `project_id`, `project_slug` fields), but worktree path
   **changes**, so existing in-flight worktrees are orphaned (expected,
   GC clears them).

## Risks

| Risk | Mitigation |
|---|---|
| Admin forgets to set `workspace.repos` → migration aborts → downtime | Pre-migration preflight script shipped with release notes: `multica admin check-migrations` |
| Slug collision between projects (two "Foo" projects) | Fallback to UUID prefix; slug generator uses `<title-slug>-<short-id>` if conflict detected on insert |
| Daemon on older version sees unknown `project_id` field | JSON unmarshal in Go tolerates unknown fields by default; old daemons ignore new fields harmlessly |
| User sets a `repo_url` they can't actually clone | Out of scope (no reach check). Daemon surfaces clone errors in task result comment. |
| Multiple Inbox projects per workspace if migration re-runs | Idempotency guard: insert Inbox only if no project with title='Inbox' exists for the workspace |

## Open Questions

None after locked decisions above. Flagged explicitly so future
reviewers know nothing is implicit.

## File-Level Change List

| File | Change |
|---|---|
| `server/migrations/058_project_repos.up.sql` | new |
| `server/migrations/058_project_repos.down.sql` | new |
| `server/pkg/db/queries/project.sql` | add `repo_url` to SELECT/INSERT/UPDATE |
| `server/pkg/db/queries/issue.sql` | remove nullable `project_id` handling where assumed |
| `server/internal/util/repo_url.go` | new — `NormalizeRepoURL` |
| `server/internal/util/repo_url_test.go` | new |
| `server/internal/handler/project.go` | add `repo_url`, authz, `activity_log` write |
| `server/internal/handler/project_test.go` | new test cases |
| `server/internal/handler/daemon.go` | fetch project.repo_url for task claim, drop workspace fallback |
| `server/internal/daemon/types.go` | add `ProjectID`, `ProjectSlug` to `Task` |
| `server/internal/daemon/execenv/context.go` | new worktree path builder |
| `server/internal/daemon/execenv/context_test.go` | path test |
| `server/internal/daemon/execenv/git.go` | use new path |
| `server/cmd/multica/cmd_project.go` | `--repo-url` flag |
| `server/cmd/multica/cmd_project_test.go` | CLI flag test |
| `server/cmd/server/integration_test.go` | claim-task-with-project test |
| `packages/views/modals/create-project.tsx` | combobox + validation |
| `packages/views/projects/components/project-detail.tsx` | inline repo_url edit + display chip, admin-gated |
| `packages/views/projects/components/*.test.tsx` | component tests |
| `packages/core/types/project.ts` | add `repo_url` field to Project type |
| `packages/core/projects/mutations.ts` | pass through `repo_url` on create/update |
| `packages/core/projects/queries.ts` | no change (shape via type) |
| `e2e/tests/projects-repo-url.spec.ts` | new E2E |
| `docs/self-hosting.md` (if exists) | document preflight requirement |

Estimated diff size: ~900 lines added, ~80 removed across ~22 files.
