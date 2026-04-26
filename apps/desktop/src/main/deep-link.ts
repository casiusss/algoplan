// Deep-link parsing extracted from index.ts for testability (Phase 7 Plan 07-04).
// Pure function: takes a URL string + a "send" callback (BrowserWindow.webContents.send),
// returns void. No side effects beyond the callback.
//
// PROTOCOL_NAME is the SINGLE source of truth for the deep-link scheme registered
// with the OS (electron-builder.yml protocols.schemes + setAsDefaultProtocolClient
// in index.ts) and emitted by the web auth callback. Changing it requires an
// atomic flip across web (apps/web/app/auth/callback/page.tsx,
// apps/web/app/(auth)/login/page.tsx) AND the electron-builder config — see
// 07-04-SUMMARY.md "ATOMIC FLIP" for the contract.

const PROTOCOL = "algoplan";

type SendFn = (channel: string, ...args: unknown[]) => void;

export function handleDeepLink(url: string, send: SendFn | null): void {
  if (!send) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;

    // algoplan://auth/callback?token=<jwt>
    if (parsed.hostname === "auth" && parsed.pathname === "/callback") {
      const token = parsed.searchParams.get("token");
      if (token) send("auth:token", token);
      return;
    }

    // algoplan://invite/<invitationId>
    // Dispatched from the web invite page when the user chooses "Open in
    // desktop app". The renderer opens the invite overlay — no tab, no
    // route persistence, so deep-linking the same invite twice stays safe.
    if (parsed.hostname === "invite") {
      const id = parsed.pathname.replace(/^\//, "");
      if (id) send("invite:open", decodeURIComponent(id));
      return;
    }
  } catch {
    // Ignore malformed URLs
  }
}

export const PROTOCOL_NAME = PROTOCOL;
