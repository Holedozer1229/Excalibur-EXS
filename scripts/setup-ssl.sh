#!/bin/bash

# Excalibur $EXS - SSL Setup Script
# Run this AFTER DNS is pointing to your server

set -e

DOMAIN="excaliburcrypto.com"
EMAIL="holedozer@icloud.com"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         EXCALIBUR \$EXS - SSL Certificate Setup          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "✗ Please run as root (use sudo)"
    exit 1
fi

echo "Installing SSL certificate..."
certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --redirect

echo ""
echo "✓ SSL certificate installed!"
echo ""
echo "Setting up auto-renewal..."
certbot renew --dry-run

# Create renewal cron job
(crontab -l 2>/dev/null; echo "0 0 * * 0 certbot renew --quiet") | crontab -

echo ""
echo "✓ Auto-renewal configured!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ HTTPS enabled! Your site is now secure:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
