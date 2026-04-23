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
