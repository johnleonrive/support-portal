# Support Portal — Docker Setup Handoff

## Project Overview

School project (with work permission) — a Helpdesk Support Portal for clinic customers. Clinics submit support tickets, SMYLS agents respond. Must run locally in Docker, **completely isolated from the SMYLS ops stack**.

**Owner:** John-Leon Rivera (`johnleonrive` on GitHub, personal account)

---

## Architecture

```
Host machine
├── ~/Development/SMYLS/Support Portal/     ← Next.js frontend (existing code)
├── support-portal-docker-setup/            ← NEW: Docker orchestration repo
│   ├── docker-compose.yml
│   ├── .env
│   └── .env.example
└── (support_desk app lives inside container volume)

Docker containers:
├── sp-backend          ← Gunicorn (Frappe + Helpdesk + Telephony + support_desk)
├── sp-frontend         ← Nginx reverse proxy for Frappe desk
├── sp-portal           ← Next.js Support Portal (standalone container)
├── sp-websocket        ← Node.js Socket.IO
├── sp-mariadb          ← Own MariaDB instance (NOT shared with SMYLS)
├── sp-redis-cache
├── sp-redis-queue
├── sp-scheduler        ← bench schedule
├── sp-queue-short      ← bench worker (short,default)
├── sp-queue-long       ← bench worker (long)
└── sp-configurator     ← one-shot config setup
```

### Port Mapping (avoid SMYLS conflicts)

| Port | Service | Note |
|------|---------|------|
| 4000 | Frappe Desk (via Nginx) | SMYLS uses 3000 |
| 4080 | Next.js Portal | SMYLS uses 8080 |
| 4306 | MariaDB | SMYLS uses 3307 |
| 9025 | Mailpit web UI (optional) | SMYLS uses 8025 |

---

## Repos

| Repo | Account | Purpose | Status |
|------|---------|---------|--------|
| `johnleonrive/support-portal` | Personal | Next.js frontend (existing code) | Create from local |
| `johnleonrive/support-desk` | Personal | Custom Frappe backend app (screen recording, custom endpoints) | Create new |
| Docker setup repo | Personal | docker-compose + orchestration | Create new |

### Git Auth

Use personal account, NOT `johnleon-smyls`:
```bash
gh auth login  # authenticate as johnleonrive
```

---

## Existing Frontend Code

**Location:** `~/Development/SMYLS/Support Portal/`

**Tech Stack:**
- Next.js 15.5 + React 19 + TypeScript 5
- Tailwind CSS v4 + Radix UI primitives
- TanStack React Query for data fetching
- Axios for HTTP (via Next.js API proxy)
- Zustand for state management
- TipTap for rich text editing (ticket replies)
- Lucide icons

**Project Structure:**
```
src/
├── app/
│   ├── api/frappe/[...path]/route.ts  ← API proxy to Frappe backend
│   ├── dashboard/                      ← Agent dashboard
│   ├── tickets/                        ← Ticket list + detail
│   ├── knowledge-base/                 ← KB articles
│   ├── login/                          ← Auth pages
│   ├── forgot-password/
│   ├── signup/
│   ├── accept-invite/                  ← User invitation flow
│   └── private/                        ← Protected routes
├── components/
│   ├── ui/          ← Radix-based primitives (shadcn style)
│   ├── layout/      ← App layout, sidebar
│   ├── auth/        ← Auth components
│   └── icons/       ← Custom icons
├── lib/
│   ├── api.ts       ← FrappeAPIClient class (axios wrapper)
│   ├── auth.ts      ← Auth helpers
│   ├── demo-api.ts  ← Demo mode API (for Vercel preview)
│   └── utils.ts     ← cn() and helpers
├── store/
│   └── auth.ts      ← Zustand auth store
└── types/
    ├── auth.ts      ← Auth types
    └── frappe.ts    ← Frappe response types
```

### API Proxy (IMPORTANT)

The frontend currently uses a **Next.js API proxy** (`src/app/api/frappe/[...path]/route.ts`) that:
1. Receives requests from the browser at `/api/frappe/*`
2. Forwards them to the Frappe backend with admin API key auth
3. Uses `X-Frappe-User` header for user impersonation (so Frappe applies per-user permissions)
4. Forwards cookies and Set-Cookie headers

**For local Docker:** The proxy's `NEXT_PUBLIC_FRAPPE_BASE_URL` env var needs to point to the local Frappe backend (e.g., `http://sp-backend:8000` or `http://localhost:4000`). The admin API key approach may change to direct cookie-based auth for local dev.

### Environment Variables (Frontend)

```env
NEXT_PUBLIC_FRAPPE_BASE_URL=http://localhost:4000
NEXT_PUBLIC_API_DEBUG=true
FRAPPE_ADMIN_API_KEY=<generate in Frappe>
FRAPPE_ADMIN_API_SECRET=<generate in Frappe>
```

---

## Custom Backend App: `support_desk`

**Repo:** `johnleonrive/support-desk`

