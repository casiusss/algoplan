import { NotFoundPage } from "@algoplan/views/common/not-found-page";

/**
 * Next.js convention: `app/not-found.tsx` is the default 404 handler. It's
 * mounted whenever a route segment calls `notFound()` or no matching route
 * is found.
 *
 * The shared `<NotFoundPage>` (Wave-0 atom) already includes:
 *   - <DragStrip /> as the first flex child (macOS drag region)
 *   - <AlgoPlanWordmark /> brand chrome
 *   - German copy + brand-green CTA back to "/"
 *
 * Per CLAUDE.md, this file lives in `apps/web/app/` — the only place Next.js
 * APIs may be referenced. The wrapper just imports the shared view; no
 * additional Next-specific wiring is needed.
 */
export default function NotFound() {
  return <NotFoundPage />;
}
