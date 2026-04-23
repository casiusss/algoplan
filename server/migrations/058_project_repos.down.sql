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
