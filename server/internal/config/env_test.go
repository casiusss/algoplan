package config

import (
	"bytes"
	"log/slog"
	"strings"
	"sync/atomic"
	"testing"
)

// captureSlog swaps the default slog logger for a buffer-backed text handler
// and returns the buffer + a restore function.
func captureSlog(t *testing.T) (*bytes.Buffer, func()) {
	t.Helper()
	buf := &bytes.Buffer{}
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(buf, &slog.HandlerOptions{Level: slog.LevelDebug})))
	return buf, func() { slog.SetDefault(prev) }
}

func TestGetEnv_PrefersNewName(t *testing.T) {
	ResetDeprecationWarnings()
	buf, restore := captureSlog(t)
	defer restore()

	t.Setenv("ALGOPLAN_TEST_FOO", "new-value")
	t.Setenv("MULTICA_TEST_FOO", "legacy-value")

	got := GetEnv("ALGOPLAN_TEST_FOO")
	if got != "new-value" {
		t.Fatalf("want new-value, got %q", got)
	}
	if strings.Contains(buf.String(), "deprecated") {
		t.Fatalf("did not expect deprecation warning when new name is set; logs: %s", buf.String())
	}
}

func TestGetEnv_FallsBackToLegacyWithWarning(t *testing.T) {
	ResetDeprecationWarnings()
	buf, restore := captureSlog(t)
	defer restore()

	t.Setenv("ALGOPLAN_TEST_BAR", "")
	t.Setenv("MULTICA_TEST_BAR", "legacy-value")

	got := GetEnv("ALGOPLAN_TEST_BAR")
	if got != "legacy-value" {
		t.Fatalf("want legacy-value, got %q", got)
	}
	if !strings.Contains(buf.String(), "MULTICA_TEST_BAR") || !strings.Contains(buf.String(), "ALGOPLAN_TEST_BAR") {
		t.Fatalf("expected deprecation warning naming both vars; logs: %s", buf.String())
	}
}

func TestGetEnv_WarnsOnlyOnceAcrossManyReads(t *testing.T) {
	ResetDeprecationWarnings()
	buf, restore := captureSlog(t)
	defer restore()

	t.Setenv("MULTICA_TEST_BAZ", "v")
	for i := 0; i < 100; i++ {
		_ = GetEnv("ALGOPLAN_TEST_BAZ")
	}
	count := strings.Count(buf.String(), "MULTICA_TEST_BAZ")
	if count != 1 {
		t.Fatalf("expected exactly 1 deprecation warning across 100 reads, got %d; logs: %s", count, buf.String())
	}
}

func TestGetEnv_OnePerVarName(t *testing.T) {
	ResetDeprecationWarnings()
	buf, restore := captureSlog(t)
	defer restore()

	t.Setenv("MULTICA_TEST_X", "x")
	t.Setenv("MULTICA_TEST_Y", "y")
	_ = GetEnv("ALGOPLAN_TEST_X")
	_ = GetEnv("ALGOPLAN_TEST_Y")
	if c := strings.Count(buf.String(), "MULTICA_TEST_X"); c != 1 {
		t.Fatalf("MULTICA_TEST_X warning count want 1, got %d", c)
	}
	if c := strings.Count(buf.String(), "MULTICA_TEST_Y"); c != 1 {
		t.Fatalf("MULTICA_TEST_Y warning count want 1, got %d", c)
	}
}

func TestGetEnv_EmptyLegacyTreatedAsUnset(t *testing.T) {
	ResetDeprecationWarnings()
	buf, restore := captureSlog(t)
	defer restore()

	t.Setenv("ALGOPLAN_TEST_EMPTY", "")
	t.Setenv("MULTICA_TEST_EMPTY", "")
	got := GetEnv("ALGOPLAN_TEST_EMPTY")
	if got != "" {
		t.Fatalf("want empty, got %q", got)
	}
	if strings.Contains(buf.String(), "deprecated") {
		t.Fatalf("no warning expected for empty legacy; logs: %s", buf.String())
	}
}

func TestGetEnvDefault_FallsBackToProvidedDefault(t *testing.T) {
	ResetDeprecationWarnings()
	t.Setenv("ALGOPLAN_TEST_DEF", "")
	t.Setenv("MULTICA_TEST_DEF", "")
	got := GetEnvDefault("ALGOPLAN_TEST_DEF", "fallback")
	if got != "fallback" {
		t.Fatalf("want fallback, got %q", got)
	}
}

func TestGetEnv_PanicsOnNonAlgoPlanName(t *testing.T) {
	defer func() {
		r := recover()
		if r == nil {
			t.Fatal("expected panic for non-ALGOPLAN_ prefixed name")
		}
		msg, ok := r.(string)
		if !ok || !strings.Contains(msg, "ALGOPLAN_-prefixed") {
			t.Fatalf("unexpected panic value: %v", r)
		}
	}()
	_ = GetEnv("MULTICA_TEST_NO")
}

// Sanity: sync.Map LoadOrStore is the basis for the once-tracker; this test
// asserts the atomic shape we depend on (defensive against future refactors).
func TestWarnedOnce_AtomicSemantics(t *testing.T) {
	ResetDeprecationWarnings()
	var loadedTrue, loadedFalse int32
	for i := 0; i < 50; i++ {
		_, loaded := alreadyWarned.LoadOrStore("MULTICA_DEFENSIVE", struct{}{})
		if loaded {
			atomic.AddInt32(&loadedTrue, 1)
		} else {
			atomic.AddInt32(&loadedFalse, 1)
		}
	}
	if atomic.LoadInt32(&loadedFalse) != 1 {
		t.Fatalf("expected exactly one initial store, got %d", loadedFalse)
	}
}
