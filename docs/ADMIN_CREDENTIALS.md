# Excalibur EXS - Admin Credentials & Access Guide

## 🔐 Admin Portal Access

### Merlin's Portal (Admin Dashboard)

**URL:** 
- Development: `http://localhost:3000/admin/merlins-portal/`
- Production: `https://www.excaliburcrypto.com/admin/merlins-portal/`

### Default Admin Credentials

**Authentication Method:** Arthurian Axiom-based

The admin portal uses the Arthurian 13-word prophecy axiom for authentication. To access:

**Primary Access:**
- **Username:** `admin`
- **Password:** `sword` (first word of the axiom)

**Full Axiom (Reference Only):**
```
sword legend pull magic kingdom artist stone destroy forget fire steel honey question
```

**Alternative Access Keys:**
- `sword` - Primary access (recommended)
- `excalibur` - Secondary master key
- `merlin` - Tertiary wizard key

### Security Notes

⚠️ **Important:**
1. The authentication is currently client-side only (localStorage-based)
2. For production deployment, implement server-side JWT authentication
3. Change default keys in production environment
4. Use environment variables for sensitive credentials
5. Enable 2FA for production admin access

## 🎯 Admin Portal Features

### Treasury Monitoring
- Total Satoshi Fees tracking
- $EXS Treasury Balance
- Total Forges counter
- Treasury Fee (1%) calculation
- Forge Fee Pool monitoring

### Difficulty Adjustment
- Current difficulty display
- Forge weight management
- Network hashrate monitoring
- Average forge time tracking
- Increase/Decrease difficulty controls

### Global Anomaly Map
- Real-time forge tracking visualization
- Geographic distribution of mining activity
- Active/inactive forge status

### Access Log
- Real-time activity logging
- Timestamp-based entries
- System event tracking

## 🔧 Production Setup

### Step 1: Update Authentication

Create `admin/merlins-portal/auth.js`:

```javascript
// Production authentication configuration
const AUTH_CONFIG = {
  apiEndpoint: process.env.ADMIN_API_URL || 'https://api.excaliburcrypto.com/admin',
  jwtSecret: process.env.JWT_SECRET,
  sessionTimeout: 3600000, // 1 hour
};

async function authenticateUser(username, password) {
  const response = await fetch(`${AUTH_CONFIG.apiEndpoint}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('admin_token', token);
    return true;
  }
  return false;
}
```

### Step 2: Environment Variables

Set in Vercel Dashboard or `.env.production`:

```bash
# Admin API
ADMIN_API_URL=https://api.excaliburcrypto.com/admin
JWT_SECRET=your-secret-key-here

# Admin Credentials (hashed)
ADMIN_USERNAME_HASH=...
ADMIN_PASSWORD_HASH=...

# 2FA
TOTP_SECRET=...
```

### Step 3: Enable HTTPS & Security Headers

Update `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/admin/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ]
}
```

## 🚀 Quick Deployment

### Option 1: Vercel Deployment

```bash
# Navigate to repository
cd /path/to/Excalibur-EXS

# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel Dashboard:
# Settings > Environment Variables > Add:
# - JWT_SECRET
# - ADMIN_API_URL
```

### Option 2: Docker Deployment

```bash
# Build admin portal container
docker build -t exs-admin-portal ./admin/merlins-portal

# Run with environment variables
docker run -d \
  -p 3001:80 \
  -e JWT_SECRET=your-secret \
  -e ADMIN_API_URL=https://api.excaliburcrypto.com/admin \
  exs-admin-portal
```

### Option 3: Static Hosting

The admin portal can be served as static files:

```bash
# Copy to web server
cp -r admin/merlins-portal/* /var/www/admin/

# Configure nginx
server {
    listen 443 ssl;
    server_name admin.excaliburcrypto.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/admin;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000";
}
```

## 🔒 Production Security Checklist

- [ ] Change default authentication keys
- [ ] Implement server-side JWT authentication
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up 2FA (TOTP recommended)
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up intrusion detection
- [ ] Configure firewall rules (IP whitelist)
- [ ] Enable CORS restrictions
- [ ] Set up monitoring and alerts
- [ ] Regular security audits
- [ ] Implement session timeout
- [ ] Use secure password hashing (bcrypt)
- [ ] Enable CSP headers
- [ ] Configure HSTS preload

## 📊 Admin API Endpoints (To Be Implemented)

```
POST   /admin/auth/login          # Authenticate admin user
POST   /admin/auth/logout         # Logout current session
GET    /admin/treasury/stats      # Get treasury statistics
POST   /admin/difficulty/adjust   # Adjust mining difficulty
GET    /admin/forges/active       # List active forges
GET    /admin/forges/history      # Forge history
GET    /admin/logs                # Access logs
POST   /admin/alerts/configure    # Configure alerts
```

## 🆘 Troubleshooting

### Can't Access Admin Portal

1. **Clear browser cache and localStorage:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Check authentication key:**
   - Ensure you're using `sword` (lowercase)
   - Try `excalibur` or `merlin` as alternatives

3. **Verify URL is correct:**
   - Development: `http://localhost:3000/admin/merlins-portal/`
   - Production: `https://www.excaliburcrypto.com/admin/merlins-portal/`

### Authentication Fails

1. Check browser console for errors
2. Verify JavaScript is enabled
3. Check network tab for failed requests
4. Try in incognito/private mode

### Metrics Not Updating

1. Check API connectivity
2. Verify environment variables are set
3. Check CORS configuration
4. Review network requests in developer tools

## 📞 Support

For admin access issues:
- **GitHub:** Open an issue at https://github.com/Holedozer1229/Excalibur-EXS/issues
- **Documentation:** See `docs/` directory for more guides
- **Email:** admin@excaliburcrypto.com (when configured)

## 🔄 Credential Rotation

Recommended schedule:
- **Development:** Every 90 days
- **Production:** Every 30 days
- **After security incident:** Immediately

To rotate credentials:
1. Generate new JWT secret
2. Update environment variables
3. Invalidate existing sessions
4. Notify all admin users
5. Update documentation

---

**⚔️ "Only those who know the ancient words may enter the sanctum."**

**🔮 Merlin's Portal - The Wizard's Observatory**
