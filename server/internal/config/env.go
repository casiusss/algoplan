// Package config centralizes environment-variable reading with backwards-compat
// for the Multica → AlgoPlan rename (Phase 8 D-3).
//
// Use GetEnv / GetEnvDefault for any ALGOPLAN_-prefixed env var. The helper
// reads the new name first and falls back to the legacy MULTICA_-prefixed
// name with a one-shot slog.Warn deprecation warning per variable per process.
//
// Wave 3 (Plan 08-05) sweeps call sites from os.Getenv("MULTICA_X") to
// config.GetEnv("ALGOPLAN_X").
package config

import (
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
)

// alreadyWarned tracks which legacy variable names have already triggered the
// deprecation warning in this process. Concurrency-safe — multiple goroutines
// reading the same env at boot will collectively log exactly one warning.
var alreadyWarned sync.Map // map[string]struct{}

// GetEnv reads the new ALGOPLAN_-prefixed env var first; if empty/unset, falls
// back to the legacy MULTICA_-prefixed equivalent and logs a one-shot
// deprecation warning. Returns "" if neither is set.
//
// PANICS if name is not "ALGOPLAN_"-prefixed (caller bug).
func GetEnv(name string) string {
	if !strings.HasPrefix(name, "ALGOPLAN_") {
		panic(fmt.Sprintf("config.GetEnv requires ALGOPLAN_-prefixed name; got %q", name))
	}
	if v := os.Getenv(name); v != "" {
		return v
	}
	legacy := "MULTICA_" + strings.TrimPrefix(name, "ALGOPLAN_")
	if v := os.Getenv(legacy); v != "" {
		warnDeprecatedOnce(legacy, name)
		return v
	}
	return ""
}

// GetEnvDefault is GetEnv with a fallback default value if neither name is set.
func GetEnvDefault(name, defaultValue string) string {
	if v := GetEnv(name); v != "" {
		return v
	}
	return defaultValue
}

// ResetDeprecationWarnings clears the once-tracker. TEST-ONLY — do not call
// from production code (would re-trigger warnings on legitimate rereads).
func ResetDeprecationWarnings() {
	alreadyWarned = sync.Map{}
}

func warnDeprecatedOnce(legacy, current string) {
	if _, loaded := alreadyWarned.LoadOrStore(legacy, struct{}{}); loaded {
		return
	}
	slog.Warn(
		"deprecated env var",
		slog.String("legacy", legacy),
		slog.String("use", current),
		slog.String("removal_target", "v0.6.0 or v0.7.0"),
	)
}
