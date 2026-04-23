package util

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// NormalizeRepoURL validates and canonicalizes a Git repository URL.
// The canonical form always ends with ".git" so lookups are deterministic.
// Accepts https://, http://, and git@host:owner/repo SSH form. Returns an
// error for any other scheme, empty input, or malformed URL.
func NormalizeRepoURL(raw string) (string, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", errors.New("repo_url is empty")
	}
	s = strings.TrimRight(s, "/")

	if strings.HasPrefix(s, "https://") || strings.HasPrefix(s, "http://") {
		u, err := url.Parse(s)
		if err != nil {
			return "", fmt.Errorf("invalid URL: %w", err)
		}
		if u.Host == "" || u.Path == "" || u.Path == "/" {
			return "", errors.New("invalid URL: missing host or path")
		}
		if !strings.HasSuffix(s, ".git") {
			s += ".git"
		}
		return s, nil
	}

	if strings.HasPrefix(s, "git@") && strings.Contains(s, ":") {
		colon := strings.Index(s, ":")
		host := s[len("git@"):colon]
		path := s[colon+1:]
		if host == "" {
			return "", errors.New("invalid SSH URL: missing host")
		}
		if path == "" {
			return "", errors.New("invalid SSH URL: missing path")
		}
		if !strings.HasSuffix(s, ".git") {
			s += ".git"
		}
		return s, nil
	}

	return "", errors.New("repo_url must be https://, http://, or git@host:path SSH URL")
}
