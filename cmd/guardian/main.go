package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"syscall"

	"github.com/Holedozer1229/Excalibur-EXS/pkg/guardian"
	"github.com/spf13/cobra"
	"golang.org/x/term"
)

var (
	g         *guardian.Guardian
	storePath = "guardian.data" // In production, use encrypted storage
)

func main() {
	g = guardian.NewGuardian(nil)

	rootCmd := &cobra.Command{
		Use:   "guardian",
		Short: "⚔️ Lancelot Guardian Protocol CLI",
		Long: `The Lancelot Guardian Protocol - Multi-layered security for Excalibur-EXS

This CLI tool manages authentication, authorization, and security for the
Excalibur $EXS blockchain protocol. Named after Sir Lancelot, the most
trusted knight of King Arthur's Round Table.`,
	}

	// User management commands
	userCmd := &cobra.Command{
		Use:   "user",
		Short: "Manage users",
	}

	createUserCmd := &cobra.Command{
		Use:   "create [username]",
		Short: "Create a new user",
		Args:  cobra.ExactArgs(1),
		RunE:  runCreateUser,
	}

	listUsersCmd := &cobra.Command{
		Use:   "list",
		Short: "List all users (requires data persistence)",
		Run:   runListUsers,
	}

	userCmd.AddCommand(createUserCmd, listUsersCmd)

	// Session management commands
	sessionCmd := &cobra.Command{
		Use:   "session",
		Short: "Manage sessions",
	}

	loginCmd := &cobra.Command{
		Use:   "login [username]",
		Short: "Authenticate and create session",
		Args:  cobra.ExactArgs(1),
		RunE:  runLogin,
	}

	validateCmd := &cobra.Command{
		Use:   "validate [token]",
		Short: "Validate a session token",
		Args:  cobra.ExactArgs(1),
		RunE:  runValidate,
	}

	revokeCmd := &cobra.Command{
		Use:   "revoke [token]",
		Short: "Revoke a session token",
		Args:  cobra.ExactArgs(1),
		RunE:  runRevoke,
	}

	sessionCmd.AddCommand(loginCmd, validateCmd, revokeCmd)

	// Security commands
	securityCmd := &cobra.Command{
		Use:   "security",
		Short: "Security operations",
	}

	whitelistCmd := &cobra.Command{
		Use:   "whitelist [add|remove] [ip]",
		Short: "Manage IP whitelist",
		Args:  cobra.ExactArgs(2),
		RunE:  runWhitelist,
	}

	cleanupCmd := &cobra.Command{
		Use:   "cleanup",
		Short: "Clean up expired sessions",
		Run:   runCleanup,
	}

	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Show Guardian status and statistics",
		Run:   runStatus,
	}

	securityCmd.AddCommand(whitelistCmd, cleanupCmd, statusCmd)

	// Info command
	infoCmd := &cobra.Command{
		Use:   "info",
		Short: "Display Lancelot Guardian Protocol information",
		Run:   runInfo,
	}

	rootCmd.AddCommand(userCmd, sessionCmd, securityCmd, infoCmd)

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func runCreateUser(cmd *cobra.Command, args []string) error {
	username := args[0]

	fmt.Printf("Creating user: %s\n", username)
	fmt.Print("Password: ")
	
	password, err := readPassword()
	if err != nil {
		return fmt.Errorf("failed to read password: %w", err)
	}

	fmt.Print("\nConfirm password: ")
	confirmPassword, err := readPassword()
	if err != nil {
		return fmt.Errorf("failed to read password: %w", err)
	}
	fmt.Println()

	if password != confirmPassword {
		return fmt.Errorf("passwords do not match")
	}

	fmt.Println("\nSelect role:")
	fmt.Println("  1) King Arthur (Full admin access)")
	fmt.Println("  2) Knight (Standard forge access)")
	fmt.Println("  3) Squire (Read-only access)")
	fmt.Print("Choice [1-3]: ")

	reader := bufio.NewReader(os.Stdin)
	choice, _ := reader.ReadString('\n')
	choice = strings.TrimSpace(choice)

	var role guardian.Role
	switch choice {
	case "1":
		role = guardian.RoleKingArthur
	case "2":
		role = guardian.RoleKnight
	case "3":
		role = guardian.RoleSquire
	default:
		return fmt.Errorf("invalid choice: %s", choice)
	}

	if err := g.CreateUser(username, password, role); err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	fmt.Printf("\n✅ User '%s' created successfully with role: %s\n", username, role)
	return nil
}

func runListUsers(cmd *cobra.Command, args []string) {
	fmt.Println("📋 User Management")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("\nNote: User listing requires persistent storage.")
	fmt.Println("In-memory users are not persisted across restarts.")
	fmt.Println("\nFor production use, integrate with a database backend.")
}

