import ReactDOM from "react-dom/client";
import App from "./App";
// Inter variable font covers all weights (100-900) in a single file.
// Geist Mono kept as-is for code blocks; CJK is handled by system font fallback
// (see globals.css --font-sans chain). Keep font stack in sync with apps/web/app/layout.tsx.
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
// Editorial serif — matches web's next/font Source_Serif_4. Loaded app-wide
// because onboarding headings (packages/views/onboarding/**) consume
// `font-serif` className. The italic axis is intentionally NOT loaded — the
// only italic-serif consumer is one line in step-welcome.tsx which falls back
// to synthesized italic; planner-accepted regression pending onboarding
// redesign (CONTEXT D-12 / Plan 01-02 SUMMARY).
import "@fontsource-variable/source-serif-4";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/700.css";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
