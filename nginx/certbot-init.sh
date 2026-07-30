#!/usr/bin/env bash
# One-time bootstrap: gets the first real Let's Encrypt cert for DOMAIN.
# Requires nginx.conf's YOUR_DOMAIN placeholders to already be replaced,
# and DOMAIN's DNS A record to already point at this host.
set -euo pipefail

DOMAIN="${1:?Usage: certbot-init.sh <domain> <email>}"
EMAIL="${2:?Usage: certbot-init.sh <domain> <email>}"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# Weekly renewal check via host cron; certbot no-ops unless the cert is
# within 30 days of expiry. Match on the repo dir so reruns don't duplicate
# the line, and rerunning for a different clone/domain still adds its own.
CRON_CMD="cd $REPO_DIR && docker compose run --rm certbot renew --webroot -w /var/www/certbot --quiet && docker compose exec nginx nginx -s reload"
install_cron() {
  ( crontab -l 2>/dev/null | grep -vF "$REPO_DIR"; echo "0 3 * * 1 $CRON_CMD" ) | crontab -
  echo "Renewal cron job installed (weekly, Mondays 03:00)."
}

# renewal/$DOMAIN.conf only exists once certbot has actually issued a real
# cert (never written by the dummy step below), so it's a safe marker for
# "already done" — reissuing needlessly risks Let's Encrypt's rate limits.
if [ -f "nginx/certbot/conf/renewal/$DOMAIN.conf" ]; then
  echo "$DOMAIN already has a real cert (nginx/certbot/conf/renewal/$DOMAIN.conf exists), skipping issuance."
  docker compose up -d nginx
  docker compose exec nginx nginx -s reload
  install_cron
  exit 0
fi

mkdir -p "nginx/certbot/conf/live/$DOMAIN" nginx/certbot/www

if [ ! -f "nginx/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout "nginx/certbot/conf/live/$DOMAIN/privkey.pem" \
    -out "nginx/certbot/conf/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=$DOMAIN"
fi

docker compose up -d nginx

rm -rf "nginx/certbot/conf/live/$DOMAIN" \
       "nginx/certbot/conf/archive/$DOMAIN" \
       "nginx/certbot/conf/renewal/$DOMAIN.conf"

docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email

docker compose exec nginx nginx -s reload
install_cron

echo "Done. $DOMAIN is now serving a real Let's Encrypt cert."
