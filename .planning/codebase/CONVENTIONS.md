# Coding Conventions

**Analysis Date:** 2026-04-23

## TypeScript Strict Mode

**Configuration:** Enabled globally in `packages/tsconfig/base.json`

**Key settings:**
- `strict: true` — All strict type checking flags enabled
- `noUnusedLocals: true` — Error on unused local variables
- `noUnusedParameters: true` — Error on unused function parameters
- `noImplicitReturns: true` — All code paths must return a value
- `noUncheckedIndexedAccess: true` — Strict index access type safety
- `forceConsistentCasingInFileNames: true` — Case-sensitive file names

**Consequence:** All `.ts` and `.tsx` files must pass strict TypeScript checks. Use explicit types; inferred types are not sufficient.

## Go Code

**Format:** Standard Go conventions via `gofmt` and `go vet`

**Example files:**
- `server/cmd/server/activity_listeners.go` — Event listener patterns
- `server/cmd/server/scope_authorizer_test.go` — Go test patterns

**Test helper convention:** Prefix with `Test` (e.g., `TestScopeAuthorizer_ChatRequiresCreator`). Use `t.Helper()` in helper functions.

## File Naming Conventions

**TypeScript/JavaScript files:**
- `kebab-case.ts` — Utility files, stores, queries, mutations (e.g., `ws-updaters.ts`, `delete-workspace-dialog.tsx`)
- Components: `PascalCase` in `kebab-case.tsx` (e.g., `login-page.tsx` exports `LoginPage`, `context-anchor.tsx` exports `ContextAnchor`)

**Directory structure:**
- `packages/core/[feature]/` — Domain modules organized by feature (auth, chat, pins, inbox, autopilots, etc.)
- `packages/core/[feature]/queries.ts` — TanStack Query hooks for that domain
- `packages/core/[feature]/mutations.ts` — TanStack Query mutation hooks
- `packages/core/[feature]/index.ts` — Barrel export for public API
- `packages/core/[feature]/store.ts` — Zustand store if state needed
- `packages/views/[feature]/components/` — React components for that domain
- `packages/views/[feature]/[component].tsx` — Shared UI components
- `packages/views/[feature]/[component].test.tsx` — Co-located tests

**Example structure:**
```
packages/core/
├── auth/
│   ├── store.ts          # Zustand auth store (user, login, logout)
│   ├── store.test.ts     # Auth store tests
│   ├── utils.ts          # Helper functions
│   ├── utils.test.ts     # Helper tests
│   └── index.ts          # Export useAuthStore, helpers
├── chat/
│   ├── queries.ts        # useChatSessions, useChatMessages hooks
│   ├── mutations.ts      # useSendMessage, useCreateSession hooks
│   └── index.ts
└── types/
    ├── index.ts          # All type exports
    └── [domain].ts       # Domain-specific types
```

## Naming Patterns

**Functions:**
- camelCase for all function and method names
- `use*` prefix for React hooks (e.g., `useAuthStore`, `useWorkspaceId`, `useNavigation`)
- `create*` prefix for factory functions (e.g., `createAuthStore`, `createWorkspaceAwareStorage`)
- `is*`, `has*` prefix for boolean predicates (e.g., `isLoading`, `hasAccess`)
- `on*` prefix for event handlers (e.g., `onSuccess`, `onClick`)
- `handle*` prefix for internal handler functions (e.g., `handleUnauthorized`)

**Variables:**
- camelCase for all local variables, parameters, and properties
- `UPPER_SNAKE_CASE` for constants (e.g., `DEFAULT_E2E_EMAIL`, `EXCLUDED_PREFIXES`)
- Private class fields: `#fieldName` (not used in this codebase; prefer functional)

**Types and Interfaces:**
- PascalCase for all type and interface names (e.g., `User`, `ApiClientOptions`, `NavigationState`)
- Suffix `Response` for API response types (e.g., `LoginResponse`, `ListIssuesResponse`)
- Suffix `Request` for API request types (e.g., `CreateIssueRequest`, `UpdateIssueRequest`)
- Suffix `Params` for query/function parameter types (e.g., `ListIssuesParams`, `AuthStoreOptions`)

**Example naming:**
```typescript
// Type definitions
interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthStoreOptions {
  api: ApiClient;
  storage: StorageAdapter;
  onLogin?: () => void;
}

// Function naming
function createAuthStore(options: AuthStoreOptions) { }
async function sendCode(email: string): Promise<void> { }
function useAuthStore(selector?: (state: AuthState) => any) { }
const isLoading = state.isLoading;
const handleUnauthorized = () => { };
const DEFAULT_E2E_EMAIL = "e2e@multica.ai";
```

