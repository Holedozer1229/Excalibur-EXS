# Oracle API Deployment Guide

## Overview

The Excalibur $EXS Oracle API provides intelligent guidance and protocol information to users. This guide explains how to deploy the Oracle API service online for production use.

## Deployment Options

### Option 1: Vercel Serverless (Recommended for Quick Setup)

#### Prerequisites
- Vercel account
- Python serverless function support

#### Steps
1. Create a new Vercel project linked to your repository
2. Configure the following in your Vercel project settings:
   ```bash
   Build Command: (leave empty - Python serverless)
   Output Directory: (leave empty)
   Install Command: pip install -r cmd/oracle-api/requirements.txt
   ```

3. Add the following environment variables in Vercel:
   ```
   ORACLE_API_KEY=your-secure-api-key-here
   PYTHON_VERSION=3.11
   ```

4. Deploy using Vercel CLI or GitHub integration

5. Your Oracle API will be available at: `https://your-project.vercel.app`

#### Update Configuration
Update the `ORACLE_API_URL` in your `.env` file:
```
ORACLE_API_URL=https://your-project.vercel.app
```

---

### Option 2: Docker Container (Recommended for Full Control)

#### Prerequisites
- Docker installed
- Container hosting (AWS ECS, GCP Cloud Run, DigitalOcean App Platform, etc.)

#### Build Docker Image
```bash
cd /home/runner/work/Excalibur-EXS/Excalibur-EXS
docker build -f docker/Dockerfile.oracle -t excalibur-oracle:latest .
```

#### Run Locally for Testing
```bash
docker run -p 5001:5001 \
  -e ORACLE_API_KEY=your-secure-api-key \
  -e ENV=production \
  excalibur-oracle:latest
```

#### Deploy to Cloud Run (Example)
```bash
# Tag for Google Container Registry
docker tag excalibur-oracle:latest gcr.io/YOUR_PROJECT/excalibur-oracle:latest

# Push to registry
docker push gcr.io/YOUR_PROJECT/excalibur-oracle:latest

# Deploy to Cloud Run
gcloud run deploy excalibur-oracle \
  --image gcr.io/YOUR_PROJECT/excalibur-oracle:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ORACLE_API_KEY=your-secure-api-key
```

---

### Option 3: Traditional VPS (DigitalOcean, Linode, AWS EC2)

#### Prerequisites
- VPS with Ubuntu 22.04 LTS
- Python 3.11+ installed
- Nginx (optional, for reverse proxy)

#### Setup Steps

1. **SSH into your VPS**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Install Dependencies**
   ```bash
   apt update
   apt install -y python3.11 python3.11-pip python3.11-venv nginx
   ```

3. **Clone Repository**
   ```bash
   cd /opt
   git clone https://github.com/Holedozer1229/Excalibur-EXS.git
   cd Excalibur-EXS
   ```

