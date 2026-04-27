# Repos per Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the repository boundary from workspace-level (`workspace.repos JSONB`) to project-level (`project.repo_url TEXT NOT NULL`) so each project pins exactly one Git repo, agents work in isolated per-project worktrees, and projects become a hard scope boundary for daemon clones.

**Architecture:** Additive DB migration (058) adds `project.repo_url`, creates a per-workspace "Inbox" default project, routes orphan issues, then hardens `issue.project_id NOT NULL`. Daemon task-claim (`handler/daemon.go`) resolves repo from the issue's project instead of the workspace. Daemon execenv constructs per-project worktree paths (`~/.multica/worktrees/<ws>/<proj>/<task>`). Frontend gains a repo combobox in the create-project modal and an admin-gated inline edit on the project detail page. CLI gains `--repo-url` on `project create|update`. Audit events land in `activity_log` (new `project_id` column).

**Tech Stack:** Go 1.26 (chi router, sqlc, pgx), PostgreSQL 17 + pgvector, Next.js 16 (App Router, TanStack Query, Zustand), pnpm workspaces, Vitest + Playwright, goose migrations.

**Reference Spec:** `docs/superpowers/specs/2026-04-23-repos-per-project-design.md` — all 13 locked decisions live there.

---

## Preconditions

- Backend + frontend + daemon reachable per `CLAUDE.md` (this spec was authored against a local dev on ports 8090 / 3010).
- `my-postgres` container running on `localhost:5432` with database `multica`. Alternatively `make db-up` + `make migrate-up` on a clean instance.
- At least one workspace in the DB has a non-empty `workspace.repos` array. If empty, the migration aborts (intentional).

---

## Phase A — URL Normalizer

### Task 1: Normalize repo URLs

**Files:**
- Create: `server/internal/util/repo_url.go`
- Create: `server/internal/util/repo_url_test.go`

- [ ] **Step 1: Write the failing test**

```go
// server/internal/util/repo_url_test.go
package util

import "testing"

func TestNormalizeRepoURL(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"", "", true},
		{"   ", "", true},
		{"not a url", "", true},
		{"ftp://example.com/x.git", "", true},

		{"https://github.com/a/b", "https://github.com/a/b.git", false},
		{"https://github.com/a/b/", "https://github.com/a/b.git", false},
		{"https://github.com/a/b.git", "https://github.com/a/b.git", false},
		{"https://github.com/a/b.git/", "https://github.com/a/b.git", false},
		{"  https://github.com/a/b  ", "https://github.com/a/b.git", false},

		{"http://gitlab.local/x/y", "http://gitlab.local/x/y.git", false},

		{"git@github.com:a/b", "git@github.com:a/b.git", false},
		{"git@github.com:a/b.git", "git@github.com:a/b.git", false},
	}
	for _, c := range cases {
		t.Run(c.in, func(t *testing.T) {
			got, err := NormalizeRepoURL(c.in)
			if c.wantErr {
				if err == nil {
					t.Fatalf("want error, got %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != c.want {
				t.Errorf("got %q want %q", got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test — expect FAIL**

```
cd server && go test ./internal/util/ -run TestNormalizeRepoURL -v
```

Expected: compile error `undefined: NormalizeRepoURL`.

- [ ] **Step 3: Write minimal implementation**

```go
// server/internal/util/repo_url.go
package util

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// NormalizeRepoURL validates and canonicalizes a Git repository URL.
// The canonical form always ends with ".git" so lookups are deterministic.
// Accepts https://, http://, and git@host:owner/repo SSH form. Returns an
// error for any other scheme, empty input, or malformed URL.
func NormalizeRepoURL(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", errors.New("repo_url is empty")
	}
	s = strings.TrimRight(s, "/")

	if strings.HasPrefix(s, "https://") || strings.HasPrefix(s, "http://") {
		u, err := url.Parse(s)
		if err != nil {
			return "", fmt.Errorf("invalid URL: %w", err)
		}
		if u.Host == "" || u.Path == "" || u.Path == "/" {
			return "", errors.New("invalid URL: missing host or path")
		}
		if !strings.HasSuffix(s, ".git") {
			s += ".git"
		}
		return s, nil
	}

	if strings.HasPrefix(s, "git@") && strings.Contains(s, ":") {
		tail := s[strings.Index(s, ":")+1:]
		if tail == "" {
			return "", errors.New("invalid SSH URL: missing path")
		}
		if !strings.HasSuffix(s, ".git") {
			s += ".git"
		}
		return s, nil
	}

	return "", errors.New("repo_url must be https://, http://, or git@host:path SSH URL")
}
```

- [ ] **Step 4: Run test — expect PASS**

```
cd server && go test ./internal/util/ -run TestNormalizeRepoURL -v
```

Expected: all sub-tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/util/repo_url.go server/internal/util/repo_url_test.go
git commit -m "feat(util): add NormalizeRepoURL with .git canonical form"
```

---

## Phase B — Database Migration

### Task 2: Write migration SQL

**Files:**
- Create: `server/migrations/058_project_repos.up.sql`
- Create: `server/migrations/058_project_repos.down.sql`

- [ ] **Step 1: Write up migration**

