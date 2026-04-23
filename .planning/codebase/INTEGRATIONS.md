# External Integrations

**Analysis Date:** 2026-04-23

## APIs & External Services

**Email Delivery:**
- Resend - Email code delivery for passwordless auth
  - SDK/Client: `github.com/resend/resend-go/v2`
  - Auth: `RESEND_API_KEY` environment variable
  - From address: `RESEND_FROM_EMAIL` (default: noreply@multica.ai)
  - Fallback: When `RESEND_API_KEY` is empty, codes print to stdout (dev mode)

**OAuth & Authentication:**
- Google OAuth 2.0 - User sign-in via Google
  - Client ID: `GOOGLE_CLIENT_ID` (served at `/api/config` runtime)
  - Client Secret: `GOOGLE_CLIENT_SECRET`
  - Redirect: `GOOGLE_REDIRECT_URI` (default: http://localhost:3000/auth/callback)
  - Implementation: Backend handles token exchange, frontend reads config at runtime

**Analytics:**
- PostHog - Product analytics and event tracking
  - SDK: `posthog-js` (catalog: ^1.176.1)
  - API Key: `POSTHOG_HOST` (https://us.i.posthog.com)
  - Key: `POSTHOG_API_KEY` (empty for local dev/self-hosted = no-op client)
  - Control: `ANALYTICS_DISABLED` to force no-op client (CI/opt-out)

## Data Storage

**Databases:**
- PostgreSQL 17 with pgvector extension
  - Driver: `jackc/pgx/v5` (Go), `pg` v8.20.0 (Node.js for migrations)
  - Connection: `DATABASE_URL` (postgres://user:pass@host:5432/db?sslmode=disable)
  - Pool tuning: `DATABASE_MAX_CONNS` (default 25), `DATABASE_MIN_CONNS` (default 5)
  - Migrations: SQL files in `server/pkg/db/migrations/`, run via Go migration tool
  - Query generation: sqlc generates Go code from SQL in `server/pkg/db/queries/`
  - Vector support: pgvector for semantic search, embeddings

**Redis (Optional):**
- redis/go-redis v9.18.0 - Caching and optional realtime relay
  - Test instance: `REDIS_TEST_URL` (redis://localhost:6379/1, CI only)
  - Production use: Optional, Postgres-backed realtime is default

**File Storage:**
- AWS S3 - Primary file storage
  - SDK: `github.com/aws/aws-sdk-go-v2/service/s3`
  - Bucket: `S3_BUCKET` (leave empty to disable)
  - Region: `S3_REGION` (default: us-west-2)
  - Signed URLs: CloudFront integration for secure downloads
- Local Filesystem - Fallback when S3 disabled
  - Path: `LOCAL_UPLOAD_DIR` (default: ./data/uploads)
  - Base URL: `LOCAL_UPLOAD_BASE_URL` (default: http://localhost:8080)

**Caching:**
- TanStack Query - Client-side server state cache with automatic invalidation
- Redis - Optional backend caching (non-default)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based implementation
  - Token signing: `JWT_SECRET` environment variable
  - Library: `github.com/golang-jwt/jwt/v5`
  - Master code fallback: `888888` (dev only, controlled by `APP_ENV`)
  - Email-based: Passwordless login via Resend codes + JWT tokens
  - Session cookies: Domain-aware, secure in production

**Session Management:**
- HTTP cookies for token storage
- Cookie domain: `COOKIE_DOMAIN` (empty for single-host, set for subdomains)
- Workspace context: Headers carry `X-Workspace-ID` for multi-tenant isolation

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry or similar integration found

**Logs:**
- Server: Structured logging via `github.com/lmittmann/tint` (Go, with color/timestamp)
- Frontend: Console logging (no persistent backend logging detected)
- File uploads: Local `./data/uploads` directory on disk

## CI/CD & Deployment

**Hosting:**
- GitHub Container Registry (GHCR) for Docker images
  - Backend: `ghcr.io/multica-ai/multica-backend`
  - Frontend: `ghcr.io/multica-ai/multica-web`
  - Tag: `MULTICA_IMAGE_TAG` (default: latest, can pin to v0.2.4 etc.)

**CI Pipeline:**
- GitHub Actions (`.github/workflows/ci.yml`)
  - Frontend: Node 22, pnpm, Turborepo (build + typecheck + test)
  - Backend: Go 1.26.1, PostgreSQL 17 (pgvector), Redis 7 (for tests)
  - Triggers: On push to main, on all PRs
  - Concurrency: Per branch/PR to cancel in-progress runs

**Release Pipeline:**
- GitHub Actions (`.github/workflows/release.yml`)
  - Trigger: Git tags matching `v*.*.*` (semantic versioning enforced)
  - Steps:
    1. Validate tag format (reject dirty tags)
    2. Run Go tests
    3. GoReleaser builds multi-platform binaries (darwin/linux/windows, amd64/arm64)
    4. Publish to GitHub Releases
    5. Auto-update Homebrew tap (`multica-ai/homebrew-tap`)
  - Token: `HOMEBREW_TAP_GITHUB_TOKEN` for tap updates

**CLI Distribution:**
- GoReleaser (.goreleaser.yml)
  - Builds: multica binary from `server/cmd/multica`
  - Platforms: macOS (darwin), Linux, Windows + both amd64 & arm64
  - Archives: Legacy names (multica_os_arch) + versioned names (multica-cli-v*-os-arch)
  - Changelog: Excludes docs, test, chore commits
  - Homebrew formula: https://github.com/multica-ai/homebrew-tap

## Environment Configuration

**Required env vars (Runtime):**
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Token signing (prod: must change from default)
- `PORT` - Server port (default 8080)
- `FRONTEND_ORIGIN` - Web frontend URL for CORS/cookies
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` - Frontend API endpoints (auto if not set)

**Optional env vars (Features):**
- `RESEND_API_KEY` - Email delivery (leave empty for dev mode)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` - OAuth
- `S3_BUCKET`, `S3_REGION` - File storage (leave empty for local filesystem)
- `CLOUDFRONT_DOMAIN`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY` - Signed URLs
- `POSTHOG_API_KEY` - Analytics (leave empty to disable)
- `ALLOWED_ORIGINS` - CORS whitelist (defaults to localhost dev origins)
- `APP_ENV` - development/production, gates 888888 master code
- `ALLOW_SIGNUP` - Boolean, disable new signups for private instances
- `ALLOWED_EMAIL_DOMAINS`, `ALLOWED_EMAILS` - Signup restrictions

**Secrets location:**
- File: `.env` (root) or `.env.worktree` (for git worktrees)
- AWS Secrets Manager: `CLOUDFRONT_PRIVATE_KEY_SECRET` points to AWS secret
- CI: GitHub Actions secrets (GITHUB_TOKEN, HOMEBREW_TAP_GITHUB_TOKEN)

## Webhooks & Callbacks

**Incoming:**
- WebSocket endpoint: `ws://localhost:8080/ws` (Gorilla WebSocket)
  - Real-time issue updates, workspace changes, chat messages
  - Authentication: JWT token in query string
  - Updates: TanStack Query invalidation on WS events

**Outgoing:**
- Not detected - No outgoing webhooks to external services

## Self-Hosting & Deployment

**Docker Compose:**
- `docker-compose.selfhost.yml` - Official production config
  - Services: Backend (Go), Web (Next.js), PostgreSQL 17, optional Redis
  - Image sources: GHCR (ghcr.io/multica-ai/...)
  - Fallback: `make selfhost-build` builds images locally if GHCR unavailable
  - Environment: `APP_ENV=production` by default (disables 888888 code)

**Worktree Support:**
- Worktrees share one PostgreSQL container
- Isolation: Database-level (unique DB per worktree)
- Auto-detection: `make dev` detects and uses `.env.worktree`
- Ports: Unique per worktree (config: `FRONTEND_PORT`, `PORT`, `DESKTOP_RENDERER_PORT`)

---

*Integration audit: 2026-04-23*
