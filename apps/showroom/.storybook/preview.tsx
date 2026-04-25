// Storybook 9 preview entry — full configuration.
//
// Theme toggle decision (UI-SPEC §Hard Constraint #8):
//   Hand-rolled globalTypes.theme + decorator that mutates document.documentElement.
//   NOT @storybook/addon-themes (would add a wrapper div + extra dependency).
//   Targeting documentElement matches what next-themes does on apps/web (semantic
//   parity), and guarantees the .dark class is on a true ancestor of every story root
//   so Tailwind's `@custom-variant dark (&:is(.dark *))` resolves.
//
// a11y config (SB-04 / SC#3):
//   WCAG 2.1 AA ruleset = wcag2a + wcag2aa + wcag21a + wcag21aa
//   (excludes wcag2aaa/wcag21aaa — those are AAA, out of scope per UI-SPEC).
//   Applied via parameters.a11y → runs on every story automatically (no per-story
//   opt-in, per UI-SPEC §Hard Constraint #9).
import type { Preview } from "@storybook/react-vite"

// Font loading — mirrors apps/desktop/src/renderer/src/main.tsx (FND-02 / D-11)
import "@fontsource-variable/inter"
import "@fontsource-variable/inter/wght-italic.css"

// Tailwind + tokens + base styles + @source directives
import "./preview.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme for stories (mirrors next-themes .dark on apps/web)",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      // Toggle .dark on the iframe <html>. Same DOM ancestor that
      // `@custom-variant dark (&:is(.dark *))` (declared in preview.css) resolves
      // against. SSR-safe guard for Storybook's docs-page generation in Node.
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle(
          "dark",
          context.globals.theme === "dark",
        )
      }
      return <Story />
    },
  ],
  parameters: {
    a11y: {
      // CITED: Storybook addon-a11y docs — WCAG ruleset configuration.
      // WCAG 2.1 AA = wcag2a + wcag2aa + wcag21a + wcag21aa.
      options: {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    },
    layout: "padded", // small breathing room around story content
  },
}

export default preview
