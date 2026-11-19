#!/usr/bin/env bash
# Run on the VPS: bash /var/www/chalo-sawari/deploy.sh
# Wrapped in { } so bash reads the whole file before git replaces it mid-run.
{
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Pulling latest code"
git config --global --add safe.directory "$ROOT" 2>/dev/null || true
git fetch origin main
# Server pe local changes (package-lock, nano edits) pull ko block karte hain.
# .env / uploads untracked hain, reset unhe nahi chhoota.
git reset --hard origin/main

echo "==> Backend"
cd "$ROOT/backend"
npm install --omit=dev
pm2 restart chalo-backend --update-env || pm2 start server.js --name chalo-backend
pm2 save

echo "==> Frontend"
cd "$ROOT/frontend"
npm install --include=dev   # vite devDependency hai, NODE_ENV=production me bhi chahiye
NODE_OPTIONS=--max-old-space-size=2048 npm run build
DIST="$ROOT/frontend/dist"
BUILT=$(grep -o 'assets/index-[^"]*\.js' "$DIST/index.html")

# Agar nginx kisi aur folder se serve karta hai (e.g. /var/www/html), build wahan copy karo.
# ponytail: root ko server_name chalosawari ke baad wali line se padhta hai; config ajeeb ho to manually check karo
for r in $(nginx -T 2>/dev/null | awk '/server_name/ && /chalosawari/ {f=1} f && $1=="root" {gsub(/;/,"",$2); print $2; f=0}' | sort -u); do
  if [ "$(realpath -m "$r")" != "$DIST" ]; then
    echo "==> nginx root $r hai, build wahan copy kar raha hoon"
    mkdir -p "$r" && cp -a "$DIST/." "$r/"
  fi
done

echo "==> Reloading nginx"
nginx -t && systemctl reload nginx

LIVE=$(curl -s "https://chalosawari.com/?nocache=$(date +%s)" | grep -o 'assets/index-[^"]*\.js' || true)
echo "==> Built: $BUILT"
echo "==> Live:  $LIVE"
[ "$BUILT" = "$LIVE" ] && echo "==> Frontend updated ✔" || echo "!! Live site purana build de raha hai — 'nginx -T | grep -n \"root\|server_name\"' ka output bhejo"

echo "==> Done: https://chalosawari.com ($(git rev-parse --short HEAD))"
exit
}
