import { useQuery } from "@tanstack/react-query";
import { NewWorkspacePage } from "@algoplan/views/workspace/new-workspace-page";
import { InvitePage } from "@algoplan/views/invite";
import { OnboardingFlow } from "@algoplan/views/onboarding";
import {
  ForgotPasswordPage,
  ResendVerifyEmailPage,
  ResetPasswordPage,
  SignupPage,
  VerifyEmailPage,
} from "@algoplan/views/auth";
import { useNavigation } from "@algoplan/views/navigation";
import { DragStrip } from "@algoplan/views/platform";
import { paths } from "@algoplan/core/paths";
import { workspaceListOptions } from "@algoplan/core/workspace/queries";
import { useWindowOverlayStore } from "@/stores/window-overlay-store";

/**
 * Window-level transition overlay: renders above the tab system when the
 * user is in a pre-workspace flow (onboarding, create workspace, accept
 * invite).
 *
 * This component is intentionally thin — just a fixed positioning shell
 * that covers the tab system. It does NOT hide traffic lights or provide
 * a drag strip: each contained view (OnboardingFlow, NewWorkspacePage,
 * InvitePage) renders its own `<DragStrip />` as a flex-child at top so
 * native macOS traffic lights stay visible and the page content can fill
 * the window edge-to-edge. This matches the Linear/Notion/Arc pattern for
 * pre-dashboard flows and keeps platform chrome consistent across every
 * "not-in-dashboard" surface.
 *
 * All UX affordances (Back button, Log out button, welcome copy, invite
 * card) live inside the shared view components under `packages/views/`,
 * so web and desktop render identical content.
 */
export function WindowOverlay() {
  const overlay = useWindowOverlayStore((s) => s.overlay);
  if (!overlay) return null;
  return <WindowOverlayInner />;
}

function WindowOverlayInner() {
  const overlay = useWindowOverlayStore((s) => s.overlay);
  const close = useWindowOverlayStore((s) => s.close);
  const { push } = useNavigation();
  const { data: wsList = [] } = useQuery(workspaceListOptions());

  if (!overlay) return null;

  // Back is only meaningful when there's somewhere to go — i.e. the user
  // has at least one workspace. Zero-workspace users can only Log out or
  // complete the flow.
  const onBack = wsList.length > 0 ? close : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-auto bg-background">
      {overlay.type === "new-workspace" && (
        <NewWorkspacePage
          onSuccess={(ws) => push(paths.workspace(ws.slug).issues())}
          onBack={onBack}
        />
      )}
      {overlay.type === "invite" && (
        <InvitePage
          invitationId={overlay.invitationId}
          onBack={onBack}
        />
      )}
      {overlay.type === "onboarding" && (
        <OnboardingFlow
          onComplete={(ws) => {
            close();
            // Post-onboarding landing is always the workspace issues
            // list. The welcome-issue flow moved into a dialog that
            // renders on that page (StarterContentPrompt), so the
            // flow doesn't need to thread a target issue id back here.
            if (ws) {
              push(paths.workspace(ws.slug).issues());
            } else {
              push(paths.root());
            }
          }}
        />
      )}

      {/* Phase 6 AUTH (Plan 07): pre-workspace auth flows. Each shared
          page is a centered card without its own page-root chrome —
          DesktopAuthShell wraps them with the DragStrip-bearing flex
          column the existing branches mount inline. The shell mounts
          <DragStrip /> as the FIRST flex child of its outer container
          per UI-SPEC §Hard Constraints #1; the dragstrip-coverage gate
          enforces the same invariant for the shared `packages/views/`
          full-window pages, so adding it ONCE here keeps both apps
          aligned without per-shared-page changes. */}
      {overlay.type === "signup" && (
        <DesktopAuthShell>
          <SignupPage />
        </DesktopAuthShell>
      )}
      {overlay.type === "verify-email" && (
        <DesktopAuthShell>
          <VerifyEmailPage token={overlay.token} />
        </DesktopAuthShell>
      )}
      {overlay.type === "verify-email-resend" && (
        <DesktopAuthShell>
          <ResendVerifyEmailPage />
        </DesktopAuthShell>
      )}
      {overlay.type === "forgot-password" && (
        <DesktopAuthShell>
          <ForgotPasswordPage />
        </DesktopAuthShell>
      )}
      {overlay.type === "reset-password" && (
        <DesktopAuthShell>
          <ResetPasswordPage token={overlay.token} />
        </DesktopAuthShell>
      )}
    </div>
  );
}

/**
 * Desktop chrome wrapper for the shared @algoplan/views/auth pages.
 *
 * The shared pages (SignupPage, VerifyEmailPage, etc.) render a centered
 * card via `<div className="flex flex-1 flex-col items-center justify-center …">`
 * but deliberately do NOT mount DragStrip themselves — the wrapping shell
 * is expected to supply it. On web that wrapper is the Next.js route file;
 * on desktop it's this component.
 *
 * Layout contract (UI-SPEC §Hard Constraints #1): DragStrip is the FIRST
 * flex child of the page-root flex container so the top 48px stays a
 * draggable region on macOS. The auth pages take the remaining flex-1.
 */
function DesktopAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <DragStrip />
      {children}
    </div>
  );
}
