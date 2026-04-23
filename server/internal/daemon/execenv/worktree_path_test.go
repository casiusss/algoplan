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
		{"fallback workspace when empty", "", "p", "task-1",
			filepath.Join(root, "worktrees", "unknown", "p", "task-1")},
		{"fallback task when empty", "ws", "p", "",
			filepath.Join(root, "worktrees", "ws", "p", "unknown")},
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