## Code Style

**Formatting:**
- Tool: Prettier (via Turborepo)
- Run: `pnpm lint` (project root)
- Apply auto-fix: `pnpm format` (if available)

**Linting:**
- Tool: Not explicitly configured in project root; each app/package handles its own
- Base config: ESLint (implicitly via TypeScript setup)
- Biome: Not detected in use

**Imports:**
- Use ES modules (`import`/`export`), never CommonJS (`require`)
- Organize in 3 groups (with blank lines between):
  1. External packages (React, @tanstack/react-query, zustand, etc.)
  2. Multica packages (@multica/core, @multica/ui, @multica/views)
  3. Relative imports (. / ../utils, etc.)

**Example import order:**
```typescript
// Group 1: External
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";

// Group 2: Multica packages
import { useAuthStore } from "@multica/core/auth";
import { api } from "@multica/core/api";
import { Button } from "@multica/ui/components/ui/button";

// Group 3: Relative
import { calculateDays } from "../utils";
import { formatDate } from "./helpers";
```

## Comment Language

**Rule:** English only. All code comments, commit messages, and documentation in English.

## Error Handling

**Pattern:** Explicit error catching with `try-catch` and specific error messages

**API errors:** Use `ApiError` class from `packages/core/api/client.ts`
```typescript
export class ApiError extends Error {
  status: number;
  statusText: string;
  constructor(message: string, status: number, statusText: string) { }
}
```

**Handle specifically:**
- `ApiError` with `status === 401` → Unauthorized, trigger re-authentication
- `ApiError` with other status → Log error, show user-friendly message
- Network errors → Retry with backoff or offline fallback
- Unknown errors → Log full error, show generic "Something went wrong"

**Example pattern from `packages/core/auth/store.ts`:**
```typescript
try {
  const user = await api.getMe();
  set({ user, isLoading: false });
} catch (err) {
  // For 401: ApiClient.onUnauthorized cleans storage; we reset in-memory state
  if (err instanceof ApiError && err.status === 401) {
    setCurrentWorkspace(null, null);
  }
  // For other errors: keep stored token so retry on next initialize()
  set({ user: null, isLoading: false });
}
```

## State Management

**TanStack Query owns all server state:**
- Issues, users, workspaces, inbox items — anything fetched from the API
- Query keys: `['issues', wsId, status]` pattern
- Mutations: Optimistic by default (apply locally, send request, revert on failure)
- Invalidation: WS events trigger `queryClient.invalidateQueries()`, never write to stores directly

**Zustand owns all client state:**
- UI selections, filters, drafts, modal state, view modes, navigation history
- Only stores in `packages/core/` (shared across apps)
- Never duplicate server data into Zustand — if it came from the API, it lives in Query cache

**Hard rules:**
- **Never copy API data into a Zustand store.** Two sources of truth will drift.
- **Mutations are optimistic.** Apply change locally immediately, request settles, revert on failure.
- **WS events invalidate queries, never write stores directly.** This keeps cache as single source of truth.
- **Workspace-scoped queries key on `wsId`.** Switching workspaces auto-fetches new data via cache key change.
- **Persist only what survives restarts** (user preferences, drafts, tab layout). Don't persist ephemeral UI state or server data.

**Zustand selector pattern (prevent infinite re-renders):**
- Selectors must return stable references
- Don't build new objects on every call: `(s) => ({ a: s.a, b: s.b })` ✗
- Select primitives separately or use shallow comparison: `(s) => s.lastPath` ✓
- Hooks accepting `wsId` parameter instead of reading from Context work outside `WorkspaceIdProvider`

**Example from `packages/core/navigation/store.ts`:**
```typescript
export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      lastPath: null,
      onPathChange: (path: string) => {
        if (!EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
          set({ lastPath: path });
        }
      },
    }),
    {
      name: "multica_navigation",
      storage: createJSONStorage(() => createWorkspaceAwareStorage(defaultStorage)),
      partialize: (state) => ({ lastPath: state.lastPath }), // Only persist lastPath
    },
  ),
);
```

## Immutability

**Pattern:** Always create new objects, never mutate existing ones

**Spread operator for updates:**
```typescript
// WRONG — mutation
user.name = "New Name";

// CORRECT — immutable
const updatedUser = { ...user, name: "New Name" };
```

**Zustand store pattern:**
```typescript
// Correct: spread + override
set({ user: { ...user, name: "New Name" } });

// Not: direct mutation in set
set((state) => {
  state.user.name = "New Name"; // WRONG
  return state;
});
```

