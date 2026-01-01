// File: cmd/tetra_pow/main.go
// Purpose: Entry point for Tetra-PoW miner with HPP-1 quantum hardening
// Integrates with: Treasury API, Rosetta API, Forge UI dashboard
// Uses: Arthurian 13-word axiom as hashed entropy source

package main

import (
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/mux"
)

// Arthurian 13-word prophecy axiom (for reference only - hashed before use)
const DefaultAxiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"

type MinerConfig struct {
	Axiom          string
	Difficulty     int
	TreasuryURL    string
	RosettaURL     string
	ListenAddr     string
	QuantumRounds  int
	PBKDF2Iters    int
}

type MinerServer struct {
	config *MinerConfig
	engine *MinerEngine
}

func main() {
	axiom := flag.String("axiom", DefaultAxiom, "13-word Arthurian prophecy axiom")
	difficulty := flag.Int("difficulty", 4, "Mining difficulty target")
	treasuryURL := flag.String("treasury", "http://localhost:8080", "Treasury API URL")
	rosettaURL := flag.String("rosetta", "http://localhost:8081", "Rosetta API URL")
	port := flag.String("port", "8082", "HTTP API port")
	flag.Parse()

	config := &MinerConfig{
		Axiom:         *axiom,
		Difficulty:    *difficulty,
		TreasuryURL:   *treasuryURL,
		RosettaURL:    *rosettaURL,
		ListenAddr:    ":" + *port,
		QuantumRounds: QuantumRounds,
		PBKDF2Iters:   PBKDF2Iterations,
	}

	// Hash axiom for entropy (never store raw axiom on-chain)
	axiomHash := hashAxiom(config.Axiom)
	log.Printf("🗡️  EXS Tetra-PoW Miner Starting...")
	log.Printf("📊 Difficulty: %d", config.Difficulty)
	log.Printf("🔐 Quantum Rounds: %d", config.QuantumRounds)
	log.Printf("🔑 Axiom Hash: %x", axiomHash[:8])
	log.Printf("🏛️  Treasury: %s", config.TreasuryURL)
	log.Printf("🌹 Rosetta: %s", config.RosettaURL)

	// Initialize miner engine
	engine := NewMinerEngine(config, axiomHash)
	
	server := &MinerServer{
		config: config,
		engine: engine,
	}

	// Setup HTTP API
	router := mux.NewRouter()
	router.HandleFunc("/health", server.handleHealth).Methods("GET")
	router.HandleFunc("/mine", server.handleMine).Methods("POST")
	router.HandleFunc("/stats", server.handleStats).Methods("GET")
	router.HandleFunc("/config", server.handleConfig).Methods("GET")

	log.Printf("🚀 Tetra-PoW Miner listening on %s", config.ListenAddr)
	log.Fatal(http.ListenAndServe(config.ListenAddr, router))
}

func (s *MinerServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"miner":   "tetra-pow",
		"version": "1.0.0",
	})
}

func (s *MinerServer) handleMine(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Nonce     uint64 `json:"nonce"`
		Timestamp int64  `json:"timestamp"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	log.Printf("⛏️  Starting mining round (nonce: %d)", req.Nonce)
	
	// Run mining round
	result, err := s.engine.Mine(req.Nonce, req.Timestamp)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (s *MinerServer) handleStats(w http.ResponseWriter, r *http.Request) {
	stats := s.engine.GetStats()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (s *MinerServer) handleConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"difficulty":      s.config.Difficulty,
		"quantum_rounds":  s.config.QuantumRounds,
		"pbkdf2_iters":    s.config.PBKDF2Iters,
		"treasury_url":    s.config.TreasuryURL,
		"rosetta_url":     s.config.RosettaURL,
	})
}

// hashAxiom creates SHA-256 hash of the axiom for use as entropy seed
// The raw axiom is NEVER stored on-chain
func hashAxiom(axiom string) [32]byte {
	// Normalize axiom (lowercase, single spaces)
	normalized := strings.ToLower(strings.TrimSpace(axiom))
	normalized = strings.Join(strings.Fields(normalized), " ")
	
	return sha256.Sum256([]byte(normalized))
}
