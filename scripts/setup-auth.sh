#!/bin/bash

# Excalibur $EXS - Admin Authentication Setup
# Secure Merlin's Portal

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      EXCALIBUR \$EXS - Admin Authentication Setup        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "✗ Please run as root (use sudo)"
    exit 1
fi

# Install apache2-utils for htpasswd
echo "Installing htpasswd utility..."
apt install -y apache2-utils

echo ""
echo "Creating admin password..."
echo "Enter username for Merlin's Sanctum (default: admin):"
read -r USERNAME
USERNAME=${USERNAME:-admin}

htpasswd -c /etc/nginx/.htpasswd_merlin $USERNAME

echo ""
echo "Updating Nginx configuration..."

# Add auth to admin location block
NGINX_CONFIG="/etc/nginx/sites-available/excaliburcrypto.com"

if grep -q "auth_basic" $NGINX_CONFIG; then
    echo "✓ Authentication already configured"
else
    # Backup
    cp $NGINX_CONFIG ${NGINX_CONFIG}.backup
    
    # Add auth lines after admin location block
    sed -i '/location \/admin\/merlins-portal\// a\        auth_basic "Merlin'\''s Sanctum - Restricted";\n        auth_basic_user_file /etc/nginx/.htpasswd_merlin;' $NGINX_CONFIG
    
    echo "✓ Authentication added to Nginx config"
fi

echo ""
echo "Testing Nginx configuration..."
nginx -t

echo ""
echo "Restarting Nginx..."
systemctl restart nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Merlin's Sanctum is now protected!"
echo ""
echo "Access URL: https://www.excaliburcrypto.com/admin/merlins-portal/"
echo "Username: $USERNAME"
echo "Password: (the one you just entered)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
