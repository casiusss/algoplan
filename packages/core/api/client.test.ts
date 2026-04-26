import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiClient", () => {
  it("preserves HTTP status on failed requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "workspace slug already exists" }), {
          status: 409,
          statusText: "Conflict",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const client = new ApiClient("https://api.example.test");

    try {
      await client.createWorkspace({ name: "Test", slug: "test" });
      throw new Error("expected createWorkspace to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        message: "workspace slug already exists",
        status: 409,
        statusText: "Conflict",
      });
    }
  });

  it("uses the expected HTTP contract for autopilot endpoints", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ autopilots: [], runs: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");

    await client.listAutopilots({ status: "active" });
    await client.getAutopilot("ap-1");
    await client.createAutopilot({
      title: "Daily triage",
      assignee_id: "agent-1",
      execution_mode: "create_issue",
    });
    await client.updateAutopilot("ap-1", { status: "paused" });
    await client.deleteAutopilot("ap-1");
    await client.triggerAutopilot("ap-1");
    await client.listAutopilotRuns("ap-1", { limit: 10, offset: 20 });
    await client.createAutopilotTrigger("ap-1", {
      kind: "schedule",
      cron_expression: "0 9 * * *",
      timezone: "UTC",
    });
    await client.updateAutopilotTrigger("ap-1", "tr-1", { enabled: false });
    await client.deleteAutopilotTrigger("ap-1", "tr-1");

    const calls = fetchMock.mock.calls.map(([url, init]) => ({
      url,
      method: init?.method ?? "GET",
      body: init?.body,
    }));

    expect(calls).toMatchObject([
      { url: "https://api.example.test/api/autopilots?status=active", method: "GET" },
      { url: "https://api.example.test/api/autopilots/ap-1", method: "GET" },
      {
        url: "https://api.example.test/api/autopilots",
        method: "POST",
        body: JSON.stringify({
          title: "Daily triage",
          assignee_id: "agent-1",
          execution_mode: "create_issue",
        }),
      },
      {
        url: "https://api.example.test/api/autopilots/ap-1",
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      },
      { url: "https://api.example.test/api/autopilots/ap-1", method: "DELETE" },
      { url: "https://api.example.test/api/autopilots/ap-1/trigger", method: "POST" },
      { url: "https://api.example.test/api/autopilots/ap-1/runs?limit=10&offset=20", method: "GET" },
      {
        url: "https://api.example.test/api/autopilots/ap-1/triggers",
        method: "POST",
        body: JSON.stringify({
          kind: "schedule",
          cron_expression: "0 9 * * *",
          timezone: "UTC",
        }),
      },
      {
        url: "https://api.example.test/api/autopilots/ap-1/triggers/tr-1",
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      },
      { url: "https://api.example.test/api/autopilots/ap-1/triggers/tr-1", method: "DELETE" },
    ]);
  });

  it("emits X-Client-* headers when identity is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test", {
      identity: { platform: "desktop", version: "1.2.3", os: "macos" },
    });
    await client.listWorkspaces();

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["X-Client-Platform"]).toBe("desktop");
    expect(headers["X-Client-Version"]).toBe("1.2.3");
    expect(headers["X-Client-OS"]).toBe("macos");
  });

  it("omits X-Client-* headers when identity is not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    await client.listWorkspaces();

    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["X-Client-Platform"]).toBeUndefined();
    expect(headers["X-Client-Version"]).toBeUndefined();
    expect(headers["X-Client-OS"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Auth (Phase 6 additions) — signup / login / verifyEmail /
// resendVerifyEmail / requestPasswordReset / resetPassword
//
// Backend contracts FROZEN by Phase 5.1. The login error MUST be
// no-enumerating: any 401 produces the SAME thrown error shape regardless
// of which credential side failed. Resend + request-reset always resolve
// (idempotent — backend returns 200 even for unknown emails). resetPassword
// uses snake_case `new_password` per the FROZEN backend contract.
// ---------------------------------------------------------------------------

describe("ApiClient — auth (Phase 6 additions)", () => {
  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Phase 5.1 idempotent endpoints (resend / request-reset) return 200 with
  // a JSON envelope. The body is intentionally generic ({} or
  // {message:"..."}) so the same response shape is used for unknown-email
  // AND fresh-issuance paths — defeating enumeration via response inspection.
  function emptyJsonResponse(status = 200) {
    return new Response("{}", {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // signup ------------------------------------------------------------------

  it("signup: 200 returns LoginResponse and posts {email, password, name}", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ token: "tok-1", user: { id: "u-1", email: "x@y.test", name: "X" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    const res = await client.signup({
      email: "x@y.test",
      password: "supersecret-password-12",
      name: "X",
    });

    expect(res).toEqual({
      token: "tok-1",
      user: { id: "u-1", email: "x@y.test", name: "X" },
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/signup");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({
        email: "x@y.test",
        password: "supersecret-password-12",
        name: "X",
      }),
    );
  });

  it("signup: 400 throws ApiError with status 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "weak password" }, 400)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.signup({ email: "x@y.test", password: "short", name: "X" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
    });
  });

  it("signup: 403 throws ApiError with status 403 (signup gated)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "signup gated" }, 403)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.signup({ email: "x@y.test", password: "supersecret-password-12", name: "X" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 403 });
  });

  it("signup: 409 throws ApiError with status 409 (duplicate email)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "duplicate email" }, 409)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.signup({ email: "x@y.test", password: "supersecret-password-12", name: "X" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 409 });
  });

  // login -------------------------------------------------------------------

  it("login: 200 returns LoginResponse and posts {email, password}", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ token: "tok-2", user: { id: "u-1", email: "x@y.test", name: "X" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    const res = await client.login({ email: "x@y.test", password: "supersecret-password-12" });

    expect(res).toEqual({
      token: "tok-2",
      user: { id: "u-1", email: "x@y.test", name: "X" },
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/login");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ email: "x@y.test", password: "supersecret-password-12" }),
    );
  });

  it("login: 401 produces a no-enumeration error (same shape regardless of which credential side failed)", async () => {
    // Simulation 1: backend would have classified this as unknown email.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "invalid credentials" }, 401)),
    );
    let unknownEmailErr: unknown;
    const client1 = new ApiClient("https://api.example.test");
    try {
      await client1.login({ email: "ghost@y.test", password: "anything-is-12-bytes" });
    } catch (e) {
      unknownEmailErr = e;
    }

    // Simulation 2: backend would have classified this as wrong password.
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "invalid credentials" }, 401)),
    );
    let wrongPwErr: unknown;
    const client2 = new ApiClient("https://api.example.test");
    try {
      await client2.login({ email: "real@y.test", password: "wrong-but-12-bytes-x" });
    } catch (e) {
      wrongPwErr = e;
    }

    // The thrown errors must have IDENTICAL discriminating shape — same
    // class, same status, same statusText. The caller cannot distinguish
    // which 401 path the backend took (no `reason` discriminator).
    expect(unknownEmailErr).toBeInstanceOf(ApiError);
    expect(wrongPwErr).toBeInstanceOf(ApiError);
    expect((unknownEmailErr as ApiError).status).toBe(401);
    expect((wrongPwErr as ApiError).status).toBe(401);
    expect((unknownEmailErr as ApiError).statusText).toBe(
      (wrongPwErr as ApiError).statusText,
    );
    // Whatever the message is, both branches produce the same constant —
    // the backend deliberately collapses both 401 paths into one body.
    expect((unknownEmailErr as ApiError).message).toBe(
      (wrongPwErr as ApiError).message,
    );
  });

  // verifyEmail -------------------------------------------------------------

  it("verifyEmail: 200 returns the user and posts {token}", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ id: "u-1", email: "x@y.test", name: "X" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    const res = await client.verifyEmail({ token: "verify-token-abc" });
    expect(res).toEqual({ id: "u-1", email: "x@y.test", name: "X" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/email-verify");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ token: "verify-token-abc" }));
  });

  it("verifyEmail: 401 throws ApiError (single shape covers reused/expired/invalid)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "invalid token" }, 401)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.verifyEmail({ token: "bad-token" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 401 });
  });

  // resendVerifyEmail -------------------------------------------------------

  it("resendVerifyEmail: 200 with idempotent JSON body resolves (does NOT throw)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(emptyJsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    // Backend always returns 200 even for unknown emails — the function MUST resolve.
    await expect(
      client.resendVerifyEmail({ email: "anyone@y.test" }),
    ).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/email-verify/resend");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ email: "anyone@y.test" }));
  });

  // requestPasswordReset ----------------------------------------------------

  it("requestPasswordReset: 200 with idempotent JSON body resolves (does NOT throw)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(emptyJsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.requestPasswordReset({ email: "anyone@y.test" }),
    ).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/password-reset/request");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ email: "anyone@y.test" }));
  });

  // resetPassword -----------------------------------------------------------

  it("resetPassword: 200 returns {message} and posts {token, new_password} (snake_case)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ message: "Password updated. Please log in." }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("https://api.example.test");
    const res = await client.resetPassword({
      token: "reset-token-xyz",
      new_password: "supersecret-password-12",
    });
    expect(res).toEqual({ message: "Password updated. Please log in." });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/auth/password-reset/confirm");
    expect(init?.method).toBe("POST");
    // Body MUST use snake_case `new_password` per FROZEN Phase 5.1 contract.
    expect(init?.body).toBe(
      JSON.stringify({
        token: "reset-token-xyz",
        new_password: "supersecret-password-12",
      }),
    );
    // Sanity: caller never sees `newPassword` in the wire payload.
    expect(init?.body).not.toContain("newPassword");
  });

  it("resetPassword: 400 throws ApiError with status 400 (weak password)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "weak password" }, 400)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.resetPassword({ token: "tok", new_password: "short" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 400 });
  });

  it("resetPassword: 401 throws ApiError with status 401 (bad/expired/reused token)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ error: "invalid token" }, 401)),
    );

    const client = new ApiClient("https://api.example.test");
    await expect(
      client.resetPassword({ token: "bad", new_password: "supersecret-password-12" }),
    ).rejects.toMatchObject({ name: "ApiError", status: 401 });
  });
});
