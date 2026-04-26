package cli

import (
	"strings"

	"github.com/multica-ai/multica/server/internal/config"
	"github.com/spf13/cobra"
)

// FlagOrEnv returns the flag value if set, otherwise the environment variable
// value (via the dual-read shim in server/internal/config), otherwise the
// fallback.
//
// envKey MUST start with "ALGOPLAN_" — config.GetEnv panics otherwise.
// The legacy MULTICA_-prefixed equivalent is read automatically with a
// one-shot deprecation warning per process per variable.
func FlagOrEnv(cmd *cobra.Command, flagName, envKey, fallback string) string {
	if cmd.Flags().Changed(flagName) {
		val, _ := cmd.Flags().GetString(flagName)
		return val
	}
	if v := strings.TrimSpace(config.GetEnv(envKey)); v != "" {
		return v
	}
	return fallback
}
