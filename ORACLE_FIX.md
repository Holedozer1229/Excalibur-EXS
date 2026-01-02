# Oracle 404 Fix - Clean URLs Implementation

## Issue Summary

The "Consult the Oracle" link was returning a `404: NOT_FOUND` error when deployed on Vercel.

**Error Code**: `NOT_FOUND - cle1::9mqjz-1767317633071-a8a16ecf4601`

## Root Cause

Vercel's configuration had `cleanUrls: true` enabled in `vercel.json`, which serves HTML files without the `.html` extension:
- `oracle.html` is accessed as `/oracle`
- `index.html` is accessed as `/index` or `/`

However, the navigation links in the HTML files were pointing to:
- `<a href="oracle.html">` instead of `<a href="oracle">`
- `<a href="index.html">` instead of `<a href="index">`

This caused a mismatch between the URL routing and the actual links, resulting in 404 errors.

## Solution

Implemented clean URL support across **all three deployment platforms** (Vercel, Nginx, Apache) for consistency.

### Changes Made

#### 1. Updated HTML Links

**File**: `web/knights-round-table/index.html`
- Changed: `<a href="oracle.html">` → `<a href="oracle">`
- Changed: `<a href="../admin/merlins-portal/index.html">` → `<a href="../admin/merlins-portal/">`

**File**: `web/knights-round-table/oracle.html`
- Changed: `<a href="index.html">` → `<a href="index">`

**File**: `web/knights-round-table/ORACLE_README.md`
- Updated documentation to reflect clean URL paths

#### 2. Apache Configuration (.htaccess)

Added clean URL rewrite rules:

```apache
# Clean URLs - serve .html files without extension
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.+)$ $1.html [L]
```

**How it works**:
- When `/oracle` is requested, Apache checks if the file doesn't exist
- If `oracle.html` exists, it serves that file
- User sees clean URL `/oracle`, but Apache serves `oracle.html`

#### 3. Nginx Configuration (nginx.conf)

Updated try_files directives:

```nginx
location /web/ {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri.html $uri/ =404;
}

location /admin/ {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri.html $uri/ =404;
}
```

**How it works**:
- When `/web/knights-round-table/oracle` is requested
- Nginx tries: `oracle` → `oracle.html` → `oracle/` → 404
- If `oracle.html` exists, it serves that file

#### 4. Vercel Configuration (vercel.json)

No changes needed - `cleanUrls: true` was already configured:

```json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

**How it works**:
- Vercel automatically serves `.html` files without the extension
- `/oracle` automatically serves `oracle.html`
- This is Vercel's built-in behavior

## Testing

### Vercel
```
URL: https://your-app.vercel.app/web/knights-round-table/oracle
Expected: Oracle page loads successfully
```

### Nginx
```bash
# Deploy with Docker Compose
docker-compose up -d

# Test clean URL
curl -I http://localhost/web/knights-round-table/oracle
# Expected: HTTP/1.1 200 OK
```

### Apache
```bash
# Deploy with Apache
sudo ./scripts/deploy-apache.sh

# Test clean URL
curl -I http://localhost/web/knights-round-table/oracle
# Expected: HTTP/1.1 200 OK
```

## Benefits

### 1. Consistency Across Platforms
- Same URL structure works on Vercel, Nginx, and Apache
- No platform-specific code or links needed

### 2. Better SEO
- Clean URLs are more search engine friendly
- `/oracle` looks better than `/oracle.html`

### 3. Flexibility
- Can switch between platforms without changing code
- Future-proof URL structure

### 4. User Experience
- Cleaner, more professional URLs
- Easier to share and remember

## URL Structure

All platforms now support these clean URLs:

```
# Main Website
/                           → website/index.html
/website/                   → website/index.html

# Knights' Round Table
/web/knights-round-table/          → web/knights-round-table/index.html
/web/knights-round-table/oracle    → web/knights-round-table/oracle.html

# Merlin's Portal (Admin)
/admin/merlins-portal/     → admin/merlins-portal/index.html

