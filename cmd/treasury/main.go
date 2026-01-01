package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/Holedozer1229/Excalibur-EXS/pkg/economy"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type Server struct {
	treasury *economy.Treasury
	router   *mux.Router
}

func NewServer() *Server {
	s := &Server{
		treasury: economy.NewTreasury(),
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
	s.router.HandleFunc("/mini-outputs", s.handleMiniOutputs()).Methods("GET")
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
		stats := s.treasury.GetStats()
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

		result := s.treasury.ProcessForge(req.MinerAddress)
		if result == nil {
			log.Printf("Forge processing error: result is nil")
			http.Error(w, "Forge processing failed", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func (s *Server) handleBalance() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		totalBalance := s.treasury.GetBalance()
		spendableBalance := s.treasury.GetSpendableBalance()
		lockedBalance := s.treasury.GetLockedBalance()
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"total_balance":     totalBalance,
			"spendable_balance": spendableBalance,
			"locked_balance":    lockedBalance,
			"forge_fee_pool":    s.treasury.GetForgeFeePool(),
		})
	}
}

func (s *Server) handleDistributions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		distributions := s.treasury.GetDistributions()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(distributions)
	}
}

func (s *Server) handleMiniOutputs() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		miniOutputs := s.treasury.GetMiniOutputs()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"mini_outputs":         miniOutputs,
			"total_count":          len(miniOutputs),
			"spendable_mini_outputs": s.treasury.GetSpendableMiniOutputs(),
			"locked_mini_outputs":   s.treasury.GetLockedMiniOutputs(),
		})
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
