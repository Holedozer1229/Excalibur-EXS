package guardian

import (
	"fmt"
	"testing"
	"time"
)

func TestGuardianCreation(t *testing.T) {
	g := NewGuardian(nil)
	if g == nil {
		t.Fatal("NewGuardian returned nil")
	}

	if g.config == nil {
		t.Fatal("Guardian config is nil")
	}
}

func TestCreateUser(t *testing.T) {
	g := NewGuardian(nil)

	// Create King Arthur
	err := g.CreateUser("arthur", "excalibur123", RoleKingArthur)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Verify user exists
	user, err := g.GetUserInfo("arthur")
	if err != nil {
		t.Fatalf("Failed to get user info: %v", err)
	}

	if user.Username != "arthur" {
		t.Errorf("Expected username 'arthur', got '%s'", user.Username)
	}

	if user.Role != RoleKingArthur {
		t.Errorf("Expected role RoleKingArthur, got %v", user.Role)
	}

	if !user.Enabled {
		t.Error("User should be enabled by default")
	}

	// Try to create duplicate user
	err = g.CreateUser("arthur", "password", RoleKnight)
	if err == nil {
		t.Error("Expected error when creating duplicate user")
	}
}

func TestAuthentication(t *testing.T) {
	g := NewGuardian(nil)

	// Create test user
	err := g.CreateUser("lancelot", "camelot456", RoleKnight)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	// Test successful authentication
	token, err := g.Authenticate("lancelot", "camelot456", "127.0.0.1")
	if err != nil {
		t.Fatalf("Authentication failed: %v", err)
	}

	if token == "" {
		t.Error("Expected non-empty token")
	}

	// Test invalid password
	_, err = g.Authenticate("lancelot", "wrongpassword", "127.0.0.1")
	if err != ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}

	// Test non-existent user
	_, err = g.Authenticate("merlin", "anypassword", "127.0.0.1")
	if err != ErrInvalidCredentials {
		t.Errorf("Expected ErrInvalidCredentials, got %v", err)
	}
}

func TestSessionValidation(t *testing.T) {
	g := NewGuardian(nil)

	// Create and authenticate user
	err := g.CreateUser("gawain", "roundtable789", RoleKnight)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	token, err := g.Authenticate("gawain", "roundtable789", "127.0.0.1")
	if err != nil {
		t.Fatalf("Authentication failed: %v", err)
	}

	// Validate valid session
	session, err := g.ValidateSession(token)
	if err != nil {
		t.Fatalf("Session validation failed: %v", err)
	}

	if session.Username != "gawain" {
		t.Errorf("Expected username 'gawain', got '%s'", session.Username)
	}

	if session.Role != RoleKnight {
		t.Errorf("Expected role RoleKnight, got %v", session.Role)
	}

	// Test invalid token
	_, err = g.ValidateSession("invalidtoken")
	if err != ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken, got %v", err)
	}
}

func TestSessionExpiration(t *testing.T) {
	// Create guardian with short session duration
	config := DefaultConfig()
	config.SessionDuration = 100 * time.Millisecond
	g := NewGuardian(config)

	// Create and authenticate user
	err := g.CreateUser("percival", "holygrail111", RoleKnight)
	if err != nil {
		t.Fatalf("Failed to create user: %v", err)
	}

	token, err := g.Authenticate("percival", "holygrail111", "127.0.0.1")
	if err != nil {
		t.Fatalf("Authentication failed: %v", err)
	}

	// Session should be valid immediately
	_, err = g.ValidateSession(token)
	if err != nil {
		t.Fatalf("Session validation failed: %v", err)
	}

	// Wait for session to expire
	time.Sleep(150 * time.Millisecond)

	// Session should now be invalid
	_, err = g.ValidateSession(token)
	if err != ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken for expired session, got %v", err)
	}
}

func TestRoleAuthorization(t *testing.T) {
	g := NewGuardian(nil)

	// Create users with different roles
	g.CreateUser("arthur", "king123", RoleKingArthur)
	g.CreateUser("knight", "sword456", RoleKnight)
	g.CreateUser("squire", "shield789", RoleSquire)

	// Authenticate users
	arthurToken, _ := g.Authenticate("arthur", "king123", "127.0.0.1")
	knightToken, _ := g.Authenticate("knight", "sword456", "127.0.0.1")
	squireToken, _ := g.Authenticate("squire", "shield789", "127.0.0.1")

	// King Arthur can access everything
	err := g.RequireRole(arthurToken, RoleKingArthur)
	if err != nil {
		t.Errorf("King Arthur should have KingArthur access: %v", err)
	}

	err = g.RequireRole(arthurToken, RoleKnight)
	if err != nil {
		t.Errorf("King Arthur should have Knight access: %v", err)
	}

	// Knight should have Knight access but not KingArthur
	err = g.RequireRole(knightToken, RoleKnight)
	if err != nil {
		t.Errorf("Knight should have Knight access: %v", err)
	}

	err = g.RequireRole(knightToken, RoleKingArthur)
	if err != ErrUnauthorized {
		t.Errorf("Knight should not have KingArthur access, got: %v", err)
	}

	// Squire should only have Squire access
	err = g.RequireRole(squireToken, RoleSquire)
	if err != nil {
		t.Errorf("Squire should have Squire access: %v", err)
	}

	err = g.RequireRole(squireToken, RoleKnight)
	if err != ErrUnauthorized {
		t.Errorf("Squire should not have Knight access, got: %v", err)
	}
}

