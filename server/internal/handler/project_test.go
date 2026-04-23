package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/multica-ai/multica/server/internal/middleware"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
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

// Helper: create a project with repo URL
func createProjectWithRepo(t *testing.T, title, repoURL string) string {
	t.Helper()
	w := httptest.NewRecorder()
	req := newRequest("POST", "/api/projects?workspace_id="+testWorkspaceID, map[string]any{
		"title":    title,
		"repo_url": repoURL,
	})
	testHandler.CreateProject(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("failed to create project: %d %s", w.Code, w.Body.String())
	}
	var resp struct {
		ID string `json:"id"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	return resp.ID
}

// Helper: set member role in context
func withMemberRole(req *http.Request, role string) *http.Request {
	member := db.Member{
		ID:          parseUUID("00000000-0000-0000-0000-000000000001"),
		WorkspaceID: parseUUID(testWorkspaceID),
		UserID:      parseUUID(testUserID),
		Role:        role,
	}
	ctx := middleware.SetMemberContext(req.Context(), testWorkspaceID, member)
	return req.WithContext(ctx)
}

func TestUpdateProject_RepoURLForbiddenForMember(t *testing.T) {
	projectID := createProjectWithRepo(t, "A", "https://github.com/a/b.git")

	w := httptest.NewRecorder()
	req := newRequest("PUT", "/api/projects/"+projectID, map[string]any{
		"repo_url": "https://github.com/a/c",
	})
	// Default testHandler member role is "owner" from fixture, so we need to downgrade
	req = withMemberRole(req, "member")
	req = withURLParam(req, "id", projectID)
	testHandler.UpdateProject(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("want 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestUpdateProject_RepoURLAsAdminWritesActivity(t *testing.T) {
	projectID := createProjectWithRepo(t, "A", "https://github.com/a/b.git")

	w := httptest.NewRecorder()
	req := newRequest("PUT", "/api/projects/"+projectID, map[string]any{
		"repo_url": "https://github.com/a/c",
	})
	// Keep owner role (admin permission)
	req = withMemberRole(req, "owner")
	req = withURLParam(req, "id", projectID)
	testHandler.UpdateProject(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}

	// Check activity log was written
	rows, err := testHandler.Queries.ListActivityByProject(context.Background(), parseUUID(projectID))
	if err != nil {
		t.Fatalf("ListActivityByProject: %v", err)
	}

	found := false
	for _, row := range rows {
		if row.Action == "project.repo_url_changed" {
			found = true
			var d map[string]string
			if err := json.Unmarshal(row.Details, &d); err != nil {
				t.Fatalf("failed to unmarshal details: %v", err)
			}
			if d["new_url"] != "https://github.com/a/c.git" || d["old_url"] != "https://github.com/a/b.git" {
				t.Errorf("wrong details: %+v", d)
			}
		}
	}
	if !found {
		t.Errorf("no project.repo_url_changed activity row found")
	}
}
