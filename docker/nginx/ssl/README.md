# SSL Certificates Directory

This directory should contain SSL certificates for HTTPS.

## For Development/Testing

Generate self-signed certificates:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem \
  -out docker/nginx/ssl/fullchain.pem \
  -subj "/CN=www.excaliburcrypto.com"
```

## For Production

Use Let's Encrypt certificates:

```bash
sudo certbot certonly --standalone -d www.excaliburcrypto.com
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/www.excaliburcrypto.com/privkey.pem docker/nginx/ssl/
```

## Required Files

- `fullchain.pem` - SSL certificate chain
- `privkey.pem` - Private key

**Note**: These files are gitignored for security and must be generated before starting Docker services.
