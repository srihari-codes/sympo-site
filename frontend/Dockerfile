# syntax=docker/dockerfile:1

###############################################################################
# build — compile the Vite bundle
###############################################################################
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* at build time, so they must be present now.
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_BASE=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_API_BASE=$VITE_API_BASE \
    NODE_OPTIONS=--max-old-space-size=1024

RUN npm run build

###############################################################################
# runtime — nginx serves the static bundle and reverse-proxies the API
###############################################################################
FROM nginx:1.27-alpine AS runtime

# Bake a self-signed cert so :443 always starts. Replace in prod via the
# certbot volume (see 20-select-cert.sh + docker-compose.yml).
RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/certs \
 && openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
      -keyout /etc/nginx/certs/privkey.pem \
      -out /etc/nginx/certs/fullchain.pem \
      -subj "/CN=localhost" \
 && apk del openssl

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/20-select-cert.sh /docker-entrypoint.d/20-select-cert.sh
RUN chmod +x /docker-entrypoint.d/20-select-cert.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443
