#!/bin/bash
# Nginx reverse proxy + SSL setup for bubblesai.info

cat > /etc/nginx/sites-available/bubblesai << 'NGINXEOF'
server {
    listen 80;
    server_name bubblesai.info www.bubblesai.info;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        client_max_body_size 50M;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/bubblesai /etc/nginx/sites-enabled/bubblesai
rm -f /etc/nginx/sites-enabled/default

echo "Testing nginx config..."
nginx -t && systemctl restart nginx && echo "NGINX_CONFIGURED"
