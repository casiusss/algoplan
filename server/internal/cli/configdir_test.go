package cli

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeConfig creates <home>/<dirName>/config.json with the given JSON body
// at file mode 0600 and dir mode 0700.
func writeConfig(t *testing.T, home, dirName, jsonBody string) {
	t.Helper()
	dir := filepath.Join(home, dirName)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "config.json"), []byte(jsonBody), 0o600); err != nil {
		t.Fatal(err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	return string(data)
}

func TestMigrateConfigDir_NoLegacyDir(t *testing.T) {
	home := t.TempDir()
	res, err := MigrateConfigDir(home)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if res.Migrated {
		t.Fatalf("expected Migrated=false; got %+v", res)
	}
	if res.Reason != "no legacy dir" {
		t.Fatalf("unexpected reason: %s", res.Reason)
	}
}

func TestMigrateConfigDir_OnlyLegacy_CopiesAndRenamesAside(t *testing.T) {
	home := t.TempDir()
	body := `{"server_url":"http://x","workspace_id":"ws-1","token":"tok"}`
	writeConfig(t, home, ".multica", body)

	res, err := MigrateConfigDir(home)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if !res.Migrated {
		t.Fatalf("expected Migrated=true; got %+v", res)
	}
	// New dir contains the EXACT same JSON
	got := readFile(t, filepath.Join(home, ".algoplan", "config.json"))
	if got != body {
		t.Fatalf("config drift: want %q, got %q", body, got)
	}
	// Legacy renamed aside, not deleted
	if _, statErr := os.Stat(filepath.Join(home, ".multica")); !os.IsNotExist(statErr) {
		t.Fatalf("expected legacy .multica dir gone (renamed); stat err: %v", statErr)
	}
	if !strings.HasPrefix(filepath.Base(res.LegacyMovedTo), ".multica.migrated-") {
		t.Fatalf("unexpected LegacyMovedTo: %s", res.LegacyMovedTo)
	}
	if _, statErr := os.Stat(res.LegacyMovedTo); statErr != nil {
		t.Fatalf("renamed-aside dir missing: %v", statErr)
	}
}

func TestMigrateConfigDir_OnlyNew_NoOp(t *testing.T) {
	home := t.TempDir()
	writeConfig(t, home, ".algoplan", `{"server_url":"http://y"}`)

	res, err := MigrateConfigDir(home)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if res.Migrated {
		t.Fatalf("expected Migrated=false; got %+v", res)
	}
	if res.Reason != "no legacy dir" {
		t.Fatalf("unexpected reason: %s", res.Reason)
	}
}

func TestMigrateConfigDir_BothExist_LegacyRenamedAside(t *testing.T) {
	home := t.TempDir()
	writeConfig(t, home, ".multica", `{"server_url":"http://stale"}`)
	writeConfig(t, home, ".algoplan", `{"server_url":"http://current"}`)

	res, err := MigrateConfigDir(home)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if res.Migrated {
		t.Fatalf("expected Migrated=false (already migrated); got %+v", res)
	}
	if !strings.Contains(res.Reason, "already migrated") {
		t.Fatalf("unexpected reason: %s", res.Reason)
	}
	// Algoplan dir untouched
	got := readFile(t, filepath.Join(home, ".algoplan", "config.json"))
	if got != `{"server_url":"http://current"}` {
		t.Fatalf("algoplan dir was modified: %s", got)
	}
	// Legacy renamed aside
	if _, err := os.Stat(filepath.Join(home, ".multica")); !os.IsNotExist(err) {
		t.Fatal("expected legacy .multica gone")
	}
}

func TestMigrateConfigDir_Idempotent(t *testing.T) {
	home := t.TempDir()
	writeConfig(t, home, ".multica", `{"workspace_id":"ws"}`)

	if _, err := MigrateConfigDir(home); err != nil {
		t.Fatal(err)
	}
	// Second call should be a no-op
	res2, err := MigrateConfigDir(home)
	if err != nil {
		t.Fatal(err)
	}
	if res2.Migrated {
		t.Fatalf("second call should be no-op; got %+v", res2)
	}
	got := readFile(t, filepath.Join(home, ".algoplan", "config.json"))
	if got != `{"workspace_id":"ws"}` {
		t.Fatalf("data corrupted between idempotent calls: %s", got)
	}
}

func TestMigrateConfigDir_ValuePreserved_RoundTripJSON(t *testing.T) {
	home := t.TempDir()
	cfg := map[string]string{
		"server_url":   "https://api.algoplan.ai",
		"app_url":      "https://plan.algoview.com",
		"workspace_id": "01H7Y2ZQQ2X8K3JSE3Y8FAP6V0",
		"token":        "eyJhbGciOiJIUzI1NiIs.test.tok",
	}
	body, _ := json.Marshal(cfg)
	writeConfig(t, home, ".multica", string(body))

	if _, err := MigrateConfigDir(home); err != nil {
		t.Fatal(err)
	}
	got := readFile(t, filepath.Join(home, ".algoplan", "config.json"))
	if got != string(body) {
		t.Fatalf("round-trip drift: want %s, got %s", body, got)
	}
}

func TestMigrateConfigDir_PreservesProfilesSubtree(t *testing.T) {
	home := t.TempDir()
	// Create ~/.multica/profiles/staging/config.json
	stagingDir := filepath.Join(home, ".multica", "profiles", "staging")
	if err := os.MkdirAll(stagingDir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		filepath.Join(stagingDir, "config.json"),
		[]byte(`{"server_url":"http://staging"}`),
		0o600,
	); err != nil {
		t.Fatal(err)
	}

	if _, err := MigrateConfigDir(home); err != nil {
		t.Fatal(err)
	}
	migrated := filepath.Join(home, ".algoplan", "profiles", "staging", "config.json")
	if got := readFile(t, migrated); got != `{"server_url":"http://staging"}` {
		t.Fatalf("staging profile not migrated: %s", got)
	}
	info, err := os.Stat(migrated)
	if err != nil {
		t.Fatal(err)
	}
	if mode := info.Mode().Perm(); mode != 0o600 {
		t.Fatalf("expected mode 0600 preserved, got %o", mode)
	}
}

func TestIsAlreadyMigrated(t *testing.T) {
	home := t.TempDir()
	if IsAlreadyMigrated(home) {
		t.Fatal("empty home should not be 'already migrated'")
	}
	writeConfig(t, home, ".algoplan", "{}")
	if !IsAlreadyMigrated(home) {
		t.Fatal("only-new should be already migrated")
	}
	writeConfig(t, home, ".multica", "{}")
	if IsAlreadyMigrated(home) {
		t.Fatal("both-exist should NOT be considered already migrated (legacy must be cleaned)")
	}
}
