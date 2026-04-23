# Architecture

**Analysis Date:** 2026-04-23

## Pattern Overview

**Overall:** Monorepo with Go REST API backend + Next.js/Electron frontend using shared TypeScript business logic packages. **Internal Packages pattern**: all shared packages (`@multica/core`, `@multica/ui`, `@multica/views`) export raw `.ts`/`.tsx` files for zero-config HMR and direct bundler compilation.

**Key Characteristics:**
- Strict package boundary enforcement (core has zero react-dom, ui has zero business logic)
- TanStack Query owns all server state; Zustand owns all client state
- REST API with WebSocket real-time updates that invalidate Query cache
- Workspace-scoped multi-tenancy at database level (all queries filter by `workspace_id`)
- Polymorphic assignees (members or agents via `assignee_type` + `assignee_id`)

## Layers

**Backend (Go):**

- **HTTP Router**: `server/cmd/server/router.go` via Chi (go-chi/chi/v5)
- **Handlers**: `server/internal/handler/*.go` — HTTP endpoints, request/response marshaling, auth
- **Services**: `server/internal/service/*.go` — business logic, task enqueueing, autopilot scheduling
- **Database Access**: `server/pkg/db/generated/*.go` — sqlc-generated typed queries from SQL
- **Middleware**: `server/internal/middleware/*.go` — request ID, logging, CSP, CORS, auth validation
- **Real-time**: `server/internal/realtime/` — WebSocket hub (in-memory or Redis-backed) for multi-node broadcasting
- **Events**: `server/internal/events/` — internal event bus for subscriber/activity/notification listeners
- **Auth**: `server/internal/auth/` — JWT validation, CloudFront signing
- **Storage**: `server/internal/storage/` — S3 or local file storage abstraction

**Frontend (TypeScript):**

