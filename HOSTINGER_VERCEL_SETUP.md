# ⚔️ Hostinger + Vercel Setup Guide for Excalibur $EXS

Complete guide to connect your Hostinger domain (www.excaliburcrypto.com) to Vercel deployment.

---

## 🚀 Quick Setup Steps

### Part 1: Deploy to Vercel (5 minutes)

1. **Deploy the site to Vercel** using one of these methods:
   
   **Option A: One-Click Deploy**
   - Visit: https://vercel.com/new/clone?repository-url=https://github.com/Holedozer1229/Excalibur-EXS
   - Click "Deploy"
   - Login/signup to Vercel
   - Wait for deployment to complete
   
   **Option B: CLI Deploy**
   ```bash
   npm install -g vercel
   vercel login
   cd ~/projects/Excalibur-EXS  # Replace with your actual project path
   vercel --prod
   ```

2. **Note your Vercel deployment URL**
   - After deployment, you'll get a URL like: `excalibur-exs.vercel.app`
   - Keep this handy for testing

---

### Part 2: Add Custom Domain in Vercel (2 minutes)

1. Go to your **Vercel Dashboard**: https://vercel.com/dashboard
2. Click on your **Excalibur-EXS** project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `www.excaliburcrypto.com`
6. Click **Add**

Vercel will show you DNS configuration instructions. Keep this page open!

---

### Part 3: Configure DNS in Hostinger (10 minutes)

#### Step 1: Login to Hostinger
1. Go to: https://hpanel.hostinger.com
2. Login with your credentials
3. Go to **Domains** section
4. Click on **excaliburcrypto.com**

#### Step 2: Access DNS Zone Editor
1. In the domain management page, find **DNS / Name Servers**
2. Click **DNS Zone Editor** or **Manage DNS Records**

#### Step 3: Add/Update DNS Records

You need to configure these records:

**For www.excaliburcrypto.com (recommended):**

| Type  | Name | Value/Target          | TTL  |
|-------|------|-----------------------|------|
| CNAME | www  | cname.vercel-dns.com  | 3600 |

**For apex domain (optional - redirects to www):**

| Type | Name | Value/Target    | TTL  |
|------|------|-----------------|------|
| A    | @    | 76.76.21.21     | 3600 |

> **Note**: Vercel's A record IP may change. Always verify the current IP in your Vercel Dashboard when adding the domain. Vercel will display the correct IP address to use.

**Instructions:**

1. **Delete existing records** (if any):
   - Remove any existing CNAME or A records for `www`
   - Remove any existing A records for `@` if you want the apex domain

2. **Add CNAME record for www**:
   - Click **Add Record** or **+ Add New Record**
   - Type: `CNAME`
   - Name: `www` (do NOT include the full domain)
   - Target/Value: `cname.vercel-dns.com`
   - TTL: `3600` (or leave default)
   - Click **Save** or **Add Record**

3. **Add A record for apex domain** (optional):
   - Click **Add Record**
   - Type: `A`
   - Name: `@` (this represents the root domain)
   - Target/Value: `76.76.21.21`
   - TTL: `3600`
   - Click **Save**

#### Step 4: Save Changes
- Click **Save Changes** or **Update DNS Records**
- Hostinger will show a confirmation message

---

### Part 4: Verify Configuration (15-30 minutes)

#### In Vercel Dashboard:
1. Go back to Vercel Dashboard → Your Project → Settings → Domains
2. You should see `www.excaliburcrypto.com` with status:
   - **Pending**: DNS is propagating (wait 5-30 minutes)
   - **Valid**: DNS is configured correctly ✅
3. Vercel will automatically provision an SSL certificate once DNS is valid

#### Test DNS Propagation:
```bash
# Check CNAME for www
nslookup www.excaliburcrypto.com

# Or use dig
dig www.excaliburcrypto.com

# Expected: CNAME record pointing to Vercel
# You should see cname.vercel-dns.com in the output
```

#### Online Tools:
- https://www.whatsmydns.net/#CNAME/www.excaliburcrypto.com
- https://dnschecker.org/

---

## 🎯 Final URLs

