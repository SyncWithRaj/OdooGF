#!/usr/bin/env bash

# ==============================================================================
# Odoo Hackathon Monorepo - Automated Setup Script
# ==============================================================================

set -e

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Determine script root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)" pwd)"
cd "${ROOT_DIR}"

echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "    🚀  ODOO HACKATHON MONOREPO - AUTOMATED ONBOARDING SETUP      "
echo "=================================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. System Prerequisites Checks
# ------------------------------------------------------------------------------
echo -e "${BLUE}${BOLD}[1/6] Checking system prerequisites...${NC}"

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Node.js is not installed!${NC}"
  echo -e "   Please install Node.js (v18 or higher): https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo -e "${YELLOW}⚠️  Node.js version is ${NODE_VERSION}. Version 18+ or 20+ is strongly recommended.${NC}"
else
  echo -e "${GREEN}✓ Node.js detected: ${NODE_VERSION}${NC}"
fi

# Check pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  pnpm is not installed!${NC}"
  if command -v npm >/dev/null 2>&1; then
    echo -e "${CYAN}   Installing pnpm globally via npm...${NC}"
    npm install -g pnpm || sudo npm install -g pnpm
    echo -e "${GREEN}✓ pnpm installed successfully!${NC}"
  else
    echo -e "${RED}❌ npm not found to install pnpm. Please install pnpm: https://pnpm.io/installation${NC}"
    exit 1
  fi
else
  PNPM_VERSION=$(pnpm -v)
  echo -e "${GREEN}✓ pnpm detected: v${PNPM_VERSION}${NC}"
fi

# Check Docker & Docker Compose
DOCKER_AVAILABLE=false
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    DOCKER_AVAILABLE=true
    echo -e "${GREEN}✓ Docker is installed and daemon is active.${NC}"
  else
    echo -e "${YELLOW}⚠️  Docker is installed but the Docker daemon is not running.${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Docker is not installed. You can use a local PostgreSQL instance instead.${NC}"
fi

# ------------------------------------------------------------------------------
# 2. Environment Files Setup (.env)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}${BOLD}[2/6] Configuring environment files...${NC}"

# Backend .env
if [ ! -f "apps/backend/.env" ]; then
  if [ -f "apps/backend/.env.example" ]; then
    cp "apps/backend/.env.example" "apps/backend/.env"
    echo -e "${GREEN}✓ Created apps/backend/.env from .env.example${NC}"
  else
    cat << 'ENVEOF' > apps/backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/odoo_hackathon?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=4000
ENVEOF
    echo -e "${GREEN}✓ Generated apps/backend/.env${NC}"
  fi
else
  echo -e "${CYAN}ℹ apps/backend/.env already exists.${NC}"
fi

# Frontend .env
if [ ! -f "apps/frontend/.env" ]; then
  if [ -f "apps/frontend/.env.example" ]; then
    cp "apps/frontend/.env.example" "apps/frontend/.env"
    echo -e "${GREEN}✓ Created apps/frontend/.env from .env.example${NC}"
  else
    cat << 'ENVEOF' > apps/frontend/.env
NEXT_PUBLIC_API_URL="http://localhost:4000"
PORT=3000
ENVEOF
    echo -e "${GREEN}✓ Generated apps/frontend/.env${NC}"
  fi
else
  echo -e "${CYAN}ℹ apps/frontend/.env already exists.${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Infrastructure Initialization (Postgres 16 + Redis 7)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}${BOLD}[3/6] Starting database infrastructure...${NC}"

if [ "${DOCKER_AVAILABLE}" = true ]; then
  echo -e "${CYAN}   Starting PostgreSQL 16 & Redis 7 via Docker Compose...${NC}"
  docker compose -f infra/docker-compose.yml up -d
  echo -e "${CYAN}   Waiting 3 seconds for PostgreSQL to initialize...${NC}"
  sleep 3
  echo -e "${GREEN}✓ Docker containers running on ports 5432 (Postgres) and 6379 (Redis).${NC}"
else
  echo -e "${YELLOW}   Skipping Docker container startup.${NC}"
  echo -e "${YELLOW}   Make sure your local PostgreSQL is running with DATABASE_URL in apps/backend/.env${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Dependency Installation
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}${BOLD}[4/6] Installing monorepo dependencies with pnpm...${NC}"
pnpm install
echo -e "${GREEN}✓ All dependencies installed across backend and frontend.${NC}"

# ------------------------------------------------------------------------------
# 5. Database Schema Synchronization
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}${BOLD}[5/6] Generating Prisma Client and syncing database...${NC}"
pnpm --filter backend exec prisma generate

if [ "${DOCKER_AVAILABLE}" = true ]; then
  if pnpm --filter backend db-push; then
    echo -e "${GREEN}✓ Database schema pushed to PostgreSQL successfully!${NC}"
  else
    echo -e "${YELLOW}⚠️  Could not push schema yet. You can run 'make db-push' once your DB is ready.${NC}"
  fi
else
  echo -e "${YELLOW}ℹ Skipping database push (run 'make db-push' when your DB is running).${NC}"
fi

# ------------------------------------------------------------------------------
# 6. Verification Build
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}${BOLD}[6/6] Running verification builds...${NC}"
echo -e "${CYAN}   Building backend (NestJS TypeScript)...${NC}"
pnpm build:backend
echo -e "${GREEN}✓ Backend build succeeded.${NC}"

echo -e "${CYAN}   Building frontend (Next.js JavaScript)...${NC}"
pnpm build:frontend
echo -e "${GREEN}✓ Frontend build succeeded.${NC}"

# ------------------------------------------------------------------------------
# Summary & Next Steps
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉  SETUP COMPLETE! ALL SYSTEMS CONFIGURED & VERIFIED        ${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo ""
echo -e "${BOLD}Next Steps & Shortcuts:${NC}"
echo -e "  ${CYAN}make dev${NC}            -> Start Frontend (port 3000) & Backend (port 4000) concurrently"
echo -e "  ${CYAN}make backend${NC}        -> Start NestJS backend only"
echo -e "  ${CYAN}make frontend${NC}       -> Start Next.js frontend only"
echo -e "  ${CYAN}make studio${NC}         -> Open Prisma Studio database GUI (port 5555)"
echo -e "  ${CYAN}make db-push${NC}        -> Push schema changes to Postgres"
echo -e "  ${CYAN}make up / make down${NC} -> Start / Stop Docker containers"
echo ""
echo -e "${BOLD}Key Service URLs:${NC}"
echo -e "  • Frontend App:     ${CYAN}http://localhost:3000${NC}"
echo -e "  • Backend API:      ${CYAN}http://localhost:4000${NC}"
echo -e "  • Health Probe:     ${CYAN}http://localhost:4000/api/health${NC}"
echo -e "  • Swagger API Docs: ${CYAN}http://localhost:4000/api/docs${NC}"
echo ""
echo -e "${GREEN}Happy Hacking! 🚀${NC}"
