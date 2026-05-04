#!/usr/bin/env bash
# install.sh — Install hermes-theme-editor into ~/.hermes/plugins/
#
# Usage:
#   ./install.sh           — symlink from this repo (recommended for development)
#   ./install.sh --copy    — copy files (for production installs)
#   ./install.sh --remove  — remove the plugin
#
set -euo pipefail

PLUGIN_NAME="hermes-theme-editor"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
PLUGINS_DIR="$HERMES_HOME/plugins"
TARGET="$PLUGINS_DIR/$PLUGIN_NAME"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="symlink"
if [[ "${1:-}" == "--copy" ]]; then MODE="copy"; fi
if [[ "${1:-}" == "--remove" ]]; then MODE="remove"; fi

case "$MODE" in
  remove)
    if [[ -L "$TARGET" || -d "$TARGET" ]]; then
      rm -rf "$TARGET"
      echo "✓ Removed $TARGET"
    else
      echo "Plugin not installed at $TARGET"
    fi
    exit 0
    ;;

  symlink)
    mkdir -p "$PLUGINS_DIR"
    if [[ -L "$TARGET" ]]; then
      echo "Updating symlink…"
      rm "$TARGET"
    elif [[ -d "$TARGET" ]]; then
      echo "ERROR: $TARGET exists and is not a symlink. Remove it manually first."
      exit 1
    fi
    ln -s "$SRC" "$TARGET"
    echo "✓ Symlinked $SRC → $TARGET"
    ;;

  copy)
    mkdir -p "$PLUGINS_DIR"
    rm -rf "$TARGET"
    cp -r "$SRC" "$TARGET"
    echo "✓ Copied to $TARGET"
    ;;
esac

# Install sample themes (skip files that already exist to preserve user edits)
THEMES_DIR="$HERMES_HOME/dashboard-themes"
mkdir -p "$THEMES_DIR"
INSTALLED_SAMPLES=0
for f in "$SRC/sample_themes/"*.yaml; do
  [[ -f "$f" ]] || continue
  DEST="$THEMES_DIR/$(basename "$f")"
  if [[ ! -f "$DEST" ]]; then
    cp "$f" "$DEST"
    echo "✓ Installed sample theme: $(basename "$f")"
    INSTALLED_SAMPLES=$((INSTALLED_SAMPLES + 1))
  fi
done
[[ $INSTALLED_SAMPLES -eq 0 ]] && echo "  (sample themes already present — skipped)"

# Enable in Hermes config if hermes CLI is available
if command -v hermes &>/dev/null; then
  hermes plugins enable "$PLUGIN_NAME" 2>/dev/null && \
    echo "✓ Plugin enabled via 'hermes plugins enable $PLUGIN_NAME'" || \
    echo "  Note: enable manually with: hermes plugins enable $PLUGIN_NAME"
else
  echo ""
  echo "Next steps:"
  echo "  1. Add to ~/.hermes/config.yaml:"
  echo "       plugins:"
  echo "         enabled:"
  echo "           - $PLUGIN_NAME"
  echo "  2. Restart the Hermes Agent"
  echo "  3. Open the dashboard — a 'Themes' tab will appear"
fi