## CSS & Design Tokens

**Foundation:** Shared across Web + Desktop via `packages/ui/styles/`

**Design tokens:** Use semantic token variables (never hardcoded colors)
- Correct: `bg-background`, `text-muted-foreground`, `border-ring`
- Wrong: `bg-gray-100`, `text-red-500`, `border-blue-300`

**Color names defined in `packages/ui/styles/tokens.css`:**
- `--background` / `--foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--destructive` (errors/danger)
- `--success`, `--warning`, `--info`
- `--chart-1` through `--chart-5` (data visualization)

**Tailwind setup:**
- Variant: Base UI (not Radix)
- Style preset: `base-nova`
- Config location: `packages/ui/components.json`
- Shared CSS foundation: Both web and desktop include `@source` directives pointing to `packages/` so Tailwind scans all shared packages

**CSS Architecture:**
- Base styles: `packages/ui/styles/base.css`
- Token definitions: `packages/ui/styles/tokens.css`
- Dark mode: `.dark` class applies dark token overrides
- Never duplicate scrollbar styling, keyframes, or base layer rules — they live in shared styles

## Commit Messages

**Format:** Conventional Commits with lowercase type and scope

```
<type>(<scope>): <description>

<optional body>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code reorganization without behavior change
- `docs` — Documentation only
- `test` — Test additions or fixes
- `chore` — Build, CI, or dependency updates
- `perf` — Performance improvement

**Scopes (examples):**
- `core` — Shared business logic in `packages/core/`
- `views` — Shared React components in `packages/views/`
- `ui` — UI component library in `packages/ui/`
- `web` — Next.js frontend in `apps/web/`
- `desktop` — Electron desktop app in `apps/desktop/`
- `server` — Go backend in `server/`

**Examples:**
```
feat(core): add repo_url to Project + request types
fix(web): redirect to workspace after login
refactor(server): extract activity listener logic
docs(readme): add setup instructions
test(core): add auth store initialization tests
chore(deps): bump @tanstack/react-query to v5.96.2
```

## Package Boundaries (Hard Constraints)

**`packages/core/` — Headless business logic**
- Zero `react-dom` imports
- Zero `localStorage` (use `StorageAdapter`)
- Zero `process.env` (inject via options)
- Zero UI libraries (no shadcn, Tailwind, etc.)
- **ALL Zustand stores live here** (even view-related ones like filters, view modes)
- Public API via barrel exports in `index.ts`

**`packages/ui/` — Pure UI components**
- Zero `@multica/core` imports (no business logic)
- Base UI primitives (@base-ui/react) + Tailwind
- Atomic components only (Button, Input, Card, etc.)
- No page/workflow logic
- Exported from `@multica/ui/components/ui/`

**`packages/views/` — Shared business pages/components**
- Zero `next/*` imports (use `NavigationAdapter` instead)
- Zero `react-router-dom` imports
- Zero stores (read from `@multica/core`, never write)
- Can import from `@multica/core` and `@multica/ui`
- Pages, forms, modals, feature-specific components
- Platform-agnostic routing via `useNavigation().push()`

**`apps/web/platform/` — Next.js-specific wiring only**
- Only place for `next/navigation` and Next.js server components
- Route definitions map shared pages to app structure
- `NavigationAdapter` implementation for Next.js

**`apps/desktop/src/renderer/src/platform/` — Electron-specific wiring only**
- Only place for `react-router-dom` and Electron APIs
- Tab management + window lifecycle
- `NavigationAdapter` implementation for Electron

**Cross-platform rule:**
If the same logic exists in both apps, it must be extracted to a shared package. No code duplication between apps.

## React & Component Patterns

**Component composition:** Props + composition over state when possible

**Event handlers:** Use `useCallback` to stabilize function references
```typescript
const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);
```

**Hooks:** All hooks from React, React Query, Zustand placed in hooks pattern position
```typescript
function MyComponent() {
  const state = useStore();
  const query = useQuery(...);
  const [local, setLocal] = useState(...);
  
  // Render and handlers below
}
```

**Data fetching:** Always use React Query, never raw `useState` + `useEffect`
```typescript
// Correct
const query = useQuery({
  queryKey: ['issues', wsId],
  queryFn: () => api.listIssues({ workspace_id: wsId }),
});

// Wrong — don't do this
const [issues, setIssues] = useState([]);
useEffect(() => {
  api.listIssues({ workspace_id: wsId }).then(setIssues);
}, [wsId]);
```

---

*Convention analysis: 2026-04-23*
