#!/bin/bash
# setup.sh
# Run once after cloning: bash setup.sh
# Symlinks the CMS theme (cms/theme) into the "maytable" LocalWP site.

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
THEME_SRC="$REPO_ROOT/cms/theme"
WP_THEMES="$HOME/Local Sites/maytable/app/public/wp-content/themes"
THEME_DEST="$WP_THEMES/maytable"

echo ""
echo "may-map-table CMS setup"
echo "───────────────────────"

if [ ! -d "$WP_THEMES" ]; then
  echo ""
  echo "  ✗ LocalWP themes folder not found at:"
  echo "    $WP_THEMES"
  echo ""
  echo "  Create the 'maytable' site in LocalWP first, then re-run: bash setup.sh"
  echo ""
  exit 1
fi

if [ -L "$THEME_DEST" ]; then
  rm "$THEME_DEST"
elif [ -d "$THEME_DEST" ]; then
  echo ""
  echo "  ✗ A real folder already exists at:"
  echo "    $THEME_DEST"
  echo ""
  echo "  Move or delete it manually, then re-run: bash setup.sh"
  echo ""
  exit 1
fi

ln -s "$THEME_SRC" "$THEME_DEST"

echo "  ✓ Symlink created:"
echo "    $THEME_DEST"
echo "    → $THEME_SRC"
echo ""
echo "  Next steps:"
echo "  1. Install and activate ACF Pro"
echo "  2. WP Admin → Appearance → Themes: activate 'May Map Table CMS'"
echo "  3. Check http://maytable.local/wp-json/maytable/v1/content"
echo ""
