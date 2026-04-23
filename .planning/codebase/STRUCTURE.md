# Codebase Structure

**Analysis Date:** 2026-04-23

## Directory Layout

```
multica/
├── server/                          # Go backend (Chi router, sqlc, gorilla/websocket)
│   ├── cmd/
│   │   ├── server/                 # HTTP server entry point
│   │   ├── multica/                # CLI tool for workspace/project/agent management
│   │   └── migrate/                # Database migration runner
│   ├── migrations/                 # SQL schema migrations (up/down pairs)
│   ├── pkg/
│   │   ├── db/
│   │   │   ├── queries/           # SQL queries for sqlc codegen
│   │   │   └── generated/         # sqlc-generated Go code (DO NOT EDIT)
│   │   ├── agent/                 # Agent runtime protocol
│   │   ├── protocol/              # WebSocket message types
│   │   └── redact/                # Secret/sensitive data redaction
│   └── internal/
│       ├── handler/               # HTTP endpoint handlers (one file per resource)
│       ├── service/               # Business logic services (TaskService, AutopilotService)
│       ├── middleware/            # HTTP middleware (auth, logging, CORS, CSP)
│       ├── realtime/              # WebSocket Hub, Redis relay
│       ├── events/                # Event bus and listeners
│       ├── auth/                  # JWT validation, CloudFront signing
│       ├── storage/               # S3 and local file storage
│       ├── daemon/                # Daemon mode initialization
│       ├── logger/                # Structured logging setup
│       ├── util/                  # Utility functions
│       ├── mention/               # @mention processing
│       ├── analytics/             # Event tracking
│       └── cli/                   # CLI command implementations
│
├── apps/
│   ├── web/                        # Next.js web frontend (App Router)
│   │   ├── app/                   # Route definitions
│   │   │   ├── (landing)/         # Public landing pages
│   │   │   ├── (auth)/            # Pre-workspace routes (login, create workspace, invite accept)
│   │   │   ├── [workspaceSlug]/   # Workspace-scoped routes
│   │   │   │   └── (dashboard)/   # Dashboard pages
│   │   │   ├── auth/              # OAuth and auth callbacks
│   │   │   └── favicon.ico
│   │   ├── platform/              # Next.js-specific platform adapters
│   │   │   └── navigation.tsx     # Next.js router wiring for NavigationAdapter
│   │   ├── components/            # App-specific components (WebProviders, theme provider)
│   │   ├── globals.css            # Tailwind directives
│   │   ├── next.config.ts         # Build config
│   │   └── tsconfig.json
│   │
│   ├── desktop/                    # Electron desktop frontend (electron-vite)
│   │   ├── src/
│   │   │   ├── renderer/          # React renderer process
│   │   │   │   ├── src/
│   │   │   │   │   ├── App.tsx    # Root component (CoreProvider wrapper)
│   │   │   │   │   ├── routes.tsx # Memory router + route definitions
│   │   │   │   │   ├── pages/     # Page components (mounted by routes)
│   │   │   │   │   ├── stores/    # Desktop-specific stores (tab-store, window-overlay-store)
│   │   │   │   │   ├── platform/  # react-router-dom wiring for NavigationAdapter
│   │   │   │   │   ├── components/ # App-specific components
│   │   │   │   │   ├── hooks/     # App-specific hooks
│   │   │   │   │   └── globals.css
│   │   │   │   └── index.html     # HTML entry point
│   │   │   ├── main/              # Electron main process (window setup, IPC)
│   │   │   ├── preload/           # Preload script (IPC bridge)
│   │   │   └── shared/            # Shared code between main/renderer
│   │   ├── electron.vite.config.ts
│   │   └── package.json
│   │
│   └── docs/                       # Docusaurus documentation site
│
├── packages/
│   ├── core/                       # Headless business logic (zero react-dom, zero localStorage)
│   │   ├── api/                   # API client (client.ts, ws-client.ts)
│   │   ├── auth/                  # Auth store, login logic
│   │   ├── workspace/             # Workspace queries, mutations, store
│   │   ├── issues/                # Issue queries, mutations, stores, WS updaters
│   │   │   ├── stores/            # Zustand stores (view, selection, draft, collapse)
│   │   │   └── config/            # Issue configuration (status, priority enums)
│   │   ├── inbox/                 # Inbox queries, mutations, WS updaters
│   │   ├── chat/                  # Chat store, queries, mutations
│   │   ├── projects/              # Project queries, mutations
│   │   ├── autopilots/            # Autopilot queries, mutations
│   │   ├── runtimes/              # Runtime queries, mutations, hooks
│   │   ├── pins/                  # Pinned items queries, mutations
│   │   ├── feedback/              # Feedback mutations
│   │   ├── realtime/              # WebSocket provider, listeners
│   │   ├── navigation/            # Navigation store (useNavigation hook)
│   │   ├── modals/                # Modal store (useModals hook)
│   │   ├── onboarding/            # Onboarding flow store
│   │   ├── platform/              # CoreProvider, StorageAdapter, workspace storage
│   │   ├── analytics/             # PostHog initialization
│   │   ├── types/                 # Shared TypeScript types
│   │   ├── constants/             # Enums, magic numbers
│   │   ├── hooks.tsx              # Shared hooks (useWorkspaceId, etc)
│   │   ├── query-client.ts        # TanStack Query configuration
│   │   ├── provider.tsx           # QueryProvider wrapper
│   │   ├── logger.ts              # Noop logger
│   │   ├── utils.ts               # Utility functions
│   │   ├── index.ts               # Barrel export
│   │   └── package.json           # Exports all domains via path aliases
│   │
│   ├── views/                      # Shared business pages and components (no next/*, no react-router-dom)
│   │   ├── issues/                # Issue list, detail, search (components + hooks + utils)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── projects/              # Project pages and components
│   │   ├── autopilots/            # Autopilot pages and components
│   │   ├── agents/                # Agent list and profile components
│   │   ├── skills/                # Skill components
│   │   ├── runtimes/              # Runtime management pages
│   │   ├── workspace/             # Workspace creation, settings, avatar
│   │   ├── auth/                  # Login form, signup form
│   │   ├── invite/                # Invitation accept page
│   │   ├── inbox/                 # Inbox page and components
│   │   ├── chat/                  # Chat UI components
│   │   ├── my-issues/             # My issues page
│   │   ├── search/                # Global search UI
│   │   ├── settings/              # Workspace settings pages
│   │   ├── onboarding/            # Onboarding flow steps and utilities
│   │   ├── layout/                # DashboardGuard, workspace layout guards
│   │   ├── editor/                # TipTap editor wrapper and extensions
│   │   ├── common/                # Shared UI utilities (markdown, actor-avatar)
│   │   ├── modals/                # Modal registry and implementations
│   │   ├── navigation/            # Navigation bar components
│   │   ├── platform/              # Platform-specific adapters (DragStrip for desktop)
│   │   └── package.json           # Exports pages and components via path aliases
│   │
│   ├── ui/                         # Atomic UI components (zero business logic, zero core imports)
│   │   ├── components/
│   │   │   ├── ui/               # shadcn components (Button, Card, Modal, etc)
│   │   │   └── common/           # Markdown, emoji picker, etc
│   │   ├── hooks/                 # Hooks: useMediaQuery, useClickOutside, etc
│   │   ├── styles/
│   │   │   ├── tokens.css        # Design tokens (colors, spacing, typography)
│   │   │   └── base.css          # Global styles (reset, scrollbar, keyframes)
│   │   ├── lib/
│   │   │   └── utils.ts          # cn() for Tailwind class merging
│   │   ├── markdown/              # Markdown rendering components
│   │   └── package.json
│   │
│   ├── tsconfig/                  # Shared TypeScript configuration
│   │   ├── base.json             # Base strict config
│   │   └── react.json            # React-specific overrides
│   │
│   └── eslint-config/             # Shared ESLint rules
│
├── e2e/                            # Playwright E2E tests
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── issues.spec.ts
│   │   ├── comments.spec.ts
│   │   ├── settings.spec.ts
│   │   └── navigation.spec.ts
│   ├── fixtures.ts                # Test data factory
│   ├── helpers.ts                 # Shared test utilities
│   ├── env.ts                     # Environment configuration
│   └── playwright.config.ts
│
├── pnpm-workspace.yaml            # Monorepo configuration, catalog version pinning
├── turbo.json                     # Turborepo build orchestration
├── docker-compose.yml             # PostgreSQL container setup
└── Makefile                       # Development commands
```

