# Excalibur $EXS - AWS Apache Quick Start

Quick guide for deploying Excalibur $EXS on AWS EC2 with Apache on Ubuntu Server.

---

## 🚀 Quick Deployment (5 Steps)

### Step 1: Launch EC2 Instance (5 minutes)

1. **Go to AWS Console** → EC2 → Launch Instance
2. **Select AMI**: Ubuntu Server 22.04 LTS
3. **Instance Type**: 
   - t2.micro (free tier eligible)
   - t3.small (recommended for production - ~$15/month)
4. **Key Pair**: Create or select existing key pair
5. **Network Settings** → Edit:
   - Create Security Group with:
     - SSH (22) - Your IP
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
6. **Storage**: Default 8GB is sufficient
7. Click **Launch Instance**

### Step 2: Allocate Elastic IP (Optional but Recommended)

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. Select the new Elastic IP → **Actions** → **Associate Elastic IP address**
3. Select your instance → **Associate**
4. **Note your Elastic IP** for DNS configuration

### Step 3: Connect and Deploy (5 minutes)

```bash
# Connect to your instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Run one-command deployment
curl -fsSL https://raw.githubusercontent.com/Holedozer1229/Excalibur-EXS/main/scripts/deploy-apache.sh | sudo bash

# Follow prompts to set admin username and password
```

### Step 4: Configure DNS (5 minutes)

Add these DNS records at your domain registrar:

```
Type    Name    Value
A       @       YOUR_ELASTIC_IP
A       www     YOUR_ELASTIC_IP
```

Wait 5-15 minutes for DNS propagation. Verify:

```bash
dig www.excaliburcrypto.com
```

### Step 5: Enable SSL (2 minutes)

```bash
# SSH into your instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Run Certbot
sudo certbot --apache -d excaliburcrypto.com -d www.excaliburcrypto.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (2)
```

**✓ Done!** Your site is live at `https://www.excaliburcrypto.com`

---

## 🌐 Your Live Sites

After deployment:

- **Main Site**: https://www.excaliburcrypto.com
- **Knights' Portal**: https://www.excaliburcrypto.com/web/knights-round-table/
- **Oracle**: https://holedozer1229.github.io/Excalibur-EXS/web/knights-round-table/oracle
- **Admin Portal**: https://www.excaliburcrypto.com/admin/merlins-portal/

---

## 💰 AWS Costs

| Instance Type | vCPU | RAM | Monthly Cost | Best For |
|--------------|------|-----|--------------|----------|
| t2.micro | 1 | 1GB | **FREE** (12 months) | Testing/Development |
| t3.small | 2 | 2GB | ~$15 | Production |
| t3.medium | 2 | 4GB | ~$30 | Medium traffic |

**Elastic IP**: Free when associated with running instance

**Total Cost** (first year): $0 with t2.micro free tier  
**Total Cost** (after): ~$15/month with t3.small

---

## 🔧 AWS-Specific Configuration

### Security Group Verification

```bash
# Verify Security Group allows traffic
# AWS Console → EC2 → Security Groups → Your SG → Inbound Rules

Required rules:
✓ SSH (22) from your IP
✓ HTTP (80) from 0.0.0.0/0
✓ HTTPS (443) from 0.0.0.0/0
```

### Check Instance Status

```bash
# Get instance public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4

# Check Apache status
sudo systemctl status apache2

# View Apache logs
sudo tail -f /var/log/apache2/excalibur-exs-error.log
```

### Update Deployment

```bash
# SSH to instance
ssh -i /path/to/your-key.pem ubuntu@YOUR_ELASTIC_IP

# Pull latest changes
cd /tmp/Excalibur-EXS
git pull origin main

# Update files
sudo cp -r website/* /var/www/excalibur-exs/website/
sudo cp -r web/* /var/www/excalibur-exs/web/
sudo cp -r admin/* /var/www/excalibur-exs/admin/

# Reload Apache
sudo systemctl reload apache2
```

---

## 🆘 Troubleshooting

### Can't connect via HTTP/HTTPS

**Issue**: Security Group not configured

**Solution**:
1. Go to EC2 → Security Groups
2. Select your instance's security group
3. Edit Inbound Rules
4. Add HTTP (80) and HTTPS (443) from 0.0.0.0/0

### SSL certificate fails

**Issue**: DNS not propagated or port 80 not accessible

**Solution**:
```bash
# Verify DNS points to your IP
dig www.excaliburcrypto.com

# Test port 80 from instance
curl -I http://localhost

# Ensure Security Group allows port 80
```

### Site loads on IP but not domain

**Issue**: DNS not configured or not propagated

**Solution**:
```bash
# Wait 15-30 minutes for DNS propagation
# Verify DNS configuration at your registrar
# Check DNS resolution
nslookup www.excaliburcrypto.com
```

### Apache won't start

**Issue**: Configuration error

**Solution**:
```bash
# Test configuration
sudo apache2ctl configtest

# Check error logs
sudo tail -f /var/log/apache2/error.log

# Restart Apache
sudo systemctl restart apache2
```

---

## 📊 AWS Best Practices

### 1. Use Elastic IP
- Prevents IP changes on instance stop/start
- Free when associated with running instance

### 2. Enable CloudWatch
- Monitor CPU, network, and disk usage
- Set up billing alerts

### 3. Create AMI Backup
```bash
# In AWS Console:
# EC2 → Instances → Select instance → Actions → Image → Create Image
```

### 4. Use t3 Instances
- Better performance per dollar than t2
- Burstable CPU for cost efficiency

### 5. Set Up Auto-Renewal for SSL
```bash
# Certbot auto-renewal is configured during setup
# Test renewal
sudo certbot renew --dry-run
```

---

## 📚 Additional Resources

- **Full Apache Guide**: [APACHE_DEPLOY.md](APACHE_DEPLOY.md)
- **Multi-Platform Guide**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Let's Encrypt Docs**: https://letsencrypt.org/docs/

---

## 📞 Support

- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS
- **Email**: holedozer@gmail.com
- **AWS Support**: https://console.aws.amazon.com/support/

---

**The realm is ready on AWS. Deploy with confidence.**

⚔️ **EXCALIBUR $EXS** ⚔️
