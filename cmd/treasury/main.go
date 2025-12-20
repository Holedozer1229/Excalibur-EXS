package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Holedozer1229/Excalibur-EXS/pkg/economy"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type Server struct {
	treasury *economy.TreasuryManager
	router   *mux.Router
}

func NewServer() *Server {
	s := &Server{
		treasury: economy.NewTreasuryManager(),
		router:   mux.NewRouter(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.router.HandleFunc("/health", s.handleHealth()).Methods("GET")
	s.router.HandleFunc("/stats", s.handleStats()).Methods("GET")
	s.router.HandleFunc("/forge", s.handleForge()).Methods("POST")
	s.router.HandleFunc("/balance", s.handleBalance()).Methods("GET")
	s.router.HandleFunc("/distributions", s.handleDistributions()).Methods("GET")
}

func (s *Server) handleHealth() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"service": "excalibur-treasury",
		})
	}
}

func (s *Server) handleStats() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		stats := s.treasury.GetTreasuryStats()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}

func (s *Server) handleForge() http.HandlerFunc {
	type forgeRequest struct {
		MinerAddress string `json:"miner_address"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		var req forgeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request format", http.StatusBadRequest)
			return
		}

		result, err := s.treasury.ProcessForge(req.MinerAddress)
		if err != nil {
			// Log actual error but return generic message
			log.Printf("Forge processing error: %v", err)
			http.Error(w, "Forge processing failed", http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func (s *Server) handleBalance() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		exs, sats := s.treasury.GetTreasuryBalance()
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"exs_balance":  economy.FormatEXSAmount(exs),
			"btc_balance":  economy.FormatBTCAmount(sats),
			"sats_balance": sats.String(),
		})
	}
}

func (s *Server) handleDistributions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		distributions := s.treasury.GetDistributionHistory(50)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(distributions)
	}
}

func main() {
	server := NewServer()

	// CORS configuration
	allowedOrigins := []string{
		"https://www.excaliburcrypto.com",
		"https://excaliburcrypto.com",
		"http://localhost:3000", // For development
	}
	
	// Allow wildcard in development
	if os.Getenv("ENV") == "development" {
		allowedOrigins = []string{"*"}
	}
	
	c := cors.New(cors.Options{
		AllowedOrigins: allowedOrigins,
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	})

	handler := c.Handler(server.router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Treasury API server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
