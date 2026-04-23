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
