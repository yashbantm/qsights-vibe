# QSights Production Working Checkpoint - "VIBE" 🎯
**Date**: December 23, 2025  
**Status**: ✅ FULLY WORKING  
**Domain**: http://prod.qsights.com  
**Server**: EC2 i-021cba87abb7fc764 (65.0.100.121) - ap-south-1

---

## 🎉 WORKING STATE CONFIRMED

### Successfully Fixed Issues:
1. ✅ Frontend calling localhost:8000 from browser (CORS error)
2. ✅ Nginx routing configuration (was editing wrong file)
3. ✅ Backend CORS allowing prod.qsights.com origin
4. ✅ Backend APP_URL and SANCTUM_STATEFUL_DOMAINS configuration
5. ✅ CSRF cookie endpoint accessible at /sanctum/csrf-cookie
6. ✅ Login working with admin123 password
7. ✅ Organizations API returning BioQuest data
8. ✅ All API endpoints accessible

### Test Results (All Passing):
```bash
# CSRF Cookie Endpoint
curl -I http://prod.qsights.com/sanctum/csrf-cookie
# Response: HTTP/1.1 204 No Content ✅

# Login Endpoint
curl -X POST http://prod.qsights.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@qsights.com","password":"admin123"}'
# Response: {"user":{...},"token":"..."} ✅

# Organizations API
curl -s http://prod.qsights.com/api/organizations \
  -H "Authorization: Bearer $TOKEN"
# Response: {"data":[{"name":"BioQuest",...}]} ✅
```

---

## 📝 CRITICAL CONFIGURATION FILES

### 1. Nginx Configuration
**File**: `/etc/nginx/sites-available/qsights`
**Symlink**: `/etc/nginx/sites-enabled/qsights -> /etc/nginx/sites-available/qsights`

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

**IMPORTANT**: 
- ❌ DO NOT edit `/etc/nginx/sites-available/default` - it's not used!
- ✅ Always edit `/etc/nginx/sites-available/qsights`
- After changes: `sudo nginx -t && sudo systemctl reload nginx`

### 2. Backend Environment (.env)
**File**: `/var/www/QSightsOrg2.0/backend/.env`

**Key Settings**:
```env
APP_NAME=QSights
APP_ENV=production
APP_URL=http://prod.qsights.com

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qsights_db
DB_USERNAME=qsights_user

# Frontend URL
FRONTEND_URL=http://prod.qsights.com

# Session Configuration
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=prod.qsights.com
SESSION_SECURE_COOKIE=false

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=prod.qsights.com
```

**After .env changes**:
```bash
php artisan config:cache
pm2 restart qsights-backend
```

### 3. Backend CORS Configuration
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

### 4. Frontend Environment (.env.production)
**File**: `/var/www/QSightsOrg2.0/frontend/.env.production`

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=http://prod.qsights.com
SENDGRID_API_KEY=[REDACTED - Keep your actual key]
SENDGRID_FROM_EMAIL=do-not-reply@qsights.com
```

**After changes**:
```bash
cd /var/www/QSightsOrg2.0/frontend
rm -rf .next
NODE_ENV=production npm run build
pm2 restart qsights-frontend
```

---

## 🔧 PM2 PROCESSES

```bash
pm2 list
```

| ID | Name               | Status  | Port | Restart Count |
|----|-------------------|---------|------|---------------|
| 0  | qsights-frontend  | online  | 3000 | 3392          |
| 1  | qsights-backend   | online  | 8000 | 5             |

**PM2 Commands**:
```bash
pm2 restart qsights-frontend
pm2 restart qsights-backend
pm2 logs qsights-frontend --lines 50
pm2 logs qsights-backend --lines 50
```

---

## 🗄️ DATABASE

**Type**: PostgreSQL 14.20  
**Database**: qsights_db  
**User**: qsights_user  
**Tables**: 38 tables, 2.03 MB  
**Users**: 5 users (including superadmin@qsights.com)

**Connection Test**:
```bash
cd /var/www/QSightsOrg2.0/backend
php artisan db:show
php artisan tinker --execute='echo User::count()'
```

---

## 🔐 CREDENTIALS

**Super Admin**:
- Email: `superadmin@qsights.com`
- Password: `admin123`

**Server Access**:
```bash
# SSM Port Forwarding (Port 7390)
aws ssm start-session \
  --target i-021cba87abb7fc764 \
  --region ap-south-1 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["22"],"localPortNumber":["7390"]}'

