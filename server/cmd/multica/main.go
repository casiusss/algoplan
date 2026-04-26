// Package main is the legacy `multica` CLI shim binary.
//
// As of v0.5.0, the CLI is named `algoplan`. This shim binary exists for
// one release cycle to give users time to update muscle-memory and shell
// aliases. It prints a deprecation warning to stderr (once per invocation)
// and forwards stdin/stdout/stderr/exit-code to the real `algoplan` binary
// found in the same directory or $PATH.
//
// Schedule for removal: v0.6.0 or v0.7.0. See Phase 8 D-4.
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const algoplanBinaryName = "algoplan"

func main() {
	fmt.Fprintln(os.Stderr,
		"deprecated: the `multica` CLI is renamed to `algoplan`. "+
			"This shim will be removed in v0.6.0. Update your scripts and shell aliases.")

	// Resolve the real binary: prefer sibling executable in the same dir as
	// this shim (Homebrew/release-archive layout); else look up in $PATH.
	execPath, err := os.Executable()
	if err == nil {
		sibling := filepath.Join(filepath.Dir(execPath), algoplanBinaryName)
		if runtime.GOOS == "windows" {
			sibling += ".exe"
		}
		if _, statErr := os.Stat(sibling); statErr == nil {
			runAndExit(sibling, os.Args[1:])
		}
	}

	resolved, lookErr := exec.LookPath(algoplanBinaryName)
	if lookErr != nil {
		fmt.Fprintf(os.Stderr, "error: cannot find `%s` in PATH or alongside this binary; install algoplan and retry.\n", algoplanBinaryName)
		os.Exit(127)
	}
	runAndExit(resolved, os.Args[1:])
}

func runAndExit(bin string, args []string) {
	cmd := exec.Command(bin, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if runErr := cmd.Run(); runErr != nil {
		if exitErr, ok := runErr.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "error invoking %s: %v\n", bin, runErr)
		os.Exit(1)
	}
	os.Exit(0)
}