```sql
-- server/migrations/058_project_repos.up.sql

-- 1. Preflight: abort if any workspace has no repos OR its first repo has no URL
DO $$
DECLARE bad INT;
BEGIN
  SELECT COUNT(*) INTO bad FROM workspace
   WHERE jsonb_array_length(COALESCE(repos, '[]'::jsonb)) = 0
      OR COALESCE(NULLIF(trim(repos->0->>'url'), ''), '') = '';
  IF bad > 0 THEN
    RAISE EXCEPTION
      'Cannot migrate: % workspace(s) have no usable workspace.repos[0].url. Populate it first.', bad;
  END IF;
END $$;

-- 2. Add nullable column; backfill before enforcing NOT NULL
ALTER TABLE project ADD COLUMN repo_url TEXT;

-- 3. Create per-workspace "Inbox" default project for orphan issues
INSERT INTO project
  (id, workspace_id, title, description, icon, status, repo_url, created_at, updated_at)
SELECT
  gen_random_uuid(), w.id, 'Inbox',
  'Default project for issues without an explicit project',
  '📥', 'in_progress',
  w.repos->0->>'url',
  now(), now()
FROM workspace w
WHERE NOT EXISTS (
  SELECT 1 FROM project p
   WHERE p.workspace_id = w.id AND p.title = 'Inbox'
);

-- 4. Route orphan issues to their workspace's Inbox
UPDATE issue i
SET project_id = (
  SELECT p.id FROM project p
   WHERE p.workspace_id = i.workspace_id AND p.title = 'Inbox'
   ORDER BY p.created_at ASC LIMIT 1
)
WHERE i.project_id IS NULL;

-- 5. Backfill repo_url on pre-existing projects from workspace template
UPDATE project p
SET repo_url = (SELECT w.repos->0->>'url' FROM workspace w WHERE w.id = p.workspace_id)
WHERE p.repo_url IS NULL;

-- 6. Harden constraints
ALTER TABLE project ALTER COLUMN repo_url SET NOT NULL;
ALTER TABLE project ADD CONSTRAINT project_repo_url_not_empty
  CHECK (length(trim(repo_url)) > 0);
ALTER TABLE issue ALTER COLUMN project_id SET NOT NULL;

-- 6b. Tighten issue.project_id FK from SET NULL to RESTRICT so deleting a
-- project with attached issues now fails fast instead of silently orphaning.
-- Discover + replace the existing FK by name:
DO $$
DECLARE fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
   WHERE tc.table_name = 'issue'
     AND tc.constraint_type = 'FOREIGN KEY'
     AND kcu.column_name = 'project_id'
   LIMIT 1;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE issue DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;
ALTER TABLE issue ADD CONSTRAINT issue_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE RESTRICT;

-- 7. activity_log: add project_id + index for project-scoped audit queries
ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES project(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_project
  ON activity_log(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

-- 8. Diagnostic index
CREATE INDEX IF NOT EXISTS idx_project_repo_url ON project(workspace_id, repo_url);
```

- [ ] **Step 2: Write down migration**

```sql
-- server/migrations/058_project_repos.down.sql

-- Allow orphan issues again
ALTER TABLE issue ALTER COLUMN project_id DROP NOT NULL;

-- Revert issue.project_id FK to ON DELETE SET NULL
DO $$
DECLARE fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
   WHERE tc.table_name = 'issue'
     AND tc.constraint_type = 'FOREIGN KEY'
     AND kcu.column_name = 'project_id'
   LIMIT 1;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE issue DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;
ALTER TABLE issue ADD CONSTRAINT issue_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE SET NULL;

-- Drop project repo_url
DROP INDEX IF EXISTS idx_project_repo_url;
ALTER TABLE project DROP CONSTRAINT IF EXISTS project_repo_url_not_empty;
ALTER TABLE project DROP COLUMN IF EXISTS repo_url;

-- Drop activity_log.project_id (details JSONB retains project context)
DROP INDEX IF EXISTS idx_activity_log_project;
ALTER TABLE activity_log DROP COLUMN IF EXISTS project_id;

-- Inbox projects intentionally preserved; operator removes manually if desired.
```

- [ ] **Step 3: Commit**

```bash
git add server/migrations/058_project_repos.up.sql server/migrations/058_project_repos.down.sql
git commit -m "feat(db): migration 058 - repos per project + inbox defaults"
```

### Task 3: Update sqlc queries for `project.repo_url`

**Files:**
- Modify: `server/pkg/db/queries/project.sql`

- [ ] **Step 1: Edit `CreateProject` and `UpdateProject`**

Change the SQL file so `INSERT` accepts `repo_url` and `UPDATE` supports optional `repo_url` change:

```sql
-- name: CreateProject :one
INSERT INTO project (
    workspace_id, title, description, icon, status,
    lead_type, lead_id, priority, repo_url
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpdateProject :one
UPDATE project SET
    title = COALESCE(sqlc.narg('title'), title),
    description = sqlc.narg('description'),
    icon = sqlc.narg('icon'),
    status = COALESCE(sqlc.narg('status'), status),
    priority = COALESCE(sqlc.narg('priority'), priority),
    lead_type = sqlc.narg('lead_type'),
    lead_id = sqlc.narg('lead_id'),
    repo_url = COALESCE(sqlc.narg('repo_url'), repo_url),
    updated_at = now()
WHERE id = $1
RETURNING *;
```

`ListProjects` and `GetProject` already `SELECT *` so they pick up the new column automatically — no change needed.

- [ ] **Step 2: Commit**

```bash
git add server/pkg/db/queries/project.sql
git commit -m "feat(db): expose repo_url in project create/update queries"
```

### Task 4: Update sqlc query for `activity_log.project_id`

**Files:**
- Modify: `server/pkg/db/queries/activity.sql`

- [ ] **Step 1: Replace `CreateActivity` so it accepts `project_id`**

```sql
-- name: CreateActivity :one
INSERT INTO activity_log (
    workspace_id, issue_id, project_id, actor_type, actor_id, action, details
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
```

Existing callers must pass `project_id` (NULL for issue-scoped events). Call sites will be updated in Task 5.

- [ ] **Step 2: Commit**

```bash
git add server/pkg/db/queries/activity.sql
git commit -m "feat(db): add project_id parameter to CreateActivity"
```

### Task 5: Regenerate sqlc + fix existing callers

**Files:**
- Regenerate: `server/pkg/db/generated/*.go`
- Modify: every `.go` file that calls `CreateActivity` with the old signature

- [ ] **Step 1: Regenerate**

```
make sqlc
```

Expected: `server/pkg/db/generated/activity.sql.go` and `project.sql.go` updated, compile errors at existing call sites.

- [ ] **Step 2: Fix existing call sites**

Find all callers:

```bash
cd server && grep -rn 'CreateActivity(' --include='*.go' .
```

For each occurrence, add `ProjectID: pgtype.UUID{}` (zero-valued, Valid=false) just below `IssueID`. Example:

