package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const (
	Version = "1.0.0"
	Banner  = `
╔═══════════════════════════════════════════════════════════╗
║           EXCALIBUR-EXS CONSOLE NODE                     ║
║     Quantum-Hardened Bitcoin Protocol Implementation      ║
║                    Version %s                          ║
╚═══════════════════════════════════════════════════════════╝
`
)

var rootCmd = &cobra.Command{
	Use:   "exs-node",
	Short: "Excalibur-EXS Console Node Application",
	Long: fmt.Sprintf(Banner, Version) + `
Excalibur-EXS Console Node is a Bitcoin Core-like application enhanced
for the Excalibur Anomaly Protocol with:
  
  • Taproot (P2TR) vaults with 13-word prophecy axiom
  • Tetra-PoW mining with HPP-1 quantum-resistance
  • Full Bitcoin consensus validation
  • AWS Managed Blockchain compatibility
  • Cross-platform support (Windows, macOS, Linux)

Use "exs-node <command> --help" for more information about a command.`,
	Version: Version,
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Initialize configuration
		if err := initConfig(); err != nil {
			fmt.Fprintf(os.Stderr, "Error initializing config: %v\n", err)
			os.Exit(1)
		}
	},
}

func init() {
	// Global flags
	rootCmd.PersistentFlags().StringP("config", "c", "", "config file (default is $HOME/.excalibur-exs/config.yaml)")
	rootCmd.PersistentFlags().StringP("datadir", "d", "", "data directory (default is $HOME/.excalibur-exs/data)")
	rootCmd.PersistentFlags().BoolP("testnet", "t", false, "use testnet")
	rootCmd.PersistentFlags().BoolP("regtest", "r", false, "use regtest mode")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")
}

func initConfig() error {
	// TODO: Load configuration from file or environment
	return nil
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
