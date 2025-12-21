// Package guardian implements the Lancelot Guardian Protocol
// A multi-layered security and authentication system for Excalibur-EXS
package guardian

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"golang.org/x/crypto/argon2"
)

var (
	// ErrInvalidCredentials indicates authentication failure
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrRateLimitExceeded indicates too many requests
	ErrRateLimitExceeded = errors.New("rate limit exceeded")
	// ErrUnauthorized indicates insufficient permissions
	ErrUnauthorized = errors.New("unauthorized access")
	// ErrInvalidToken indicates token validation failure
	ErrInvalidToken = errors.New("invalid or expired token")
)

// Role defines access levels within the Excalibur protocol
type Role string

const (
	// RoleKingArthur - Full administrative access (Merlin's Portal)
	RoleKingArthur Role = "king_arthur"
	// RoleKnight - Standard forge access (Knights' Round Table)
	RoleKnight Role = "knight"
	// RoleSquire - Read-only access
	RoleSquire Role = "squire"
)

// Guardian implements the Lancelot Guardian Protocol
type Guardian struct {
	mu             sync.RWMutex
	users          map[string]*User
	sessions       map[string]*Session
	rateLimiter    *RateLimiter
	ipWhitelist    map[string]bool
	config         *Config
}

// User represents an authenticated user in the system
type User struct {
	Username     string
	PasswordHash []byte
	Salt         []byte
	Role         Role
	CreatedAt    time.Time
	LastLoginAt  time.Time
	Enabled      bool
}

// Session represents an active authenticated session
type Session struct {
	Token     string
	Username  string
	Role      Role
	CreatedAt time.Time
	ExpiresAt time.Time
	IPAddress string
}

// Config holds Guardian configuration
type Config struct {
	// Argon2 parameters for password hashing
	Argon2Time    uint32
	Argon2Memory  uint32
	Argon2Threads uint8
	Argon2KeyLen  uint32

	// Session parameters
	SessionDuration time.Duration
	TokenLength     int

	// Rate limiting
	RateLimitRequests int
	RateLimitWindow   time.Duration

	// Security
	RequireIPWhitelist bool
}

// DefaultConfig returns secure default configuration
func DefaultConfig() *Config {
	return &Config{
		// Argon2id parameters (OWASP recommendations)
		Argon2Time:    3,
		Argon2Memory:  64 * 1024, // 64 MB
		Argon2Threads: 4,
		Argon2KeyLen:  32,

		// 24 hour sessions
		SessionDuration: 24 * time.Hour,
		TokenLength:     32,

		// Rate limiting: 100 requests per minute
		RateLimitRequests: 100,
		RateLimitWindow:   time.Minute,

		RequireIPWhitelist: false,
	}
}

// NewGuardian creates a new Guardian instance
func NewGuardian(config *Config) *Guardian {
	if config == nil {
		config = DefaultConfig()
	}

	return &Guardian{
		users:       make(map[string]*User),
		sessions:    make(map[string]*Session),
		rateLimiter: NewRateLimiter(config.RateLimitRequests, config.RateLimitWindow),
		ipWhitelist: make(map[string]bool),
		config:      config,
	}
}

// CreateUser creates a new user with hashed password
func (g *Guardian) CreateUser(username, password string, role Role) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if _, exists := g.users[username]; exists {
		return fmt.Errorf("user already exists: %s", username)
	}

	// Generate salt
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return fmt.Errorf("failed to generate salt: %w", err)
	}

	// Hash password using Argon2id
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		g.config.Argon2Time,
		g.config.Argon2Memory,
		g.config.Argon2Threads,
		g.config.Argon2KeyLen,
	)

	user := &User{
		Username:     username,
		PasswordHash: hash,
		Salt:         salt,
		Role:         role,
		CreatedAt:    time.Now(),
		Enabled:      true,
	}

	g.users[username] = user
	return nil
}

