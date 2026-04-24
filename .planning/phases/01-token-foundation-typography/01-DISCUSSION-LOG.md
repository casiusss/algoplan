# Phase 1: Token Foundation + Typography — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 01-token-foundation-typography
**Areas discussed:** OKLCH-Farbwerte, Tag/AccentBar Token-Taxonomie, Dark-Mode FOUC + Theme-Options, CI-Enforcement + Source_Serif_4

---

## Gray Area Selection

**Question:** Phase 1 — welche Gray Areas wollen wir besprechen?

| Option | Description | Selected |
|--------|-------------|----------|
| OKLCH-Farbwerte | Konkrete Werte für deep-forest-green / mint-sage / white / Tag-Farben — Quelle? | ✓ |
| Tag/AccentBar Token-Taxonomie | Naming-Struktur, Priority vs. Category-Tags, AccentBar-Palette | ✓ |
| Dark-Mode FOUC + Theme-Options | Pre-React Script, storage-Key, System-Detection, Theme-Radios | ✓ |
| CI-Enforcement + Source_Serif_4 | Enforcement-Mechanismus, Scope, Source_Serif_4 Schicksal | ✓ |

**User's choice:** All 4 areas (multi-select).

---

## OKLCH-Farbwerte

### Q1: Woher kommen die konkreten OKLCH-Werte?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude schlägt aus Mocks vor | Claude sampelt Screenshots, User reviewed im Plan | |
| User liefert Hex/OKLCH-Liste | User schickt fertige Farb-Liste | ✓ (via Brand Guide) |
| Tailwind-Preset als Basis | emerald/green/slate als Startpunkt | |

**User's choice:** "ich liefere brand guide" (freeform).
**Notes:** Brand Guide kommt separat in nächster Nachricht.

### Q2: Wie wird der Dark-Mode abgeleitet?

| Option | Description | Selected |
|--------|-------------|----------|
| Separat definiert pro Slot (Recommended) | Eigene OKLCH-Werte Light + Dark, volle Kontrolle | ✓ |
| Auto-invert via Lightness-Flip | Mechanisches L → 1-L | |
| Hybrid: Core separat, Utility auto | Kompromiss | |

### Q3: Palette-Abdeckung — welche Token-Slots?

| Option | Description | Selected |
|--------|-------------|----------|
| Bestehende Slots + neue: sidebar/canvas/card + tag-p0..p3 (Recommended) | Minimal Additions | ✓ |
| Plus volle Tint-Scales (brand-50..950) | 10x Tokens pro Hue | |
| Nur semantic, keine neuen Slots | Tag-Farben auf destructive/warning/etc. mappen | |

### Q4: Canvas vs. Background — Beziehung?

| Option | Description | Selected |
|--------|-------------|----------|
| Neuer Token `--canvas` (mint-sage) ≠ `--background` (neutral) (Recommended) | Zwei Tokens, Auth-Pages bleiben neutral | |
| `--background` wird mint-sage, kein separater Canvas-Token | Ein Token überall | ✓ |
| `--canvas` + Layout-scoped Override | Hybrid | |

### Q5: Brand-Guide Lieferung — wie geht's weiter?

| Option | Description | Selected |
|--------|-------------|----------|
| User hängt Brand-Guide in nächster Nachricht an (Recommended) | Planner wartet, Placeholder-Werte | ✓ |
| Brand-Guide liegt schon im Repo | Pfad angeben | |
| Brand-Guide via URL/Figma-Link | Fetch via MCP/WebFetch | |

### Q6: Pre-Workspace-Views Hintergrund?

| Option | Description | Selected |
|--------|-------------|----------|
| Auch mint-sage — konsistente Marke (Recommended) | Auth pages erben --background | ✓ |
| Auth-Pages eigener `--auth-background` | Neutral/weiß separat | |
| Auth-Pages: dark-forest-green | Inverse Brand-Signal | |

### Q7: OKLCH — weitere Fragen oder nächste Area?

| Option | Description | Selected |
|--------|-------------|----------|
| Nächste Area | | |
| Noch Fragen zu OKLCH | | ✓ (free-text redirect) |

