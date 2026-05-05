# Changelog

All notable changes to **hermes-theme-editor** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.4.4] — 2026-05-05

### Fixed
- **`anthropic` theme: font now overrides correctly** — added `!important` CSS rule in `customCSS` targeting `*:not(code):not(pre)…` so DM Sans wins over Tailwind utility-class `font-family` declarations that ignore CSS variable changes
- **`anthropic` theme: default Hermes background filler hidden** — changed `assets.bg` from `""` to `"none"`; an empty string leaves the Hermes default background image visible, `"none"` explicitly suppresses it via the `--theme-asset-bg: none` CSS var

---

## [0.4.3] — 2026-05-05

### Changed
- **`sample_themes/anthropic.yaml` — complete redesign** to faithfully match the claude.ai visual language:
  - Background `#1c1c1a` — near-black, no brown warmth
  - `noiseOpacity: 0.0` — zero grain/noise texture
  - `warmGlow: rgba(217,119,87,0.05)` — barely perceptible, down from 16%
  - Font changed to **DM Sans** (closest open-source match to Söhne used on claude.ai) at 15.5 px with −0.005 em letter-spacing
  - `border-radius: 0.75rem` — matches claude.ai's rounded cards
  - All `colorOverrides` recalibrated: muted surfaces darker (`#252523`), `mutedForeground` lightened to `#a09890` for readable secondary labels
  - Card shadow refined to match claude.ai's subtle depth
  - Removed the orange `foreground` highlight layer (was at 5%, contributed to the warm cast)

---

## [0.4.2] — 2026-05-05

