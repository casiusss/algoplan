package main

import (
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestProjectCreate_RequiresRepoURL(t *testing.T) {
	cmd := newTestProjectCreateCmd()
	cmd.SetArgs([]string{"--title", "Test Project"})

	err := cmd.Execute()
	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "repo-url") {
		t.Fatalf("want error mentioning 'repo-url', got %v", err)
	}
}

func TestProjectCreate_RepoURLFlagRegistered(t *testing.T) {
	if projectCreateCmd.Flag("repo-url") == nil {
		t.Fatalf("projectCreateCmd has no --repo-url flag")
	}
}

func TestProjectUpdate_RepoURLFlagRegistered(t *testing.T) {
	if projectUpdateCmd.Flag("repo-url") == nil {
		t.Fatalf("projectUpdateCmd has no --repo-url flag")
	}
}

// newTestProjectCreateCmd returns a copy of projectCreateCmd with test setup.
// We use a new command instance to avoid state bleed between tests.
func newTestProjectCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create a new project",
		RunE:  runProjectCreate,
	}

	// Register the same flags as in init()
	cmd.Flags().String("title", "", "Project title (required)")
	cmd.Flags().String("description", "", "Project description")
	cmd.Flags().String("status", "", "Project status")
	cmd.Flags().String("icon", "", "Project icon (emoji)")
	cmd.Flags().String("lead", "", "Lead name (member or agent)")
	cmd.Flags().String("repo-url", "", "Git repository URL (required)")
	cmd.Flags().String("output", "json", "Output format: table or json")
	cmd.MarkFlagRequired("title")
	cmd.MarkFlagRequired("repo-url")

	// Add parent persistent flags for compatibility
	cmd.PersistentFlags().String("profile", "", "")

	return cmd
}