```go
// before
_, err := q.CreateActivity(ctx, db.CreateActivityParams{
    WorkspaceID: wsID,
    IssueID:     issueID,
    ActorType:   pgtype.Text{String: "member", Valid: true},
    ActorID:     pgtype.UUID{Bytes: userID, Valid: true},
    Action:      "status_changed",
    Details:     detailsJSON,
})

// after
_, err := q.CreateActivity(ctx, db.CreateActivityParams{
    WorkspaceID: wsID,
    IssueID:     issueID,
    ProjectID:   pgtype.UUID{}, // not project-scoped
    ActorType:   pgtype.Text{String: "member", Valid: true},
    ActorID:     pgtype.UUID{Bytes: userID, Valid: true},
    Action:      "status_changed",
    Details:     detailsJSON,
})
```

- [ ] **Step 3: Build**

```
cd server && go build ./...
```

Expected: clean build.

- [ ] **Step 4: Apply migration against the local database**

```
make migrate-up
```

Expected: migration `058_project_repos` applied. If it raises `Cannot migrate: N workspace(s) have empty workspace.repos`, populate the workspace via SQL (`UPDATE workspace SET repos='[{"url":"https://github.com/you/your-repo.git"}]'::jsonb WHERE id='...';`) and rerun.

- [ ] **Step 5: Verify schema**

```
docker exec -e PGPASSWORD=multica my-postgres psql -U multica -d multica -c "\d project" | grep repo_url
```

Expected: `repo_url | text | not null`.

- [ ] **Step 6: Commit**

```bash
git add server/pkg/db/generated/ server/
git commit -m "feat(db): regenerate sqlc + add ProjectID to existing CreateActivity calls"
```

### Task 5.5: Migration rollback smoke test

**Files:**
- Read: `server/migrations/058_project_repos.up.sql`
- Read: `server/migrations/058_project_repos.down.sql`

- [ ] **Step 1: Apply down, then up again, in a shell script**

Do this against the local dev database (which already has 058 applied from Task 5):

```bash
cd server
go run ./cmd/migrate down   # rolls back 058 only (top of stack)
go run ./cmd/migrate up     # re-applies 058
```

- [ ] **Step 2: After down, verify schema**

```bash
docker exec -e PGPASSWORD=multica my-postgres psql -U multica -d multica <<'SQL'
\d project
\d issue
\d activity_log
SQL
```

Expected after `down`:
- `project.repo_url` column gone
- `issue.project_id` nullable
- `activity_log.project_id` gone
- Inbox projects still present (intentional)

Expected after `up` (second apply):
- All constraints back (matches Step 5 of Task 5)
- `Inbox` project insert skipped for workspaces that already have one (idempotency guard in Step 3 of the up SQL)

- [ ] **Step 3: Assert preserved data**

```bash
docker exec -e PGPASSWORD=multica my-postgres psql -U multica -d multica -c "SELECT title FROM project WHERE title = 'Inbox';"
```

Should show one `Inbox` row per workspace — never duplicated on re-apply.

- [ ] **Step 4: Commit the test procedure as a shell helper (optional, recommended)**

```bash
# server/scripts/test-058-rollback.sh  — new
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
go run ./cmd/migrate down
go run ./cmd/migrate up
echo "058 rollback smoke OK"
```

```bash
chmod +x server/scripts/test-058-rollback.sh
git add server/scripts/test-058-rollback.sh
git commit -m "test(migration): rollback smoke helper for 058"
```

---

## Phase C — Backend: Project Handler

### Task 6: `CreateProject` requires + normalizes `repo_url`

**Files:**
- Modify: `server/internal/handler/project.go`
- Modify: `server/internal/handler/project_test.go`

- [ ] **Step 1: Write failing test for CreateProject**

Add to `server/internal/handler/project_test.go`:

```go
func TestCreateProject_RequiresRepoURL(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()

	body := `{"title":"No Repo","workspace_id":"` + h.WorkspaceID + `"}`
	req := newAuthedReq(h, "POST", "/api/projects", body)
	rr := httptest.NewRecorder()
	h.Handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestCreateProject_NormalizesRepoURL(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()

	body := `{"title":"X","repo_url":"https://github.com/a/b/","workspace_id":"` + h.WorkspaceID + `"}`
	req := newAuthedReq(h, "POST", "/api/projects", body)
	rr := httptest.NewRecorder()
	h.Handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rr.Code, rr.Body.String())
	}
	var got struct{ RepoURL string `json:"repo_url"` }
	_ = json.Unmarshal(rr.Body.Bytes(), &got)
	if got.RepoURL != "https://github.com/a/b.git" {
		t.Errorf("got %q want canonical .git form", got.RepoURL)
	}
}
```