func TestSessionRevocation(t *testing.T) {
	g := NewGuardian(nil)

	g.CreateUser("bedivere", "lastnight321", RoleKnight)
	token, _ := g.Authenticate("bedivere", "lastnight321", "127.0.0.1")

	// Session should be valid
	_, err := g.ValidateSession(token)
	if err != nil {
		t.Fatalf("Session should be valid: %v", err)
	}

	// Revoke session
	err = g.RevokeSession(token)
	if err != nil {
		t.Fatalf("Failed to revoke session: %v", err)
	}

	// Session should now be invalid
	_, err = g.ValidateSession(token)
	if err != ErrInvalidToken {
		t.Errorf("Expected ErrInvalidToken after revocation, got %v", err)
	}
}

func TestIPWhitelist(t *testing.T) {
	config := DefaultConfig()
	config.RequireIPWhitelist = true
	g := NewGuardian(config)

	g.CreateUser("galahad", "pureheart555", RoleKnight)

	// Authentication from non-whitelisted IP should fail
	_, err := g.Authenticate("galahad", "pureheart555", "192.168.1.1")
	if err != ErrUnauthorized {
		t.Errorf("Expected ErrUnauthorized for non-whitelisted IP, got %v", err)
	}

	// Add IP to whitelist
	g.AddToWhitelist("192.168.1.1")

	// Authentication should now succeed
	token, err := g.Authenticate("galahad", "pureheart555", "192.168.1.1")
	if err != nil {
		t.Fatalf("Authentication from whitelisted IP failed: %v", err)
	}

	if token == "" {
		t.Error("Expected valid token from whitelisted IP")
	}

	// Remove from whitelist
	g.RemoveFromWhitelist("192.168.1.1")

	// Authentication should fail again
	_, err = g.Authenticate("galahad", "pureheart555", "192.168.1.1")
	if err != ErrUnauthorized {
		t.Errorf("Expected ErrUnauthorized after removing from whitelist, got %v", err)
	}
}

func TestRateLimiting(t *testing.T) {
	config := DefaultConfig()
	config.RateLimitRequests = 5
	config.RateLimitWindow = 10 * time.Second // Longer window to avoid refills during test
	g := NewGuardian(config)

	g.CreateUser("tristan", "isolde999", RoleKnight)

	// Make requests up to the limit
	for i := 0; i < 5; i++ {
		_, err := g.Authenticate("tristan", "wrongpassword", "10.0.0.1")
		if err != ErrInvalidCredentials {
			t.Fatalf("Request %d: expected ErrInvalidCredentials, got %v", i, err)
		}
	}

	// Next request should be rate limited
	_, err := g.Authenticate("tristan", "wrongpassword", "10.0.0.1")
	if err != ErrRateLimitExceeded {
		t.Errorf("Expected ErrRateLimitExceeded, got %v", err)
	}
}

func TestCleanupExpiredSessions(t *testing.T) {
	config := DefaultConfig()
	config.SessionDuration = 50 * time.Millisecond
	g := NewGuardian(config)

	// Create multiple users and sessions
	for i := 0; i < 3; i++ {
		username := fmt.Sprintf("user%d", i)
		g.CreateUser(username, "pass"+username, RoleKnight)
		g.Authenticate(username, "pass"+username, "127.0.0.1")
	}

	// Verify sessions exist
	g.mu.RLock()
	sessionCount := len(g.sessions)
	g.mu.RUnlock()

	if sessionCount != 3 {
		t.Errorf("Expected 3 sessions, got %d", sessionCount)
	}

	// Wait for sessions to expire
	time.Sleep(100 * time.Millisecond)

	// Cleanup expired sessions
	removed := g.CleanupExpiredSessions()
	if removed != 3 {
		t.Errorf("Expected to remove 3 sessions, removed %d", removed)
	}

	// Verify sessions are gone
	g.mu.RLock()
	sessionCount = len(g.sessions)
	g.mu.RUnlock()

	if sessionCount != 0 {
		t.Errorf("Expected 0 sessions after cleanup, got %d", sessionCount)
	}
}

func TestRateLimiterBasic(t *testing.T) {
	rl := NewRateLimiter(3, time.Second)
	defer rl.Stop()

	identifier := "test-client"

	// Should allow first 3 requests
	for i := 0; i < 3; i++ {
		if !rl.Allow(identifier) {
			t.Errorf("Request %d should be allowed", i)
		}
	}

	// 4th request should be denied
	if rl.Allow(identifier) {
		t.Error("4th request should be denied")
	}
}

func BenchmarkAuthenticate(b *testing.B) {
	g := NewGuardian(nil)
	g.CreateUser("benchuser", "benchpass123", RoleKnight)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		g.Authenticate("benchuser", "benchpass123", "127.0.0.1")
	}
}

func BenchmarkValidateSession(b *testing.B) {
	g := NewGuardian(nil)
	g.CreateUser("benchuser", "benchpass123", RoleKnight)
	token, _ := g.Authenticate("benchuser", "benchpass123", "127.0.0.1")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		g.ValidateSession(token)
	}
}
