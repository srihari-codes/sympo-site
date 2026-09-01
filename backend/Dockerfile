# syntax=docker/dockerfile:1

###############################################################################
# deps — install production node_modules (better-sqlite3 needs a toolchain)
###############################################################################
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

###############################################################################
# runtime — slim image, no build tools
###############################################################################
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5050 \
    DATA_DIR=/app/data \
    UPLOAD_DIR=/app/uploads \
    NODE_OPTIONS=--max-old-space-size=384

# curl is only used by the container HEALTHCHECK
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Volume mount points — created here so a named volume inherits node ownership
RUN mkdir -p /app/data /app/uploads && chown -R node:node /app

USER node
EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:5050/api/health || exit 1

CMD ["node", "server.js"]