(If `newTestHandler` / `newAuthedReq` helpers don't exist in this test file yet, copy the pattern from `issue_test.go` — the same handler-level test setup.)

- [ ] **Step 2: Run tests — expect FAIL**

```
cd server && go test ./internal/handler/ -run TestCreateProject_ -v
```

Expected: both fail (create currently accepts missing repo_url, returns raw value).

- [ ] **Step 3: Modify `CreateProject` handler**

Edit the existing `CreateProject` in `server/internal/handler/project.go` — add `RepoURL` to the request struct, validate via `util.NormalizeRepoURL`, pass to `db.CreateProjectParams`:

```go
type CreateProjectRequest struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	Status      *string `json:"status"`
	LeadType    *string `json:"lead_type"`
	LeadID      *string `json:"lead_id"`
	Priority    *string `json:"priority"`
	RepoURL     string  `json:"repo_url"`
}

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	normalizedURL, err := util.NormalizeRepoURL(req.RepoURL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	workspaceID := middleware.WorkspaceIDFromContext(r.Context())
	// ... existing param assembly, then:
	p, err := h.Queries.CreateProject(r.Context(), db.CreateProjectParams{
		WorkspaceID: workspaceID,
		Title:       req.Title,
		// ... existing fields
		RepoURL: normalizedURL,
	})
	// ... existing error handling + response
	writeJSON(w, http.StatusCreated, toProjectResponse(p))
}
```

Also extend `toProjectResponse` (or the inline mapper) so `repo_url` ships in the JSON. Add `RepoURL string \`json:"repo_url"\`` to whatever response struct the file uses.

- [ ] **Step 4: Run tests — expect PASS**

```
cd server && go test ./internal/handler/ -run TestCreateProject_ -v
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/project.go server/internal/handler/project_test.go
git commit -m "feat(project): require + normalize repo_url on create"
```

### Task 7: `UpdateProject` authz + activity_log for `repo_url` changes

**Files:**
- Modify: `server/internal/handler/project.go`
- Modify: `server/internal/handler/project_test.go`

- [ ] **Step 1: Write failing tests**

```go
func TestUpdateProject_RepoURLForbiddenForMember(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()

	projectID := h.CreateProject(t, "A", "https://github.com/a/b.git")
	// h.UserID has "member" role (test default)
	body := `{"repo_url":"https://github.com/a/c"}`
	req := newAuthedReq(h, "PUT", "/api/projects/"+projectID, body)
	rr := httptest.NewRecorder()
	h.Handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestUpdateProject_RepoURLAsAdminWritesActivity(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()
	h.PromoteToAdmin(t) // sets member.role = 'admin'

	projectID := h.CreateProject(t, "A", "https://github.com/a/b.git")
	body := `{"repo_url":"https://github.com/a/c"}`
	req := newAuthedReq(h, "PUT", "/api/projects/"+projectID, body)
	rr := httptest.NewRecorder()
	h.Handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", rr.Code, rr.Body.String())
	}

	rows, err := h.Queries.ListActivityByProject(t.Context(), parseUUIDFrom(projectID))
	if err != nil {
		t.Fatalf("ListActivityByProject: %v", err)
	}
	found := false
	for _, row := range rows {
		if row.Action == "project.repo_url_changed" {
			found = true
			var d map[string]string
			_ = json.Unmarshal(row.Details, &d)
			if d["new_url"] != "https://github.com/a/c.git" || d["old_url"] != "https://github.com/a/b.git" {
				t.Errorf("wrong details: %+v", d)
			}
		}
	}
	if !found {
		t.Errorf("no project.repo_url_changed activity row")
	}
}
```

If `ListActivityByProject` query doesn't exist, add it to `server/pkg/db/queries/activity.sql`:

```sql
-- name: ListActivityByProject :many
SELECT * FROM activity_log
WHERE project_id = $1
ORDER BY created_at DESC;
```

Then `make sqlc` to regenerate.

- [ ] **Step 2: Run tests — expect FAIL**

```
cd server && go test ./internal/handler/ -run TestUpdateProject_RepoURL -v
```

- [ ] **Step 3: Modify `UpdateProject` handler**

```go
type UpdateProjectRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	Status      *string `json:"status"`
	LeadType    *string `json:"lead_type"`
	LeadID      *string `json:"lead_id"`
	Priority    *string `json:"priority"`
	RepoURL     *string `json:"repo_url"`
}

func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	projectID := parseUUID(chi.URLParam(r, "id"))
	var req UpdateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	current, err := h.Queries.GetProject(r.Context(), projectID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	// repo_url change is admin-only
	var normalizedRepo *string
	if req.RepoURL != nil {
		role := middleware.WorkspaceRoleFromContext(r.Context())
		if role != "admin" && role != "owner" {
			writeError(w, http.StatusForbidden, "only workspace admins can change repo_url")
			return
		}
		normalized, err := util.NormalizeRepoURL(*req.RepoURL)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		normalizedRepo = &normalized
	}

	updated, err := h.Queries.UpdateProject(r.Context(), db.UpdateProjectParams{
		ID:       projectID,
		Title:    textFromPtr(req.Title),
		// ... existing fields
		RepoURL: textFromPtr(normalizedRepo),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update project")
		return
	}

	// Audit log only when repo_url actually changed
	if normalizedRepo != nil && *normalizedRepo != current.RepoURL {
		details, _ := json.Marshal(map[string]string{
			"old_url": current.RepoURL,
			"new_url": *normalizedRepo,
		})
		userID := middleware.UserIDFromContext(r.Context())
		_, _ = h.Queries.CreateActivity(r.Context(), db.CreateActivityParams{
			WorkspaceID: current.WorkspaceID,
			IssueID:     pgtype.UUID{},
			ProjectID:   pgtype.UUID{Bytes: projectID.Bytes, Valid: true},
			ActorType:   pgtype.Text{String: "member", Valid: true},
			ActorID:     pgtype.UUID{Bytes: userID, Valid: true},
			Action:      "project.repo_url_changed",
			Details:     details,
		})
	}

	writeJSON(w, http.StatusOK, toProjectResponse(updated))
}
```

Helpers: if `middleware.WorkspaceRoleFromContext` doesn't exist yet, add it to `server/internal/middleware/workspace.go` — `RequireWorkspaceMember` already looks up the role; stash it in the request context alongside `workspaceID`.

- [ ] **Step 4: Run tests — expect PASS**

```
cd server && go test ./internal/handler/ -run TestUpdateProject_RepoURL -v
```

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/project.go server/internal/handler/project_test.go server/pkg/db/queries/activity.sql server/pkg/db/generated/
git commit -m "feat(project): admin-gated repo_url edits with activity_log audit"
```

### Task 8: Expose `repo_url` in all project GET responses

**Files:**
- Modify: `server/internal/handler/project.go`

- [ ] **Step 1: Write failing test**

```go
func TestListProjects_IncludesRepoURL(t *testing.T) {
	h, cleanup := newTestHandler(t)
	defer cleanup()

	id := h.CreateProject(t, "P", "https://github.com/a/b.git")

	req := newAuthedReq(h, "GET", "/api/projects", "")
	rr := httptest.NewRecorder()
	h.Handler.ServeHTTP(rr, req)

	var list []struct{ ID, RepoURL string `json:"id"` `json:"repo_url"` }
	_ = json.Unmarshal(rr.Body.Bytes(), &list)
	for _, p := range list {
		if p.ID == id && p.RepoURL == "https://github.com/a/b.git" {
			return
		}
	}
	t.Errorf("project %s with repo_url not in response", id)
}
```

- [ ] **Step 2: Run — expect FAIL** (response mapper doesn't ship `repo_url` yet)

```
cd server && go test ./internal/handler/ -run TestListProjects_IncludesRepoURL -v
```

- [ ] **Step 3: Update response mapping**

In `project.go`, find the `ProjectResponse` struct (or equivalent) and add:

```go
type ProjectResponse struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	// ... existing fields
	RepoURL     string  `json:"repo_url"`
}

