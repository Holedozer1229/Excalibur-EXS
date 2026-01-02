# Nginx Configuration

This directory contains configuration files for the Nginx web server.

## Files

### `nginx.conf`
Main Nginx configuration file that handles:
- HTTP to HTTPS redirect
- Static file serving (website, web apps, admin portal)
- API proxying (treasury, forge)
- Rate limiting
- Security headers
- SSL/TLS configuration

### `.htpasswd`
HTTP Basic Authentication file for Merlin's Portal (admin dashboard).

**Default Credentials (Development Only):**
- Username: `merlin`
- Password: `excalibur`

⚠️ **IMPORTANT:** Change this password before deploying to production!

### Changing Admin Password

```bash
# Install htpasswd utility
sudo apt-get install apache2-utils

# Update password
htpasswd -b docker/nginx/.htpasswd merlin YOUR_NEW_PASSWORD

# Or create a new user
htpasswd docker/nginx/.htpasswd newuser

# Restart nginx to apply changes
docker-compose restart website
```

### `ssl/`
Directory containing SSL certificates. See `ssl/README.md` for details.

## Production Deployment

Before deploying to production:

1. ✅ Change the admin password in `.htpasswd`
2. ✅ Replace self-signed SSL certificates with proper ones (Let's Encrypt recommended)
3. ✅ Update `nginx.conf` with your domain name if different
4. ✅ Review and adjust rate limiting rules based on your needs