**User's choice:** "nimm farben von hier https://algorivo-web.vercel.app/" (freeform).
**Notes:** Pivotaler Moment — User hat Brand-Quelle zu Algorivo-Web verschoben. CSS-Bundle gefetcht (`/assets/index-BfV5Noj2.css`, 242KB), Palette extrahiert: brand-green `#008757`, surface-primary `#fafbfc`/`#0f1318`, komplett trading-aesthetic, kein mint-sage. PROJECT.md-Beschreibung widerspricht → Claude hat Konflikt markiert und Follow-up gestellt.

### Q8: Algorivo-Palette-Scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Komplett 1:1 übernehmen (Recommended) | Algorivo-Palette atomar adoptieren, PROJECT.md mint-sage obsolet | ✓ |
| Brand-Werte übernehmen, Layout bleibt wie PROJECT.md | Hybrid: Sidebar deep-forest-green, Canvas mint-sage aus brand-green generiert | |
| Nur Accent + Semantic übernehmen, Layout User-driven | Rest später via Brand-Guide | |

### Q9: Default-Theme bei AlgoPlan?

| Option | Description | Selected |
|--------|-------------|----------|
| Light als Default, Dark als Option (Recommended) | Matched Mock-Screenshots (hell) | ✓ |
| System-Preference als Default | OS-Setting respektieren | |
| Dark als Default (wie Algorivo) | Trading-Brand-Statement | |

---

## Tag/AccentBar Token-Taxonomie

### Q1: Priority-Tag-Farben (P0-P3) — Mapping?

| Option | Description | Selected |
|--------|-------------|----------|
| P0=rot, P1=orange, P2=gelb, P3=grün (Recommended) | Klassisches Heat-Mapping | |
| P0=rot, P1=orange, P2=blau (info), P3=grau (neutral) | P2=info statt warning, P3=nice-to-have | ✓ |
| Alle P-Tags grün mit Lightness-Abstufung | Monochrom | |
| User definiert später | Leave to Phase 2 | |

### Q2: Category-Tag-Farben — First-Class Tokens?

| Option | Description | Selected |
|--------|-------------|----------|
| NICHT als Tokens — out-of-scope für v1 (Recommended) | Matched PROJECT.md Out-of-Scope | ✓ |
| Generische Tag-Palette `--tag-1..8` | 8 unterscheidbare Farben | |
| Dedizierte `--tag-backend/frontend/launch/legal/devops` | Fix 5 Tokens | |

### Q3: AccentBar Color-Source?

| Option | Description | Selected |
|--------|-------------|----------|
| Priority-Tokens wiederverwenden (Recommended) | AccentBar nimmt --tag-p0..p3, keine neuen Tokens | ✓ |
| Eigene `--accent-bar-1..N` Tokens | Entkoppelt | |
| Variable Multi-Stripe-Component | Caller gibt Array | |

### Q4: Weitere Fragen oder nächste Area?

**User's choice:** "Nächste Area"

---

## Dark-Mode FOUC + Theme-Options

### Q1: Theme-Optionen — was sieht User in Settings?

| Option | Description | Selected |
|--------|-------------|----------|
| Light / Dark / System (Recommended) | 3-Radio wie in SET-02 | ✓ |
| Light / Dark nur — kein System | 2 Optionen | |
| Auto (System erstmal, danach User-Override) | Erster Besuch = System-Pref | |

### Q2: localStorage-Key für Theme?

| Option | Description | Selected |
|--------|-------------|----------|
| `multica_theme` (Recommended, matched RBR-05) | Bleibt `multica_*` Prefix (Anti-silent-logout) | ✓ |
| `theme` (standard next-themes Default) | Kein Prefix | |
| `algoplan_theme` | Widerspricht RBR-05 | |

### Q3: Pre-React FOUC-Script auf Desktop — wo liegt er?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline `<script>` in `index.html` (Recommended) | FND-03 explizit; keine Netz-Dep | ✓ |
| Separates `theme-init.js` via `<script src>` | Extra Request | |

