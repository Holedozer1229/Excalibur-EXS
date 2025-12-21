package main

import (
	"encoding/hex"
	"fmt"
	"os"
	"time"

	"github.com/Holedozer1229/Excalibur-EXS/pkg/crypto"
	"github.com/Holedozer1229/Excalibur-EXS/pkg/hardware"
	"github.com/spf13/cobra"
)

var (
	difficulty   uint64
	data         string
	rounds       int
	workers      int
	optimization string
)

var rootCmd = &cobra.Command{
	Use:   "miner",
	Short: "Excalibur-EXS Ω′ Δ18 CLI mining tool",
	Long: `The Ω′ Δ18 Tetra-PoW miner for Excalibur-EXS.
	
This tool implements quantum-hardened mining using:
- HPP-1: 600,000 rounds of PBKDF2
- Tetra-PoW: 128-round unrolled nonlinear state shifts
	
Part of the Excalibur Anomaly Protocol ($EXS)`,
}

var mineCmd = &cobra.Command{
	Use:   "mine",
	Short: "Mine a block using Tetra-PoW",
	Long:  "Perform Tetra-PoW mining on the provided data with specified difficulty",
	Run: func(cmd *cobra.Command, args []string) {
		// Initialize hardware accelerator
		acc := hardware.NewAccelerator()
		
		if workers > 0 {
			if err := acc.SetWorkerCount(workers); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
			}
		}
		
		if optimization != "" {
			if err := acc.SetOptimization(optimization); err != nil {
				fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
			}
		}
		
		fmt.Println("⚔️ Excalibur-EXS Ω′ Δ18 Miner")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Printf("Mining data: %s\n", data)
		fmt.Printf("Difficulty: 0x%016x\n", difficulty)
		
		// Display hardware info
		hwInfo := acc.GetHardwareInfo()
		fmt.Printf("Hardware: %s (%s)\n", hwInfo.Type.String(), hwInfo.Name)
		fmt.Printf("Cores: %d\n", hwInfo.Cores)
		fmt.Printf("Workers: %d\n", acc.GetWorkerCount())
		fmt.Printf("Optimization: %s\n", acc.GetOptimization())
		fmt.Printf("Estimated Hash Rate: %.2f H/s\n", acc.EstimateHashRate())
		fmt.Printf("Estimated Power: %.2f W\n", acc.EstimatePowerConsumption())
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		startTime := time.Now()
		nonce, hash := crypto.TetraPoW([]byte(data), difficulty)
		elapsed := time.Since(startTime)
		
		fmt.Println("\n✅ Block mined successfully!")
		fmt.Printf("Nonce: %d\n", nonce)
		fmt.Printf("Hash: %s\n", hex.EncodeToString(hash))
		fmt.Printf("Time elapsed: %v\n", elapsed)
		fmt.Printf("Hash rate: %.2f H/s\n", float64(nonce)/elapsed.Seconds())
		fmt.Printf("Efficiency: %.4f H/s/W\n", (float64(nonce)/elapsed.Seconds())/acc.EstimatePowerConsumption())
	},
}

var hpp1Cmd = &cobra.Command{
	Use:   "hpp1",
	Short: "Run HPP-1 key derivation",
	Long:  "Perform HPP-1 (600,000 rounds) quantum-hardened key derivation",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("🔐 HPP-1 Key Derivation")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Printf("Input: %s\n", data)
		fmt.Printf("Rounds: %d\n", crypto.HPP1Rounds)
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		startTime := time.Now()
		key := crypto.HPP1([]byte(data), []byte("Excalibur-EXS"), 32)
		elapsed := time.Since(startTime)
		
		fmt.Printf("\n✅ Key derived in %v\n", elapsed)
		fmt.Printf("Key: %s\n", hex.EncodeToString(key))
	},
}

var benchmarkCmd = &cobra.Command{
	Use:   "benchmark",
	Short: "Benchmark Tetra-PoW performance",
	Long:  "Run performance benchmarks for the Tetra-PoW algorithm",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("⚡ Tetra-PoW Benchmark")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Printf("Rounds: %d\n", rounds)
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		testData := []byte("Excalibur-EXS-Benchmark")
		
		// Benchmark Tetra-PoW state computation
		state := crypto.NewTetraPoWState(testData)
		startTime := time.Now()
		for i := 0; i < rounds; i++ {
			state.Compute()
		}
		elapsed := time.Since(startTime)
		
		fmt.Printf("\n✅ Completed %d iterations in %v\n", rounds, elapsed)
		fmt.Printf("Average time per iteration: %v\n", elapsed/time.Duration(rounds))
		fmt.Printf("Throughput: %.2f ops/sec\n", float64(rounds)/elapsed.Seconds())
	},
}

var hwInfoCmd = &cobra.Command{
	Use:   "hwinfo",
	Short: "Display hardware information",
	Long:  "Display detailed information about available mining hardware",
	Run: func(cmd *cobra.Command, args []string) {
		acc := hardware.NewAccelerator()
		
		fmt.Println("🖥️  Hardware Information")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		stats := acc.GetStats()
		fmt.Printf("Hardware Type: %v\n", stats["hardware_type"])
		fmt.Printf("Hardware Name: %v\n", stats["hardware_name"])
		fmt.Printf("CPU Cores: %v\n", stats["cores"])
		fmt.Printf("Worker Count: %v\n", stats["worker_count"])
		fmt.Printf("Optimization: %v\n", stats["optimization"])
		fmt.Printf("Status: ")
		if stats["enabled"].(bool) {
			fmt.Println("Enabled ✅")
		} else {
			fmt.Println("Disabled ❌")
		}
		
		fmt.Println("\n📊 Performance Estimates")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Printf("Hash Rate: %.2f H/s\n", stats["estimated_hashrate"].(float64))
		fmt.Printf("Power Consumption: %.2f W\n", stats["estimated_power_w"].(float64))
		fmt.Printf("Efficiency: %.4f H/s/W\n", stats["efficiency_h_per_w"].(float64))
		
		fmt.Println("\n⚙️  Optimization Modes")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		
		modes := []string{"power_save", "balanced", "performance", "extreme"}
		for _, mode := range modes {
			acc.SetOptimization(mode)
			fmt.Printf("%-12s: %.2f H/s @ %.2f W (%.4f H/s/W)\n",
				mode,
				acc.EstimateHashRate(),
				acc.EstimatePowerConsumption(),
				acc.GetEfficiency(),
			)
		}
	},
}

func init() {
	mineCmd.Flags().Uint64VarP(&difficulty, "difficulty", "d", 0x00FFFFFFFFFFFFFF, "Mining difficulty target")
	mineCmd.Flags().StringVarP(&data, "data", "i", "Excalibur-EXS", "Data to mine")
	mineCmd.Flags().IntVarP(&workers, "workers", "w", 0, "Number of worker threads (0 = auto)")
	mineCmd.Flags().StringVarP(&optimization, "optimization", "o", "balanced", "Optimization mode: power_save, balanced, performance, extreme")
	
	hpp1Cmd.Flags().StringVarP(&data, "data", "i", "Excalibur-EXS", "Input data for key derivation")
	
	benchmarkCmd.Flags().IntVarP(&rounds, "rounds", "r", 1000, "Number of benchmark rounds")
	
	rootCmd.AddCommand(mineCmd)
	rootCmd.AddCommand(hpp1Cmd)
	rootCmd.AddCommand(benchmarkCmd)
	rootCmd.AddCommand(hwInfoCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
