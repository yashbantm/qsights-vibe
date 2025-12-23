#!/bin/bash
# QSights VIBE - Working Configuration Backup
# Date: December 23, 2025
# Status: FULLY WORKING

echo "=== QSights VIBE Configuration Backup ==="
echo "This backup represents a fully working production state"
echo ""

# ===========================================
# NGINX CONFIGURATION
# ===========================================
cat > /tmp/nginx-qsights-vibe.conf << 'NGINX_EOF'
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
NGINX_EOF

# ===========================================
# BACKEND ENV TEMPLATE (without secrets)
# ===========================================
cat > /tmp/backend-env-vibe-template.txt << 'BACKEND_EOF'
APP_NAME=QSights
APP_ENV=production
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=http://prod.qsights.com
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file

# Frontend URL
FRONTEND_URL=http://prod.qsights.com

# Database Configuration
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=qsights_db
DB_USERNAME=qsights_user
# DB_PASSWORD=[REDACTED - Keep original]

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

BACKEND_EOF

# ===========================================
# FRONTEND ENV.PRODUCTION
# ===========================================
cat > /tmp/frontend-env-production-vibe.txt << 'FRONTEND_EOF'
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_APP_URL=http://prod.qsights.com
SENDGRID_API_KEY=[REDACTED - Keep your actual key]
SENDGRID_FROM_EMAIL=do-not-reply@qsights.com
FRONTEND_EOF

# ===========================================
# CORS CONFIGURATION
# ===========================================
cat > /tmp/cors-config-vibe.php << 'CORS_EOF'
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
CORS_EOF

echo "✓ Configuration files created in /tmp/"
echo ""
echo "Files created:"
echo "  - /tmp/nginx-qsights-vibe.conf"
echo "  - /tmp/backend-env-vibe-template.txt"
echo "  - /tmp/frontend-env-production-vibe.txt"
echo "  - /tmp/cors-config-vibe.php"
echo ""
echo "=== RESTORATION COMMANDS ==="
echo ""
echo "# SSM Port Forward (run first):"
echo 'aws ssm start-session --target i-021cba87abb7fc764 --region ap-south-1 --document-name AWS-StartPortForwardingSession --parameters '"'"'{"portNumber":["22"],"localPortNumber":["7390"]}'"'"' &'
echo "sleep 5"
echo ""
echo '# Set PEM key path:'
echo 'PEM_KEY="$HOME/Library/CloudStorage/OneDrive-BIOQUESTSOLUTIONSPRIVATELIMITED/Backup_laptop/PEMs/QSights-Mumbai-12Aug2019.pem"'
echo ""
echo "# Restore Nginx:"
echo 'scp -P 7390 -i "$PEM_KEY" /tmp/nginx-qsights-vibe.conf ubuntu@localhost:/tmp/'
echo 'ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo cp /tmp/nginx-qsights-vibe.conf /etc/nginx/sites-available/qsights && sudo nginx -t && sudo systemctl reload nginx"'
echo ""
echo "# Restore CORS (backend):"
echo 'scp -P 7390 -i "$PEM_KEY" /tmp/cors-config-vibe.php ubuntu@localhost:/tmp/'
echo 'ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo cp /tmp/cors-config-vibe.php /var/www/QSightsOrg2.0/backend/config/cors.php && cd /var/www/QSightsOrg2.0/backend && php artisan config:cache && pm2 restart qsights-backend"'
echo ""
echo "# Restore frontend env:"
echo 'scp -P 7390 -i "$PEM_KEY" /tmp/frontend-env-production-vibe.txt ubuntu@localhost:/tmp/'
echo 'ssh -p 7390 -i "$PEM_KEY" ubuntu@localhost "sudo cp /tmp/frontend-env-production-vibe.txt /var/www/QSightsOrg2.0/frontend/.env.production && cd /var/www/QSightsOrg2.0/frontend && rm -rf .next && NODE_ENV=production npm run build && pm2 restart qsights-frontend"'
echo ""
echo "=== VERIFICATION COMMANDS ==="
echo ""
echo "# Test CSRF endpoint:"
echo "curl -I http://prod.qsights.com/sanctum/csrf-cookie"
echo ""
echo "# Test login:"
echo 'curl -X POST http://prod.qsights.com/api/auth/login -H "Content-Type: application/json" -d '"'"'{"email":"superadmin@qsights.com","password":"admin123"}'"'"''
echo ""
echo "# Test organizations API:"
echo 'TOKEN=$(curl -s -X POST http://prod.qsights.com/api/auth/login -H "Content-Type: application/json" -d '"'"'{"email":"superadmin@qsights.com","password":"admin123"}'"'"' | grep -o '"'"'"token":"[^"]*"'"'"' | cut -d'"'"'"'"'"' -f4)'
echo 'curl -s http://prod.qsights.com/api/organizations -H "Authorization: Bearer $TOKEN"'
echo ""
echo "✓ QSights VIBE backup complete!"
