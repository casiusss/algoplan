package execenv

import (
	"path/filepath"
	"strings"
)

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