4. **Setup Python Environment**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r cmd/oracle-api/requirements.txt
   pip install gunicorn
   ```

5. **Create Systemd Service**
   ```bash
   cat > /etc/systemd/system/excalibur-oracle.service << 'EOF'
   [Unit]
   Description=Excalibur Oracle API
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/opt/Excalibur-EXS
   Environment="PATH=/opt/Excalibur-EXS/venv/bin"
   Environment="ORACLE_API_KEY=your-secure-api-key-here"
   Environment="ENV=production"
   ExecStart=/opt/Excalibur-EXS/venv/bin/gunicorn \
       --bind 0.0.0.0:5001 \
       --workers 4 \
       --worker-class sync \
       --timeout 120 \
       --access-logfile /var/log/excalibur-oracle-access.log \
       --error-logfile /var/log/excalibur-oracle-error.log \
       cmd.oracle-api.app:app
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   EOF
   ```

6. **Start Service**
   ```bash
   systemctl daemon-reload
   systemctl enable excalibur-oracle
   systemctl start excalibur-oracle
   systemctl status excalibur-oracle
   ```

7. **Configure Nginx Reverse Proxy** (Optional but recommended)
   ```bash
   cat > /etc/nginx/sites-available/oracle << 'EOF'
   server {
       listen 80;
       server_name oracle.excaliburcrypto.com;

       location / {
           proxy_pass http://127.0.0.1:5001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   EOF

   ln -s /etc/nginx/sites-available/oracle /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d oracle.excaliburcrypto.com
   ```

---

## Post-Deployment Configuration

### Update Website Configuration

1. **Update .env file** (for production deployment):
   ```bash
   ORACLE_API_URL=https://oracle.excaliburcrypto.com
   ORACLE_API_KEY=your-secure-api-key-here
   ```

2. **Configuration File** (`website/assets/js/config.js`):
   - The configuration file automatically detects the environment
   - For production, it uses `https://oracle.excaliburcrypto.com`
   - For localhost development, it falls back to `http://localhost:5001`

3. **Redeploy Website**:
   - The website configuration will automatically use the correct Oracle API URL based on the hostname
   - No code changes required after initial setup

---

## Testing Your Deployment

### Health Check
```bash
curl https://oracle.excaliburcrypto.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-20T22:30:00Z"
}
```

### Test Oracle Query
```bash
curl -X POST https://oracle.excaliburcrypto.com/oracle \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"query": "How does the forge work?", "user_id": "test"}'
```

### Test from Website
1. Navigate to Merlin's Portal: `https://www.excaliburcrypto.com/admin/merlins-portal/`
2. Click "Consult Oracle"
3. Enter a question
4. Verify the response

---

## Security Considerations

### 1. API Key Management
- **Never commit API keys to version control**
- Use environment variables or secret management services
- Rotate keys regularly
- Use different keys for development/staging/production

### 2. Rate Limiting
- Implement rate limiting to prevent abuse
- Configure in your reverse proxy (Nginx) or application

### 3. CORS Configuration
```python
# In cmd/oracle-api/app.py
ALLOWED_ORIGINS = [
    'https://www.excaliburcrypto.com',
    'https://excaliburcrypto.com'
]
```

### 4. HTTPS Only
- Always use HTTPS in production
- Configure SSL certificates with Let's Encrypt
- Set up automatic certificate renewal

### 5. Monitoring
- Set up logging and monitoring
- Monitor API usage and errors
- Set up alerts for downtime

---

## Troubleshooting

### Oracle API Not Responding
1. Check service status: `systemctl status excalibur-oracle`
2. Check logs: `journalctl -u excalibur-oracle -f`
3. Verify port is open: `netstat -tuln | grep 5001`
4. Check firewall rules

### CORS Errors
- Verify ALLOWED_ORIGINS in the API configuration
- Check browser console for specific error messages
- Ensure HTTPS is properly configured

### Connection Refused
- Verify DNS is pointing to your server
- Check nginx configuration
- Verify SSL certificates are valid

---

## Maintenance

### Update Oracle Code
```bash
cd /opt/Excalibur-EXS
git pull origin main
source venv/bin/activate
pip install -r cmd/oracle-api/requirements.txt
systemctl restart excalibur-oracle
```

### View Logs
```bash
# Real-time logs
journalctl -u excalibur-oracle -f

# Access logs
tail -f /var/log/excalibur-oracle-access.log

# Error logs
tail -f /var/log/excalibur-oracle-error.log
```

### Backup
- Backup Oracle code and configuration
- Backup environment variables and secrets
- Consider versioning your Docker images

---

## Cost Estimates

| Platform | Estimated Monthly Cost | Notes |
|----------|----------------------|-------|
| Vercel | $0 - $20 | Free tier available, serverless |
| DigitalOcean Droplet | $6 - $12 | Basic VPS (1-2 GB RAM) |
| AWS EC2 | $8 - $20 | t3.micro to t3.small |
| Google Cloud Run | $0 - $10 | Pay per request, generous free tier |
| DigitalOcean App Platform | $5 - $12 | Managed container hosting |

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/Holedozer1229/Excalibur-EXS/issues
- Email: holedozer@gmail.com

---

## Next Steps

After deploying the Oracle API:
1. ✅ Update website configuration with your Oracle API URL
2. ✅ Test all oracle features in Merlin's Portal
3. ✅ Monitor API usage and performance
4. ✅ Set up SSL/HTTPS
5. ✅ Configure monitoring and alerts
6. ✅ Deploy to production website

---

**Last Updated**: 2026-01-20
**Version**: 1.0.0
