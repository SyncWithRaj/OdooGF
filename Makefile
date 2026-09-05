.PHONY: dev backend frontend up down studio db-push build-backend build-frontend format-backend lint-backend setup setup-linux setup-windows setup-win

# Default command: run dev servers
.DEFAULT_GOAL := dev

# Everyday Development Commands
dev:
	pnpm dev

backend:
	pnpm dev:backend

frontend:
	pnpm dev:frontend

# Infrastructure (PostgreSQL & Redis)
up:
	docker compose -f infra/docker-compose.yml up -d

down:
	docker compose -f infra/docker-compose.yml down

# Database & Prisma
studio:
	pnpm --filter backend prisma studio

db-push:
	pnpm --filter backend prisma db push

# Build, Format & Lint
build-backend:
	pnpm build:backend

build-frontend:
	pnpm build:frontend

format-backend:
	pnpm format:backend

lint-backend:
	pnpm lint:backend

# Automated Onboarding & Setup
setup: setup-linux

setup-linux:
	./scripts/setup/setup.sh

setup-windows:
	cmd.exe /c scripts\\setup\\setup.bat

setup-win: setup-windows
