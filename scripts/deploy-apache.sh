#!/bin/bash

# Excalibur $EXS - Apache Deployment Script
# Automated deployment for Apache web server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root or with sudo"
    exit 1
fi

print_info "Starting Excalibur $EXS Apache deployment..."

# Step 1: Install Apache and dependencies
print_info "Installing Apache and dependencies..."
apt update
apt install -y apache2 apache2-utils certbot python3-certbot-apache

# Step 2: Enable required modules
print_info "Enabling Apache modules..."
a2enmod rewrite
a2enmod ssl
a2enmod headers
a2enmod expires
a2enmod proxy
a2enmod proxy_http
a2enmod deflate

print_success "Apache modules enabled"

# Step 3: Clone repository if not already in it
if [ ! -f "website/index.html" ]; then
    print_info "Cloning repository..."
    cd /tmp
    if [ -d "Excalibur-EXS" ]; then
        rm -rf Excalibur-EXS
    fi
    git clone https://github.com/Holedozer1229/Excalibur-EXS.git
    cd Excalibur-EXS
    print_success "Repository cloned"
else
    print_info "Using current directory"
fi

# Step 4: Deploy website files
print_info "Deploying website files..."
mkdir -p /var/www/excalibur-exs

cp -r website /var/www/excalibur-exs/
cp -r web /var/www/excalibur-exs/
cp -r admin /var/www/excalibur-exs/
cp index.html /var/www/excalibur-exs/
cp .htaccess /var/www/excalibur-exs/

print_success "Website files deployed"

# Step 5: Set permissions
print_info "Setting file permissions..."
chown -R www-data:www-data /var/www/excalibur-exs
chmod -R 755 /var/www/excalibur-exs
print_success "Permissions set"

# Step 6: Configure Apache
print_info "Configuring Apache virtual host..."
cp apache/excalibur-exs.conf /etc/apache2/sites-available/

# Disable default site
a2dissite 000-default.conf 2>/dev/null || true

# Enable Excalibur site
a2ensite excalibur-exs.conf

print_success "Apache configured"

# Step 7: Test configuration
print_info "Testing Apache configuration..."
if apache2ctl configtest; then
    print_success "Apache configuration is valid"
else
    print_error "Apache configuration test failed"
    exit 1
fi

# Step 8: Configure firewall
print_info "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 'Apache Full'
    ufw allow OpenSSH
    print_success "Firewall configured"
else
    print_warning "UFW not found, skipping firewall configuration"
fi

# Step 9: Restart Apache
print_info "Restarting Apache..."
systemctl restart apache2
systemctl enable apache2
print_success "Apache restarted and enabled"

# Step 10: Setup admin authentication
print_info "Setting up admin authentication..."
echo ""
echo "Please create a password for the admin portal:"
htpasswd -c /etc/apache2/.htpasswd admin

# Step 11: Check Apache status
if systemctl is-active --quiet apache2; then
    print_success "Apache is running"
else
    print_error "Apache failed to start"
    exit 1
fi

echo ""
print_success "======================================"
print_success "Excalibur $EXS Apache Deployment Complete!"
print_success "======================================"
echo ""

# Display next steps
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure DNS to point your domain to this server's IP"
echo "   Add these DNS records at your registrar:"
echo "   - Type: A, Name: @, Value: YOUR_SERVER_IP"
echo "   - Type: A, Name: www, Value: YOUR_SERVER_IP"
echo ""
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "   Verify with: dig www.excaliburcrypto.com"
echo ""
echo "3. Install SSL certificate:"
echo "   sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com"
echo ""
echo -e "${BLUE}Your Sites:${NC}"
echo "- Main Site: http://YOUR_SERVER_IP (https after SSL)"
echo "- Knights' Portal: http://YOUR_SERVER_IP/web/knights-round-table/"
echo "- Merlin's Sanctum: http://YOUR_SERVER_IP/admin/merlins-portal/"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "- Check status: sudo systemctl status apache2"
echo "- View logs: sudo tail -f /var/log/apache2/excalibur-exs-error.log"
echo "- Restart Apache: sudo systemctl restart apache2"
echo "- Test config: sudo apache2ctl configtest"
echo ""
print_info "For more information, see APACHE_DEPLOY.md"
echo ""
print_success "⚔️ EXCALIBUR \$EXS - The realm is ready! ⚔️"
