#!/bin/bash
# Excalibur-EXS Docker Setup Script
# Generates necessary files for Docker Compose deployment

set -e

echo "🗡️  Excalibur-EXS Docker Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p docker/nginx/ssl

# Generate SSL certificates
if [ -f "docker/nginx/ssl/privkey.pem" ] && [ -f "docker/nginx/ssl/fullchain.pem" ]; then
    echo "⚠️  SSL certificates already exist."
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔐 Generating new self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout docker/nginx/ssl/privkey.pem \
            -out docker/nginx/ssl/fullchain.pem \
            -subj "/C=US/ST=State/L=City/O=Excalibur/CN=www.excaliburcrypto.com"
        echo -e "${GREEN}✓ SSL certificates generated${NC}"
    else
        echo "Keeping existing SSL certificates"
    fi
else
    echo "🔐 Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/privkey.pem \
        -out docker/nginx/ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=Excalibur/CN=www.excaliburcrypto.com"
    echo -e "${GREEN}✓ SSL certificates generated${NC}"
fi

# Generate .htpasswd file
if [ -f "docker/nginx/.htpasswd" ]; then
    echo "⚠️  Admin password file (.htpasswd) already exists."
    read -p "Do you want to regenerate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter username (default: merlin): " USERNAME
        USERNAME=${USERNAME:-merlin}
        read -s -p "Enter password (default: excalibur): " PASSWORD
        echo
        PASSWORD=${PASSWORD:-excalibur}
        
        # Check if htpasswd is available
        if command -v htpasswd &> /dev/null; then
            htpasswd -bc docker/nginx/.htpasswd "$USERNAME" "$PASSWORD"
            echo -e "${GREEN}✓ Admin password file created with username: $USERNAME${NC}"
        else
            echo -e "${YELLOW}⚠️  htpasswd not found. Creating with default credentials.${NC}"
            echo -e "${YELLOW}   Install apache2-utils to set custom passwords.${NC}"
            echo 'merlin:$apr1$a2ZweZ4v$vh5aBlHAIRFxD2EEi1wDC0' > docker/nginx/.htpasswd
            echo -e "${GREEN}✓ Default password file created${NC}"
        fi
    else
        echo "Keeping existing password file"
    fi
else
    echo "🔑 Creating default admin password file..."
    
    # Check if htpasswd is available
    if command -v htpasswd &> /dev/null; then
        htpasswd -bc docker/nginx/.htpasswd merlin excalibur
        echo -e "${GREEN}✓ Admin password file created${NC}"
        echo -e "  Username: merlin"
        echo -e "  Password: excalibur"
    else
        echo -e "${YELLOW}⚠️  htpasswd not found. Creating with default credentials.${NC}"
        echo -e "${YELLOW}   Install apache2-utils to change: sudo apt-get install apache2-utils${NC}"
        echo 'merlin:$apr1$a2ZweZ4v$vh5aBlHAIRFxD2EEi1wDC0' > docker/nginx/.htpasswd
        echo -e "${GREEN}✓ Default password file created${NC}"
        echo -e "  Username: merlin"
        echo -e "  Password: excalibur"
    fi
fi

echo ""
echo "================================"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "You can now run:"
echo "  docker-compose up -d"
echo ""
echo -e "${YELLOW}📝 Important Notes:${NC}"
echo "  • Default admin credentials: merlin / excalibur"
echo "  • SSL certificates are self-signed (browser will warn)"
echo "  • Change credentials before production deployment"
echo "  • See docker/nginx/README.md for more information"
echo ""
