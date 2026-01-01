# SSL Certificates

This directory contains SSL certificates for the Excalibur website.

## Development Certificates (Default)

Self-signed certificates are included for development purposes:
- `fullchain.pem` - Certificate chain
- `privkey.pem` - Private key

**Note:** These are self-signed certificates that will show a browser warning. They are provided for immediate local development only.

## Production Certificates

For production deployment, replace these with proper SSL certificates:

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d www.excaliburcrypto.com

# Copy to Docker volume
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/privkey.pem docker/nginx/ssl/
```

### Option 2: Custom Certificate

Replace the files with your own certificates:
- `fullchain.pem` - Your certificate with intermediate certificates
- `privkey.pem` - Your private key

## Security

⚠️ **Never commit production private keys to version control!**

The `.gitignore` file is configured to ignore `*.pem` files to prevent accidental commits of production certificates.
