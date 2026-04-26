package cli

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"time"
)

// AlgoPlanConfigDirName is the new ~/.algoplan/ basename.
// LegacyConfigDirName is the old ~/.multica/ basename.
//
// Plan 08-06 swaps defaultCLIConfigPath in config.go to use AlgoPlanConfigDirName;
// MigrateConfigDir is the bridge that lets existing users transition without
// losing their config.json on first run after upgrade.
const (
	AlgoPlanConfigDirName = ".algoplan"
	LegacyConfigDirName   = ".multica"
)

// MigrateResult reports the outcome of a MigrateConfigDir call.
type MigrateResult struct {
	Migrated      bool   // true iff a copy from legacy → new actually occurred
	Reason        string // human-readable explanation (always populated)
	LegacyMovedTo string // path that legacy dir was renamed to (".multica.migrated-{ts}"), empty if legacy was absent
}

// MigrateConfigDir copies <home>/.multica/ to <home>/.algoplan/ when (and only
// when) the legacy dir exists and the new dir does not. Atomic w.r.t. partial
// failures: if copy fails, the partial new dir is removed.
//
// After successful copy, the legacy dir is RENAMED to ".multica.migrated-<ts>"
// (NOT deleted) so the user can rollback by renaming back if v0.5.0 misbehaves.
//
// Idempotent: safe to call on every CLI invocation. Subsequent calls observe
// the legacy dir is gone (renamed to .migrated-{ts}) and return Migrated:false.
//
// Pure w.r.t. `home` — accepts t.TempDir() in tests; never touches real $HOME.
func MigrateConfigDir(home string) (MigrateResult, error) {
	legacy := filepath.Join(home, LegacyConfigDirName)
	current := filepath.Join(home, AlgoPlanConfigDirName)

	legacyInfo, legacyErr := os.Stat(legacy)
	currentInfo, currentErr := os.Stat(current)
	legacyExists := legacyErr == nil && legacyInfo.IsDir()
	currentExists := currentErr == nil && currentInfo.IsDir()

	if !legacyExists && !currentExists {
		return MigrateResult{Migrated: false, Reason: "no legacy dir"}, nil
	}
	if !legacyExists && currentExists {
		return MigrateResult{Migrated: false, Reason: "no legacy dir"}, nil
	}
	if legacyExists && currentExists {
		// Already migrated; treat legacy as stale and rename it out of the way.
		moved, mvErr := renameLegacyAside(legacy)
		if mvErr != nil {
			return MigrateResult{}, fmt.Errorf("rename stale legacy dir: %w", mvErr)
		}
		return MigrateResult{
			Migrated:      false,
			Reason:        "already migrated; legacy preserved",
			LegacyMovedTo: moved,
		}, nil
	}

	// Only legacy exists → copy it to current, then rename legacy aside.
	if err := copyDir(legacy, current); err != nil {
		// Best-effort rollback: remove partial dest so a retry can re-attempt.
		_ = os.RemoveAll(current)
		return MigrateResult{}, fmt.Errorf("copy %s -> %s: %w", legacy, current, err)
	}
	moved, mvErr := renameLegacyAside(legacy)
	if mvErr != nil {
		// Copy succeeded; rename failed. New dir is intact, legacy still present —
		// idempotent re-run will see "both exist" and rename legacy aside.
		return MigrateResult{
			Migrated: true,
			Reason:   fmt.Sprintf("copied; legacy rename failed (will retry next run): %v", mvErr),
		}, nil
	}
	return MigrateResult{
		Migrated:      true,
		Reason:        "copied legacy → new",
		LegacyMovedTo: moved,
	}, nil
}

// renameLegacyAside moves a directory to "<dir>.migrated-<unix_ts>" preserving
// it for rollback. Returns the new path.
func renameLegacyAside(dir string) (string, error) {
	target := fmt.Sprintf("%s.migrated-%d", dir, time.Now().Unix())
	if err := os.Rename(dir, target); err != nil {
		return "", err
	}
	return target, nil
}

// copyDir recursively copies src to dst, creating dst with mode 0700.
// Files preserve their mode bits. Symlinks are copied as symlinks (not followed).
func copyDir(src, dst string) error {
	if err := os.MkdirAll(dst, 0o700); err != nil {
		return err
	}
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, relErr := filepath.Rel(src, path)
		if relErr != nil {
			return relErr
		}
		target := filepath.Join(dst, rel)
		switch {
		case d.IsDir():
			info, statErr := d.Info()
			if statErr != nil {
				return statErr
			}
			return os.MkdirAll(target, info.Mode().Perm())
		case d.Type()&fs.ModeSymlink != 0:
			link, rdErr := os.Readlink(path)
			if rdErr != nil {
				return rdErr
			}
			return os.Symlink(link, target)
		default:
			return copyFile(path, target)
		}
	})
}

func copyFile(src, dst string) error {
	srcInfo, err := os.Stat(src)
	if err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, srcInfo.Mode().Perm())
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return nil
}

// IsAlreadyMigrated returns true when only the new dir exists and the legacy
// dir is absent — a fast-path check for callers that want to skip even
// invoking MigrateConfigDir.
func IsAlreadyMigrated(home string) bool {
	_, legacyErr := os.Stat(filepath.Join(home, LegacyConfigDirName))
	_, currentErr := os.Stat(filepath.Join(home, AlgoPlanConfigDirName))
	return errors.Is(legacyErr, fs.ErrNotExist) && currentErr == nil
}
