// CITED: Storybook 9 docs — React Vite framework + addons configuration
// https://storybook.js.org/docs/get-started/frameworks/react-vite
//
// Addons explained:
// - @storybook/addon-a11y: axe-core panel; required by SB-04 / SC#3
//   (panel is rendered automatically; per-story config in preview.tsx Plan 02)
// - @storybook/addon-docs: needed for parameters.docs.description.story
//   (per UI-SPEC §main.ts contract — used for the smoke-story instructional copy)
//
// NOT installed:
// - the legacy "essentials" meta-addon → REMOVED in Storybook 9.0 (would throw at startup)
// - @storybook/addon-themes → UI-SPEC §Hard Constraint #8: hand-rolled
//   globalTypes.theme is preferred (3 lines of code in preview.tsx; no extra dep)
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
}

export default config
