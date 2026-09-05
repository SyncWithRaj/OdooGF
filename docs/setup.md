# 🚀 Developer Onboarding & Setup Guide

> **Production-ready full-stack monorepo boilerplate for rapid hackathon development.**  
> Powered by **pnpm workspaces**, **NestJS 10 (TypeScript)**, **Next.js 14 App Router (JavaScript)**, **Prisma ORM**, **PostgreSQL 16**, and **Docker Compose**.

---

## ⚡ Quick Start (Under 2 Minutes)

Clone the repository and run the automated setup command matching your operating system:

### 🐧 Linux / macOS
```bash
make setup
# Alternatively: ./scripts/setup/setup.sh
```

### 🪟 Windows
```cmd
make setup-windows
# Alternatively: scripts\setup\setup.bat
```

> **What this does:** Automatically validates your Node.js and Docker environments, sets up `.env` files, boots PostgreSQL & Redis, installs all dependencies via `pnpm`, syncs the Prisma database schema, and runs verification builds.

---

## 🏗️ Monorepo Architecture

```mermaid
graph TD
    Client["Frontend Client<br/>Next.js 14 (JavaScript + Tailwind)<br/>Port: 3000"]
    API["Backend API<br/>NestJS 10 (TypeScript + Swagger)<br/>Port: 4000"]
    DB[("PostgreSQL 16 Alpine<br/>Prisma ORM<br/>Port: 5432")]
    Cache[("Redis 7 Alpine<br/>BullMQ & Cache<br/>Port: 6379")]
    Studio["Prisma Studio<br/>Database GUI<br/>Port: 5555"]

    Client -->|HTTP / REST| API
    API -->|Prisma Client| DB
    API -.->|Queue / Cache| Cache
    Studio -->|Direct Query| DB
```

### Stack Breakdown

| Layer | Technology | Language | Location | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) | **JavaScript** (`.jsx`) | [`apps/frontend/`](../apps/frontend/) | UI dashboard, Tailwind styling, reactive state |
| **Backend** | NestJS 10 (Modular) | **TypeScript** (`.ts`) | [`apps/backend/`](../apps/backend/) | REST API, OpenAPI/Swagger docs, business logic |
| **Database** | PostgreSQL 16 | SQL / Prisma | [`infra/`](../infra/) | Persistent relational storage via Prisma ORM |
| **Cache / Queue** | Redis 7 Alpine | Key-Value | [`infra/`](../infra/) | Background job brokering & caching |
| **Scripts** | Bash & Batch | Shell | [`scripts/`](../scripts/) | Domain-organized automation and lifecycle utilities |

---

## 🔍 Automated Setup Pipeline Details

When you execute `make setup` (or `setup.bat`), the engine runs through six automated validation stages:

```
[1/6] Prerequisites Check   ──▶ Verifies Node.js >= 18, pnpm, and Docker daemon
[2/6] Environment Setup     ──▶ Generates apps/backend/.env and apps/frontend/.env
[3/6] Infrastructure Boot   ──▶ Launches PostgreSQL 16 & Redis 7 via Docker Compose
[4/6] Dependency Install    ──▶ Single-shot pnpm install across the whole monorepo
[5/6] Database Sync         ──▶ Runs prisma generate & prisma db push to PostgreSQL
[6/6] Build Verification    ──▶ Compiles NestJS (TS) and Next.js (JS) with 0 errors
```

---

## 🎮 Command Reference Cheat Sheet

All daily workflows are orchestrated through the root [`Makefile`](../Makefile) or directly via `pnpm`:

### Everyday Development

| Task | Makefile Shortcut | Direct pnpm Command |
| :--- | :--- | :--- |
| **Run Full-Stack (Dev)** | `make dev` *(or just `make`)* | `pnpm dev` |
| **Run Backend Only** | `make backend` | `pnpm dev:backend` |
| **Run Frontend Only** | `make frontend` | `pnpm dev:frontend` |

### Infrastructure & Database

| Task | Makefile Shortcut | Direct pnpm Command |
| :--- | :--- | :--- |
| **Start Containers** | `make up` | `pnpm up` |
| **Stop Containers** | `make down` | `pnpm down` |
| **Sync DB Schema** | `make db-push` | `pnpm --filter backend db-push` |
| **Open Prisma Studio** | `make studio` | `pnpm studio` |

### Code Quality & Builds