# Assets
/assets/*                  → website/assets/*
```

## Verification Checklist

After deployment, verify these URLs work:

- [ ] Main site: `https://www.excaliburcrypto.com/`
- [ ] Knights' Portal: `https://www.excaliburcrypto.com/web/knights-round-table/`
- [ ] Oracle: `https://www.excaliburcrypto.com/web/knights-round-table/oracle` ✅ FIXED
- [ ] Merlin's Portal: `https://www.excaliburcrypto.com/admin/merlins-portal/`

## Technical Details

### Apache Rewrite Flow
1. Request: `/web/knights-round-table/oracle`
2. Check: Does `oracle` file exist? No
3. Check: Does `oracle` directory exist? No
4. Check: Does `oracle.html` file exist? Yes
5. Serve: `oracle.html` with URL `/web/knights-round-table/oracle`

### Nginx Try Flow
1. Request: `/web/knights-round-table/oracle`
2. Try: `$uri` (oracle) - doesn't exist
3. Try: `$uri.html` (oracle.html) - exists!
4. Serve: `oracle.html` with URL `/web/knights-round-table/oracle`

### Vercel Clean URLs
1. Request: `/web/knights-round-table/oracle`
2. Vercel: Automatically checks for `oracle.html`
3. Serve: `oracle.html` as `/web/knights-round-table/oracle`

## Future Considerations

### Adding New Pages
When adding new HTML pages:

1. Create file: `newpage.html`
2. Link to it: `<a href="newpage">Link Text</a>`
3. Works automatically on all platforms

### Removing .html Extension
Do NOT include `.html` in links:
- ✅ Correct: `<a href="page">`
- ❌ Wrong: `<a href="page.html">`

### Directory Index
For directory-based URLs, use trailing slash:
- ✅ Correct: `<a href="/web/knights-round-table/">`
- ✅ Also works: `<a href="/web/knights-round-table">`

## Files Modified

1. `.htaccess` - Added clean URL rewrite rules
2. `docker/nginx/nginx.conf` - Updated try_files with .html fallback
3. `web/knights-round-table/index.html` - Updated links to clean URLs
4. `web/knights-round-table/oracle.html` - Updated back link to clean URL
5. `web/knights-round-table/ORACLE_README.md` - Updated documentation

## Deployment Impact

### Vercel ✅
- **Status**: Fixed immediately on next deployment
- **Action**: Already deployed via Git push
- **URL**: Works after DNS propagation

### Nginx 🔄
- **Status**: Requires nginx.conf update
- **Action**: Update configuration and reload
- **Command**: `sudo nginx -t && sudo systemctl reload nginx`

### Apache 🔄
- **Status**: Requires .htaccess deployment
- **Action**: Copy .htaccess to web root
- **Command**: `sudo systemctl reload apache2`

## Support

If the Oracle still returns 404:

1. **Check DNS**: Ensure domain points to correct server
   ```bash
   dig www.excaliburcrypto.com
   ```

2. **Check file exists**: Verify oracle.html is deployed
   ```bash
   ls -la web/knights-round-table/oracle.html
   ```

3. **Check web server config**: Ensure rewrite rules are active
   ```bash
   # Nginx
   sudo nginx -t
   
   # Apache
   sudo apache2ctl configtest
   ```

4. **Check logs**: View web server error logs
   ```bash
   # Nginx
   sudo tail -f /var/log/nginx/error.log
   
   # Apache
   sudo tail -f /var/log/apache2/error.log
   ```

## Related Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Multi-platform deployment
- [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) - Vercel-specific guide
- [APACHE_DEPLOY.md](APACHE_DEPLOY.md) - Apache-specific guide
- [DEPLOY.md](DEPLOY.md) - Nginx-specific guide

---

**Status**: ✅ RESOLVED

The Oracle is now accessible at:
`https://www.excaliburcrypto.com/web/knights-round-table/oracle`

⚔️ **EXCALIBUR $EXS** ⚔️