func toProjectResponse(p db.Project) ProjectResponse {
	return ProjectResponse{
		ID:      uuidToString(p.ID),
		Title:   p.Title,
		// ... existing fields
		RepoURL: p.RepoURL,
	}
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add server/internal/handler/project.go server/internal/handler/project_test.go
git commit -m "feat(project): include repo_url in list/get responses"
```

---

## Phase D — Daemon Task-Claim Uses `project.repo_url`

### Task 9: Extend `Task` payload with `project_id` / `project_slug`

**Files:**
- Modify: `server/internal/daemon/types.go`

- [ ] **Step 1: Add fields**

Edit `server/internal/daemon/types.go`:

```go
type Task struct {
	ID                    string     `json:"id"`
	AgentID               string     `json:"agent_id"`
	RuntimeID             string     `json:"runtime_id"`
	IssueID               string     `json:"issue_id"`
	WorkspaceID           string     `json:"workspace_id"`
	ProjectID             string     `json:"project_id,omitempty"`
	ProjectSlug           string     `json:"project_slug,omitempty"`
	Agent                 *AgentData `json:"agent,omitempty"`
	Repos                 []RepoData `json:"repos,omitempty"`
	// ... existing fields
}
```

- [ ] **Step 2: Build to confirm**

```
cd server && go build ./internal/daemon/...
```

- [ ] **Step 3: Commit**

```bash
git add server/internal/daemon/types.go
git commit -m "feat(daemon): add ProjectID and ProjectSlug to Task payload"
```

### Task 10: Task-claim handler fetches `project.repo_url`

**Files:**
- Modify: `server/internal/handler/daemon.go`
- Modify: `server/cmd/server/integration_test.go` (or a new handler-level test)

- [ ] **Step 1: Write failing test**

Add to `server/cmd/server/integration_test.go` (or a focused new test — mirror the pattern already used for claim flows):

```go
func TestClaimTask_UsesProjectRepoURL(t *testing.T) {
	env := newIntegrationEnv(t)
	defer env.Cleanup()

	// Seed two projects with different repos; one issue in each.
	projA := env.CreateProject("Project A", "https://github.com/acme/repo-a.git")
	projB := env.CreateProject("Project B", "https://github.com/acme/repo-b.git")
	issueA := env.CreateIssue(projA.ID, "issue-a")
	issueB := env.CreateIssue(projB.ID, "issue-b")

	agent, runtime := env.CreateAgentAndRuntime()
	env.AssignIssue(issueA, agent.ID)
	env.AssignIssue(issueB, agent.ID)

	// Claim twice; each task should carry its project's repo URL, only.
	for _, want := range []struct {
		issueID string
		repoURL string
	}{
		{issueA, "https://github.com/acme/repo-a.git"},
		{issueB, "https://github.com/acme/repo-b.git"},
	} {
		task := env.DaemonClaim(runtime.ID)
		if task.IssueID != want.issueID {
			t.Fatalf("want issue %s got %s", want.issueID, task.IssueID)
		}
		if len(task.Repos) != 1 {
			t.Fatalf("want 1 repo, got %d: %+v", len(task.Repos), task.Repos)
		}
		if task.Repos[0].URL != want.repoURL {
			t.Errorf("want repo %s got %s", want.repoURL, task.Repos[0].URL)
		}
		if task.ProjectID == "" {
			t.Errorf("ProjectID empty on task payload")
		}
	}
}
```

(If fixture helpers `env.CreateProject(title, repoURL)` etc. don't exist yet, extend the existing integration test helpers consistently with current patterns.)

- [ ] **Step 2: Run — expect FAIL**

```
cd server && go test ./cmd/server -run TestClaimTask_UsesProjectRepoURL -v
```

- [ ] **Step 3: Modify `handler/daemon.go` claim response**

Locate the block around line 649-658 that currently assembles `resp.Repos` from `workspace.repos`. Replace with a project-scoped lookup:

```go
if task.IssueID.Valid {
	if issue, err := h.Queries.GetIssue(r.Context(), task.IssueID); err == nil {
		resp.WorkspaceID = uuidToString(issue.WorkspaceID)
		if issue.ProjectID.Valid {
			if proj, err := h.Queries.GetProject(r.Context(), issue.ProjectID); err == nil {
				resp.ProjectID = uuidToString(proj.ID)
				resp.ProjectSlug = projectSlug(proj.Title, proj.ID)
				resp.Repos = []RepoData{{URL: proj.RepoURL, Description: proj.Title}}
			}
		}
		// Keep existing TriggerCommentContent and PriorSession lookups untouched.
	}
}

// Chat-session branch (no issue): keep existing workspace.repos fallback for now
// until chat tasks are re-scoped. Document this as a known follow-up.
```

`projectSlug` helper (new, same file or `server/internal/util/slug.go` if preferred):

```go
func projectSlug(title string, id pgtype.UUID) string {
	slug := strings.ToLower(strings.TrimSpace(title))
	slug = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return uuidToString(id)[:8]
	}
	return fmt.Sprintf("%s-%s", slug, uuidToString(id)[:8])
}
```

- [ ] **Step 4: Run — expect PASS**

```
cd server && go test ./cmd/server -run TestClaimTask_UsesProjectRepoURL -v
```

- [ ] **Step 5: Run the full server test suite as a regression check**

```
make test
```

Expected: all Go tests green.

- [ ] **Step 6: Commit**

```bash
git add server/internal/handler/daemon.go server/cmd/server/integration_test.go
git commit -m "feat(daemon): claim response carries project repo_url + slug"
```

---

## Phase E — Daemon Worktree Path

### Task 11: Per-project worktree path

**Files:**
- Create: `server/internal/daemon/execenv/context_test.go`
- Modify: `server/internal/daemon/execenv/context.go`
- Modify: `server/internal/daemon/execenv/git.go` (call site)

- [ ] **Step 1: Write failing test**

```go
// server/internal/daemon/execenv/context_test.go
package execenv

