# Testing Patterns

**Analysis Date:** 2026-04-23

## Test Framework Matrix

**Location guides where tests live based on what's being tested:**

| What you're testing | Framework | Environment | Where it lives | Config file |
|---|---|---|---|---|
| Shared business logic (stores, utilities, hooks) | Vitest | Node (no DOM) | `packages/core/*.test.ts` | `packages/core/vitest.config.ts` |
| Shared UI components, pages, forms | Vitest + @testing-library/react | jsdom | `packages/views/*.test.tsx` | `packages/views/vitest.config.ts` |
| Next.js-specific routes, middleware, cookies | Vitest + @testing-library/react | jsdom | `apps/web/**/*.test.tsx` | `apps/web/vitest.config.ts` |
| Electron-specific wiring, IPC, window APIs | Vitest + @testing-library/react | jsdom | `apps/desktop/**/*.test.tsx` | `apps/desktop/vitest.config.ts` |
| End-to-end critical user flows | Playwright | Real browser + real backend | `e2e/*.spec.ts` | `playwright.config.ts` |
| Go server logic | Go testing | N/A | `server/**/*_test.go` | N/A |

**Critical principle:** Tests follow the code, not the app. If a component from `@multica/views` is tested, the test belongs in `packages/views/` — not in the app where it's consumed.

## Test File Organization

**Naming convention:**
- Same filename as source, with `.test` or `.spec` suffix
- Examples: `login-page.tsx` → `login-page.test.tsx`, `store.ts` → `store.test.ts`

**Co-location:**
- Test files live alongside source files in the same directory
- No separate `__tests__` directories

**File structure:**
```
packages/core/
├── auth/
│   ├── store.ts
│   ├── store.test.ts          ← Test for store.ts
│   ├── utils.ts
│   └── utils.test.ts          ← Test for utils.ts
└── api/
    ├── client.ts
    ├── client.test.ts         ← Test for client.ts
    └── ws-client.test.ts      ← Separate component

packages/views/
├── auth/
│   ├── login-page.tsx
│   └── login-page.test.tsx    ← Test for login-page
└── chat/
    └── components/
        ├── chat-window.tsx
        └── chat-window.test.tsx
```

## Run Commands

**All tests (Turborepo discovers packages):**
```bash
pnpm test
```

**Single package tests:**
```bash
pnpm --filter @multica/core test
pnpm --filter @multica/views test
pnpm --filter @multica/web test
```

**Single test file (from project root):**
```bash
pnpm --filter @multica/views exec vitest run auth/login-page.test.tsx
pnpm --filter @multica/core exec vitest run auth/store.test.ts
pnpm --filter @multica/web exec vitest run app/\(auth\)/login/page.test.tsx
```

**Watch mode (file re-runs on change):**
```bash
pnpm --filter @multica/core test --watch
pnpm --filter @multica/views test --watch
```

**Coverage report:**
```bash
pnpm --filter @multica/core test --coverage
pnpm --filter @multica/views test --coverage
```

**Go tests (from server/ directory):**
```bash
cd server && go test ./...                    # All tests
cd server && go test ./internal/handler       # Specific package
cd server && go test ./... -run TestName      # Specific test
```

**E2E tests (requires backend + frontend running):**
```bash
pnpm exec playwright test                     # All E2E
pnpm exec playwright test e2e/auth.spec.ts   # Single file
pnpm exec playwright test --debug             # Debug mode with Inspector
```

**Full verification pipeline:**
```bash
make check    # Typecheck + TS unit tests + Go tests + E2E (requires running services)
```

## Test Structure

**Vitest test suite format:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

