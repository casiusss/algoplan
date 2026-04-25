// Storybook 9 preview entry — CSS + font imports only.
// Plan 02 will extend this file with globalTypes.theme, decorators, and parameters.a11y.
//
// SSR-safety note: any browser-only code added in Plan 02 (e.g. document mutations
// in the theme decorator) MUST guard with `typeof document !== "undefined"`.
import type { Preview } from "@storybook/react-vite"

// Font loading — mirrors apps/desktop/src/renderer/src/main.tsx (FND-02 / D-11).
// Italic axis is required because Phase 1 D-11 locks Inter italic for display headings.
import "@fontsource-variable/inter"
import "@fontsource-variable/inter/wght-italic.css"

// Tailwind + tokens + base styles + @source directives.
// This single import IS the entire visual chain — pixel parity with apps/web/app/globals.css.
import "./preview.css"

const preview: Preview = {
  // Plan 02 adds: globalTypes.theme, initialGlobals.theme, decorators, parameters.a11y, parameters.layout.
  parameters: {},
}

export default preview