- **API Client**: `packages/core/api/client.ts` — REST client with workspace scoping via `X-Workspace-Slug` header
- **Stores (Zustand)**: `packages/core/**/store.ts` — auth, navigation, modals, chat, UI state (NEVER server data)
- **Queries (TanStack Query)**: `packages/core/**/queries.ts` — workspace-scoped API fetches keyed by `wsId`
- **Mutations**: `packages/core/**/mutations.ts` — optimistic updates, server sync, cache invalidation
- **Views**: `packages/views/**/` — UI components and pages (headless: no next/*, no react-router-dom)
- **UI Components**: `packages/ui/components/` — atomic shadcn components, zero business logic
- **Platform Bridge**: `packages/core/platform/` — CoreProvider, StorageAdapter, workspace storage, navigation adapter wiring

## Data Flow

**Request Path (HTTP + Cache):**

1. Component calls `useQuery` or `useMutation` from TanStack Query
2. Query executes via `ApiClient` (from `packages/core/api/client.ts`)
3. ApiClient adds `X-Workspace-ID`, `X-Workspace-Slug` headers from `setCurrentWorkspace()` singleton
4. Handler in `server/internal/handler/` validates workspace membership, executes sqlc query
5. Response cached in Query cache; subsequent renders read from cache, no redundant API calls

**Real-time Updates (WebSocket):**

1. Event fires on server (e.g., issue created, comment added)
2. Event Bus in `server/internal/events/` dispatches to registered listeners
3. Listeners (activity, notifications, subscribers) write to DB if needed
4. Real-time Hub broadcasts via WebSocket to connected clients
5. WSProvider in `packages/core/realtime/` receives message, **invalidates corresponding Query cache**
6. Component re-renders with fresh cache data (no manual invalidation needed)

**State Ownership:**

- **Server State**: Issues, users, workspaces, comments, agents, all API responses → Query cache only
- **Client State**: UI selections, filters, drafts, modals, navigation history → Zustand stores only
- **Hard rule**: Never duplicate server data into Zustand; if it came from API, it lives in Query cache

**Workspace Context:**

- `setCurrentWorkspace(slug, uuid)` in `packages/core/platform/workspace-storage.ts` is the single source of truth
- Called on mount by workspace-scoped layouts (web: `[workspaceSlug]/(dashboard)`, desktop: `WorkspaceRouteLayout`)
- API client reads slug via `getCurrentSlug()` to set `X-Workspace-Slug` header
- All queries key on `wsId` so cache automatically swaps when workspace changes

## Key Abstractions

**CoreProvider** (`packages/core/platform/core-provider.tsx`):
- Initializes API client, auth store, chat store, Query client, WebSocket connection
- Singletons created once at boot, survive HMR
- Each app wraps its root with `<CoreProvider>` and provides `apiBaseUrl`, `wsUrl`, storage adapter
- Example: web's `apps/web/components/web-providers.tsx`, desktop's `apps/desktop/src/renderer/src/App.tsx`

**NavigationAdapter** (implicit via `useNavigation()` from `packages/core/navigation/store.ts`):
- Abstracts routing away from framework-specific APIs (no `next/navigation` or `react-router-dom` in shared code)
- Web: wired to Next.js router via `apps/web/platform/navigation.tsx`
- Desktop: wired to memory router + tab system via `apps/desktop/src/renderer/src/platform/navigation.tsx`

**StorageAdapter** (`packages/core/platform/types.ts`):
- Interface for localStorage/sessionStorage access
- Web: browser `localStorage`, Electron: sqlite-based or file-based storage
- Allows secrets/tokens to be stored per-platform without hard-coding browser APIs

**WorkspaceIdProvider** (React Context):
- Provides workspace UUID and slug to routes that need it
- Set by layout on mount after URL resolution
- Used by navigation adapter, workspace queries, API header construction

**WindowOverlay** (Desktop-specific):
- State-driven modals for pre-workspace flows (create workspace, accept invite)
- Not a route, not a page component; a canvas for showing transition UI
- Located in `apps/desktop/src/renderer/src/stores/window-overlay-store.ts`
- Allows the same shared page component (`NewWorkspacePage`, `InvitePage`) to work on both platforms

**Real-time Hub** (`server/internal/realtime/hub.go`):
- In-memory WebSocket broadcaster; optional Redis relay for multi-node deployments
- Clients subscribe on connection; messages broadcast to all subscribers in a namespace
- Authorizer checks membership before delivering messages (via scope extractor)

## Entry Points

**Backend:**
- `server/cmd/server/main.go` — HTTP server on port 8080, gorilla/websocket + Chi router
- `server/cmd/multica/main.go` — CLI tool for local workspace/project management
- `server/cmd/migrate/main.go` — Database migration runner
- Daemon runtime: spawned by `server/internal/daemon/` via `server/cmd/server` with `--daemon` flag

**Web Frontend:**
- `apps/web/app/layout.tsx` — Root layout (fonts, providers, global CSS)
- `apps/web/app/auth/callback/route.ts` — OAuth callback handler (Next.js Route Handler)
- `apps/web/app/(auth)/login/page.tsx` — Login, create workspace, accept invite (pre-workspace routes)
- `apps/web/app/[workspaceSlug]/(dashboard)/page.tsx` — Workspace home (post-login, workspace-scoped)

**Desktop Frontend:**
- `apps/desktop/src/renderer/src/main.tsx` — React root
- `apps/desktop/src/renderer/src/App.tsx` — CoreProvider wrapper, root router
- `apps/desktop/src/renderer/src/routes.tsx` — Memory router and route definitions
- `apps/desktop/src/renderer/src/stores/window-overlay-store.ts` — Modal state for transitions

**E2E Tests:**
- `e2e/` — Playwright fixtures and test specs
- Tests use `TestApiClient` fixture to set up data, then run headless browser against frontend

## Error Handling

**Strategy:** Synchronous validation + async error propagation

- **Input validation**: Handlers validate request body via schema guards (exact types inferred from sqlc)
- **Database errors**: Converted to HTTP 400/409/500 with minimal detail (secrets never leak)
- **Auth errors**: Middleware returns 401 if JWT invalid; ApiClient clears token on 401 response
- **Workspace errors**: 403 if member not in workspace; cache miss if workspace data unavailable (handled by layout)

## Cross-Cutting Concerns

**Logging:** 
- Go: `log/slog` with structured fields and log level control via `SLOG_LEVEL` env var
- TS: `packages/core/logger.ts` exports noop logger (no console.log in production code)

**Validation:**
- Go: sqlc guarantees type safety; handlers explicit-check required fields
- TS: Zod schemas on API boundary (already used for RuntimeConfig); no deep nested validation (keep it simple)

**Authentication:**
- Go backend: JWT validation in middleware; workspace membership check in handler
- TS frontend: Token in localStorage (web) or Electron storage; auth store manages user session
- WebSocket: Initial connection validated via token in query string; re-auth not needed per-message

**Authorization:**
- Database-level: All queries filter by `workspace_id` + member check
- Handler-level: workspace membership verified before action; agent actions validated against agent workspace

---

*Architecture analysis: 2026-04-23*