### Fixed
- **Background bleed on theme switch**: `applyThemeToDom` now mirrors Hermes's `_PREV_DYNAMIC_VAR_KEYS` pattern — every `--component-*` and `--theme-asset-*` var written by the previous call is tracked and cleared before the new theme is applied, preventing stale component/asset styles from bleeding through.
- **Font not applying**: `--font-sans` (Tailwind's own variable, used by `.font-sans` utility classes) is now also set to match `--theme-font-sans` on every theme apply, so Tailwind-classed elements follow the theme font.
- **Typography vars always written**: every typography variable (`--theme-font-sans`, `--theme-font-mono`, `--theme-font-display`, `--theme-base-size`, `--theme-line-height`, `--theme-letter-spacing`) is now always set unconditionally — no more "skip if falsy" that left stale values from the previous theme.
- **localStorage sync on activate**: `handleActivate` now writes `hermes-dashboard-theme` to `localStorage` (same as Hermes's own `setTheme()`), so F5 and the native theme switcher see the correct active theme instead of the previous one.
- **Font stylesheet reuse**: instead of injecting a new `<link>` element on every apply, the existing `[data-hermes-theme-font]` link's `href` is updated in-place, avoiding duplicate stylesheet requests.

---

## [0.4.1] — 2026-05-05

### Fixed
- **Activate button now applies theme immediately**: `handleActivate` now passes the full theme object to `applyThemeToDom` after the API call, so all CSS variables (including the background asset) update at once — same result as the Hermes native theme switcher.
- **Background asset cleared on theme switch**: `applyThemeToDom` now removes `--theme-asset-bg` / `--theme-asset-bg-raw` when the incoming theme has no background asset, preventing the previous theme's background from bleeding through.

### Added
- **Screenshot** in `docs/screenshot.png`, displayed at the top of README.

---

## [0.4.0] — 2026-05-05

### Added
- **"Hide from sidebar" button** in the theme list panel: calls `POST /api/dashboard/plugins/hermes-theme-editor/visibility` then immediately reloads the page so the tab disappears without any further steps. The previous Hermes plugins-page button required a manual reload — this button does everything in one click.
- **Anthropic/Claude gift theme** (`sample_themes/anthropic.yaml`): warm dark palette (`#1a1410` background, `#d97757` terracotta accent, `#e8e2d8` text), Inter + JetBrains Mono typography, custom scrollbar and focus-ring CSS, carefully tuned `colorOverrides` for every shadcn token. Installed automatically to `~/.hermes/dashboard-themes/` on first `install.sh` run (existing files are never overwritten).
- **`install.sh` sample theme installer**: loops over `sample_themes/*.yaml` and copies each to `~/.hermes/dashboard-themes/` only if the destination file does not already exist — user customisations are preserved on re-install.

---

## [0.3.0] — 2026-05-05

### Fixed
- **Instant theme apply on save**: after saving the currently-active theme the plugin now writes all CSS variables directly to `document.documentElement` (mirrors `applyTheme` in Hermes `context.tsx`) — no page reload needed
- **Hex colour input for rgba values**: `resolveHex()` now parses `rgba(r,g,b,a)` and `rgb(r,g,b)` strings and converts them to hex, so colour override fields that store rgba values (e.g. `border`) display a correct hex colour instead of `#000000`
- **Action button styling**: Save / Activate / Delete / Close buttons in the Live Preview column now use native `<button>` elements styled with theme CSS variables instead of the SDK `Button` component, so they match the rest of the editor UI
- **`tools.py` → `plugin_tools.py`**: renamed to prevent `sys.path.insert` collision with Hermes Agent's own `tools/` package (was causing 500 errors in unrelated dashboard endpoints)
- **`register_tool()` call signature**: fixed to pass `name, toolset, schema, handler` as required by `PluginContext`

---

## [0.2.0] — 2026-05-04

### Changed
- **Complete rewrite of `dashboard/dist/index.js`** — replaced the basic theme selector with a full
  visual **Theme Editor** (3-panel layout: theme list | editor form | live preview)
- Sidebar tab label changed from "Themes" to "Theme Editor"

### Added
- **3-panel editor layout**: theme list sidebar (220 px) · editor form (flex) · live preview panel (280 px)
- **Live preview** (`LivePreview` component): mini Hermes UI mockup — header, sidebar, chat bubbles,
  message input — updates in real time as you change any field
- **8 collapsible editor sections**:
  1. Theme identity (name, label)
  2. Base colours — background, midground, foreground (hex + alpha), warm glow (rgba), noise opacity
  3. UI colours — all 17 shadcn-compat colour-override tokens with friendly labels
  4. Typography — sans-serif, monospace, display font pickers (21 open-source fonts) + custom URL
  5. Font sizes — base size slider (rem), line height slider
  6. Layout — border radius slider, density radio (compact / comfortable / spacious), layout variant
  7. Background asset — gradient string or image URL
  8. Custom CSS — textarea with 32 KiB cap indicator
- **`ColorField`** — hex input + native colour picker + optional alpha slider
- **`GlowField`** — rgba colour picker with opacity slider (for warm glow)
- **`SliderField`** — range slider with formatted value display
- **`FontPicker`** — grouped dropdown (21 fonts) + optional custom URL field
- **`RadioGroup`** — accessible radio buttons for density / layout variant
- **`TextareaField`** — resizable textarea with character counter
- Built-in themes (`default`, `midnight`, `ember`, `mono`, `cyberpunk`, `rose`) are read-only; **Clone** button creates a new editable copy
- User themes (e.g. `anthropic-claude`) are fully editable: Save · Activate · Delete

---

## [0.1.0] — 2026-05-04

### Added
- Initial plugin scaffold: `plugin.yaml`, `__init__.py`, `schemas.py`, `tools.py`, `commands.py`, `hooks.py`
- Theme persistence layer: `themes/repository.py` with atomic YAML writes
- Input validation: `themes/validator.py` (slug, hex, font URL whitelist, CSS cap)
- Dashboard plugin manifest: `dashboard/manifest.json` — native tab in Hermes Agent dashboard
- Backend API (`dashboard/plugin_api.py`) mounted at `/api/plugins/hermes-theme-editor/`
- Basic theme selector UI (`dashboard/dist/index.js`)
- i18n: English, Hungarian, Chinese translations
- LLM tools: `theme_editor_list_themes`, `theme_editor_get_theme`, `theme_editor_save_theme`, `theme_editor_delete_theme`, `theme_editor_open`
- Slash command: `/theme-editor`
- CLI subcommands: `hermes theme-editor list|get|delete`
- `install.sh` — symlink or copy installer
- Unit tests: validator (22 cases), repository (14 cases)
- Integration tests: all API endpoints (17 cases)