Once DNS propagates (5-30 minutes), your site will be live at:

- **Main Site**: https://www.excaliburcrypto.com/
- **Knights' Portal**: https://www.excaliburcrypto.com/web/knights-round-table/
- **Merlin's Sanctum**: https://www.excaliburcrypto.com/admin/merlins-portal/

**SSL Certificate**: Automatically provisioned by Vercel (free, auto-renewing)

---

## 🔧 Troubleshooting

### Issue: "Invalid Configuration" in Vercel

**Solution**: Double-check DNS records in Hostinger:
```bash
# Verify CNAME
dig www.excaliburcrypto.com CNAME

# Should return: www.excaliburcrypto.com CNAME cname.vercel-dns.com
```

### Issue: DNS Not Propagating

**Solution**: 
1. Clear your browser cache
2. Try incognito/private browsing
3. Wait up to 24-48 hours (usually 5-30 minutes)
4. Check with different DNS checkers

### Issue: SSL Certificate Not Provisioning

**Solution**:
1. Ensure DNS is fully propagated first
2. In Vercel Dashboard → Domains, click "Refresh"
3. Certificate provisions automatically once DNS is valid

### Issue: Hostinger Shows "CNAME Already Exists"

**Solution**:
1. Delete the existing CNAME record for `www`
2. Add the new CNAME pointing to `cname.vercel-dns.com`

### Issue: Can't Find DNS Zone Editor in Hostinger

**Solution**:
1. Make sure you're in the domain management section (not hosting)
2. Look for "DNS / Name Servers" or "Advanced DNS"
3. If using Hostinger nameservers, you should see DNS Zone Editor
4. If using external nameservers, you need to manage DNS there

---

## 📋 Complete DNS Configuration Checklist

- [ ] Logged into Hostinger hPanel
- [ ] Accessed excaliburcrypto.com domain settings
- [ ] Opened DNS Zone Editor
- [ ] Deleted old www CNAME/A records (if any)
- [ ] Added new CNAME: `www` → `cname.vercel-dns.com`
- [ ] (Optional) Added A record: `@` → `76.76.21.21`
- [ ] Saved DNS changes in Hostinger
- [ ] Added www.excaliburcrypto.com in Vercel Domains
- [ ] Waited 5-30 minutes for DNS propagation
- [ ] Verified DNS with nslookup/dig
- [ ] Confirmed "Valid" status in Vercel Dashboard
- [ ] SSL certificate auto-provisioned
- [ ] Tested website at https://www.excaliburcrypto.com

---

## 🎓 Understanding the Configuration

### Why CNAME for www?
- CNAME (Canonical Name) points your subdomain to Vercel's infrastructure
- Vercel handles routing, SSL, and CDN automatically
- No need to update DNS when Vercel's IPs change

### Why A record for apex?
- Apex domain (excaliburcrypto.com) cannot use CNAME
- Vercel provides an A record IP (76.76.21.21) for apex domain
- This redirects apex → www automatically

### TTL (Time To Live)
- 3600 seconds = 1 hour
- Lower TTL = faster DNS updates, more DNS queries
- 3600 is a good balance for production

---

## 🔐 Security Notes

- ✅ Vercel provides free SSL/TLS certificates (Let's Encrypt)
- ✅ Certificates auto-renew every 90 days
- ✅ HTTPS enforced automatically (HTTP redirects to HTTPS)
- ✅ Security headers configured in vercel.json

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **Hostinger DNS Guide**: https://support.hostinger.com/en/articles/1583227-how-to-manage-dns-records
- **DNS Propagation Checker**: https://www.whatsmydns.net/
- **Project Issues**: https://github.com/Holedozer1229/Excalibur-EXS/issues

---

## ⚡ Quick Command Reference

```bash
# Check DNS propagation
nslookup www.excaliburcrypto.com
dig www.excaliburcrypto.com CNAME

# Check if site is live
curl -I https://www.excaliburcrypto.com

# Deploy updates (after initial setup)
cd ~/projects/Excalibur-EXS  # Replace with your actual path
vercel --prod
```

---

**The realm awaits your command, my liege. Let the prophecy unfold!** ⚔️
