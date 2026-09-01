#!/bin/sh
# Runs before nginx starts (nginx:alpine sources /docker-entrypoint.d/*.sh).
#
# Picks the TLS cert in this order:
#   1. /etc/nginx/origin-certs/  — a real cert bind-mounted from ./certs
#      (e.g. a Cloudflare Origin CA cert; used when Cloudflare fronts the domain).
#   2. /etc/letsencrypt/live/$DOMAIN/  — a Let's Encrypt cert from the certbot volume.
#   3. The self-signed cert baked into the image, so :443 always starts.

set -e

DOMAIN="${DOMAIN:-localhost}"
ORIGIN_DIR="/etc/nginx/origin-certs"
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ -s "${ORIGIN_DIR}/fullchain.pem" ] && [ -s "${ORIGIN_DIR}/privkey.pem" ]; then
    ln -sf "${ORIGIN_DIR}/fullchain.pem" /etc/nginx/certs/fullchain.pem
    ln -sf "${ORIGIN_DIR}/privkey.pem"   /etc/nginx/certs/privkey.pem
    echo "[cert] using mounted origin certificate (${ORIGIN_DIR})"
elif [ -s "${LE_DIR}/fullchain.pem" ] && [ -s "${LE_DIR}/privkey.pem" ]; then
    ln -sf "${LE_DIR}/fullchain.pem" /etc/nginx/certs/fullchain.pem
    ln -sf "${LE_DIR}/privkey.pem"   /etc/nginx/certs/privkey.pem
    echo "[cert] using Let's Encrypt certificate for ${DOMAIN}"
else
    echo "[cert] no real cert found — using bundled self-signed certificate"
fi
