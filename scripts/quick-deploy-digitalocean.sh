#!/bin/bash

# Excalibur $EXS - Quick Digital Ocean Deployment
# One-command deployment to www.excaliburcrypto.com

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   EXCALIBUR \$EXS - Digital Ocean Quick Deploy            ║"
echo "║   Deploying to: www.excaliburcrypto.com                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="excaliburcrypto.com"
EMAIL="holedozer@gmail.com"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 1: System Preparation${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Updating system packages...${NC}"
apt update && apt upgrade -y

echo -e "${GREEN}✓ System updated${NC}"
echo ""

echo -e "${YELLOW}→ Installing required packages...${NC}"
apt install -y nginx certbot python3-certbot-nginx apache2-utils git curl ufw

echo -e "${GREEN}✓ Packages installed${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 2: Cloning Repository${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if repo already exists
if [ -d "/root/Excalibur-EXS" ]; then
    echo -e "${YELLOW}→ Repository exists, updating...${NC}"
    cd /root/Excalibur-EXS
    git pull origin main
else
    echo -e "${YELLOW}→ Cloning Excalibur-EXS repository...${NC}"
    cd /root
    git clone https://github.com/Holedozer1229/Excalibur-EXS.git
    cd Excalibur-EXS
fi

echo -e "${GREEN}✓ Repository ready${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 3: Deploying Website Files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Creating web directory...${NC}"
mkdir -p /var/www/$DOMAIN

echo -e "${YELLOW}→ Copying website files...${NC}"
# Copy website files (copy directory contents)
if [ -d "website" ] && [ "$(ls -A website)" ]; then
    cp -r website/* /var/www/$DOMAIN/
fi
# Copy web and admin directories
if [ -d "web" ]; then
    cp -r web /var/www/$DOMAIN/
fi
if [ -d "admin" ]; then
    cp -r admin /var/www/$DOMAIN/
fi

echo -e "${YELLOW}→ Setting permissions...${NC}"
chown -R www-data:www-data /var/www/$DOMAIN
find /var/www/$DOMAIN -type d -exec chmod 755 {} \;
find /var/www/$DOMAIN -type f -exec chmod 644 {} \;

echo -e "${GREEN}✓ Website files deployed${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 4: Configuring Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Creating Nginx configuration...${NC}"

cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name excaliburcrypto.com www.excaliburcrypto.com;
    
    root /var/www/excaliburcrypto.com;
    index index.html;
    
    # Main website
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Knights' Round Table (Public Portal)
    location /web/knights-round-table/ {
        try_files $uri $uri/ /web/knights-round-table/index.html;
    }
    
    # Forge UI (Next.js)
    location /web/forge-ui/ {
        try_files $uri $uri/ /web/forge-ui/index.html;
    }
    
    # Merlin's Sanctum (Admin Portal - Will add auth after SSL)
    location /admin/merlins-portal/ {
        try_files $uri $uri/ /admin/merlins-portal/index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Hide hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
NGINXEOF

echo -e "${YELLOW}→ Enabling site...${NC}"
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default

echo -e "${YELLOW}→ Testing Nginx configuration...${NC}"
nginx -t

echo -e "${YELLOW}→ Restarting Nginx...${NC}"
systemctl restart nginx
systemctl enable nginx

echo -e "${GREEN}✓ Nginx configured${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 5: Configuring Firewall${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Setting up UFW firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 6: DNS Check${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

SERVER_IP=$(curl -s ifconfig.me)
echo -e "${YELLOW}→ Your server IP: ${GREEN}$SERVER_IP${NC}"
echo ""

echo -e "${YELLOW}Checking DNS configuration...${NC}"
if command -v dig &> /dev/null; then
    DNS_IP=$(dig +short www.$DOMAIN | tail -n1)
    if [ "$DNS_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✓ DNS is correctly pointing to this server!${NC}"
        DNS_READY=true
    else
        echo -e "${YELLOW}⚠ DNS is not pointing to this server yet${NC}"
        echo -e "  Current DNS IP: ${DNS_IP:-not set}"
        echo -e "  Expected IP: $SERVER_IP"
        DNS_READY=false
    fi
else
    echo -e "${YELLOW}⚠ Cannot check DNS (dig not available)${NC}"
    DNS_READY=false
fi
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 7: SSL Certificate Setup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DNS_READY" = true ]; then
    echo -e "${YELLOW}→ Installing SSL certificate with Let's Encrypt...${NC}"
    
    certbot --nginx \
        -d $DOMAIN \
        -d www.$DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --redirect \
        --non-interactive
    
    SSL_EXIT_CODE=$?
    
    if [ $SSL_EXIT_CODE -ne 0 ]; then
        echo -e "${RED}✗ SSL installation failed${NC}"
        echo -e "${YELLOW}You can run it manually later: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
    fi
    
    if [ $SSL_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate installed!${NC}"
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 0 * * 0 certbot renew --quiet") | crontab -
        echo -e "${GREEN}✓ Auto-renewal configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping SSL setup - DNS not ready${NC}"
    echo -e "${YELLOW}After DNS propagation, run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
fi
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 8: Admin Portal Security${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Setting up admin authentication...${NC}"
echo -e "Creating admin user for Merlin's Sanctum"
echo -e "${BLUE}Enter username (default: admin):${NC}"
read -r ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

echo -e "${BLUE}Enter password for $ADMIN_USER:${NC}"
htpasswd -c /etc/nginx/.htpasswd_merlin $ADMIN_USER

# Update Nginx config to add auth (using a more readable approach)
AUTH_LINES="        auth_basic \"Merlin's Sanctum - Restricted\";\n        auth_basic_user_file /etc/nginx/.htpasswd_merlin;"
sed -i "/location \/admin\/merlins-portal\// a\\${AUTH_LINES}" /etc/nginx/sites-available/$DOMAIN

nginx -t && systemctl reload nginx

echo -e "${GREEN}✓ Admin authentication configured${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Phase 9: Final Verification${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}→ Verifying deployment...${NC}"
sleep 2

# Test local access
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Website is responding${NC}"
else
    echo -e "${RED}✗ Website is not responding${NC}"
fi

echo -e "${GREEN}✓ Nginx is running: $(systemctl is-active nginx)${NC}"
echo -e "${GREEN}✓ Firewall is active: $(ufw status | grep Status | awk '{print $2}')${NC}"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Your Excalibur $EXS Protocol is now deployed!${NC}"
echo ""
echo -e "${YELLOW}📍 Access your sites:${NC}"
if [ "$DNS_READY" = true ]; then
    echo -e "   Main Site:        ${BLUE}https://www.$DOMAIN${NC}"
    echo -e "   Knights' Portal:  ${BLUE}https://www.$DOMAIN/web/knights-round-table/${NC}"
    echo -e "   Merlin's Sanctum: ${BLUE}https://www.$DOMAIN/admin/merlins-portal/${NC}"
else
    echo -e "   Main Site:        ${BLUE}http://$SERVER_IP${NC}"
    echo -e "   Knights' Portal:  ${BLUE}http://$SERVER_IP/web/knights-round-table/${NC}"
    echo -e "   Merlin's Sanctum: ${BLUE}http://$SERVER_IP/admin/merlins-portal/${NC}"
fi
echo ""

if [ "$DNS_READY" = false ]; then
    echo -e "${YELLOW}⚠ IMPORTANT: DNS Setup Required${NC}"
    echo ""
    echo -e "Add these DNS records at your domain registrar:"
    echo -e "  ${BLUE}Type    Name    Value${NC}"
    echo -e "  A       @       $SERVER_IP"
    echo -e "  A       www     $SERVER_IP"
    echo ""
    echo -e "After DNS propagation (5-30 minutes), run:"
    echo -e "  ${BLUE}sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
    echo ""
fi

echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo -e "  View logs:        ${BLUE}sudo tail -f /var/log/nginx/access.log${NC}"
echo -e "  Update site:      ${BLUE}cd /root/Excalibur-EXS && git pull && sudo rsync -av website/ /var/www/$DOMAIN/ && sudo cp -r web admin /var/www/$DOMAIN/${NC}"
echo -e "  Restart Nginx:    ${BLUE}sudo systemctl restart nginx${NC}"
echo -e "  Check status:     ${BLUE}sudo systemctl status nginx${NC}"
echo ""

echo -e "${YELLOW}📚 Documentation:${NC}"
echo -e "  Full guide:       ${BLUE}/root/Excalibur-EXS/DIGITAL_OCEAN_DEPLOY.md${NC}"
echo -e "  Quick deploy:     ${BLUE}/root/Excalibur-EXS/DEPLOY.md${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚔️  The realm is now live. The prophecy unfolds. ⚔️${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
