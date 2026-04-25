// Source: mirrors apps/desktop/electron.vite.config.ts renderer block
// Storybook's @storybook/react-vite framework merges its own config on top of this.
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
})