// Authenticate verifies credentials and returns a session token
func (g *Guardian) Authenticate(username, password, ipAddress string) (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	// Check rate limit
	if !g.rateLimiter.Allow(ipAddress) {
		return "", ErrRateLimitExceeded
	}

	// Check IP whitelist if enabled
	if g.config.RequireIPWhitelist && !g.ipWhitelist[ipAddress] {
		return "", ErrUnauthorized
	}

	// Get user
	user, exists := g.users[username]
	if !exists || !user.Enabled {
		return "", ErrInvalidCredentials
	}

	// Verify password
	hash := argon2.IDKey(
		[]byte(password),
		user.Salt,
		g.config.Argon2Time,
		g.config.Argon2Memory,
		g.config.Argon2Threads,
		g.config.Argon2KeyLen,
	)

	if subtle.ConstantTimeCompare(hash, user.PasswordHash) != 1 {
		return "", ErrInvalidCredentials
	}

	// Update last login
	user.LastLoginAt = time.Now()

	// Generate session token
	tokenBytes := make([]byte, g.config.TokenLength)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Create session
	session := &Session{
		Token:     token,
		Username:  username,
		Role:      user.Role,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(g.config.SessionDuration),
		IPAddress: ipAddress,
	}

	g.sessions[token] = session

	return token, nil
}

// ValidateSession checks if a session token is valid
func (g *Guardian) ValidateSession(token string) (*Session, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	session, exists := g.sessions[token]
	if !exists {
		return nil, ErrInvalidToken
	}

	if time.Now().After(session.ExpiresAt) {
		return nil, ErrInvalidToken
	}

	return session, nil
}

// RequireRole checks if a session has the required role
func (g *Guardian) RequireRole(token string, requiredRole Role) error {
	session, err := g.ValidateSession(token)
	if err != nil {
		return err
	}

	// King Arthur has access to everything
	if session.Role == RoleKingArthur {
		return nil
	}

	// Check role hierarchy
	if session.Role != requiredRole {
		return ErrUnauthorized
	}

	return nil
}

// RevokeSession removes an active session
func (g *Guardian) RevokeSession(token string) error {
	g.mu.Lock()
	defer g.mu.Unlock()

	if _, exists := g.sessions[token]; !exists {
		return ErrInvalidToken
	}

	delete(g.sessions, token)
	return nil
}

// AddToWhitelist adds an IP address to the whitelist
func (g *Guardian) AddToWhitelist(ip string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.ipWhitelist[ip] = true
}

// RemoveFromWhitelist removes an IP address from the whitelist
func (g *Guardian) RemoveFromWhitelist(ip string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.ipWhitelist, ip)
}

// CleanupExpiredSessions removes expired sessions
func (g *Guardian) CleanupExpiredSessions() int {
	g.mu.Lock()
	defer g.mu.Unlock()

	removed := 0
	now := time.Now()

	for token, session := range g.sessions {
		if now.After(session.ExpiresAt) {
			delete(g.sessions, token)
			removed++
		}
	}

	return removed
}

// GetUserInfo returns information about a user
func (g *Guardian) GetUserInfo(username string) (*User, error) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	user, exists := g.users[username]
	if !exists {
		return nil, fmt.Errorf("user not found: %s", username)
	}

	// Return a copy to prevent external modification
	userCopy := *user
	return &userCopy, nil
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*bucket
	maxReqs  int
	window   time.Duration
	cleanup  *time.Ticker
}

type bucket struct {
	tokens    int
	lastRefill time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*bucket),
		maxReqs: maxRequests,
		window:  window,
		cleanup: time.NewTicker(5 * time.Minute),
	}

	// Start cleanup goroutine
	go rl.cleanupLoop()

	return rl
}

// Allow checks if a request from the given identifier is allowed
func (rl *RateLimiter) Allow(identifier string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[identifier]

	if !exists {
		// Create new bucket
		rl.buckets[identifier] = &bucket{
			tokens:     rl.maxReqs - 1,
			lastRefill: now,
		}
		return true
	}

	// Refill tokens based on time passed
	elapsed := now.Sub(b.lastRefill)
	// Note: Float to int conversion may truncate fractional tokens,
	// which is acceptable for rate limiting as it errs on the side of being more restrictive
	refillAmount := int(elapsed.Seconds() / rl.window.Seconds() * float64(rl.maxReqs))

	if refillAmount > 0 {
		b.tokens += refillAmount
		if b.tokens > rl.maxReqs {
			b.tokens = rl.maxReqs
		}
		b.lastRefill = now
	}

	// Check if we have tokens available
	if b.tokens > 0 {
		b.tokens--
		return true
	}

	return false
}

func (rl *RateLimiter) cleanupLoop() {
	for range rl.cleanup.C {
		rl.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for id, b := range rl.buckets {
			if b.lastRefill.Before(cutoff) {
				delete(rl.buckets, id)
			}
		}
		rl.mu.Unlock()
	}
}

// Stop stops the rate limiter cleanup goroutine
func (rl *RateLimiter) Stop() {
	rl.cleanup.Stop()
}
