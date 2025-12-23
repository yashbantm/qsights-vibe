# QSights VIBE - Complete Working Backup
# Date: December 23, 2025
# Status: ✅ FULLY WORKING PRODUCTION STATE

## Server Information
- **Domain**: http://prod.qsights.com
- **Server IP**: 65.0.100.121
- **EC2 Instance**: i-021cba87abb7fc764
- **Region**: ap-south-1 (Mumbai)
- **OS**: Ubuntu
- **Nginx**: 1.18.0
- **PHP**: 8.4.16
- **Node.js**: (via PM2)
- **PostgreSQL**: 14.20

## Login Credentials
- **Email**: superadmin@qsights.com
- **Password**: admin123

## Working State Verification (December 23, 2025)
✅ Dashboard loads: http://prod.qsights.com
✅ Login working with admin123
✅ Organizations API returns BioQuest
✅ All /api/* endpoints accessible
✅ CSRF cookies working
✅ Session management working
✅ Database: 5 users, 38 tables

---

## 1. NGINX CONFIGURATION
**File**: `/etc/nginx/sites-available/qsights`
**Symlink**: `/etc/nginx/sites-enabled/qsights`

```nginx
server {
    listen 80;
    server_name prod.qsights.com 13.235.114.129;
    
    # All requests go to Next.js (including /api/ routes)
    # Next.js will handle proxying to backend via its API routes
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**To apply**:
```bash
sudo cp [this-file] /etc/nginx/sites-available/qsights
sudo nginx -t
sudo systemctl reload nginx
```

---

## 2. BACKEND ENVIRONMENT
**File**: `/var/www/QSightsOrg2.0/backend/.env`

```env
APP_NAME=QSights
APP_ENV=production
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=http://prod.qsights.com
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file
APP_KEY=[KEEP EXISTING - DO NOT CHANGE]

# Frontend URL
FRONTEND_URL=http://prod.qsights.com

# Database Configuration
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qsights_db
DB_USERNAME=qsights_user
DB_PASSWORD=[KEEP EXISTING - DO NOT CHANGE]

# Session Configuration
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=prod.qsights.com
SESSION_SAME_SITE=lax
SESSION_SECURE_COOKIE=false

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=prod.qsights.com

# Mail Configuration
MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=debug

# Cache & Queue
CACHE_STORE=file
QUEUE_CONNECTION=database

# AWS S3 Configuration (if used)
AWS_ACCESS_KEY_ID=[KEEP EXISTING]
AWS_SECRET_ACCESS_KEY=[KEEP EXISTING]
AWS_DEFAULT_REGION=ap-south-1
AWS_BUCKET=[KEEP EXISTING]
AWS_USE_PATH_STYLE_ENDPOINT=false
```

**To apply**:
```bash
cd /var/www/QSightsOrg2.0/backend
# Edit .env file with above values (keeping secrets)
php artisan config:cache
pm2 restart qsights-backend
```

---

## 3. BACKEND CORS CONFIGURATION
**File**: `/var/www/QSightsOrg2.0/backend/config/cors.php`

```php
<?php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://prod.qsights.com',
        'https://prod.qsights.com'
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
```

**To apply**:
```bash
cd /var/www/QSightsOrg2.0/backend
# Copy this file to config/cors.php
php artisan config:cache
pm2 restart qsights-backend
```

---

## 4. FRONTEND ENVIRONMENT
**File**: `/var/www/QSightsOrg2.0/frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=http://prod.qsights.com
SENDGRID_API_KEY=[REDACTED - Keep your actual key]
SENDGRID_FROM_EMAIL=do-not-reply@qsights.com
```

**To apply**:
```bash
cd /var/www/QSightsOrg2.0/frontend
# Copy this file to .env.production
rm -rf .next
NODE_ENV=production npm run build
pm2 restart qsights-frontend
```

---

## 5. PM2 PROCESS CONFIGURATION

**Frontend Process**:
```bash
pm2 start npm --name "qsights-frontend" -- start
pm2 save
```

**Backend Process**:
```bash
pm2 start "php artisan serve --host=0.0.0.0 --port=8000" --name "qsights-backend"
pm2 save
```

---

## RESTORATION GUIDE

### Step 1: SSH Access Setup
```bash
# Start SSM port forwarding (run in local terminal)
aws ssm start-session \
  --target i-021cba87abb7fc764 \
  --region ap-south-1 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["22"],"localPortNumber":["7390"]}' &

sleep 5

# Set PEM key path
PEM_KEY="$HOME/Library/CloudStorage/OneDrive-BIOQUESTSOLUTIONSPRIVATELIMITED/Backup_laptop/PEMs/QSights-Mumbai-12Aug2019.pem"
```

### Step 2: Restore Nginx Configuration
```bash
# Save this gist content to local file
curl -o /tmp/qsights-vibe.md https://gist.githubusercontent.com/[YOUR_GIST_URL]

# Extract Nginx config (lines between NGINX markers)
# Then upload:
scp -P 7390 -i "$PEM_KEY" /tmp/nginx-qsights.conf ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost \
  "sudo cp /tmp/nginx-qsights.conf /etc/nginx/sites-available/qsights && \
   sudo nginx -t && \
   sudo systemctl reload nginx"
```

### Step 3: Restore Backend Configuration
```bash
# Upload CORS config
scp -P 7390 -i "$PEM_KEY" /tmp/cors.php ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost \
  "sudo cp /tmp/cors.php /var/www/QSightsOrg2.0/backend/config/cors.php"

# Update backend .env (manually edit keeping secrets)
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost
# On server:
cd /var/www/QSightsOrg2.0/backend
sudo nano .env
# Update: APP_URL, FRONTEND_URL, SESSION_DOMAIN, SANCTUM_STATEFUL_DOMAINS
php artisan config:cache
pm2 restart qsights-backend
exit
```

### Step 4: Restore Frontend Configuration
```bash
# Upload frontend .env.production
scp -P 7390 -i "$PEM_KEY" /tmp/env.production ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost \
  "sudo cp /tmp/env.production /var/www/QSightsOrg2.0/frontend/.env.production && \
   cd /var/www/QSightsOrg2.0/frontend && \
   rm -rf .next && \
   NODE_ENV=production npm run build && \
   pm2 restart qsights-frontend"
```

### Step 5: Verification
```bash
# Test CSRF endpoint
curl -I http://prod.qsights.com/sanctum/csrf-cookie
# Expected: HTTP/1.1 204 No Content

# Test login
curl -X POST http://prod.qsights.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@qsights.com","password":"admin123"}'
# Expected: JSON with user object and token

# Test Organizations API
TOKEN=$(curl -s -X POST http://prod.qsights.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@qsights.com","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s http://prod.qsights.com/api/organizations \
  -H "Authorization: Bearer $TOKEN"
# Expected: JSON with BioQuest organization

# Test dashboard
open http://prod.qsights.com
# Login with superadmin@qsights.com / admin123
```

---

## TROUBLESHOOTING

### Issue: "Failed to fetch" errors
**Solution**:
1. Check PM2 processes: `pm2 list`
2. Check backend logs: `pm2 logs qsights-backend --lines 50`
3. Verify backend responds: `curl http://localhost:8000/api/health`
4. Clear config cache: `php artisan config:cache`

### Issue: CORS errors
**Solution**:
1. Verify CORS config has prod.qsights.com in allowed_origins
2. Clear config cache: `php artisan config:cache`
3. Restart backend: `pm2 restart qsights-backend`

### Issue: Login fails
**Solution**:
1. Check SANCTUM_STATEFUL_DOMAINS in .env matches domain
2. Verify SESSION_DOMAIN matches domain
3. Test password: `php artisan tinker --execute="echo Hash::check('admin123', User::where('email', 'superadmin@qsights.com')->first()->password) ? 'MATCH' : 'NO MATCH';"`

### Issue: 404 on /sanctum/csrf-cookie
**Solution**:
1. Verify Nginx config allows all requests to Next.js
2. Check Next.js is running: `pm2 list`
3. Test backend directly: `curl http://localhost:8000/sanctum/csrf-cookie`

---

## IMPORTANT NOTES

1. **Nginx Configuration Location**:
   - Active config: `/etc/nginx/sites-available/qsights`
   - DO NOT edit `/etc/nginx/sites-available/default` (not used)
   - Check active: `ls -la /etc/nginx/sites-enabled/`

2. **Architecture**:
   - All requests → Nginx → Next.js (port 3000)
   - Next.js API routes → Laravel backend (port 8000)
   - Do NOT route /api/ directly to backend in Nginx

3. **After Changes**:
   - Backend .env changes: `php artisan config:cache && pm2 restart qsights-backend`
   - Frontend .env.production: `rm -rf .next && npm run build && pm2 restart qsights-frontend`
   - Nginx config: `sudo nginx -t && sudo systemctl reload nginx`

4. **Key Environment Variables**:
   - Backend: APP_URL, FRONTEND_URL, SANCTUM_STATEFUL_DOMAINS, SESSION_DOMAIN
   - Frontend: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL
   - All must use same domain: prod.qsights.com

---

## DATABASE ACCESS

```bash
# Connect to PostgreSQL
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost
sudo -u postgres psql -d qsights_db

# Laravel Artisan
cd /var/www/QSightsOrg2.0/backend
php artisan db:show
php artisan tinker --execute='echo User::count()'
```

---

## PM2 MANAGEMENT

```bash
# List processes
pm2 list

# Restart
pm2 restart qsights-frontend
pm2 restart qsights-backend

# Logs
pm2 logs qsights-frontend --lines 100
pm2 logs qsights-backend --lines 100

# Monitor
pm2 monit

# Save configuration
pm2 save

# Startup script
pm2 startup
```

---

**Checkpoint Name**: QSIGHTS-VIBE  
**Date**: December 23, 2025  
**Status**: ✅ FULLY WORKING  
**Verified By**: Production testing - all features operational  

This backup represents a stable, working production configuration. Use this as the baseline for future deployments and troubleshooting.
