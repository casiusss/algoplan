// Package config centralizes environment-variable reading for ALGOPLAN_-prefixed names.
package config

import (
	"fmt"
	"os"
	"strings"
)

// GetEnv reads an ALGOPLAN_-prefixed env var. Returns "" if unset.
//
// PANICS if name is not "ALGOPLAN_"-prefixed (caller bug).
func GetEnv(name string) string {
	if !strings.HasPrefix(name, "ALGOPLAN_") {
		panic(fmt.Sprintf("config.GetEnv requires ALGOPLAN_-prefixed name; got %q", name))
	}
	return os.Getenv(name)
}

// GetEnvDefault is GetEnv with a fallback default value if unset.
func GetEnvDefault(name, defaultValue string) string {
	if v := GetEnv(name); v != "" {
		return v
	}
	return defaultValue
}
