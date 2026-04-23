package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateProject_RequiresRepoURL(t *testing.T) {
	req := newRequest("POST", "/api/projects?workspace_id="+testWorkspaceID, map[string]any{
		"title": "No Repo",
	})
	w := httptest.NewRecorder()
	testHandler.CreateProject(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateProject_NormalizesRepoURL(t *testing.T) {
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects?workspace_id="+testWorkspaceID, map[string]any{
		"title":    "X",
		"repo_url": "https://github.com/a/b/",
	})
	testHandler.CreateProject(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", w.Code, w.Body.String())
	}
	var got struct {
		RepoURL string `json:"repo_url"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if got.RepoURL != "https://github.com/a/b.git" {
		t.Errorf("got %q want canonical .git form", got.RepoURL)
	}
}