A Frappe app that extends Helpdesk. Scaffold with:
```bash
bench new-app support_desk
```

**Will contain:**
- Custom screen recording feature (future)
- Any API endpoint overrides for Helpdesk
- Custom DocTypes specific to the support portal
- Server scripts (user invite system is currently in Frappe Server Scripts — should be migrated here)

**Install order in bench:**
```
frappe → helpdesk → telephony → support_desk
```

Helpdesk repo: `https://github.com/frappe/helpdesk` (v1, Frappe v15 compatible)

---

## Docker Setup Details

### Image

Use the official Frappe Docker images for v15:
- Backend: `frappe/bench:latest` or build a custom image with helpdesk pre-installed
- Frontend (Nginx): from the Frappe Docker repo

### Volume Strategy

All volumes prefixed with `sp-` to avoid collision with SMYLS (`smyls-ops-*`):
```yaml
volumes:
  sp-apps-data:
  sp-env-data:
  sp-sites-data:
  sp-logs-data:
  sp-mariadb-data:
  sp-redis-cache-data:
  sp-redis-queue-data:
```

### Site Name

Use `support-portal.local` (not `smyls-ops.local`).

### Apps Installation Order

```bash
bench new-site support-portal.local --admin-password=<password> --install-app helpdesk
bench --site support-portal.local install-app telephony
bench get-app --branch main https://github.com/johnleonrive/support-desk.git
bench --site support-portal.local install-app support_desk
```

### Next.js Container

The Support Portal runs as its own container:
```yaml
sp-portal:
  build:
    context: ../Support Portal
    dockerfile: Dockerfile  # Need to create this
  ports:
    - "4080:3000"
  environment:
    NEXT_PUBLIC_FRAPPE_BASE_URL: http://sp-frontend:8080
    FRAPPE_ADMIN_API_KEY: ${FRAPPE_ADMIN_API_KEY}
    FRAPPE_ADMIN_API_SECRET: ${FRAPPE_ADMIN_API_SECRET}
  depends_on:
    - sp-backend
```

A `Dockerfile` needs to be created in the Support Portal repo:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Existing Documentation

### `docs/USER_INVITE_SYSTEM.md`

Documents the user invitation flow:
- Main App creates user → Server Script fires → creates disabled user on Helpdesk instance
- User receives email with invite link → sets password → account activated
- Uses Contact + Dynamic Link to HD Customer for clinic-level ticket scoping

### `~/Development/SMYLS/Helpdesk/CLAUDE.md`

Comprehensive architecture doc covering:
- How Helpdesk's permission model works (HD Customer → Contact → Dynamic Links)
- Company-scoped ticket visibility (built-in, no code changes)
- Branding configuration (HD Settings, built-in)
- Hiding priority from portal users (requires `override_whitelisted_methods`)
- All relevant source file paths in `frappe/helpdesk`
- Data setup procedure for HD Customers and Contacts

**READ THIS FIRST** — it has all the architectural context.

---

## Key Lessons from SMYLS Docker Setup

These gotchas will save hours:

1. **Heredocs mangle TypeScript** — when writing .tsx files to a container, use `python3 -c "from pathlib import Path; Path('...').write_text('...')"` or `tee`. Shell heredocs eat backticks and mess up template literals.

2. **Restart backend after .py changes** — `docker compose restart sp-backend`. Gunicorn doesn't auto-reload in production mode.

3. **Delete `__pycache__`** — when writing new .py files to the container, delete `__pycache__/*.pyc` in the same directory, then restart backend.

4. **`bench build` for production assets** — Frappe's Nginx serves from `sites/assets/`. Running `bench build --app helpdesk` registers assets there. Without it, the desk UI will be blank on the Nginx port.

5. **Site resolution** — Frappe resolves sites by hostname. If accessing via `localhost` instead of `support-portal.local`, create a symlink:
   ```bash
   ln -s sites/support-portal.local sites/localhost
   ```

6. **No force push** — if branch protection is on, use merge commits instead of rebase.

7. **No Co-Authored-By** — John-Leon wants to be sole author on all commits. Never add `Co-Authored-By: Claude ...` to commit messages.

---

## First Steps for New Claude Instance

1. Read this file + `~/Development/SMYLS/Helpdesk/CLAUDE.md`
2. Create repos on `johnleonrive` GitHub account: `support-portal`, `support-desk`, and a docker setup repo
3. Push existing Support Portal code to `johnleonrive/support-portal`
4. Create `docker-compose.yml` with all containers (use SMYLS's compose as reference at `~/Development/SMYLS/smyls-ops-docker-setup/docker-compose.yml`)
5. Build/pull Frappe v15 image with Helpdesk
6. Scaffold `support_desk` custom app
7. Get containers running, verify desk at `:4000` and portal at `:4080`
8. Update portal's `NEXT_PUBLIC_FRAPPE_BASE_URL` to point to local Frappe
9. Set up test data (HD Customer, Contacts, users)
