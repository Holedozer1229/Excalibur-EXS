package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/Holedozer1229/Excalibur-EXS/pkg/bitcoin"
	"github.com/Holedozer1229/Excalibur-EXS/pkg/crypto"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/spf13/cobra"
)

var (
	port          int
	network       string
	customSeed    string
	useDefaultSeed bool
)

// NetworkIdentifier represents the blockchain network
type NetworkIdentifier struct {
	Blockchain string `json:"blockchain"`
	Network    string `json:"network"`
}

// Version represents the API version
type Version struct {
	RosettaVersion    string `json:"rosetta_version"`
	NodeVersion       string `json:"node_version"`
	MiddlewareVersion string `json:"middleware_version,omitempty"`
}

// NetworkListResponse contains all available networks
type NetworkListResponse struct {
	NetworkIdentifiers []NetworkIdentifier `json:"network_identifiers"`
}

// NetworkOptionsResponse contains versioning information
type NetworkOptionsResponse struct {
	Version Version  `json:"version"`
	Allow   AllowObj `json:"allow"`
}

// AllowObj describes what the implementation supports
type AllowObj struct {
	OperationStatuses []OperationStatus `json:"operation_statuses"`
	OperationTypes    []string          `json:"operation_types"`
	Errors            []APIError        `json:"errors"`
}

// OperationStatus is the status of an operation
type OperationStatus struct {
	Status     string `json:"status"`
	Successful bool   `json:"successful"`
}

// APIError represents an error in the Rosetta API
type APIError struct {
	Code        int32  `json:"code"`
	Message     string `json:"message"`
	Retriable   bool   `json:"retriable"`
	Description string `json:"description,omitempty"`
}

// AccountBalanceRequest is used to get account balance
type AccountBalanceRequest struct {
	NetworkIdentifier NetworkIdentifier `json:"network_identifier"`
	AccountIdentifier AccountIdentifier `json:"account_identifier"`
}

// AccountIdentifier uniquely identifies an account
type AccountIdentifier struct {
	Address string `json:"address"`
}

// Amount represents a monetary amount
type Amount struct {
	Value    string `json:"value"`
	Currency Currency `json:"currency"`
}

// Currency represents the currency
type Currency struct {
	Symbol   string `json:"symbol"`
	Decimals int32  `json:"decimals"`
}

// AccountBalanceResponse contains account balance
type AccountBalanceResponse struct {
	BlockIdentifier BlockIdentifier `json:"block_identifier"`
	Balances        []Amount        `json:"balances"`
}

// BlockIdentifier uniquely identifies a block
type BlockIdentifier struct {
	Index int64  `json:"index"`
	Hash  string `json:"hash"`
}

// NetworkStatusResponse contains the current network status
type NetworkStatusResponse struct {
	CurrentBlockIdentifier BlockIdentifier `json:"current_block_identifier"`
	CurrentBlockTimestamp  int64           `json:"current_block_timestamp"`
	GenesisBlockIdentifier BlockIdentifier `json:"genesis_block_identifier"`
	Peers                  []interface{}   `json:"peers"`
}

// BlockResponse contains block information
type BlockResponse struct {
	Block Block `json:"block"`
}

// Block represents a blockchain block
type Block struct {
	BlockIdentifier       BlockIdentifier `json:"block_identifier"`
	ParentBlockIdentifier BlockIdentifier `json:"parent_block_identifier"`
	Timestamp             int64           `json:"timestamp"`
	Transactions          []interface{}   `json:"transactions"`
}

var rootCmd = &cobra.Command{
	Use:   "rosetta",
	Short: "Excalibur-ESX Rosetta API Server",
	Long: `Go-based Rosetta API server for Excalibur-ESX.
	
Implements the Rosetta API specification for blockchain integration
with Coinbase and other exchanges. Supports Taproot addresses and
the Ω′ Δ18 Tetra-PoW consensus mechanism.`,
}

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the Rosetta API server",
	Long:  "Start the HTTP server implementing the Rosetta API specification",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("🔱 Excalibur-ESX Rosetta API Server\n")
		fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
		fmt.Printf("Network: %s\n", network)
		fmt.Printf("Port: %d\n", port)
		fmt.Printf("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n")

		http.HandleFunc("/network/list", handleNetworkList)
		http.HandleFunc("/network/options", handleNetworkOptions)
		http.HandleFunc("/network/status", handleNetworkStatus)
		http.HandleFunc("/account/balance", handleAccountBalance)
		http.HandleFunc("/block", handleBlock)
		http.HandleFunc("/health", handleHealth)

		addr := fmt.Sprintf(":%d", port)
		fmt.Printf("✅ Server started on %s\n", addr)
		fmt.Printf("📚 Rosetta API endpoints available:\n")
		fmt.Printf("   - POST /network/list\n")
		fmt.Printf("   - POST /network/options\n")
		fmt.Printf("   - POST /network/status\n")
		fmt.Printf("   - POST /account/balance\n")
		fmt.Printf("   - POST /block\n")
		fmt.Printf("   - GET  /health\n\n")

		log.Fatal(http.ListenAndServe(addr, nil))
	},
}

