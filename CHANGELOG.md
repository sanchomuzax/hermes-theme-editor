# Changelog

All notable changes to **hermes-theme-editor** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added
- Initial plugin scaffold: `plugin.yaml`, `__init__.py`, `schemas.py`, `tools.py`, `commands.py`, `hooks.py`
- Theme persistence layer: `themes/repository.py` with atomic YAML writes
- Input validation: `themes/validator.py` (slug, hex, font URL whitelist, CSS cap)
- Dashboard plugin manifest: `dashboard/manifest.json` — native **Themes** tab in Hermes Agent dashboard
- Backend API (`dashboard/plugin_api.py`) mounted at `/api/plugins/hermes-theme-editor/`:
  - `GET /themes` — list user themes
  - `GET /themes/{name}` — get single theme
  - `POST /themes` — create theme
  - `PUT /themes/{name}` — update theme
  - `DELETE /themes/{name}` — delete theme
  - `GET /health` — plugin health check
- Visual Theme Editor UI (`dashboard/dist/index.js`):
  - Palette editor: background / midground / foreground (hex + alpha), warm glow, noise opacity
  - Typography: sans-serif, monospace, display font pickers with 20 popular open-source Google Fonts
  - Font URL field with domain whitelist (Google Fonts, Bunny Fonts, jsDelivr, …)
  - Layout controls: border radius, density (compact / comfortable / spacious), layout variant
  - Color overrides: all 18 shadcn-compat tokens
  - Assets: background gradient/URL field
  - Custom CSS textarea (32 KiB cap, matches Hermes Agent limit)
  - Live preview panel showing palette, font, and radius applied in real time
  - Theme list: built-in presets + user themes, with activate / edit / clone / delete actions
- i18n: English, Hungarian, Chinese translations bundled in the plugin JS; adapts to host locale via `useI18n` from the Hermes Plugin SDK
- LLM tools: `theme_editor_list_themes`, `theme_editor_get_theme`, `theme_editor_save_theme`, `theme_editor_delete_theme`, `theme_editor_open`
- Slash command: `/theme-editor`
- CLI subcommands: `hermes theme-editor list|get|delete`
- `install.sh` — symlink or copy installer, auto-enables via `hermes plugins enable`
- Unit tests: validator (22 cases), repository (14 cases)
- Integration tests: all API endpoints (17 cases)
- `.gitignore` configured to exclude secrets (`auth.json`, `google_token.json`, `*.key`)

---

## [0.1.0] — 2026-05-04

_Initial development release (pre-alpha). Not yet published to PyPI._
