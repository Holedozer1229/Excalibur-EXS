#!/bin/bash

# Excalibur $EXS - Automated Deployment Script
# Deploy website to www.excaliburcrypto.com

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     EXCALIBUR \$EXS - Deployment to excaliburcrypto.com  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Configuration
DOMAIN="excaliburcrypto.com"
WEB_ROOT="/var/www/$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
SSL_EMAIL="holedozer@gmail.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${YELLOW}Step 2: Installing Nginx...${NC}"
apt install -y nginx

echo ""
echo -e "${YELLOW}Step 3: Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx

echo ""
echo -e "${YELLOW}Step 4: Creating web directory...${NC}"
mkdir -p $WEB_ROOT
chmod 755 $WEB_ROOT

echo ""
echo -e "${YELLOW}Step 5: Copying website files...${NC}"
cp -r website/* $WEB_ROOT/
cp -r web $WEB_ROOT/
cp -r admin $WEB_ROOT/

echo ""
echo -e "${YELLOW}Step 6: Setting permissions...${NC}"
chown -R www-data:www-data $WEB_ROOT
find $WEB_ROOT -type d -exec chmod 755 {} \;
find $WEB_ROOT -type f -exec chmod 644 {} \;

echo ""
echo -e "${YELLOW}Step 7: Creating Nginx configuration...${NC}"
cat > $NGINX_CONFIG << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name excaliburcrypto.com www.excaliburcrypto.com;
    
    root /var/www/excaliburcrypto.com;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location /web/knights-round-table/ {
        try_files $uri $uri/ /web/knights-round-table/index.html;
    }
    
    location /admin/merlins-portal/ {
        try_files $uri $uri/ /admin/merlins-portal/index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINXEOF

echo ""
echo -e "${YELLOW}Step 8: Enabling site...${NC}"
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default

echo ""
echo -e "${YELLOW}Step 9: Testing Nginx configuration...${NC}"
nginx -t

echo ""
echo -e "${YELLOW}Step 10: Restarting Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx

echo ""
echo -e "${YELLOW}Step 11: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo -e "${GREEN}✓ Basic deployment complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo ""
echo "1. Point your DNS A records to this server's IP:"
echo "   A     @      $(curl -s ifconfig.me)"
echo "   A     www    $(curl -s ifconfig.me)"
echo ""
echo "2. Once DNS is propagated, run SSL setup:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $SSL_EMAIL --agree-tos"
echo ""
echo "3. Setup admin authentication:"
echo "   sudo apt install apache2-utils"
echo "   sudo htpasswd -c /etc/nginx/.htpasswd_merlin admin"
echo ""
echo "4. Add to Nginx config (in /admin/merlins-portal/ location block):"
echo "   auth_basic \"Merlin's Sanctum - Restricted\";"
echo "   auth_basic_user_file /etc/nginx/.htpasswd_merlin;"
echo ""
echo "5. Restart Nginx:"
echo "   sudo systemctl restart nginx"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}⚔️  The realm awaits at http://$DOMAIN ⚔️${NC}"
echo ""
