#!/usr/bin/env bash
# Run on the VPS: bash /var/www/chalo-sawari/deploy.sh
set -e
cd "$(dirname "$0")"

echo "==> Pulling latest code"
git pull origin main

echo "==> Backend"
cd backend
npm install --omit=dev
pm2 restart chalo-backend || pm2 start server.js --name chalo-backend
pm2 save

echo "==> Frontend"
cd ../frontend
npm install
NODE_OPTIONS=--max-old-space-size=2048 npm run build

echo "==> Reloading nginx"
nginx -t && systemctl reload nginx

echo "==> Done: https://chalosawari.com"