func handleNetworkList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := NetworkListResponse{
		NetworkIdentifiers: []NetworkIdentifier{
			{Blockchain: "Excalibur-ESX", Network: "mainnet"},
			{Blockchain: "Excalibur-ESX", Network: "testnet"},
		},
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleNetworkOptions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := NetworkOptionsResponse{
		Version: Version{
			RosettaVersion: "1.4.13",
			NodeVersion:    "0.1.0",
		},
		Allow: AllowObj{
			OperationStatuses: []OperationStatus{
				{Status: "SUCCESS", Successful: true},
				{Status: "FAILED", Successful: false},
			},
			OperationTypes: []string{"TRANSFER", "STAKE", "UNSTAKE"},
			Errors: []APIError{
				{Code: 1, Message: "Network not found", Retriable: false},
				{Code: 2, Message: "Account not found", Retriable: true},
			},
		},
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleNetworkStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := NetworkStatusResponse{
		CurrentBlockIdentifier: BlockIdentifier{
			Index: 1000,
			Hash:  "0x" + fmt.Sprintf("%064x", 1000),
		},
		CurrentBlockTimestamp: 1700000000000,
		GenesisBlockIdentifier: BlockIdentifier{
			Index: 0,
			Hash:  "0x" + fmt.Sprintf("%064x", 0),
		},
		Peers: []interface{}{},
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleAccountBalance(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req AccountBalanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Code:    400,
			Message: "Invalid request format",
			Retriable: false,
		})
		return
	}

	// Validate the address is a valid Taproot address
	if !bitcoin.VerifyTaprootAddress(req.AccountIdentifier.Address) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(APIError{
			Code:    5,
			Message: "Invalid Taproot address format",
			Retriable: false,
		})
		return
	}

	// Mock balance response
	response := AccountBalanceResponse{
		BlockIdentifier: BlockIdentifier{
			Index: 1000,
			Hash:  "0x" + fmt.Sprintf("%064x", 1000),
		},
		Balances: []Amount{
			{
				Value: "100000000",
				Currency: Currency{
					Symbol:   "EXS",
					Decimals: 8,
				},
			},
		},
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleBlock(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := BlockResponse{
		Block: Block{
			BlockIdentifier: BlockIdentifier{
				Index: 1000,
				Hash:  "0x" + fmt.Sprintf("%064x", 1000),
			},
			ParentBlockIdentifier: BlockIdentifier{
				Index: 999,
				Hash:  "0x" + fmt.Sprintf("%064x", 999),
			},
			Timestamp:    1700000000000,
			Transactions: []interface{}{},
		},
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"status": "healthy",
		"version": "0.1.0",
		"network": network,
		"tetra_pow": "active",
		"hpp1_rounds": crypto.HPP1Rounds,
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

var validateCmd = &cobra.Command{
	Use:   "validate-address [address]",
	Short: "Validate a Taproot address",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		address := args[0]
		valid := bitcoin.VerifyTaprootAddress(address)
		
		if valid {
			fmt.Printf("✅ Valid Taproot (P2TR) address: %s\n", address)
			witnessVersion, program, _ := bitcoin.DecodeBech32m(address)
			fmt.Printf("   Witness version: %d\n", witnessVersion)
			fmt.Printf("   Program length: %d bytes\n", len(program))
		} else {
			fmt.Printf("❌ Invalid Taproot address: %s\n", address)
		}
	},
}

var generateCmd = &cobra.Command{
	Use:   "generate-vault",
	Short: "Generate a new Taproot vault",
	Long: `Generate a new Taproot vault using either a custom 13-word seed or the canonical prophecy axiom.
	
Examples:
  # Use canonical prophecy axiom (default)
  rosetta generate-vault
  
  # Use custom 13-word seed
  rosetta generate-vault --seed "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13"
  
  # Generate for testnet
  rosetta generate-vault --network testnet --seed "your 13 words here"`,
	Run: func(cmd *cobra.Command, args []string) {
		var prophecyWords []string
		
		// If custom seed provided, parse it
		if customSeed != "" {
			// Split by spaces and validate
			words := []string{}
			for _, word := range strings.Fields(customSeed) {
				words = append(words, strings.TrimSpace(word))
			}
			
			if len(words) != 13 {
				fmt.Printf("❌ Error: Seed must contain exactly 13 words (got %d)\n", len(words))
				fmt.Println("\nExample: rosetta generate-vault --seed \"word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13\"")
				return
			}
			
			prophecyWords = words
			fmt.Println("🔑 Using custom seed")
		} else {
			// Use canonical prophecy axiom
			prophecyWords = []string{
				"sword", "legend", "pull", "magic", "kingdom", "artist",
				"stone", "destroy", "forget", "fire", "steel", "honey", "question",
			}
			fmt.Println("🔑 Using canonical prophecy axiom")
		}
		
		params := &chaincfg.MainNetParams
		if network == "testnet" {
			params = &chaincfg.TestNet3Params
		}
		
		vault, err := bitcoin.GenerateTaprootVault(prophecyWords, params)
		if err != nil {
			fmt.Printf("❌ Error generating vault: %v\n", err)
			return
		}
		
		fmt.Println("\n🔱 Taproot Vault Generated")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Printf("Address:  %s\n", vault.Address)
		fmt.Printf("Network:  %s\n", network)
		fmt.Printf("Seed:     %s\n", strings.Join(prophecyWords, " "))
		fmt.Printf("Prophecy: %x\n", vault.ProphecyHash)
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Println("\n⚠️  IMPORTANT: Store your seed securely. Anyone with access")
		fmt.Println("   to your seed can recreate your vault address.")
	},
}

func init() {
	serveCmd.Flags().IntVarP(&port, "port", "p", 8080, "Server port")
	serveCmd.Flags().StringVarP(&network, "network", "n", "mainnet", "Network (mainnet/testnet)")
	
	generateCmd.Flags().StringVarP(&network, "network", "n", "mainnet", "Network (mainnet/testnet)")
	generateCmd.Flags().StringVarP(&customSeed, "seed", "s", "", "Custom 13-word seed (defaults to canonical prophecy axiom)")
	
	rootCmd.AddCommand(serveCmd)
	rootCmd.AddCommand(validateCmd)
	rootCmd.AddCommand(generateCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