describe("FeatureName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should do something specific", async () => {
    // Test implementation
    expect(...).toEqual(...);
  });
});
```

**Real example from `packages/core/auth/store.test.ts`:**
```typescript
describe("authStore.initialize — token mode", () => {
  it("keeps the stored token when getMe fails with a non-401 ApiError", async () => {
    const storage = makeStorage({ multica_token: "t" });
    const api = makeApi(() =>
      Promise.reject(new ApiError("server error", 500, "Internal Server Error")),
    );
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(store.getState().isLoading).toBe(false);
    expect(storage.snapshot().multica_token).toBe("t");
  });
});
```

**Component test example from `packages/views/auth/login-page.test.tsx`:**
```typescript
describe("LoginPage", () => {
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders email form with 'Sign in to Multica' title", () => {
    render(<LoginPage onSuccess={onSuccess} />);
    expect(screen.getByText(/sign in to multica/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
```

## Mocking Conventions

**Zustand store mocking:** Use `vi.hoisted()` + `Object.assign()` pattern

```typescript
// At top of test file, in hoisted block
const mockSendCode = vi.hoisted(() => vi.fn());
const mockVerifyCode = vi.hoisted(() => vi.fn());

vi.mock("@multica/core/auth", () => ({
  useAuthStore: Object.assign(
    // Zustand hook form — component may call useAuthStore(selector)
    (selector?: (s: unknown) => unknown) => {
      const state = { sendCode: mockSendCode, verifyCode: mockVerifyCode };
      return selector ? selector(state) : state;
    },
    {
      // Zustand also exposes .getState() for direct access
      getState: () => ({
        sendCode: mockSendCode,
        verifyCode: mockVerifyCode,
      }),
    },
  ),
}));
```

**Why this pattern?** Zustand stores are both callable hooks AND have a `.getState()` method. This pattern ensures both work.

**API client mocking:**
```typescript
const mockApiGetMe = vi.hoisted(() => vi.fn());

vi.mock("@multica/core/api", () => ({
  api: {
    getMe: mockApiGetMe,
    listWorkspaces: vi.fn(),
    verifyCode: vi.fn(),
    setToken: vi.fn(),
    // ... other methods
  },
}));

// In test:
mockApiGetMe.mockResolvedValueOnce({ id: "u-1", email: "user@example.com" });
mockApiGetMe.mockRejectedValueOnce(new Error("unauthorized"));
```

**React Query mocking:**
```typescript
const mockSetQueryData = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({ setQueryData: mockSetQueryData }),
  };
});
```

**What to mock:**
- External services and APIs (`@multica/core/api`)
- Third-party libraries if they have side effects
- Zustand stores (never test implementation details of stores, mock them in component tests)
- Timers for deadline-sensitive tests (`vi.useFakeTimers()`)

**What NOT to mock:**
- Never mock `@multica/core/types` in `packages/views/` tests
- Never mock `next/navigation` in `packages/views/` tests (tests belong in `packages/views/`, not app)
- Never mock `react-router-dom` in `packages/views/` tests
- Don't mock `react` or `@testing-library/react` utilities

## Fixtures and Factories

**Test data factories for E2E:**

Location: `e2e/fixtures.ts`

```typescript
export class TestApiClient {
  private token: string | null = null;
  private workspaceSlug: string | null = null;

  async login(email: string, name: string) {
    // Step 1: send-code
    // Step 2: read code from DB
    // Step 3: verify-code to get JWT
    this.token = data.token;
  }

  async ensureWorkspace(name = "E2E Workspace", slug = "e2e-workspace") {
    // Create or find workspace
  }

  async createIssue(title: string, description?: string) {
    // Create test issue in current workspace
  }

  async cleanup() {
    // Delete all test data created during test
  }

  getToken(): string {
    return this.token!;
  }
}
```

**Usage in E2E tests:**

```typescript
import { loginAsDefault, createTestApi } from "./helpers";

test.beforeEach(async ({ page }) => {
  // Option 1: Login via UI + API setup
  const slug = await loginAsDefault(page);

  // Option 2: Create API client for data setup
  const api = await createTestApi();
  const issue = await api.createIssue("Test Issue");
});

test.afterEach(async () => {
  await api.cleanup();  // Clean up test data
});

test("example", async ({ page }) => {
  await page.goto(`/${slug}/issues/${issue.id}`);
  // Assertions...
});
```

**Helper patterns from `e2e/helpers.ts`:**

```typescript
/**
 * Log in as the default E2E user and ensure the workspace exists.
 * Authenticates via API, then injects token into localStorage.
 */
export async function loginAsDefault(page: Page): Promise<string> {
  const api = new TestApiClient();
  await api.login("e2e@multica.ai", "E2E User");
  const workspace = await api.ensureWorkspace("E2E Workspace", "e2e-workspace");

  const token = api.getToken();
  await page.goto("/login");
  await page.evaluate((t) => {
    localStorage.setItem("multica_token", t);
  }, token);
  await page.goto(`/${workspace.slug}/issues`);
  return workspace.slug;
}
```

## Coverage Requirements

**Target:** 80%+ across all packages

**Measure coverage:**
```bash
pnpm --filter @multica/core test --coverage
pnpm --filter @multica/views test --coverage
```

**What counts as coverage:**
- Unit tests for utilities, helpers, store logic
- Component render + interaction tests
- Happy path + error path scenarios
- Edge cases and boundary conditions

**What's acceptable to skip:**
- Platform-specific code (OS-level APIs)
- External library integration (we trust the library)
- Trivial getters/setters if well-covered in integration
- Generated code (sqlc, TypeScript types)

## Test Types

### Unit Tests

**Scope:** Individual functions, utilities, stores

**When to write:** Every public function should have a unit test

**Pattern from `packages/core/utils.test.ts`:**
```typescript
describe("utils id helpers", () => {
  it("generateUUID returns a valid UUID v4", () => {
    const id = generateUUID();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("createSafeId falls back when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i;
        return arr;
      },
    });
    const id = createSafeId();
    expect(id).toMatch(/^[0-9a-f]{8}..../);
  });
});
```

### Integration Tests

**Scope:** Store + API interactions, form submissions with async operations

**Pattern from `packages/views/auth/login-page.test.tsx`:**
```typescript
describe("LoginPage", () => {
  it("calls sendCode on form submit with email", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockSendCode).toHaveBeenCalledWith("test@example.com");
  });

  it("transitions to code step after successful sendCode", async () => {
    mockSendCode.mockResolvedValueOnce(undefined);
    render(<LoginPage onSuccess={onSuccess} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });
});
```

**Key patterns:**
- Setup mocks with specific return values
- Perform user interactions via `userEvent.setup()`
- Assert both external calls and DOM changes
- Use `waitFor()` for async state updates

### E2E Tests

**Scope:** Critical user flows end-to-end (login, create issue, comment, etc.)

**Framework:** Playwright

**Pattern from `e2e/auth.spec.ts`:**
```typescript
import { test, expect } from "@playwright/test";
import { loginAsDefault, openWorkspaceMenu } from "./helpers";