func runLogin(cmd *cobra.Command, args []string) error {
	username := args[0]

	fmt.Print("Password: ")
	password, err := readPassword()
	if err != nil {
		return fmt.Errorf("failed to read password: %w", err)
	}
	fmt.Println()

	fmt.Print("IP Address (or press Enter for 127.0.0.1): ")
	reader := bufio.NewReader(os.Stdin)
	ipAddress, _ := reader.ReadString('\n')
	ipAddress = strings.TrimSpace(ipAddress)
	if ipAddress == "" {
		ipAddress = "127.0.0.1"
	}

	token, err := g.Authenticate(username, password, ipAddress)
	if err != nil {
		return fmt.Errorf("authentication failed: %w", err)
	}

	fmt.Println("\n✅ Authentication successful!")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("Session Token: %s\n", token)
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("\n💡 Use this token for API authentication.")
	return nil
}

func runValidate(cmd *cobra.Command, args []string) error {
	token := args[0]

	session, err := g.ValidateSession(token)
	if err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	fmt.Println("\n✅ Session is valid")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Printf("Username:   %s\n", session.Username)
	fmt.Printf("Role:       %s\n", session.Role)
	fmt.Printf("IP Address: %s\n", session.IPAddress)
	fmt.Printf("Created:    %s\n", session.CreatedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("Expires:    %s\n", session.ExpiresAt.Format("2006-01-02 15:04:05"))
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	return nil
}

func runRevoke(cmd *cobra.Command, args []string) error {
	token := args[0]

	if err := g.RevokeSession(token); err != nil {
		return fmt.Errorf("revocation failed: %w", err)
	}

	fmt.Println("✅ Session revoked successfully")
	return nil
}

func runWhitelist(cmd *cobra.Command, args []string) error {
	action := args[0]
	ip := args[1]

	switch action {
	case "add":
		g.AddToWhitelist(ip)
		fmt.Printf("✅ Added %s to IP whitelist\n", ip)
	case "remove":
		g.RemoveFromWhitelist(ip)
		fmt.Printf("✅ Removed %s from IP whitelist\n", ip)
	default:
		return fmt.Errorf("invalid action: %s (use 'add' or 'remove')", action)
	}

	return nil
}

func runCleanup(cmd *cobra.Command, args []string) {
	removed := g.CleanupExpiredSessions()
	fmt.Printf("🧹 Cleaned up %d expired session(s)\n", removed)
}

func runStatus(cmd *cobra.Command, args []string) {
	fmt.Println("\n⚔️ Lancelot Guardian Protocol Status")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("\n🛡️  Security Status: Active")
	fmt.Println("🔐 Authentication: Argon2id (OWASP compliant)")
	fmt.Println("⏱️  Rate Limiting: Enabled")
	fmt.Println("🌐 IP Whitelisting: Configurable")
	fmt.Println("\n💡 For detailed metrics, integrate with monitoring system.")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

func runInfo(cmd *cobra.Command, args []string) {
	fmt.Println(`
⚔️ ═══════════════════════════════════════════════════════════════ ⚔️

            THE LANCELOT GUARDIAN PROTOCOL
            
    Multi-Layered Security for Excalibur $EXS
    
⚔️ ═══════════════════════════════════════════════════════════════ ⚔️

Named after Sir Lancelot, the most trusted and noble knight of
King Arthur's Round Table, this protocol ensures that only the
worthy may access the sacred halls of Excalibur.

╔══════════════════════════════════════════════════════════════╗
║                    SECURITY FEATURES                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🔐 Argon2id Password Hashing                                ║
║     • OWASP recommended parameters                           ║
║     • 64 MB memory, 3 iterations, 4 threads                  ║
║     • Quantum-resistant key derivation                       ║
║                                                               ║
║  🛡️  Role-Based Access Control (RBAC)                        ║
║     • King Arthur: Full administrative access                ║
║     • Knight: Standard forge operations                      ║
║     • Squire: Read-only access                               ║
║                                                               ║
║  ⏱️  Token Bucket Rate Limiting                              ║
║     • Configurable request limits                            ║
║     • Per-IP address tracking                                ║
║     • Automatic bucket refill                                ║
║                                                               ║
║  🌐 IP Whitelisting                                          ║
║     • Optional IP-based access control                       ║
║     • Dynamic whitelist management                           ║
║     • Enhanced security for Merlin's Portal                  ║
║                                                               ║
║  🎫 Session Management                                       ║
║     • Cryptographically secure tokens                        ║
║     • Configurable expiration (24h default)                  ║
║     • Manual revocation support                              ║
║     • Automatic cleanup of expired sessions                  ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝

INTEGRATION POINTS:

  • Merlin's Portal: Protects admin dashboard with King Arthur role
  • Knights' Round Table: Rate limits forge submissions
  • Rosetta API: Validates session tokens for sensitive operations
  • Treasury: Ensures only authorized access to protocol funds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"A knight is sworn to valor. His heart knows only virtue."
                                    - The Code of Chivalry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For more information, see: docs/guardian.md
`)
}

func readPassword() (string, error) {
	bytePassword, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		return "", err
	}
	return string(bytePassword), nil
}