## Directory Purposes

**server/**
- Purpose: Go backend API and daemon runtime
- Contains: HTTP handlers, services, database access, WebSocket server
- Entry points: `cmd/server/main.go` (API), `cmd/multica/main.go` (CLI), `cmd/migrate/main.go` (migrations)

**apps/web/**
- Purpose: Next.js web frontend
- Contains: Route definitions, Next.js-specific adapters, app components
- Key files: `app/layout.tsx` (root), `app/[workspaceSlug]/(dashboard)/page.tsx` (main workspace page)

**apps/desktop/**
- Purpose: Electron desktop frontend
- Contains: React renderer, window setup, tab management, window overlay state
- Key files: `src/renderer/src/App.tsx` (root), `src/renderer/src/routes.tsx` (route definitions), `src/renderer/src/stores/` (desktop state)

**packages/core/**
- Purpose: Headless business logic shared by all apps
- Contains: API client, TanStack Query hooks, Zustand stores, types, utils
- Constraint: Zero react-dom, zero localStorage, zero process.env (use StorageAdapter), zero UI libraries
- Exports: Path aliases for each domain (e.g., `@multica/core/issues/queries`)

**packages/views/**
- Purpose: Shared UI pages and business components
- Contains: Issue detail, workspace creation, settings, modals, search, inbox
- Constraint: Zero next/*, zero react-router-dom (use NavigationAdapter), zero stores (import from core)
- Exports: Page components and composite UI widgets via path aliases

**packages/ui/**
- Purpose: Atomic UI components library
- Contains: shadcn components, design tokens, markdown rendering, hooks
- Constraint: Zero business logic, zero @multica/core imports, zero framework-specific code
- Exports: Components and utilities via path aliases

**packages/tsconfig/**
- Purpose: Shared TypeScript configuration
- Contains: Base strict config + React overrides
- Used by: All packages and apps via `"extends": "@multica/tsconfig/react.json"`

**e2e/**
- Purpose: End-to-end browser tests
- Contains: Playwright specs, API client fixture, test helpers
- Run: `pnpm exec playwright test` (requires backend + frontend running)

## Key File Locations

**Entry Points:**

- Backend API: `server/cmd/server/main.go` — initializes DB, event bus, handlers, WS hub
- Web frontend: `apps/web/app/layout.tsx` — React root, Next.js app layout
- Desktop frontend: `apps/desktop/src/renderer/src/main.tsx` — React root (Vite entry)
- CLI: `server/cmd/multica/main.go` — local workspace/project/agent commands

**Configuration:**

- Database migrations: `server/migrations/` — SQL up/down pairs
- Environment defaults: `server/cmd/server/main.go` (hardcoded fallbacks)
- TypeScript: `packages/tsconfig/base.json` and `react.json`
- Tailwind: `packages/ui/styles/tokens.css` (design tokens)

**Core Logic:**

- API Client: `packages/core/api/client.ts` — REST requests, header construction
- Auth Store: `packages/core/auth/store.ts` — user session, login/logout
- Handlers: `server/internal/handler/*.go` — one file per resource (issue.go, comment.go, etc)
- Services: `server/internal/service/*.go` — TaskService, AutopilotService, EmailService
- Queries: `server/pkg/db/queries/*.sql` — SQL templates for sqlc codegen

**Testing:**

- Unit tests: `packages/core/**/*.test.ts`, `packages/views/**/*.test.tsx`
- Integration tests: `server/internal/**/*_test.go`
- E2E tests: `e2e/**/*.spec.ts`

**Shared Pages/Components:**

- Issue detail: `packages/views/issues/components/` (IssueDetailPage, CommentThread, etc)
- Workspace creation: `packages/views/workspace/new-workspace-page.tsx`
- Settings: `packages/views/settings/` (WorkspaceSettings, MemberManagement, etc)
- Inbox: `packages/views/inbox/` (InboxPage, InboxItem, etc)
- Modals: `packages/views/modals/registry.tsx` (CreateIssueModal, CreateProjectModal, etc)

## Naming Conventions

**Files:**

- Handlers: `server/internal/handler/{resource}.go` (issue.go, comment.go, agent.go)
- Services: `server/internal/service/{service}.go` (task.go, autopilot.go, email.go)
- Queries: `packages/core/{domain}/queries.ts` (issues/queries.ts, workspace/queries.ts)
- Mutations: `packages/core/{domain}/mutations.ts` (issues/mutations.ts, chat/mutations.ts)
- Stores: `packages/core/{domain}/store.ts` (auth/store.ts, navigation/store.ts)
- Pages: `packages/views/{domain}/index.ts` or `packages/views/{domain}/{page-name}.tsx`
- Components: PascalCase ending in `.tsx` (IssueDetail.tsx, CommentThread.tsx)
- Tests: Same directory as source, suffix with `.test.ts` or `.test.tsx` (or `_test.go` for Go)

**Directories:**

- Feature domains: lowercase (issues/, workspace/, projects/, runtimes/)
- Subfolders within domain: `components/`, `hooks/`, `utils/`, `stores/`, `config/`
- Utilities: `packages/core/utils.ts`, `packages/ui/lib/utils.ts`

## Where to Add New Code

**New Feature (e.g., new resource like "Templates"):**

1. **Backend**: 
   - Add SQL migration: `server/migrations/NNN_add_templates_table.up.sql`
   - Add queries: `server/pkg/db/queries/template.sql`
   - Run `make sqlc` to regenerate `server/pkg/db/generated/`
   - Add handler: `server/internal/handler/template.go` (with Create, List, Update, Delete endpoints)
   - Add service if needed: `server/internal/service/template.go`
   - Register routes in `server/cmd/server/router.go`

2. **Frontend (Shared)**:
   - Add queries: `packages/core/templates/queries.ts` (useTemplates, useTemplate hooks)
   - Add mutations: `packages/core/templates/mutations.ts` (useCreateTemplate, useUpdateTemplate, etc)
   - Add types: `packages/core/types/` (Template interface)
   - Export from `packages/core/package.json` with path alias: `"./templates": "./templates/index.ts"`

3. **Views**:
   - Add page: `packages/views/templates/index.ts` → `packages/views/templates/templates-page.tsx`
   - Add components: `packages/views/templates/components/` (TemplateDetail, TemplateForm, etc)
   - Export from `packages/views/package.json`

4. **App Routes**:
   - Web: Add route file in `apps/web/app/[workspaceSlug]/(dashboard)/templates/` (Next.js file structure)
   - Desktop: Add route in `apps/desktop/src/renderer/src/routes.tsx`, create page in `src/renderer/src/pages/`

5. **Tests**:
   - Write test first (TDD): `packages/core/templates/queries.test.ts`
   - Implement feature to pass test
   - Add Go test: `server/internal/handler/template_test.go`

**New Component (used by both web and desktop):**

- If it's a page → add to `packages/views/`
- If it's a reusable widget → add to `packages/views/common/` or domain-specific components
- If it's atomic UI (Button, Card, Input) → add to `packages/ui/components/ui/`
- Never duplicate between apps; extract to a package instead

**New Utility Function:**

- Shared business logic → `packages/core/utils.ts` or domain-specific utils (e.g., `packages/core/issues/utils.ts`)
- Shared UI utilities → `packages/ui/lib/utils.ts`
- App-specific utility → `apps/web/utils/` or `apps/desktop/src/renderer/src/utils/`

**New Zustand Store (client state):**

- Core: Lives in `packages/core/{domain}/store.ts`
- Exported via `packages/core/package.json`
- Example: `packages/core/issues/stores/view-store.ts` (is-list, filter, sort preferences)
- Never query from store; always use Query cache for server data

## Special Directories

**server/pkg/db/generated/**
- Purpose: sqlc-generated Go code
- Generated: Yes (auto-regenerated by `make sqlc`)
- Committed: Yes (committed for reproducibility)
- **DO NOT EDIT** — changes are overwritten on next `make sqlc`

**server/migrations/**
- Purpose: Database schema and data migrations
- Generated: No (hand-written SQL)
- Committed: Yes
- Naming: `NNN_description.up.sql` and `NNN_description.down.sql` (sequential number NNN)

**packages/core/types/**
- Purpose: Shared TypeScript types
- Contains: API response types, domain models, enums
- Exported: Via `@multica/core/types` in package.json

**apps/desktop/src/renderer/src/stores/**
- Purpose: Desktop-specific state (tabs, window overlay)
- Tab store: Groups tabs per workspace; TabBar shows only active workspace's tabs
- Window overlay store: Manages pre-workspace transition UI (create workspace, accept invite)

**packages/views/platform/**
- Purpose: Platform-specific adapters for shared components
- Desktop: `DragStrip` component for macOS window dragging on full-screen views
- Web: Empty or future adapters

## Route Categories (Desktop-Specific)

Every desktop route falls into exactly one category. Choosing the wrong one causes navigation bugs.

**Session Routes** (legitimate tab destinations):
- Example: `/:slug/issues`, `/:slug/settings`, `/:slug/projects`
- Rendered by `WorkspaceRouteLayout` under per-tab memory router
- Workspace-scoped, tab-specific
- What you add: A `Route` in `apps/desktop/src/renderer/src/routes.tsx` and a page component

**Transition Flows** (pre-workspace, one-shot actions):
- Examples: Create workspace (`/workspaces/new`), accept invite (`/invite/:id`)
- **NOT routes in `routes.tsx`** — they're `WindowOverlay` state
- Registered in `apps/desktop/src/renderer/src/stores/window-overlay-store.ts`
- When navigation adapter sees `push('/workspaces/new')`, it dispatches overlay state instead of routing
- The shared view component (`NewWorkspacePage`) is identical on web and desktop; desktop wraps it in overlay chrome

**Error/Stale States** (workspace became inaccessible):
- Example: Member removed from workspace, workspace deleted
- **NOT explicit error pages** — `WorkspaceRouteLayout` auto-heals by dropping stale tab group
- User never lands on error screen; tab silently disappears from tab bar
- Web keeps `NoAccessPage` (shareable error URL is meaningful); desktop has no URL bar so heal silently

## Package Boundary Rules (Hard Constraints)

**packages/core/**
- NO react-dom imports (queries/stores must work in Node.js for CLI/daemon)
- NO localStorage or sessionStorage (use StorageAdapter instead)
- NO process.env or process.platform (use identity argument to CoreProvider)
- NO UI libraries (no material-ui, no shadcn)
- NO next/*, react-router-dom, electron imports
- YES Zustand, TanStack Query, zod, date-fns, luxon

**packages/views/**
- NO next/*, react-router-dom imports (use NavigationAdapter and shared routes)
- NO stores (import from @multica/core, never create local state)
- NO packages/ui circular imports (views → core + ui, ui has no reverse deps)
- YES view-specific hooks (useIssueDetail, useFilteredIssues) — these go in packages/views, not core

**packages/ui/**
- NO @multica/core or @multica/views imports (pure UI, no business logic)
- NO next/*, react-router-dom, electron imports
- YES shadcn components, design tokens, markdown rendering

**apps/web/platform/**
- YES only Next.js-specific wiring (router, navigation adapter implementation)
- This is the ONLY place in the web app for `next/navigation` imports

**apps/desktop/src/renderer/src/platform/**
- YES only react-router-dom-specific wiring (router, navigation adapter implementation)
- This is the ONLY place in desktop for `react-router-dom` imports

---

*Structure analysis: 2026-04-23*