### Q4: Wie bleiben web (next-themes) + desktop synchronisiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Gleiche storage-Key + gleiche Class-Strategy (Recommended) | Shared Hook in @multica/core | ✓ |
| Extrahierter Shared Theme-Store in packages/core | next-themes ersetzen | |

### Q5: Weitere Fragen oder nächste Area?

**User's choice:** "Nächste Area"

---

## CI-Enforcement + Source_Serif_4

### Q1: CI-Enforcement-Mechanismus?

| Option | Description | Selected |
|--------|-------------|----------|
| Shell-Grep in CI-Job (Recommended) | Regex in ci.yml | |
| ESLint-Plugin `eslint-plugin-tailwindcss` | Integriert in pnpm lint | |
| Stylelint mit custom pattern | — | |
| Pre-commit Hook + CI-Backup | Husky | |

**User's choice:** "keine — unnötig" (freeform).
**Notes:** **FND-04 gestrichen.** Enforcement-Rule wird NICHT implementiert. Bestehende Verstöße trotzdem migriert (siehe Q4).

### Q2: CI-Rule Scope — was wird geprüft?

| Option | Description | Selected |
|--------|-------------|----------|
| `packages/views/` + `packages/ui/` (Recommended) | — | |
| Plus `packages/core/` | — | |
| Plus `apps/web/app/[workspaceSlug]/` | — | |

**User's choice:** "keine" (freeform).
**Notes:** Moot — keine Rule, kein Scope.

### Q3: Source_Serif_4 Schicksal?

| Option | Description | Selected |
|--------|-------------|----------|
| Landing-only behalten, Workspace removed (Recommended) | Serif bleibt Landing (Display-Headlines), Workspace/Desktop bekommen nur Inter italic | ✓ |
| Komplett entfernen | Landing auf Inter italic umbauen (mehr Scope) | |
| Überall behalten | Ignoriert STATE.md Audit-Item | |

### Q4: Bestehende Verstöße — Migration Phase-Split?

| Option | Description | Selected |
|--------|-------------|----------|
| In Phase 1 migrieren, CI-Rule erst danach aktiv (Recommended) | Clean baseline (CI-Rule entfällt, Migration bleibt) | ✓ |
| CI-Rule aktiv, Ignore-List für Bestand | Moot ohne Rule | |
| Alle Verstöße in Phase 2 | — | |

### Q5: Alle 4 Areas durch. Weitere Gray Areas?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready für CONTEXT.md (Recommended) | Entscheidungen reichen | ✓ |
| Noch weitere Gray Areas erkunden | Font-Loading, Radius, Scrollbar, Chart-Farben | |

---

## Claude's Discretion

- Exact `oklch()` arithmetic conversion from Algorivo hex values (approximations acceptable; document inline).
- Values of secondary tokens (`--secondary`, `--muted`, `--accent`, `--sidebar`, `--sidebar-accent`) derived from Algorivo surface/border chain.
- Fate of the singleton `--priority` token (currently orange) now that per-priority tokens exist.
- Exact commit split inside Phase 1.
- Whether `CoreProvider` owns theme init or apps wire it locally.

## Deferred Ideas

- Algorivo chart-specific colors (`--color-loss-muted` etc.) — revisit if v2 adds dashboards.
- Category-Tag tokens as first-class — v2 (FTR-04).
- Shadow / radius token refinements — revisit in Phase 4 (Dashboard Shell) if needed.
- AI accent purple (`#a855f7` from Algorivo) — no defined AlgoPlan use yet.
- Landing-page palette alignment — out of milestone scope entirely.

## Scope Changes from REQUIREMENTS.md

1. **FND-04 dropped** (CI rule against hardcoded Tailwind colors) — user declined.
2. **Palette source pivot:** PROJECT.md "deep-forest-green sidebar + mint-sage canvas" → Algorivo web palette (brand-green on neutral surfaces, no mint-sage).
3. **Source_Serif_4 scope narrowed:** kept for Landing only; removed from Desktop bundle.

Planner must update PROJECT.md + REQUIREMENTS.md + ROADMAP.md traceability accordingly.
