# Technology Stack

**Analysis Date:** 2026-04-23

## Languages

**Primary:**
- TypeScript 5.9.3 - Web and desktop frontend, shared packages (`packages/core`, `packages/ui`, `packages/views`, `apps/web`, `apps/desktop`)
- Go 1.26.1 - Backend server (`server/`)

**Secondary:**
- JavaScript - Build scripts, configuration files, Node.js tooling

## Runtime

**Environment:**
- Node.js 22.x - TypeScript/JavaScript execution, frontend builds, package management
- Go 1.26.1 - Backend API server execution
- Electron 39.2.6 - Desktop application runtime (`apps/desktop`)

**Package Manager:**
- pnpm 10.28.2 - Monorepo package manager for all frontend packages
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.2.3 - Web frontend (App Router, server-side rendering, API routes)
- React 19.2.3 - UI framework (web and desktop)
- React Router 7.6.0 - Desktop client-side routing (`apps/desktop`)
- electron-vite 5.0.0 - Build tooling for Electron (`apps/desktop`)
- Chi v5.2.5 - HTTP router for Go backend (`server/`)

**State Management:**
- Zustand 5.0.0 - Client state management (UI, filters, modals, drafts)
- TanStack Query 5.96.2 - Server state caching and synchronization

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- Base UI 1.3.0 - Unstyled component primitives
- shadcn - Component library wrapper (Base UI variant, base-nova style)
- Lucide React 1.0.1 - Icon library
- CVA (class-variance-authority) 0.7.1 - CSS class composition

**Rich Text Editing:**
- Tiptap 3.22.1 - WYSIWYG editor framework
  - Extensions: code-block, image, link, mention, table, typography, markdown
- Markdown: remark, rehype ecosystem for processing
- KaTeX 0.16.45 - Mathematical notation rendering

**Build & Dev:**
- Turborepo 2.5.4 - Monorepo task orchestration
- Vite + @vitejs/plugin-react 6.0.1 - Fast frontend build and dev server
- Electron Builder 26.0.12 - Package and distribute Electron apps
- electron-updater 6.8.3 - Auto-update support for desktop app

**Testing:**
- Vitest 4.1.0 - Unit test runner (TS/TS packages)
- Playwright 1.58.2 - E2E browser testing
- @testing-library/react 16.3.2 - React component testing utilities
- jsdom 29.0.1 - DOM simulation for Node environment

**Linting & Format:**
- ESLint - Code linting (configuration in each package)
- TypeScript strict mode - Type safety across codebase

## Key Dependencies

**Critical (Backend):**
- PostgreSQL driver: jackc/pgx v5.8.0 - Direct SQL execution via sqlc
- gorilla/websocket v1.5.3 - WebSocket support for real-time features
- AWS SDK v1.41.5 - S3 storage and Secrets Manager integration
- JWT v5.3.1 - Token-based authentication
- Redis v9.18.0 - Caching and realtime relay (optional, Postgres default)
- oklog/ulid v2.1.1 - Sortable unique identifiers
- Resend v2.28.0 - Email delivery service
- Cobra v1.10.2 - CLI framework for multica command-line tool

**Critical (Frontend):**
- @dnd-kit - Drag-and-drop primitives (core, sortable, utilities)
- Embla Carousel 8.6.0 - Carousel/slider component
- React Day Picker 9.14.0 - Calendar/date picker
- Recharts 3.8.0 - Data visualization
- Sonner 2.0.7 - Toast notifications
- PostHog JS 1.176.1 - Product analytics

**Infrastructure & Utilities:**
- google/uuid v1.6.0 - UUID generation
- robfig/cron v3.0.1 - Scheduled tasks
- tint v1.1.3 - Go logging with color and timestamp

## Configuration

**Environment:**
- `.env.example` defines all available configuration variables
- Environment-based config: `APP_ENV` gates development shortcuts (master code 888888 for self-hosted)
- Database connection: `DATABASE_URL` with optional pgxpool tuning (`DATABASE_MAX_CONNS`, `DATABASE_MIN_CONNS`)
- Server ports: `PORT` (default 8080), `FRONTEND_PORT` (default 3000), `DESKTOP_RENDERER_PORT`

**Key Configs Required:**
- `JWT_SECRET` - Signing key for authentication tokens (required, must change in production)
- `DATABASE_URL` - PostgreSQL connection string (local: postgres://localhost:5432, Docker: database service)
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - Database credentials
- `FRONTEND_ORIGIN` - Web frontend URL for CORS, cookies
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` - Frontend-visible API endpoints (auto-derived from origin if not set)

**Build:**
- `turbo.json` - Monorepo build pipeline config
- `.goreleaser.yml` - CLI binary release configuration (multi-platform: darwin/linux/windows, amd64/arm64)
- `Makefile` - Local development automation (make dev, make check, make server, make db-up, etc.)
- `pnpm-workspace.yaml` - Workspace definition with pnpm catalog for dependency pinning

**TypeScript:**
- `packages/tsconfig/` - Shared TypeScript configurations
- Strict mode enabled across all packages

## Platform Requirements

**Development:**
- Node.js 22.x
- pnpm 10.28.2+
- Go 1.26.1
- PostgreSQL 17 with pgvector extension (docker: pgvector/pgvector:pg17)
- Redis 7-alpine (optional, for tests and optional realtime relay)
- Xcode Command Line Tools (macOS)

**Production:**
- Docker containers: `ghcr.io/multica-ai/multica-backend` (Go), `ghcr.io/multica-ai/multica-web` (Next.js static)
- PostgreSQL 17+ with pgvector
- Redis (optional, for Postgres-backed realtime)
- S3-compatible storage (optional, local filesystem fallback)
- CloudFront CDN (optional, for signed URLs)

**Desktop Distribution:**
- Electron 39.2.6 packaged as `.app` (macOS), `.dmg` (macOS disk image), `.exe` (Windows)
- Auto-update via electron-updater (checks for newer versions)
- Homebrew formula via `multica-ai/tap` for CLI tool distribution

---

*Stack analysis: 2026-04-23*
