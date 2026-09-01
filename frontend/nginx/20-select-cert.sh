#!/bin/sh
# Runs before nginx starts (nginx:alpine sources /docker-entrypoint.d/*.sh).
#
# If Let's Encrypt has issued a real cert for $DOMAIN (mounted from the certbot
# volume at /etc/letsencrypt), point nginx at it. Otherwise nginx keeps the
# self-signed cert baked into the image so :443 still comes up.

set -e

DOMAIN="${DOMAIN:-localhost}"
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [ -f "${LE_DIR}/fullchain.pem" ] && [ -f "${LE_DIR}/privkey.pem" ]; then
    ln -sf "${LE_DIR}/fullchain.pem" /etc/nginx/certs/fullchain.pem
    ln -sf "${LE_DIR}/privkey.pem"   /etc/nginx/certs/privkey.pem
    echo "[cert] using Let's Encrypt certificate for ${DOMAIN}"
else
    echo "[cert] no LE cert for ${DOMAIN} — using bundled self-signed certificate"
fi