test.describe("Authentication", () => {
  test("login and redirect to /issues", async ({ page }) => {
    await loginAsDefault(page);
    await expect(page).toHaveURL(/\/issues/);
    await expect(page.locator("text=All Issues")).toBeVisible();
  });

  test("logout redirects to /login", async ({ page }) => {
    await loginAsDefault(page);
    await openWorkspaceMenu(page);
    await page.locator("text=Sign out").click();
    await page.waitForURL("**/login", { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
```

**Key patterns:**
- Use `loginAsDefault()` helper to set up authenticated browser state
- Use TestApiClient for data setup/teardown
- Test full flow: user action → API call → UI update
- Assert visible outcomes, not implementation details
- Use `waitForURL()` for navigation assertions

## Common Testing Patterns

### Async Testing

**Pattern with async/await:**
```typescript
it("populates user when getMe succeeds", async () => {
  const storage = makeStorage({ multica_token: "t" });
  const api = makeApi(() => Promise.resolve(fakeUser));
  const store = createAuthStore({ api, storage });

  await store.getState().initialize();

  expect(store.getState().user).toEqual(fakeUser);
});
```

**Pattern with React component async operations:**
```typescript
it("calls verifyCode and onSuccess", async () => {
  mockVerifyCode.mockResolvedValueOnce(undefined);
  mockApiListWorkspaces.mockResolvedValueOnce([{ id: "ws-1" }]);

  render(<LoginPage onSuccess={onSuccess} />);
  const user = userEvent.setup();
  
  // Type code
  const otpInput = getOTPInput();
  await user.type(otpInput, "123456");

  // Wait for async completion
  await waitFor(() => {
    expect(mockVerifyCode).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});
```

**Pattern with fake timers:**
```typescript
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

it("advances timer and shows updated state", async () => {
  render(<Component />);
  expect(screen.getByText(/60 seconds/)).toBeInTheDocument();

  // Advance 61 seconds
  for (let i = 0; i < 61; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
  }

  await waitFor(() => {
    expect(screen.getByText(/resend code/)).toBeInTheDocument();
  });
});
```

### Error Testing

**Pattern for API error handling:**
```typescript
it("shows error on invalid code", async () => {
  mockSendCode.mockResolvedValueOnce(undefined);
  mockVerifyCode.mockRejectedValueOnce(new Error("Invalid code"));

  render(<LoginPage onSuccess={onSuccess} />);

  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await waitFor(() => {
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  const otpInput = getOTPInput();
  await user.type(otpInput, "000000");

  await waitFor(() => {
    expect(screen.getByText("Invalid code")).toBeInTheDocument();
  });
  expect(onSuccess).not.toHaveBeenCalled();
});
```

**Pattern for authorization errors:**
```typescript
it("keeps the stored token when getMe fails with a non-401 ApiError", async () => {
  const storage = makeStorage({ multica_token: "t" });
  const api = makeApi(() =>
    Promise.reject(new ApiError("server error", 500, "Internal Server Error")),
  );
  const store = createAuthStore({ api, storage });

  await store.getState().initialize();

  // Token should NOT be cleared on non-401 errors
  expect(storage.snapshot().multica_token).toBe("t");
});

it("on 401, clears token and resets state", async () => {
  const storage = makeStorage({ multica_token: "t" });
  const api = makeApi(() => {
    storage.removeItem("multica_token"); // Simulates ApiClient.onUnauthorized
    return Promise.reject(new ApiError("unauthorized", 401, "Unauthorized"));
  });
  const store = createAuthStore({ api, storage });

  await store.getState().initialize();

  expect(storage.snapshot().multica_token).toBeUndefined();
  expect(store.getState().user).toBeNull();
});
```

## Vitest Configuration

**Core tests (Node environment):** `packages/core/vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
```

**View tests (jsdom environment):** `packages/views/vitest.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
});
```

**Setup file provides jsdom polyfills:** `packages/views/test/setup.ts`
```typescript
import "@testing-library/jest-dom/vitest";

// Polyfill localStorage
if (typeof globalThis.localStorage?.clear !== "function") {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}

// Polyfill matchMedia for useIsMobile()
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    // ... full implementation
  });
}

// Polyfill ResizeObserver for input-otp
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill elementFromPoint
if (typeof document.elementFromPoint !== "function") {
  document.elementFromPoint = () => null;
}
```

## pnpm Catalog for Test Dependencies

All test dependencies pinned in `pnpm-workspace.yaml` for unified versioning:

```yaml
catalog:
  vitest: "^4.1.0"
  jsdom: "^29.0.1"
  "@vitejs/plugin-react": "^6.0.1"
  "@testing-library/react": "^16.3.2"
  "@testing-library/jest-dom": "^6.9.1"
  "@testing-library/user-event": "^14.6.1"
```

Add new shared test deps to `catalog:` first, then reference via `catalog:` in `package.json`.

## Go Testing

**Pattern from `server/cmd/server/scope_authorizer_test.go`:**

```go
package main

import (
  "context"
  "testing"
  "github.com/google/uuid"
)

type fakeScopeQuerier struct {
  tasks map[[16]byte]db.AgentTaskQueue
}

func (f *fakeScopeQuerier) GetAgentTask(ctx context.Context, id pgtype.UUID) (db.AgentTaskQueue, error) {
  if t, ok := f.tasks[id.Bytes]; ok {
    return t, nil
  }
  return db.AgentTaskQueue{}, errors.New("not found")
}

func mustUUID(t *testing.T) (string, pgtype.UUID) {
  t.Helper()
  u, err := uuid.NewRandom()
  if err != nil {
    t.Fatal(err)
  }
  return u.String(), pgtype.UUID{Bytes: u, Valid: true}
}

// TestScopeAuthorizer_ChatRequiresCreator pins must-fix #2 from PR #1429
func TestScopeAuthorizer_ChatRequiresCreator(t *testing.T) {
  wsStr, wsUUID := mustUUID(t)
  creatorStr, creatorUUID := mustUUID(t)
  
  q := &fakeScopeQuerier{
    sessions: map[[16]byte]db.ChatSession{
      sessUUID.Bytes: {
        ID:          sessUUID,
        WorkspaceID: wsUUID,
        CreatorID:   creatorUUID,
      },
    },
  }
  
  // Creator in matching workspace → allowed.
  ok, err := a.AuthorizeScope(ctx, creatorStr, wsStr, realtime.ScopeChat, sessStr)
  if err != nil || !ok {
    t.Fatalf("creator should be allowed: ok=%v err=%v", ok, err)
  }
}
```

---

*Testing analysis: 2026-04-23*