| Task | Makefile Shortcut | Direct pnpm Command |
| :--- | :--- | :--- |
| **Build Backend** | `make build-backend` | `pnpm build:backend` |
| **Build Frontend** | `make build-frontend` | `pnpm build:frontend` |
| **Format Backend** | `make format-backend` | `pnpm format:backend` |
| **Lint Backend** | `make lint-backend` | `pnpm lint:backend` |

---

## 🌐 Endpoints & Service Directory

Once servers are running (`make dev`), access these endpoints locally:

| Service | Port | Endpoint URL | Description |
| :--- | :---: | :--- | :--- |
| **Frontend Application** | `3000` | [http://localhost:3000](http://localhost:3000) | Live status dashboard (JavaScript) |
| **Backend REST API** | `4000` | [http://localhost:4000](http://localhost:4000) | Core NestJS API server |
| **Health Probe** | `4000` | [http://localhost:4000/api/health](http://localhost:4000/api/health) | Live DB & backend connectivity check |
| **Swagger API Docs** | `4000` | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) | Interactive OpenAPI documentation & tester |
| **OpenAPI Spec** | `4000` | [http://localhost:4000/api/docs-json](http://localhost:4000/api/docs-json) | Raw OpenAPI 3.0 schema |
| **PostgreSQL Database** | `5432` | `localhost:5432` | DB: `odoo_hackathon` &bull; User: `postgres` |
| **Redis Broker** | `6379` | `localhost:6379` | In-memory key-value store |
| **Prisma Studio** | `5555` | [http://localhost:5555](http://localhost:5555) | Visual database GUI (`make studio`) |

---

## 🔐 Environment Configuration

Environment variables are isolated within their respective package boundaries. **Never commit `.env` files to git.**

### Backend Configuration: `apps/backend/.env`
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/odoo_hackathon?schema=public"

# Redis connection string
REDIS_URL="redis://localhost:6379"

# API Port
PORT=4000
```

### Frontend Configuration: `apps/frontend/.env`
```env
# Base URL pointing to the NestJS API
NEXT_PUBLIC_API_URL="http://localhost:4000"

# Web Port
PORT=3000
```

---

## 👥 Hackathon Team Development Workflow

### Adding New Backend Endpoints (NestJS)
1. Use the Nest CLI from inside `apps/backend`:
   ```bash
   cd apps/backend && npx @nestjs/cli g resource users --no-spec
   ```
2. Inject `PrismaService` into your new service directly (no need to import `PrismaModule` thanks to `@Global()`):
   ```typescript
   @Injectable()
   export class UsersService {
     constructor(private readonly prisma: PrismaService) {}
   }
   ```
3. Add Swagger tags and summaries to your controller:
   ```typescript
   @ApiTags('Users')
   @Controller('api/users')
   export class UsersController { ... }
   ```

### Updating Database Models (Prisma)
1. Edit [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma) to add or modify models.
2. Push changes to PostgreSQL instantly without manual migration files:
   ```bash
   make db-push
   ```
3. Inspect and edit new records visually in Prisma Studio:
   ```bash
   make studio
   ```

### Adding New Frontend Pages / Components (Next.js)
1. Create pages inside `apps/frontend/src/app/` using `.jsx` files (e.g., `dashboard/page.jsx`).
2. Use standard `@/*` imports (pre-configured in `jsconfig.json`):
   ```javascript
   import { Button } from '@/components/Button';
   ```
3. Fetch data from the backend using the environment variable:
   ```javascript
   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`);
   ```

---

## 🛠️ Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Docker container fails to start** | Docker daemon is not running | Open Docker Desktop (macOS/Windows) or run `sudo systemctl start docker` (Linux). |
| **Port `4000` or `3000` already in use** | A dangling node process is occupying the port | Kill occupying process: `lsof -ti:4000,3000 \| xargs -r kill -9` (or `taskkill /PID <PID> /F` on Windows). |
| **Prisma cannot connect to database** | Postgres container is still initializing | Wait 3-5 seconds and re-run `make db-push`. Verify container status with `docker ps`. |
| **`pnpm: command not found`** | pnpm is not installed globally | Install it with `npm install -g pnpm` or enable corepack: `corepack enable`. |
| **Missing packages after git pull** | Teammate added a new dependency | Run `pnpm install` in the root. It updates all workspace packages simultaneously. |

---

*Built with precision for the Odoo Hackathon. Happy hacking! 🚀*
