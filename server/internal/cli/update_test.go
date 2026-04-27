package cli

import "testing"

func TestReleaseAssetCandidates(t *testing.T) {
	tests := []struct {
		name          string
		targetVersion string
		goos          string
		goarch        string
		wantAssets    []string
	}{
		{
			// v0.5.0+: algoplan-cli-* first; multica-cli-* and multica_ as fallbacks.
			name:          "darwin prefers algoplan-cli then legacy candidates",
			targetVersion: "v1.2.3",
			goos:          "darwin",
			goarch:        "arm64",
			wantAssets: []string{
				"algoplan-cli-1.2.3-darwin-arm64.tar.gz",
				"multica-cli-1.2.3-darwin-arm64.tar.gz",
				"multica_darwin_arm64.tar.gz",
			},
		},
		{
			name:          "linux normalizes missing v prefix",
			targetVersion: "1.2.3",
			goos:          "linux",
			goarch:        "amd64",
			wantAssets: []string{
				"algoplan-cli-1.2.3-linux-amd64.tar.gz",
				"multica-cli-1.2.3-linux-amd64.tar.gz",
				"multica_linux_amd64.tar.gz",
			},
		},
		{
			name:          "windows uses zip assets",
			targetVersion: "1.2.3",
			goos:          "windows",
			goarch:        "amd64",
			wantAssets: []string{
				"algoplan-cli-1.2.3-windows-amd64.zip",
				"multica-cli-1.2.3-windows-amd64.zip",
				"multica_windows_amd64.zip",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := releaseAssetCandidates(tt.targetVersion, tt.goos, tt.goarch)
			if len(got) != len(tt.wantAssets) {
				t.Fatalf("candidate count mismatch: got %d, want %d", len(got), len(tt.wantAssets))
			}
			for i := range got {
				if got[i] != tt.wantAssets[i] {
					t.Fatalf("candidate[%d] mismatch: got %q, want %q", i, got[i], tt.wantAssets[i])
				}
			}
		})
	}
}

// TestReleaseAssetCandidates_OrdersAlgoplanFirst asserts the v0.5.0+ lookup
// priority: algoplan-cli-* > multica-cli-* (pre-v0.5.0) > multica_ (very legacy).
func TestReleaseAssetCandidates_OrdersAlgoplanFirst(t *testing.T) {
	got := releaseAssetCandidates("v0.5.0", "darwin", "arm64")
	if len(got) < 3 {
		t.Fatalf("expected >= 3 candidates, got %d: %v", len(got), got)
	}
	if got[0] != "algoplan-cli-0.5.0-darwin-arm64.tar.gz" {
		t.Fatalf("expected algoplan-cli first, got %q", got[0])
	}
	if got[1] != "multica-cli-0.5.0-darwin-arm64.tar.gz" {
		t.Fatalf("expected multica-cli legacy second, got %q", got[1])
	}
	if got[2] != "multica_darwin_arm64.tar.gz" {
		t.Fatalf("expected multica_ very-legacy third, got %q", got[2])
	}
}

func TestFindReleaseAsset(t *testing.T) {
	t.Run("prefers algoplan-cli asset when all names exist", func(t *testing.T) {
		assets := []GitHubReleaseAsset{
			{Name: "multica_darwin_amd64.tar.gz", BrowserDownloadURL: "very-old"},
			{Name: "multica-cli-1.2.3-darwin-amd64.tar.gz", BrowserDownloadURL: "old"},
			{Name: "algoplan-cli-1.2.3-darwin-amd64.tar.gz", BrowserDownloadURL: "new"},
		}

		got, err := findReleaseAsset(assets, "v1.2.3", "darwin", "amd64")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.Name != "algoplan-cli-1.2.3-darwin-amd64.tar.gz" {
			t.Fatalf("asset mismatch: got %q", got.Name)
		}
	})

	t.Run("falls back to multica-cli when algoplan-cli absent", func(t *testing.T) {
		assets := []GitHubReleaseAsset{
			{Name: "multica_darwin_amd64.tar.gz", BrowserDownloadURL: "very-old"},
			{Name: "multica-cli-1.2.3-darwin-amd64.tar.gz", BrowserDownloadURL: "old"},
		}

		got, err := findReleaseAsset(assets, "v1.2.3", "darwin", "amd64")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.Name != "multica-cli-1.2.3-darwin-amd64.tar.gz" {
			t.Fatalf("asset mismatch: got %q", got.Name)
		}
	})

	t.Run("falls back to very-legacy multica_ asset when others absent", func(t *testing.T) {
		assets := []GitHubReleaseAsset{
			{Name: "multica_linux_amd64.tar.gz", BrowserDownloadURL: "old"},
		}

		got, err := findReleaseAsset(assets, "1.2.3", "linux", "amd64")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got.Name != "multica_linux_amd64.tar.gz" {
			t.Fatalf("asset mismatch: got %q", got.Name)
		}
	})

	t.Run("returns error when no candidate matches", func(t *testing.T) {
		_, err := findReleaseAsset([]GitHubReleaseAsset{{Name: "checksums.txt"}}, "1.2.3", "linux", "amd64")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})
}