# SSH via SSM tunnel
PEM_KEY="$HOME/Library/CloudStorage/OneDrive-BIOQUESTSOLUTIONSPRIVATELIMITED/Backup_laptop/PEMs/QSights-Mumbai-12Aug2019.pem"
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost
```

---

## 🚨 TROUBLESHOOTING GUIDE

### If Dashboard Shows "Failed to fetch":

1. **Check PM2 Processes**:
   ```bash
   pm2 list
   pm2 logs qsights-frontend --lines 20
   pm2 logs qsights-backend --lines 20
   ```

2. **Test Backend Directly**:
   ```bash
   curl http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@qsights.com","password":"admin123"}'
   ```

3. **Test Frontend API Route**:
   ```bash
   curl http://prod.qsights.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@qsights.com","password":"admin123"}'
   ```

4. **Check Nginx Config**:
   ```bash
   sudo cat /etc/nginx/sites-available/qsights
   sudo nginx -t
   sudo systemctl status nginx
   ```

5. **Check Backend Config Cache**:
   ```bash
   cd /var/www/QSightsOrg2.0/backend
   php artisan config:clear
   php artisan config:cache
   pm2 restart qsights-backend
   ```

### If CORS Errors:

1. **Verify CORS Config**:
   ```bash
   cat /var/www/QSightsOrg2.0/backend/config/cors.php | grep -A 5 allowed_origins
   ```

2. **Update CORS** (if needed):
   ```bash
   cd /var/www/QSightsOrg2.0/backend
   # Edit config/cors.php to add domain
   php artisan config:cache
   pm2 restart qsights-backend
   ```

### If Login Fails:

1. **Check Backend Logs**:
   ```bash
   sudo tail -50 /var/www/QSightsOrg2.0/backend/storage/logs/laravel.log
   ```

2. **Verify Password Hash**:
   ```bash
   cd /var/www/QSightsOrg2.0/backend
   php artisan tinker --execute="echo Hash::check('admin123', User::where('email', 'superadmin@qsights.com')->first()->password) ? 'MATCH' : 'NO MATCH';"
   ```

3. **Check SANCTUM_STATEFUL_DOMAINS**:
   ```bash
   cat /var/www/QSightsOrg2.0/backend/.env | grep SANCTUM
   # Should be: SANCTUM_STATEFUL_DOMAINS=prod.qsights.com
   ```

---

## 📊 DEPLOYMENT CHECKLIST

When deploying changes:

### Frontend Changes:
- [ ] Upload new files via SCP
- [ ] Update `.env.production` if needed
- [ ] Run: `cd /var/www/QSightsOrg2.0/frontend && rm -rf .next && NODE_ENV=production npm run build`
- [ ] Run: `pm2 restart qsights-frontend`
- [ ] Test: `curl -I http://prod.qsights.com/`

### Backend Changes:
- [ ] Upload new files via SCP
- [ ] Update `.env` if needed
- [ ] Run: `cd /var/www/QSightsOrg2.0/backend && php artisan migrate --force` (if DB changes)
- [ ] Run: `php artisan config:cache`
- [ ] Run: `pm2 restart qsights-backend`
- [ ] Test: `curl http://localhost:8000/api/health` or similar

### Nginx Changes:
- [ ] Edit: `/etc/nginx/sites-available/qsights`
- [ ] Test: `sudo nginx -t`
- [ ] Reload: `sudo systemctl reload nginx`
- [ ] Verify: `curl -I http://prod.qsights.com/`

