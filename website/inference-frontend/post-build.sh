#!/bin/bash
set -e

DIST_DIR="./dist"
LANDING_SRC="../index.html"
LANDING_ASSETS="../banner2.png ../chimeralogo-header.png ../chimeralogo.png ../robots.txt ../sitemap.xml"

# Create inference subdirectory with the React app
mkdir -p "$DIST_DIR/inference"
cp "$DIST_DIR/index.html" "$DIST_DIR/inference/index.html"

# Copy assets to inference subdirectory (relative paths need them there)
cp -r "$DIST_DIR/assets" "$DIST_DIR/inference/assets" 2>/dev/null || true
cp "$DIST_DIR/chimeralogo-header.png" "$DIST_DIR/inference/" 2>/dev/null || true

# Replace root index.html with the static landing page
cp "$LANDING_SRC" "$DIST_DIR/index.html"

# Copy landing page assets
for asset in $LANDING_ASSETS; do
  if [ -f "$asset" ]; then
    cp "$asset" "$DIST_DIR/"
  fi
done

echo "Post-build: landing page at /, inference app at /inference/"
