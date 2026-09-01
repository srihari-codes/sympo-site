# Zyverse 2K26

Immersive 3D symposium site + registration backend.

```
.
├── frontend/           # Vite + React + three.js SPA; Docker image = nginx (edge)
├── backend/            # Express + SQLite API (Google auth, onboarding, events, teams)
├── docker-compose.yml  # production stack
└── .env.example        # copy to .env
```

In production only the **frontend** container is exposed (ports 80/443). It serves
the built SPA and reverse-proxies `/api` and `/uploads` to the **backend**
container over the internal Docker network.

---

## Local development (no Docker)

```bash
npm run install:all      # installs backend/ and frontend/ deps
cp backend/.env.example  backend/.env      # fill in secrets
cp frontend/.env.example frontend/.env     # fill in VITE_GOOGLE_CLIENT_ID
npm run dev              # backend :5050  +  frontend :5173 (proxies /api → :5050)
```

Open http://localhost:5173.

---

## Production deploy (cloud server, e.g. t3.micro)

### 1. Server prerequisites

- Docker Engine + the Compose plugin
  (`curl -fsSL https://get.docker.com | sh`)
- Ports 80 and 443 open in the security group / firewall
- **Swap** — a 1 GB box does not have enough RAM to build the three.js bundle.
  Add 2 GB once:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
  (Or build the images on your laptop / CI and `docker compose pull` on the server.)

### 2. Clone & configure

```bash
git clone https://github.com/srihari-codes/sympo-site.git
cd sympo-site
cp .env.example .env
nano .env
```

Set in `.env`:

| var | value |
|-----|-------|
| `DOMAIN` | your domain, e.g. `zyverse.example.com` (or the server IP for a quick test) |
| `JWT_SECRET` | a long random string (`openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud → APIs & Services → Credentials |
| `VITE_GOOGLE_CLIENT_ID` | same client ID (baked into the frontend at build time) |
| `CERTBOT_EMAIL` | your email, for Let's Encrypt |

In the Google Cloud OAuth client, add `https://DOMAIN` to **Authorized JavaScript origins**.

### 3. Start

```bash
docker compose up -d --build
```

- `http://DOMAIN` → redirects to `https://`
- `https://DOMAIN` → the site

Check: `docker compose ps`, `docker compose logs -f`.

### 4. TLS certificate

nginx picks a cert in this order (see `frontend/nginx/20-select-cert.sh`):

1. **`certs/fullchain.pem` + `certs/privkey.pem`** (bind-mounted at
   `/etc/nginx/origin-certs`). This repo ships a **Cloudflare Origin CA**
   certificate for `zyverse.whitehatians.in` here, so a proxied Cloudflare setup
   works out of the box. In the Cloudflare dashboard set
   **SSL/TLS → Overview → Full (strict)**.
   To rotate: replace the two files, `docker compose restart frontend`.
2. A Let's Encrypt cert for `$DOMAIN` (DNS-only / no Cloudflare proxy):
   ```bash
   docker compose --profile ssl run --rm certbot      # issue
   docker compose restart frontend                     # picked up automatically
   # renewal (cron, monthly):
   0 3 1 * * cd /path/to/sympo-site && docker compose --profile ssl run --rm certbot renew && docker compose restart frontend
   ```
3. Otherwise a bundled self-signed cert (browser / Cloudflare "526" warning).

> The Origin CA key is committed because this is a private repo. If the repo
> ever becomes public or is widely shared, revoke it in Cloudflare
> (SSL/TLS → Origin Server) and issue a new one.

### 5. Updates

```bash
git pull
docker compose up -d --build
```

---

## Data & backups

SQLite DB and uploaded images live in Docker **named volumes**
(`sympo-site_backend_data`, `sympo-site_backend_uploads`) — they survive
`docker compose down` and rebuilds.

```bash
# backup
docker run --rm -v sympo-site_backend_data:/d -v "$PWD":/b alpine \
  tar czf /b/backup-db-$(date +%F).tgz -C /d .
docker run --rm -v sympo-site_backend_uploads:/u -v "$PWD":/b alpine \
  tar czf /b/backup-uploads-$(date +%F).tgz -C /u .
```

To migrate the current local dev data onto the server, copy `backend/data/` and
`backend/uploads/` up and extract them into those volumes the same way.

---

## Ports

| where | port | who |
|-------|------|-----|
| host  | 80, 443 | `frontend` (nginx) — the only published ports |
| internal | 5050 | `backend` — `http://backend:5050`, not reachable from outside |