import (
	"path/filepath"
	"testing"
)

func TestWorktreePath(t *testing.T) {
	root := "/home/u/.multica"
	cases := []struct {
		name, ws, proj, task, want string
	}{
		{"normal", "acme", "platform-abc12345", "task-42",
			filepath.Join(root, "worktrees", "acme", "platform-abc12345", "task-42")},
		{"fallback slug when empty", "acme", "", "task-7",
			filepath.Join(root, "worktrees", "acme", "unknown", "task-7")},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := WorktreePath(root, c.ws, c.proj, c.task)
			if got != c.want {
				t.Errorf("got %q want %q", got, c.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run — expect FAIL**

```
cd server && go test ./internal/daemon/execenv -run TestWorktreePath -v
```

- [ ] **Step 3: Implement `WorktreePath`**

Add to `server/internal/daemon/execenv/context.go`:

```go
// WorktreePath returns the isolated clone location for a daemon-executed task.
// Shape: <root>/worktrees/<workspace>/<project>/<task>
// Missing workspace or project segments fall back to "unknown" so the path
// stays well-formed and collisions are still rare due to the task ID suffix.
func WorktreePath(root, workspace, project, task string) string {
	ws := strings.TrimSpace(workspace)
	if ws == "" {
		ws = "unknown"
	}
	proj := strings.TrimSpace(project)
	if proj == "" {
		proj = "unknown"
	}
	t := strings.TrimSpace(task)
	if t == "" {
		t = "unknown"
	}
	return filepath.Join(root, "worktrees", ws, proj, t)
}
```

- [ ] **Step 4: Wire at call site in `git.go`**

Find the current worktree path construction in `server/internal/daemon/execenv/git.go`. Replace with:

```go
// OLD (illustrative — actual code may differ):
// path := filepath.Join(cfg.WorktreeRoot, "worktrees", hash(repoURL), taskID)

// NEW:
path := WorktreePath(cfg.WorktreeRoot, task.WorkspaceID, task.ProjectSlug, task.ID)
```

Pass `task` (which now carries `WorkspaceID`, `ProjectSlug`, `ID`) through from the daemon's execenv wiring.

- [ ] **Step 5: Run the path test + broader daemon tests**

```
cd server && go test ./internal/daemon/execenv/ -v
cd server && go test ./internal/daemon/... -v
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add server/internal/daemon/execenv/
git commit -m "feat(daemon): per-workspace/project worktree path layout"
```

---

## Phase F — CLI

### Task 12: `--repo-url` flag on `project create|update`

**Files:**
- Modify: `server/cmd/algoplan/cmd_project.go`
- Modify: `server/cmd/algoplan/cmd_project_test.go`

- [ ] **Step 1: Write failing test**

```go
// server/cmd/algoplan/cmd_project_test.go
func TestProjectCreate_RequiresRepoURL(t *testing.T) {
	cmd := newProjectCreateCmd()
	cmd.SetArgs([]string{"--title", "X"})
	err := cmd.Execute()
	if err == nil || !strings.Contains(err.Error(), "repo-url") {
		t.Fatalf("want error mentioning repo-url, got %v", err)
	}
}

func TestProjectUpdate_RepoURLFlag(t *testing.T) {
	cmd := newProjectUpdateCmd()
	cmd.SetArgs([]string{"abc", "--repo-url", "https://x/y"})
	got := cmd.Flag("repo-url").Value.String()
	if got != "https://x/y" {
		t.Errorf("got %q", got)
	}
}
```

- [ ] **Step 2: Run — expect FAIL**

```
cd server && go test ./cmd/algoplan -run TestProjectCreate_RequiresRepoURL -v
cd server && go test ./cmd/algoplan -run TestProjectUpdate_RepoURLFlag -v
```

- [ ] **Step 3: Add flags + wire into request body**

Edit `server/cmd/algoplan/cmd_project.go`. In the create command:

```go
projectCreateCmd.Flags().String("repo-url", "", "Git repository URL (required)")
_ = projectCreateCmd.MarkFlagRequired("repo-url")
```

And in the create RunE body, include `repo_url` in the POST payload:

```go
payload := map[string]any{
	"title":   title,
	"repo_url": repoURL,
	// existing fields
}
```

Analogous change on update: add `projectUpdateCmd.Flags().String("repo-url", "", "New repository URL")` and include in payload when non-empty.

- [ ] **Step 4: Run — expect PASS**

```
cd server && go test ./cmd/algoplan -run TestProject -v
```

- [ ] **Step 5: Commit**

```bash
git add server/cmd/algoplan/cmd_project.go server/cmd/algoplan/cmd_project_test.go
git commit -m "feat(cli): add --repo-url flag to project create/update"
```

---

## Phase G — Frontend

### Task 13: Core types + mutations

**Files:**
- Modify: `packages/core/types/project.ts`
- Modify: `packages/core/projects/mutations.ts`

- [ ] **Step 1: Add `repo_url` field to the `Project` type**

Edit `packages/core/types/project.ts` — add:

```ts
export interface Project {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  status: ProjectStatus;
  lead_type: "member" | "agent" | null;
  lead_id: string | null;
  priority: string;
  repo_url: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  icon?: string;
  status?: ProjectStatus;
  lead_type?: "member" | "agent";
  lead_id?: string;
  priority?: string;
  repo_url: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string | null;
  icon?: string | null;
  status?: ProjectStatus;
  priority?: string;
  lead_type?: "member" | "agent" | null;
  lead_id?: string | null;
  repo_url?: string;
}
```

- [ ] **Step 2: Mutations already pass-through — verify no change needed**

`packages/core/projects/mutations.ts` forwards `data` as-is to `api.createProject` / `api.updateProject`. Adding `repo_url` to the request type above is sufficient. If the file has explicit field whitelisting, extend it there.

- [ ] **Step 3: Typecheck + unit test**

```
pnpm --filter @multica/core typecheck
pnpm --filter @multica/core test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add packages/core/types/project.ts packages/core/projects/mutations.ts
git commit -m "feat(core): add repo_url to Project + request types"
```

### Task 14: Create-project modal — repo combobox

**Files:**
- Modify: `packages/views/modals/create-project.tsx`
- Create: `packages/views/modals/create-project.test.tsx`

- [ ] **Step 1: Write failing component test**

```tsx
// packages/views/modals/create-project.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateProjectModal } from "./create-project";

// Mock core store; follow pattern from packages/views/auth/login-page.test.tsx
// Use vi.hoisted + Object.assign selectorFn with .getState().
// Specifically stub useWorkspace so workspace.repos = [{url:"https://a/b.git"}].

test("submit disabled until repo_url valid", () => {
  render(<CreateProjectModal onClose={() => {}} />);
  const submit = screen.getByRole("button", { name: /create/i });
  expect(submit).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "X" } });
  fireEvent.change(screen.getByLabelText(/repository url/i), {
    target: { value: "not a url" },
  });
  expect(submit).toBeDisabled();

  fireEvent.change(screen.getByLabelText(/repository url/i), {
    target: { value: "https://github.com/a/b" },
  });
  expect(submit).not.toBeDisabled();
});

test("combobox lists workspace.repos as suggestions", () => {
  render(<CreateProjectModal onClose={() => {}} />);
  // The first suggestion (workspace default) must be visible + clickable.
  expect(screen.getByText("https://a/b.git")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run — expect FAIL**

```
pnpm --filter @multica/views exec vitest run modals/create-project.test.tsx
```

- [ ] **Step 3: Edit the modal**

Add a `Repository URL` field below `Title`. Implementation shape:

```tsx
// inside the form state
const [repoURL, setRepoURL] = useState("");
const workspaceRepos = useWorkspace((s) => s.workspace?.repos ?? []);

function isValidRepoURL(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/[^\s]+|git@[^\s]+:[^\s]+)$/.test(trimmed);
}

// …
<label htmlFor="repo-url">Repository URL</label>
<Combobox value={repoURL} onChange={setRepoURL}>
  <ComboboxInput
    id="repo-url"
    placeholder="https://github.com/org/repo.git"
    onChange={(e) => setRepoURL(e.target.value)}
  />
  <ComboboxPopover>
    {workspaceRepos.map((r) => (
      <ComboboxOption key={r.url} value={r.url}>
        {r.url}
      </ComboboxOption>
    ))}
  </ComboboxPopover>
</Combobox>

<Button
  type="submit"
  disabled={!title.trim() || !isValidRepoURL(repoURL)}
  onClick={async () => {
    await createProject.mutateAsync({
      title,
      repo_url: repoURL.trim(),
      description,
      // …
    });
    onClose();
  }}
>
  Create
</Button>
```

Use the project's existing `Combobox` primitive from `@multica/ui`. If no combobox exists yet, fall back to `<input list="workspace-repos">` with `<datalist>` — simplest native combobox.

- [ ] **Step 4: Run — expect PASS**

```
pnpm --filter @multica/views exec vitest run modals/create-project.test.tsx
```

- [ ] **Step 5: Smoke-check in the running frontend**

1. Open http://localhost:3010 in browser.
2. Create a project → confirm repo URL input + workspace suggestion shown.
3. Submit with invalid URL → button stays disabled.
4. Submit with valid URL → project appears in list with repo chip.

- [ ] **Step 6: Commit**

```bash
git add packages/views/modals/create-project.tsx packages/views/modals/create-project.test.tsx
git commit -m "feat(create-project): require repo_url with workspace suggestions"
```

### Task 15: Project detail — inline repo_url edit (admin-gated)

**Files:**
- Modify: `packages/views/projects/components/project-detail.tsx`
- Create: `packages/views/projects/components/project-detail.repo.test.tsx`

- [ ] **Step 1: Write failing component tests**

```tsx
// packages/views/projects/components/project-detail.repo.test.tsx
import { render, screen } from "@testing-library/react";
import { ProjectDetail } from "./project-detail";

// Mock useCurrentMemberRole so we can toggle "member" vs "admin".

test("member sees repo URL but no edit button", () => {
  // mock role = "member"
  render(<ProjectDetail project={mockProject({ repo_url: "https://a/b.git" })} />);
  expect(screen.getByText("https://a/b.git")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /edit repository/i })).toBeNull();
});

test("admin sees edit button", () => {
  // mock role = "admin"
  render(<ProjectDetail project={mockProject({ repo_url: "https://a/b.git" })} />);
  expect(screen.getByRole("button", { name: /edit repository/i })).toBeInTheDocument();
});

test("admin save calls updateProject with new repo_url", async () => {
  const update = vi.fn();
  // wire update into the mocked useUpdateProject selector
  render(<ProjectDetail project={mockProject({ repo_url: "https://a/b.git" })} />);
  // click edit → change input → save
  // assert update called with { id, repo_url: "https://a/c.git" }
});
```

(Mock helpers mirror `login-page.test.tsx` patterns.)

- [ ] **Step 2: Run — expect FAIL**

```
pnpm --filter @multica/views exec vitest run projects/components/project-detail.repo.test.tsx
```

- [ ] **Step 3: Add the repo block + gated edit to `project-detail.tsx`**

```tsx
const role = useCurrentMemberRole();
const canEditRepo = role === "admin" || role === "owner";
const [editing, setEditing] = useState(false);
const [draftURL, setDraftURL] = useState(project.repo_url);
const updateProject = useUpdateProject();

return (
  <>
    {/* existing title + description */}

    <section aria-label="Repository">
      <h3 className="text-sm text-muted-foreground">Repository</h3>
      {!editing && (
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs">{project.repo_url}</code>
          {canEditRepo && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit repository">
              Edit
            </Button>
          )}
        </div>
      )}
      {editing && canEditRepo && (
        <div className="flex items-center gap-2">
          <Input
            value={draftURL}
            onChange={(e) => setDraftURL(e.target.value)}
            aria-label="Repository URL"
          />
          <Button
            size="sm"
            onClick={async () => {
              try {
                await updateProject.mutateAsync({ id: project.id, repo_url: draftURL.trim() });
                toast.success("Repository updated");
                setEditing(false);
              } catch (err: unknown) {
                if (err instanceof ApiError && err.status === 403) {
                  toast.error("Only admins can change the repository.");
                } else {
                  toast.error("Failed to update repository");
                }
              }
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraftURL(project.repo_url); }}>
            Cancel
          </Button>
        </div>
      )}
    </section>
  </>
);
```

If `useCurrentMemberRole` doesn't exist, add it to `packages/core/workspaces/queries.ts`:

```ts
export function useCurrentMemberRole(): "owner" | "admin" | "member" | null {
  return useWorkspace((s) => s.currentMember?.role ?? null);
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
pnpm --filter @multica/views exec vitest run projects/components/project-detail.repo.test.tsx
```

- [ ] **Step 5: Smoke check**

Open a project in the running app. Verify:
- As regular member → URL visible, no Edit button.
- As admin → URL visible with Edit button; clicking reveals input; saving a valid URL updates the display.

- [ ] **Step 6: Commit**

```bash
git add packages/views/projects/components/project-detail.tsx packages/views/projects/components/project-detail.repo.test.tsx packages/core/workspaces/queries.ts
git commit -m "feat(project-detail): admin-gated inline repo_url edit"
```

---

## Phase H — E2E

### Task 16: Playwright E2E

**Files:**
- Create: `e2e/tests/projects-repo-url.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// e2e/tests/projects-repo-url.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsDefault, createTestApi } from "./helpers";
import type { TestApiClient } from "./fixtures";

let api: TestApiClient;

test.beforeEach(async ({ page }) => {
  api = await createTestApi();
  await loginAsDefault(page);
  await api.promoteMeToAdmin();
});

test.afterEach(async () => {
  await api.cleanup();
});

test("admin can create project with repo URL and edit it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /projects/i }).click();
  await page.getByRole("button", { name: /new project/i }).click();

  await page.getByLabel(/title/i).fill("E2E Test Project");
  await page.getByLabel(/repository url/i).fill("https://github.com/acme/e2e-a");
  await page.getByRole("button", { name: /create/i }).click();

  await expect(page.getByText("https://github.com/acme/e2e-a.git")).toBeVisible();

  await page.getByRole("button", { name: /edit repository/i }).click();
  await page.getByLabel(/repository url/i).fill("https://github.com/acme/e2e-b.git");
  await page.getByRole("button", { name: /save/i }).click();

  await expect(page.getByText("https://github.com/acme/e2e-b.git")).toBeVisible();
});

