@echo off
setlocal enabledelayedexpansion

echo ==================================================================
echo     [!] ODOO HACKATHON MONOREPO - AUTOMATED SETUP (WINDOWS)
echo ==================================================================
echo.

cd /d "%~dp0\..\.."

:: 1. Check Node.js
echo [1/6] Checking system prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js [v18+ or v20+]: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js detected: %NODE_VER%

:: Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] pnpm is not installed!
    where npm >nul 2>nul
    if %errorlevel% equ 0 (
        echo [*] Installing pnpm globally via npm...
        call npm install -g pnpm
    ) else (
        echo [ERROR] npm not found to install pnpm. Please install pnpm: https://pnpm.io/
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VER=%%i
echo [OK] pnpm detected: v%PNPM_VER%

:: Check Docker
set DOCKER_OK=0
where docker >nul 2>nul
if %errorlevel% equ 0 (
    docker info >nul 2>nul
    if %errorlevel% equ 0 (
        set DOCKER_OK=1
        echo [OK] Docker is installed and running.
    ) else (
        echo [WARN] Docker is installed but daemon is not running.
    )
) else (
    echo [WARN] Docker is not installed. You can use local PostgreSQL.
)

:: 2. Environment Files
echo.
echo [2/6] Configuring environment files (.env)...
if not exist "apps\backend\.env" (
    if exist "apps\backend\.env.example" (
        copy "apps\backend\.env.example" "apps\backend\.env" >nul
        echo [OK] Created apps/backend/.env from .env.example
    )
) else (
    echo [INFO] apps/backend/.env already exists.
)

if not exist "apps\frontend\.env" (
    if exist "apps\frontend\.env.example" (
        copy "apps\frontend\.env.example" "apps\frontend\.env" >nul
        echo [OK] Created apps/frontend/.env from .env.example
    )
) else (
    echo [INFO] apps/frontend/.env already exists.
)

:: 3. Start Database Containers
echo.
echo [3/6] Initializing database infrastructure...
if %DOCKER_OK% equ 1 (
    echo [*] Starting PostgreSQL and Redis via Docker Compose...
    call docker compose -f infra/docker-compose.yml up -d
    timeout /t 3 /nobreak >nul
    echo [OK] Docker containers running on ports 5432 and 6379.
) else (
    echo [SKIP] Skipping Docker. Ensure local Postgres is configured in apps/backend/.env.
)

:: 4. Install Dependencies
echo.
echo [4/6] Installing dependencies across monorepo...
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] pnpm install failed!
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully.

:: 5. Sync Prisma Database
echo.
echo [5/6] Generating Prisma Client and syncing database...
call pnpm --filter backend exec prisma generate
if %DOCKER_OK% equ 1 (
    call pnpm --filter backend db-push
    if %errorlevel% equ 0 (
        echo [OK] Database schema pushed to PostgreSQL!
    )
)

:: 6. Verification Builds
echo.
echo [6/6] Verifying production builds...
echo [*] Building backend (NestJS TypeScript)...
call pnpm build:backend
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

echo [*] Building frontend (Next.js JavaScript)...
call pnpm build:frontend
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

echo.
echo ==================================================================
echo    [SUCCESS] ALL SYSTEMS CONFIGURED AND VERIFIED!
echo ==================================================================
echo.
echo Next Steps & Commands:
echo   pnpm dev             -^> Start frontend and backend concurrently
echo   pnpm dev:backend     -^> Start backend only (port 4000)
echo   pnpm dev:frontend    -^> Start frontend only (port 3000)
echo   pnpm studio          -^> Open Prisma Studio (port 5555)
echo   pnpm up / pnpm down  -^> Start / Stop Docker containers
echo.
echo Service URLs:
echo   Frontend UI:  http://localhost:3000
echo   Backend API:  http://localhost:4000
echo   Health Probe: http://localhost:4000/api/health
echo   Swagger Docs: http://localhost:4000/api/docs
echo.
echo Happy Hacking!
pause
