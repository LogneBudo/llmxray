#!/usr/bin/env bash
set -euo pipefail

# Deploy LLMxRay website + docs to GitHub Pages
# Usage: bash scripts/deploy-site.sh
#
# Builds:
#   1. Website (from ../llmxrayweb) → site-dist/
#   2. VitePress docs                → site-dist/docs/
# Then pushes site-dist/ to the gh-pages branch.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
WEBSITE_DIR="$(dirname "$REPO_DIR")/llmxrayweb"
SITE_DIST="$REPO_DIR/site-dist"

echo "==> Checking website directory..."
if [ ! -d "$WEBSITE_DIR" ]; then
  echo "ERROR: Website directory not found at $WEBSITE_DIR"
  exit 1
fi

echo "==> Cleaning site-dist/..."
rm -rf "$SITE_DIST"
mkdir -p "$SITE_DIST"

echo "==> Building website..."
cd "$WEBSITE_DIR"
npm run build
cp -r dist/* "$SITE_DIST/"

echo "==> Building docs..."
cd "$REPO_DIR"
npx vitepress build docs
cp -r docs/.vitepress/dist "$SITE_DIST/docs"

echo "==> Deploying to gh-pages..."
cd "$REPO_DIR"
npx gh-pages -d site-dist --dotfiles

echo "==> Done! Site deployed to GitHub Pages."
echo "    Website: https://lognebudo.github.io/llmxray/"
echo "    Docs:    https://lognebudo.github.io/llmxray/docs/en/"