test("member cannot edit repo_url", async ({ page, browser }) => {
  const project = await api.createProject({
    title: "Member Test",
    repo_url: "https://github.com/acme/m.git",
  });

  // Second browser context as a non-admin member
  const memberCtx = await browser.newContext();
  const memberPage = await memberCtx.newPage();
  await loginAsDefault(memberPage);
  await memberPage.goto(`/projects/${project.id}`);

  await expect(memberPage.getByText("https://github.com/acme/m.git")).toBeVisible();
  await expect(memberPage.getByRole("button", { name: /edit repository/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the spec**

```
pnpm exec playwright test e2e/tests/projects-repo-url.spec.ts
```

Expected: both tests green. If fixture helpers like `api.promoteMeToAdmin()` or `api.createProject({repo_url})` don't exist yet, extend `e2e/tests/helpers.ts` and `e2e/tests/fixtures.ts` consistently with existing fixtures.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/projects-repo-url.spec.ts e2e/tests/helpers.ts e2e/tests/fixtures.ts
git commit -m "test(e2e): repo_url create/edit admin-gated flow"
```

---

## Phase I — Final Verification

### Task 17: Full verification pipeline

- [ ] **Step 1: Run full checks**

```
make check
```

Expected: `typecheck`, `pnpm test`, `go test ./...`, and Playwright all green.

- [ ] **Step 2: Manual smoke of daemon flow**

1. Ensure backend + frontend running (ports 8090 / 3010 in this checkout).
2. `algoplan login` + `algoplan daemon start` (interactive).
3. Create a new project via CLI: `algoplan project create --title "Daemon Smoke" --repo-url "https://github.com/<your>/<repo>.git"`.
4. Create an issue in that project assigned to an agent that uses a local runtime.
5. Verify daemon logs show the project's repo being cloned into `~/.multica/worktrees/<workspace>/<project-slug>/<task-id>/` — not a workspace-wide path.

- [ ] **Step 3: Tag the branch (optional, if working on a feature branch)**

```bash
git log --oneline -15
```

Ensure the commit list reads linearly from Task 1 → Task 17 without rework loops.

- [ ] **Step 4: Final commit (if any lingering formatting)**

```bash
git status
git commit -am "chore: final formatting" # only if something is staged
```

---

## Risk Register During Implementation

| Risk | Mitigation |
|---|---|
| `make sqlc` produces a diff that conflicts with hand-written changes | Run `make sqlc` **before** editing any handler; review the generated diff; only then edit handlers |
| `CreateActivity` call-site updates leave a zero-valued `pgtype.UUID` for a field that should be NULL | Always use `pgtype.UUID{}` (Valid=false) for "no project"; never `pgtype.UUID{Bytes: ...}` with `Valid: false` |
| Migration 058 fails on a workspace with no repos | Preflight in the SQL raises a clear exception; operator populates `workspace.repos` and re-runs |
| Worktree path change orphans existing in-flight worktrees | Daemon GC (`server/internal/daemon/gc.go`) already sweeps stale worktrees — acceptable loss |
| Frontend submit enabled with URL that server rejects | Client-side regex mirrors server normalizer; server is still authoritative — UI surfaces server 400 as toast |
| Component test mocks drift from real Zustand shape | Follow the `vi.hoisted` + `Object.assign(selectorFn, {getState})` pattern from `packages/views/auth/login-page.test.tsx` |

## Out of Scope (explicit — do NOT expand)

- Multiple repos per project (array schema).
- Live reachability / clone check on save.
- Autopilot `project_id NOT NULL` enforcement.
- Project-level activity timeline UI (activity_log rows are stored but not rendered).
- Chat-task repo resolution (keeps workspace fallback for now; flagged as follow-up in `daemon.go`).
- Per-team ACLs / workspace role expansion.