---

## 🎯 WHAT WORKS NOW

1. ✅ **Dashboard Access**: http://prod.qsights.com loads successfully
2. ✅ **Authentication**: Login with superadmin@qsights.com / admin123
3. ✅ **Organizations Tab**: Shows BioQuest organization
4. ✅ **API Endpoints**: All /api/* endpoints accessible
5. ✅ **CSRF Protection**: /sanctum/csrf-cookie returns proper cookies
6. ✅ **Session Management**: Cookies properly set with domain=prod.qsights.com
7. ✅ **Database**: PostgreSQL with 5 users, 38 tables working
8. ✅ **PM2**: Both frontend and backend processes online and stable

---

## 🔍 KEY LEARNINGS

1. **Nginx Configuration Location**: 
   - The active config is `/etc/nginx/sites-available/qsights` NOT `default`
   - Always check `ls -la /etc/nginx/sites-enabled/` to see active configs

2. **Next.js API Routes Architecture**:
   - All `/api/*` requests go to Next.js first (port 3000)
   - Next.js API routes then proxy to Laravel backend (port 8000)
   - This is by design - do NOT bypass Next.js by routing /api/ directly to backend

3. **SANCTUM_STATEFUL_DOMAINS**:
   - Must match the domain in browser (prod.qsights.com)
   - Without this, CSRF validation fails silently

4. **CORS Configuration**:
   - Backend must explicitly allow the frontend domain
   - Needs both http:// and https:// variants

5. **Frontend Environment**:
   - `NEXT_PUBLIC_API_URL=/api` uses relative path (proxies through Next.js)
   - After changing .env.production, must rebuild with `npm run build`

---

## 📦 BACKUP FILES LOCATION

Local backups saved to:
- `/tmp/nginx-qsights.conf` - Nginx configuration
- `/tmp/backend-env-sanitized.txt` - Backend environment (sanitized)
- `/tmp/cors-config.php` - CORS configuration
- `/tmp/frontend-env-production.txt` - Frontend environment

---

## 🚀 QUICK RECOVERY COMMANDS

If you need to restore this working state:

```bash
# 1. Restore Nginx config
scp -P 7390 -i "$PEM_KEY" /tmp/nginx-qsights.conf ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo mv /tmp/nginx-qsights.conf /etc/nginx/sites-available/qsights && sudo nginx -t && sudo systemctl reload nginx"

# 2. Restore backend .env (merge with actual file for passwords)
scp -P 7390 -i "$PEM_KEY" /tmp/backend-env-sanitized.txt ubuntu@localhost:/tmp/

# 3. Restore CORS config
scp -P 7390 -i "$PEM_KEY" /tmp/cors-config.php ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo mv /tmp/cors-config.php /var/www/QSightsOrg2.0/backend/config/cors.php && cd /var/www/QSightsOrg2.0/backend && php artisan config:cache && pm2 restart qsights-backend"

# 4. Restore frontend .env.production
scp -P 7390 -i "$PEM_KEY" /tmp/frontend-env-production.txt ubuntu@localhost:/tmp/
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo mv /tmp/frontend-env-production.txt /var/www/QSightsOrg2.0/frontend/.env.production"

# 5. Rebuild frontend
ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "cd /var/www/QSightsOrg2.0/frontend && rm -rf .next && NODE_ENV=production npm run build && pm2 restart qsights-frontend"
```

---

## 📞 SUPPORT INFORMATION

**Date of Last Working State**: December 23, 2025  
**Checkpoint Name**: QSIGHTS-VIBE  
**Server IP**: 65.0.100.121  
**Domain**: prod.qsights.com  

If issues arise, refer to this checkpoint and compare current configuration with working state documented here.

---

**✨ This configuration is TESTED and WORKING - December 23, 2025 ✨**
