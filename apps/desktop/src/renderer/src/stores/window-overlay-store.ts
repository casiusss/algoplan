import { create } from "zustand";

/**
 * Window-level transition overlay: pre-workspace flows that are NOT pages
 * inside a tab. Triggered by navigation-adapter interception, zero-workspace
 * auto-redirect, or deep link; rendered above the tab system as a full-window
 * takeover.
 *
 * These flows used to be routes (`/workspaces/new`, `/invite/:id`) but on
 * desktop the URL is invisible to users — routes are an implementation detail
 * of the tab system. Representing transitions as routes meant tabs tried to
 * persist them, TabBar rendered on top, and invite deep-linking had no clean
 * dispatch target. Modeling them as application state removes all three.
 */
export type WindowOverlay =
  | { type: "new-workspace" }
  | { type: "invite"; invitationId: string }
  | { type: "onboarding" }
  // Phase 6 AUTH (Plan 07): pre-workspace auth flows live as overlays on
  // desktop, mirroring the existing new-workspace / invite / onboarding
  // pattern. The optional `token?: string` payload on verify-email and
  // reset-password carries the token parsed from `/auth/{verb}?token=...`
  // by the navigation adapter — see `platform/navigation.tsx`.
  | { type: "signup" }
  | { type: "verify-email"; token?: string }
  | { type: "verify-email-resend" }
  | { type: "forgot-password" }
  | { type: "reset-password"; token?: string };

interface WindowOverlayStore {
  overlay: WindowOverlay | null;
  open: (overlay: WindowOverlay) => void;
  close: () => void;
}

export const useWindowOverlayStore = create<WindowOverlayStore>((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
}));
